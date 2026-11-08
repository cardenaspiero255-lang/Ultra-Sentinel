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

/* Bind Fixer's exact pinned candidate to the existing functional Judge. The
 * caller supplies JVM outcomes: this module verifies their consistency, NOT
 * their execution origin. A trusted CI job must execute and hash the binaries.
 */
const {judgeReadProgressEvidence}=
 require('./bounded-read-progress-functional-judge.cjs');
function blockedFunctional(){return Object.freeze({
 schema:'ultra-sentinel-pinned-bounded-read-functional-handoff/v1',
 status:'BLOCKED_PINNED_FIXER_FUNCTIONAL_EVIDENCE',
 functionalEvidenceConsistent:false,unsafeCandidateRejected:false,
 localGitRollbackVerified:false,originalJVMExecutionAuthenticated:false,
 remoteRepositoryAuthenticated:false,remoteWrites:false,mergeAllowed:false,
 productionReleaseAllowed:false
});}
function bindPinnedBoundedReadFunctionalEvidence(options={}){
 try{
  const input=snapshotRecord(options,
   ['source','candidateSource','unsafeSource','results']);
  if(typeof input.source!=='string'||typeof input.candidateSource!=='string'||
   typeof input.unsafeSource!=='string')return blockedFunctional();
  const binding=bindPinnedBoundedReadCandidate({
   source:input.source,candidateSource:input.candidateSource
  });
  if(binding.status!=='PINNED_LOCAL_FIXER_CANDIDATE_MATCHED_NOT_JVM_ATTESTED'||
   binding.originalBlobSha!==ORIGINAL||
   binding.candidateBlobSha!==blobSha(input.candidateSource)||
   binding.fixerCandidateGenerationVerified!==true)return blockedFunctional();
  const judge=judgeReadProgressEvidence({
   expectedCommitSha:COMMIT,
   file:{path:PATH,source:input.source,expectedBlobSha:ORIGINAL},
   candidateSource:input.candidateSource,unsafeSource:input.unsafeSource,
   results:input.results
  });
  if(judge.status!=='LOCAL_FUNCTIONAL_JUDGE_ACCEPTED_NOT_AUTHENTICATED'||
   judge.functionalCandidateAccepted!==true||
   judge.unsafeCandidateRejected!==true||
   judge.exactTreeRollbackVerified!==true||
   judge.remoteWrites!==false||judge.mergeAllowed!==false)
   return blockedFunctional();
  return Object.freeze({
   schema:'ultra-sentinel-pinned-bounded-read-functional-handoff/v1',
   status:'PINNED_FIXER_LOCAL_FUNCTIONAL_JUDGE_MATCHED_UNATTESTED',
   sourceCommit:COMMIT,sourceBlobSha:ORIGINAL,
   candidateBlobSha:binding.candidateBlobSha,
   fixerCandidateGenerationVerified:true,sourcePinnedBytesMatched:true,
   functionalEvidenceConsistent:true,unsafeCandidateRejected:true,
   localGitRollbackVerified:true,
   originalJVMExecutionAuthenticated:false,
   remoteRepositoryAuthenticated:false,causalityVerified:false,
   remoteWrites:false,mergeAllowed:false,productionReleaseAllowed:false,
   limitation:'Only consistency of caller-provided JVM logs, pinned source/candidate bytes and disposable local Git Judge/rollback is verified. Authenticated JVM execution must be established by a trusted runner.'
  });
 }catch{return blockedFunctional();}
}
module.exports=Object.freeze({
 bindPinnedBoundedReadCandidate,bindPinnedBoundedReadFunctionalEvidence
});
