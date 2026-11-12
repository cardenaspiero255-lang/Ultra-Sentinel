'use strict';
/* Block 2.5: source-only, bounded structural hypothesis about swallowed Kotlin
 * CancellationException. This is NOT symbol/type resolution or proof of a defect.
 * Independent original JVM oracles and Git provenance are separate gates. */
const {createHash}=require('node:crypto');
const {snapshotRecord,snapshotArray}=require('../investigation/plain-kotlin-payload.cjs');
const {isSafeHunterKotlinPath}=require('../investigation/novel-kotlin-path-policy.cjs');
const SHA=/^[0-9a-f]{40}$/;
function gitBlob(source){
 const bytes=Buffer.from(source,'utf8');
 return createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
}
function result(status,findings=[],verified=false){
 return Object.freeze({
  schema:'ultra-sentinel-cancellation-propagation-hunter/v1',status,
  findings:Object.freeze(findings),sourceByteIntegrityVerified:verified,
  sourceRepositoryAuthenticated:false,originalFunctionalOracleVerified:false,
  compilerTypeResolutionVerified:false,causalityVerified:false,
  generalizationVerified:false,repairAuthorized:false,
  remoteWrites:false,mergeAllowed:false
 });
}
/* Omit Kotlin comments (including nested blocks), chars, ordinary and raw strings.
 * Preserve source lengths and newlines to retain exact catch line numbers. */
function maskKotlin(source){
 const out=Array.from({length:source.length},(_,i)=>source[i]==='\n'?'\n':' ');
 let i=0,block=0,line=false,raw=false,quote='';
 while(i<source.length){
  const c=source[i],two=source.slice(i,i+2),three=source.slice(i,i+3);
  if(line){
   if(c==='\n')line=false;
   i++;continue;
  }
  if(block){
   if(two==='/*'){block++;i+=2;continue;}
   if(two==='*/'){block--;i+=2;continue;}
   i++;continue;
  }
  if(raw){
   if(three==='"""'){raw=false;i+=3;continue;}
   i++;continue;
  }
  if(quote){
   if(c==='\\'){i+=Math.min(2,source.length-i);continue;}
   if(c===quote)quote='';
   i++;continue;
  }
  if(two==='//'){line=true;i+=2;continue;}
  if(two==='/*'){block=1;i+=2;continue;}
  if(three==='"""'){raw=true;i+=3;continue;}
  if(c==='"'||c==="'"){quote=c;i++;continue;}
  out[i]=c;
  i++;
 }
 if(block||raw||quote)throw Error('UNTERMINATED_KOTLIN_LEXEME');
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
function scanSource(file){
 const code=maskKotlin(file.source),findings=[];
 // Explicit CancellationException only: broad Exception catches require actual
 // compiler-backed coroutine type and control-flow analysis, not guessed positives.
 const pattern=/\bcatch\s*\(\s*[A-Za-z_]\w*\s*:\s*(?:(?:kotlinx\s*\.\s*coroutines|kotlin\s*\.\s*coroutines\s*\.\s*cancellation)\s*\.\s*)?CancellationException\s*\)\s*\{/g;
 for(const match of code.matchAll(pattern)){
  if(findings.length>128)throw Error('TOO_MANY_CATCHES');
  const open=match.index+match[0].lastIndexOf('{');
  const end=closingBrace(code,open);
  const body=code.slice(open+1,end);
  // Any explicit throw anywhere in the catch is conservatively treated as
  // potentially propagating cancellation. This can miss real defects.
  if(/\bthrow\b/.test(body))continue;
  const line=file.source.slice(0,match.index).split('\n').length;
  findings.push(Object.freeze({
   rule:'CANCELLATION_EXCEPTION_SWALLOWED',path:file.path,line,
   expectedBlobSha:file.expectedBlobSha,
   status:'HYPOTHESIS_REQUIRES_INDEPENDENT_KOTLIN_ORACLE'
  }));
 }
 return findings;
}
function scanCancellationPropagationHypotheses(options){
 try{
  const input=snapshotRecord(options,['expectedCommitSha','files']);
  const files=snapshotArray(input.files,['path','source','expectedBlobSha'],80);
  if(typeof input.expectedCommitSha!=='string'||!SHA.test(input.expectedCommitSha))
   return result('BLOCKED_COMMIT_CONTRACT');
  const seen=new Set();
  for(const file of files){
   if(typeof file.path!=='string'||!isSafeHunterKotlinPath(file.path)||
    seen.has(file.path)||typeof file.source!=='string'||
    Buffer.byteLength(file.source,'utf8')>65536||Buffer.byteLength(file.source,'utf8')<10||
    file.source.includes('\0')||file.source.includes('\r')||
    Buffer.from(file.source,'utf8').toString('utf8')!==file.source||
    file.source.split('\n').length>4000||
    typeof file.expectedBlobSha!=='string'||!SHA.test(file.expectedBlobSha))
    return result('BLOCKED_SOURCE_CONTRACT');
   seen.add(file.path);
   if(gitBlob(file.source)!==file.expectedBlobSha)return result('BLOCKED_GIT_BLOB_MISMATCH');
  }
  const findings=files.flatMap(scanSource).sort((a,b)=>a.path.localeCompare(b.path)||a.line-b.line||a.rule.localeCompare(b.rule));
  if(findings.length>256)return result('BLOCKED_TOO_MANY_FINDINGS');
  return result(findings.length?'CANCELLATION_PROPAGATION_HYPOTHESES_REQUIRE_ORIGINAL_ORACLE':
   'NO_CANCELLATION_HYPOTHESES_NOT_CERTIFIED',findings,true);
 }catch{return result('BLOCKED_INPUT_OR_KOTLIN_STRUCTURE');}
}
module.exports=Object.freeze({scanCancellationPropagationHypotheses});
