'use strict';
/* Source-derived, bounded fix draft for a Kotlin question-policy mismatch.
 * No product write, model authority or verified general-purpose repair.
 * The original Kotlin/JVM oracle remains independent of this transformer. */
const {createHash}=require('node:crypto');
const {snapshotRecord}=require('./plain-kotlin-payload.cjs');
const COMMIT='747c14b5d97750a7b2736968e2d516f02448558d';
const PATH='apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/LocalGgufPolicy.kt';
const ORIGINAL='46e9dd8b4d0fe861935bfb5ee5160cd39f3b5a78';
function blobSha(text){
 const bytes=Buffer.from(text,'utf8');
 return createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
}
function createVoicePolicyNormalizationCandidate(source){
 if(typeof source!=='string'||source.length<100||source.length>60000||
   source.includes('\0')||source.includes('\r')||!source.endsWith('\n'))return null;
 const target='fun validReadOnlyQuestion(';
 const start=source.indexOf(target);
 if(start<0||source.indexOf(target,start+target.length)!==-1)return null;
 const end=source.indexOf('val direct = Regex',start);
 if(end<0||end-start>2000)return null;
 const group=source.slice(start,end);
 const old='.replace(Regex("""\\p{M}+"""), "").trim()';
 if(group.split(old).length!==2)return null;
 const next='.replace(Regex("""\\p{M}+"""), "")\n'+
  '            .replace(Regex("""[¿?¡!.,:;]+"""), " ")\n'+
  '            .replace(Regex("""\\s+"""), " ").trim()';
 const updated=source.slice(0,start)+group.replace(old,next)+source.slice(end);
 return updated!==source?updated:null;
}
function blocked(){
 return Object.freeze({status:'BLOCKED_UNVERIFIED_VOICE_FIXER_INPUT',
  sourceRepositoryAuthenticated:false,originalJVMOracleVerified:false,
  novelDefectVerified:false,generalFixerVerified:false,
  ownerAuthorizationGranted:false,remoteWrites:false,mergeAllowed:false});
}
function draftPinnedVoiceBoundaryRepair(options){
 try{
  const o=snapshotRecord(options,['expectedCommitSha','file']);
  const f=snapshotRecord(o.file,['path','source','expectedBlobSha']);
  if(o.expectedCommitSha!==COMMIT||f.path!==PATH||
   f.expectedBlobSha!==ORIGINAL||typeof f.source!=='string'||
   blobSha(f.source)!==ORIGINAL)return blocked();
  const candidateSource=createVoicePolicyNormalizationCandidate(f.source);
  if(!candidateSource)return blocked();
  return Object.freeze({
   status:'VOICE_BOUNDARY_CANDIDATE_REQUIRES_ORIGINAL_JVM_ORACLE',
   path:f.path,rule:'VOICE_READ_ONLY_PUNCTUATION_NORMALIZATION',
   expectedCommitSha:COMMIT,originalBlobSha:ORIGINAL,
   candidateBlobSha:blobSha(candidateSource),candidateSource,
   sourceRepositoryAuthenticated:false,originalJVMOracleVerified:false,
   novelDefectVerified:false,generalFixerVerified:false,
   ownerAuthorizationGranted:false,remoteWrites:false,mergeAllowed:false,
   productionReleaseAllowed:false
  });
 }catch{return blocked();}
}
module.exports=Object.freeze({createVoicePolicyNormalizationCandidate,draftPinnedVoiceBoundaryRepair});
