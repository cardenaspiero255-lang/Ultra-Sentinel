'use strict';
// The independent Kotlin/JVM verifier must execute these sources. A lexical
// candidate never authorizes production changes or proves a product contract.
const {createHash}=require('node:crypto');
const {snapshotRecord}=require('../investigation/plain-kotlin-payload.cjs');
const {isSafeNovelKotlinPath}=require('../investigation/novel-kotlin-path-policy.cjs');
const {scanCodecIntegrityHypotheses}=require('../family-hunter/phase2-codec-integrity-hunter.cjs');
const SHA=/^[a-f0-9]{40}$/;
// Match only the bounded expression family already recognized by Hunter,
// including Kotlin whitespace and line breaks, not arbitrary source rewrites.
const LOSSY=/\bString\s*\(\s*(Base64\s*\.\s*get(?:Url)?Decoder\s*\(\s*\)\s*\.\s*decode\s*\([^)]{0,512}\))\s*,\s*StandardCharsets\s*\.\s*UTF_8\s*\)/g;
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
   Buffer.from(f.source,'utf8').toString('utf8')!==f.source||
   !f.source.endsWith('\n')||f.source.includes('\r')||f.source.includes('\0')||
   typeof f.expectedBlobSha!=='string'||!SHA.test(f.expectedBlobSha)||
   sha(f.source)!==f.expectedBlobSha||
   observation.rule!=='LOSSY_BASE64_UTF8_DECODE'||observation.path!==f.path||
   observation.expectedBlobSha!==f.expectedBlobSha||
   observation.status!=='HYPOTHESIS_REQUIRES_INDEPENDENT_KOTLIN_ORACLE'||
   !Number.isSafeInteger(observation.line)||observation.line<1)return blocked();
  // Require the unique byte-pinned Hunter observation to be reproducible.
  // A raw regex alone could otherwise rewrite a comment or string literal.
  const rescanned=scanCodecIntegrityHypotheses({
   expectedCommitSha:r.expectedCommitSha,files:[f]
  });
  if(rescanned.status!=='CODEC_INTEGRITY_HYPOTHESES_REQUIRE_ORIGINAL_ORACLE'||
   rescanned.findings.length!==1||
   rescanned.findings[0].line!==observation.line)return blocked();
  // Path and Git blob equality were validated above against the same
  // immutable string values passed into Hunter. Repeating those comparisons
  // adds unreachable decision branches without increasing assurance.
  const matches=[...f.source.matchAll(LOSSY)];
  if(matches.length!==1)return blocked();
  const match=matches[0];
  if(f.source.slice(0,match.index).split('\n').length!==observation.line)return blocked();
  const replacement='StandardCharsets.UTF_8.newDecoder()'+
   '.onMalformedInput(java.nio.charset.CodingErrorAction.REPORT)'+
   '.onUnmappableCharacter(java.nio.charset.CodingErrorAction.REPORT)'+
   '.decode(java.nio.ByteBuffer.wrap('+match[1]+')).toString()';
  const candidateSource=f.source.slice(0,match.index)+replacement+
   f.source.slice(match.index+match[0].length);
  return Object.freeze({status:'CANDIDATE_REQUIRES_INDEPENDENT_ORIGINAL_JVM_ORACLE',
   path:f.path,originalBlobSha:f.expectedBlobSha,candidateBlobSha:sha(candidateSource),
   candidateSource,originalFunctionalOracleVerified:false,
   ownerAuthorizationGranted:false,remoteWrites:false,mergeAllowed:false});
 }catch{return blocked();}
}
module.exports=Object.freeze({draftCodecIntegrityCandidate});
