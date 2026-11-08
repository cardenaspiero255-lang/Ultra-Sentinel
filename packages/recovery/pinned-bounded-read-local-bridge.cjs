'use strict';
const {blobSha}=require('../investigation/novel-kotlin-hypotheses.cjs');
const {draftBoundedReadProgressRepair}=require('../investigation/bounded-read-progress-repair.cjs');
const {snapshotRecord}=require('../investigation/plain-kotlin-payload.cjs');
const ORIGINAL='fd061b9dad636684184ccf2e96f87084d3b99df5';
const COMMIT='747c14b5d97750a7b2736968e2d516f02448558d';
const PATH='apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/BoundedImageInputStream.kt';
function blocked(){return Object.freeze({status:'BLOCKED_UNTRUSTED_PINNED_CANDIDATE',localGitRollbackVerified:false,remoteWrites:false,mergeAllowed:false});}
function bindPinnedBoundedReadCandidate(options={}){
 try{
  const input=snapshotRecord(options,['source','candidateSource']);
  if(typeof input.source!=='string'||typeof input.candidateSource!=='string'||blobSha(input.source)!==ORIGINAL)return blocked();
  const draft=draftBoundedReadProgressRepair({expectedCommitSha:COMMIT,file:{path:PATH,source:input.source,expectedBlobSha:ORIGINAL}});
  if(draft.status!=='CANDIDATE_REQUIRES_TRUSTED_ORIGINAL_ORACLE'||draft.candidateSource!==input.candidateSource||blobSha(input.candidateSource)!==draft.candidateBlobSha)return blocked();
  return Object.freeze({status:'PINNED_LOCAL_FIXER_CANDIDATE_MATCHED_NOT_JVM_ATTESTED',
   originalBlobSha:ORIGINAL,candidateBlobSha:draft.candidateBlobSha,
   localGitRollbackVerified:false,sourcePinnedBytesMatched:true,
   fixerCandidateGenerationVerified:true,originalJVMExecutionAuthenticated:false,
   externalRepositoryAuthenticated:false,causalityVerified:false,remoteWrites:false,mergeAllowed:false});
 }catch{return blocked();}
}
module.exports=Object.freeze({bindPinnedBoundedReadCandidate});
