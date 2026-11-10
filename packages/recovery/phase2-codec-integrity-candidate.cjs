'use strict';
// The independent Kotlin/JVM verifier must execute these sources. A lexical
// candidate never authorizes production changes or proves a product contract.
const {createHash}=require('node:crypto');
const {snapshotRecord}=require('../investigation/plain-kotlin-payload.cjs');
const {isSafeNovelKotlinPath}=require('../investigation/novel-kotlin-path-policy.cjs');
const SHA=/^[a-f0-9]{40}$/;
const ORIGINAL='String(Base64.getDecoder().decode(fields[index]), StandardCharsets.UTF_8)';
const REPLACEMENT='StandardCharsets.UTF_8.newDecoder().onMalformedInput(java.nio.charset.CodingErrorAction.REPORT).onUnmappableCharacter(java.nio.charset.CodingErrorAction.REPORT).decode(java.nio.ByteBuffer.wrap(Base64.getDecoder().decode(fields[index]))).toString()';
function sha(text){const b=Buffer.from(text,'utf8');return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');}
function blocked(){return Object.freeze({status:'BLOCKED_CODEC_CANDIDATE',originalFunctionalOracleVerified:false,
 remoteWrites:false,mergeAllowed:false});}
function draftCodecIntegrityCandidate(input){
 try{
  const r=snapshotRecord(input,['expectedCommitSha','file','finding']);
  const f=snapshotRecord(r.file,['path','source','expectedBlobSha']);
  const observation=snapshotRecord(r.finding,['rule','path','line','expectedBlobSha','status']);
  if(typeof r.expectedCommitSha!=='string'||!SHA.test(r.expectedCommitSha)||
   typeof f.path!=='string'||!isSafeNovelKotlinPath(f.path)||
   typeof f.source!=='string'||f.source.length<20||Buffer.byteLength(f.source)>160000||
   !f.source.endsWith('\n')||f.source.includes('\r')||f.source.includes('\0')||
   typeof f.expectedBlobSha!=='string'||!SHA.test(f.expectedBlobSha)||
   sha(f.source)!==f.expectedBlobSha||
   observation.rule!=='LOSSY_BASE64_UTF8_DECODE'||observation.path!==f.path||
   observation.expectedBlobSha!==f.expectedBlobSha||
   observation.status!=='HYPOTHESIS_REQUIRES_INDEPENDENT_KOTLIN_ORACLE'||
   !Number.isSafeInteger(observation.line)||observation.line<1||
   f.source.split(ORIGINAL).length!==2)return blocked();
  const offset=f.source.indexOf(ORIGINAL);
  if(f.source.slice(0,offset).split('\n').length!==observation.line)return blocked();
  const candidateSource=f.source.replace(ORIGINAL,REPLACEMENT);
  return Object.freeze({status:'CANDIDATE_REQUIRES_INDEPENDENT_ORIGINAL_JVM_ORACLE',
   path:f.path,originalBlobSha:f.expectedBlobSha,candidateBlobSha:sha(candidateSource),
   candidateSource,originalFunctionalOracleVerified:false,
   ownerAuthorizationGranted:false,remoteWrites:false,mergeAllowed:false});
 }catch{return blocked();}
}
module.exports=Object.freeze({draftCodecIntegrityCandidate});
