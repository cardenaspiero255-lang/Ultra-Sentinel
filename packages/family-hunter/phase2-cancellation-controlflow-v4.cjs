'use strict';
/* Hunter v4: import-aware, bounded source-only type guard and branch-exit
 * inference for cancellation swallowed under broad Exception/Throwable catches.
 * NOT a compiler-backed BindingContext or proof of original functional harm.
 * Reuses v3 input/source Git SHA verification; v3 itself remains frozen by SHA. */
const {scanCancellationPropagationHypotheses}=require('./phase2-cancellation-propagation-hunter.cjs');
const {snapshotRecord,snapshotArray}=require('../investigation/plain-kotlin-payload.cjs');

function maskKotlin(source){
 // UTF-16 unit positions are preserved, including for astral characters.
 const out=Array.from({length:source.length},(_,i)=>source[i]==='\n'?'\n':' ');
 const stack=[{kind:'code'}];
 let i=0;
 function push(frame){
  if(stack.length>=64)throw Error('KOTLIN_TEMPLATE_STACK_BUDGET');
  stack.push(frame);
 }
 const templateOpen=String.fromCharCode(36)+'{';
 while(i<source.length){
  const top=stack[stack.length-1];
  const c=source[i],two=source.slice(i,i+2),three=source.slice(i,i+3);
  if(top.kind==='lineComment'){
   if(c==='\n')stack.pop();
   i++;continue;
  }
  if(top.kind==='blockComment'){
   if(two==='/*'){top.depth++;if(top.depth>512)throw Error('COMMENT_DEPTH');i+=2;continue;}
   if(two==='*/'){top.depth--;if(top.depth===0)stack.pop();i+=2;continue;}
   i++;continue;
  }
  if(top.kind==='string'){
   if(top.delimiter==='char'){
    if(c==='\\'){i+=Math.min(2,source.length-i);continue;}
    if(c==="'")stack.pop();
    i++;continue;
   }
   if(top.delimiter==='raw'){
    if(three==='"""'){stack.pop();i+=3;continue;}
    if(two===templateOpen){push({kind:'template',depth:1});i+=2;continue;}
    i++;continue;
   }
   if(c==='\\'){i+=Math.min(2,source.length-i);continue;}
   if(two===templateOpen){push({kind:'template',depth:1});i+=2;continue;}
   if(c==='"')stack.pop();
   i++;continue;
  }
  // Executable Kotlin code inside a string template is conservatively masked
  // along with the enclosing string: it is not a top-level finding.
  if(two==='//'){push({kind:'lineComment'});i+=2;continue;}
  if(two==='/*'){push({kind:'blockComment',depth:1});i+=2;continue;}
  if(three==='"""'){push({kind:'string',delimiter:'raw'});i+=3;continue;}
  if(c==='"'){push({kind:'string',delimiter:'ordinary'});i++;continue;}
  if(c==="'"){push({kind:'string',delimiter:'char'});i++;continue;}
  if(top.kind==='template'){
   if(c==='{'){top.depth++;if(top.depth>512)throw Error('TEMPLATE_BRACE_DEPTH');}
   else if(c==='}'&&--top.depth===0)stack.pop();
   i++;continue;
  }
  out[i]=c;
  i++;
 }
 // A //-comment may legitimately terminate at EOF.
 if(stack.length===2&&stack[1].kind==='lineComment')stack.pop();
 if(stack.length!==1||stack[0].kind!=='code')throw Error('UNTERMINATED_KOTLIN_LEXEME_OR_TEMPLATE');
 return out.join('');
}
function closingBrace(code,open){
 if(code[open]!=='{')throw Error('INVALID_CATCH_OPEN');
 let depth=1;
 for(let i=open+1;i<code.length;i++){
  if(code[i]==='{')depth++;
  else if(code[i]==='}'&&--depth===0)return i;
 }
 throw Error('UNTERMINATED_CATCH_BODY');
}

