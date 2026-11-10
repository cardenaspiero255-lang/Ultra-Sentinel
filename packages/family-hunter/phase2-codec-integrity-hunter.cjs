'use strict';
// Advisory only: byte-consistent Kotlin text is not independently authenticated,
// and a pattern is never proof of a functional defect or production contract.
const {createHash}=require('node:crypto');
const {snapshotRecord,snapshotArray}=require('../investigation/plain-kotlin-payload.cjs');
const {isSafeNovelKotlinPath}=require('../investigation/novel-kotlin-path-policy.cjs');
const SHA=/^[a-f0-9]{40}$/;
const PATTERN=/\bString\s*\(\s*Base64\s*\.\s*get(?:Url)?Decoder\s*\(\s*\)\s*\.\s*decode\s*\([^)\n]*\)\s*,\s*StandardCharsets\s*\.\s*UTF_8\s*\)/g;
function blob(text){const bytes=Buffer.from(text,'utf8');return createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');}
function report(status,findings=[],valid=false){
 return Object.freeze({schema:'ultra-sentinel-codec-integrity-hunter/v1',status,findings:Object.freeze(findings),
  sourceByteIntegrityVerified:valid,sourceRepositoryAuthenticated:false,originalFunctionalOracleVerified:false,
  causalityVerified:false,generalizationVerified:false,ownerAuthorizationGranted:false,remoteWrites:false,mergeAllowed:false});
}
function sanitizedLines(source){
 let comment=0,raw=false;
 return source.split('\n').map(row=>{
  let output='',i=0;
  while(i<row.length){
   if(comment){if(row.startsWith('/*',i)){comment++;i+=2;}else if(row.startsWith('*/',i)){comment--;i+=2;}else i++;continue;}
   if(raw){if(row.startsWith('"""',i)){raw=false;i+=3;}else i++;continue;}
   if(row.startsWith('//',i))break;
   if(row.startsWith('/*',i)){comment++;i+=2;output+=' ';continue;}
   if(row.startsWith('"""',i)){raw=true;i+=3;output+=' ';continue;}
   if(row[i]==='"'||row[i]==="'"){
    const quote=row[i++];while(i<row.length){if(row[i]==='\\'){i+=2;continue;}if(row[i++]===quote)break;}
    output+=' ';continue;
   }
   output+=row[i++];
  }
  return output;
 });
}
function scanCodecIntegrityHypotheses(options){
 try{
  const root=snapshotRecord(options,['expectedCommitSha','files']);
  if(typeof root.expectedCommitSha!=='string'||!SHA.test(root.expectedCommitSha))return report('BLOCKED_COMMIT');
  const files=snapshotArray(root.files,['path','source','expectedBlobSha'],300);
  const unique=new Set();
  for(const f of files){
   if(typeof f.path!=='string'||!isSafeNovelKotlinPath(f.path)||unique.has(f.path)||
     typeof f.source!=='string'||f.source.length<10||Buffer.byteLength(f.source,'utf8')>160000||
     f.source.includes('\r')||f.source.includes('\0')||typeof f.expectedBlobSha!=='string'||!SHA.test(f.expectedBlobSha))return report('BLOCKED_SOURCE');
   if(blob(f.source)!==f.expectedBlobSha)return report('BLOCKED_BLOB');
   unique.add(f.path);
  }
  const findings=[];
  for(const f of files){
   const lines=sanitizedLines(f.source);
   for(let i=0;i<lines.length;i++){
    for(const match of lines[i].matchAll(PATTERN)){
     findings.push(Object.freeze({rule:'LOSSY_BASE64_UTF8_DECODE',path:f.path,line:i+1,
      expectedBlobSha:f.expectedBlobSha,status:'HYPOTHESIS_REQUIRES_INDEPENDENT_KOTLIN_ORACLE'}));
    }
   }
  }
  findings.sort((a,b)=>a.path.localeCompare(b.path)||a.line-b.line||a.rule.localeCompare(b.rule));
  return report(findings.length?'CODEC_INTEGRITY_HYPOTHESES_REQUIRE_ORIGINAL_ORACLE':
   'NO_CODEC_INTEGRITY_HYPOTHESES_NOT_CERTIFIED',findings,true);
 }catch{return report('BLOCKED_INPUT_CONTRACT');}
}
module.exports=Object.freeze({scanCodecIntegrityHypotheses});
