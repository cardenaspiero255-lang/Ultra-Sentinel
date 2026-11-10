'use strict';
/* Source-only numeric hypotheses; neither compiler evidence nor defect proof.
 * Accept only ordinary inert data and locally consistent Git object IDs. */
const {createHash}=require('node:crypto');
const {snapshotRecord,snapshotArray}=require('../investigation/plain-kotlin-payload.cjs');
const {isSafeNovelKotlinPath}=require('../investigation/novel-kotlin-path-policy.cjs');
const SHA=/^[0-9a-f]{40}$/;
function blobSha(source){const bytes=Buffer.from(source,'utf8');return createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');}
function result(status,findings=[],integrity=false){
 return Object.freeze({schema:'ultra-sentinel-numeric-risk-hunter/v1',status,
  findings:Object.freeze(findings),sourceByteIntegrityVerified:integrity,
  sourceRepositoryAuthenticated:false,originalFunctionalOracleVerified:false,
  causalityVerified:false,generalizationVerified:false,remoteWrites:false,mergeAllowed:false});
}
// Conservative line scanner: skip literal strings, nested comments and raw strings.
// Unsupported multiline arithmetic is not interpreted as a safe result.
function codeLines(source){
 let block=0,raw=false;
 return source.split('\n').map(line=>{
  let code='',i=0;
  while(i<line.length){
   if(block){
    if(line.startsWith('/*',i)){block++;i+=2;continue;}
    if(line.startsWith('*/',i)){block--;i+=2;continue;}
    i++;continue;
   }
   if(raw){if(line.startsWith('"""',i)){raw=false;i+=3;}else i++;continue;}
   if(line.startsWith('//',i))break;
   if(line.startsWith('/*',i)){block++;i+=2;code+=' ';continue;}
   if(line.startsWith('"""',i)){raw=true;i+=3;code+=' ';continue;}
   if(line[i]==='"'||line[i]==="'"){
    const quote=line[i++];
    while(i<line.length){if(line[i]==='\\'){i+=2;continue;}if(line[i++]===quote)break;}
    code+=' ';continue;
   }
   code+=line[i++];
  }
  return code;
 });
}
function scanFile(file){
 const findings=[];
 const lines=codeLines(file.source);
 // Import aliases are hypotheses only; the compiler bridge must still
 // establish which declaration was actually resolved for each call.
 const clamps=new Set(['coerceIn']);
 for(const row of lines){
  const match=/^\s*import\s+kotlin\s*\.\s*ranges\s*\.\s*coerceIn\s+as\s+([A-Za-z_]\w*)\s*$/.exec(row);
  if(match){clamps.add(match[1]);if(clamps.size>33)throw Error('TOO_MANY_CLAMP_ALIASES');}
 }
 for(let index=0;index<lines.length;index++){
  const line=lines[index];
  for(const chunk of line.split(';')){
   // Widened arithmetic converted to Int before a bounds clamp may wrap.
   const narrowing=/\.toInt\s*\(\s*\)\s*\.\s*([A-Za-z_]\w*)\s*\(\s*-?\d+\s*,\s*-?\d+\s*\)/g;
   for(const m of chunk.matchAll(narrowing)){
    if(!clamps.has(m[1]))continue;
    const prefix=chunk.slice(Math.max(0,m.index-240),m.index);
    if(!/(?:\.toLong\s*\(\s*\)|\b\d+L\b)/.test(prefix)||!/[*/+-]/.test(prefix))continue;
    findings.push(Object.freeze({rule:'WIDE_NUMERIC_NARROWED_BEFORE_CLAMP',
     path:file.path,line:index+1,expectedBlobSha:file.expectedBlobSha,
     status:'HYPOTHESIS_REQUIRES_INDEPENDENT_KOTLIN_ORACLE'}));
   }
   // The multiplication can overflow before a later conversion to Long.
   if(/\(\s*[A-Za-z_]\w*\s*\*\s*\d+\s*\)\s*\.toLong\s*\(\s*\)/.test(chunk)){
    findings.push(Object.freeze({rule:'INT_MULTIPLICATION_BEFORE_WIDENING',
     path:file.path,line:index+1,expectedBlobSha:file.expectedBlobSha,
     status:'HYPOTHESIS_REQUIRES_INDEPENDENT_KOTLIN_ORACLE'}));
   }
  }
 }
 return findings;
}
function scanKotlinNumericRisks(options){
 try{
  const input=snapshotRecord(options,['expectedCommitSha','files']);
  const files=snapshotArray(input.files,['path','source','expectedBlobSha'],80);
  if(typeof input.expectedCommitSha!=='string'||!SHA.test(input.expectedCommitSha))return result('BLOCKED_COMMIT_CONTRACT');
  const seen=new Set();
  for(const file of files){
   if(typeof file.path!=='string'||!isSafeNovelKotlinPath(file.path)||
      typeof file.source!=='string'||file.source.length<10||
      Buffer.byteLength(file.source,'utf8')>60000||file.source.includes('\0')||
      file.source.includes('\r')||!file.source.endsWith('\n')||
      typeof file.expectedBlobSha!=='string'||!SHA.test(file.expectedBlobSha))
    return result('BLOCKED_SOURCE_CONTRACT');
   if(seen.has(file.path))return result('BLOCKED_DUPLICATE_PATH');
   seen.add(file.path);
   if(blobSha(file.source)!==file.expectedBlobSha)return result('BLOCKED_BLOB_MISMATCH');
  }
  const findings=files.flatMap(scanFile).sort((a,b)=>a.path.localeCompare(b.path)||a.line-b.line||a.rule.localeCompare(b.rule));
  return result(findings.length?'NUMERIC_HYPOTHESES_REQUIRE_ORIGINAL_ORACLE':'NO_NUMERIC_HYPOTHESES_NOT_CERTIFIED',findings,true);
 }catch{return result('BLOCKED_INPUT_CONTRACT');}
}
module.exports=Object.freeze({scanKotlinNumericRisks});