function importBinding(code){
 const aliases=new Set(['kotlin.coroutines.cancellation.CancellationException']);
 for(const m of code.matchAll(/^\s*import\s+kotlin\s*\.\s*coroutines\s*\.\s*cancellation\s*\.\s*CancellationException(?:\s+as\s+([A-Za-z_]\w*))?\s*$/gm)){
  aliases.add(m[1]||'CancellationException');
 }
 // Reject any imported competing simple symbol or local symbol that could
 // shadow a seemingly equivalent CancellationException name.
 const candidates=[...aliases];
 const imports=[...code.matchAll(/^\s*import\s+([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+)(?:\s+as\s+([A-Za-z_]\w*))?\s*$/gm)];
 for(const name of candidates){
  if(name.includes('.'))continue;
  if(new RegExp('\\b(?:class|interface|object|typealias|enum\\s+class)\\s+'+name+'\\b').test(code))
   aliases.delete(name);
  if(imports.some(m=>(m[2]||m[1].split('.').at(-1))===name&&
    m[1]!=='kotlin.coroutines.cancellation.CancellationException'))
   aliases.delete(name);
 }
 return aliases;
}
function scanGuarded(file){
 const code=maskKotlin(file.source),accepted=importBinding(code);
 const findings=[];
 const catches=/\bcatch\s*\(\s*([A-Za-z_]\w*)\s*:\s*(?:kotlin\s*\.\s*)?(?:Exception|Throwable)\s*\)\s*\{/g;
 for(const m of code.matchAll(catches)){
  if(findings.length>128)throw Error('TOO_MANY_GUARD_CATCHES');
  const open=m.index+m[0].lastIndexOf('{'),end=closingBrace(code,open);
  const body=code.slice(open+1,end);
  const ident=m[1];
  const conditional=new RegExp('\\bif\\s*\\(\\s*'+ident+
   '\\s+is\\s+([A-Za-z_]\\w*(?:\\s*\\.\\s*[A-Za-z_]\\w*)*)\\s*\\)\\s*\\{','g');
  for(const guard of body.matchAll(conditional)){
   const type=guard[1].replace(/\s+/g,'');
   if(!accepted.has(type))continue;
   const guardOpen=guard.index+guard[0].lastIndexOf('{');
   const guardEnd=closingBrace(body,guardOpen);
   const target=body.slice(guardOpen+1,guardEnd);
   // Bounded path reasoning: only direct return from the narrowed branch,
   // never a branch that may throw. A downstream throw does not rescue this
   // branch when the branch explicitly exits first.
   if(!/\breturn\b/.test(target)||/\bthrow\b/.test(target))continue;
   // Avoid nested lambda non-local return ambiguity; purely conservative.
   if(/\b(?:fun|object|class)\b|->/.test(target))continue;
   findings.push(Object.freeze({
    rule:'GUARDED_CANCELLATION_SWALLOWED',path:file.path,
    line:file.source.slice(0,m.index).split('\n').length,
    expectedBlobSha:file.expectedBlobSha,
    status:'HYPOTHESIS_REQUIRES_INDEPENDENT_KOTLIN_ORACLE'
   }));
   break;
  }
 }
 return findings;
}
function reject(status){
 return Object.freeze({schema:'ultra-sentinel-cancellation-controlflow-hunter/v2',
  status,findings:Object.freeze([]),sourceByteIntegrityVerified:false,
  sourceRepositoryAuthenticated:false,compilerTypeResolutionVerified:false,
  originalFunctionalOracleVerified:false,causalityVerified:false,
  generalizationVerified:false,repairAuthorized:false,remoteWrites:false,
  mergeAllowed:false});
}
function scanCancellationControlflowV4(options){
 try{
  // Important: v3 is the mandatory Git-byte/proxy/path input gate.
  const base=scanCancellationPropagationHypotheses(options);
  if(base.status.startsWith('BLOCKED_')||base.sourceByteIntegrityVerified!==true)
   return reject('BLOCKED_V3_SOURCE_VERIFICATION');
  const input=snapshotRecord(options,['expectedCommitSha','files']);
  const files=snapshotArray(input.files,['path','source','expectedBlobSha'],80);
  const findings=base.findings.concat(files.flatMap(scanGuarded)).
   sort((a,b)=>a.path.localeCompare(b.path)||a.line-b.line||a.rule.localeCompare(b.rule));
  if(findings.length>256)return reject('BLOCKED_FINDING_BUDGET');
  return Object.freeze({
   schema:'ultra-sentinel-cancellation-controlflow-hunter/v2',
   status:findings.length?'CANCELLATION_CONTROLFLOW_HYPOTHESES_REQUIRE_ORIGINAL_ORACLE':
     'NO_CANCELLATION_CONTROLFLOW_HYPOTHESES_NOT_CERTIFIED',
   findings:Object.freeze(findings),sourceByteIntegrityVerified:true,
   sourceRepositoryAuthenticated:false,compilerTypeResolutionVerified:false,
   originalFunctionalOracleVerified:false,causalityVerified:false,generalizationVerified:false,
   repairAuthorized:false,remoteWrites:false,mergeAllowed:false
  });
 }catch{return reject('BLOCKED_IMPORT_BINDING_OR_KOTLIN_STRUCTURE');}
}
module.exports=Object.freeze({scanCancellationControlflowV4});
