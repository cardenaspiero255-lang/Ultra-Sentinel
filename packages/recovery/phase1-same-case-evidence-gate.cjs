'use strict';
/*
 * Read-only Phase 1 SAME-CASE consistency gate.
 *
 * Local source-hash assertions and disposable Git rollback are not evidence
 * of a newly found original Kotlin defect or authenticated JVM execution.
 * No input to this function can authorize a repair or close Phase 1.
 */
const {snapshotRecord,snapshotArray}=
 require('../investigation/plain-kotlin-payload.cjs');
const {planNovelKotlinCandidates}=
 require('../investigation/novel-kotlin-candidate-intake.cjs');
const {drillNovelKotlinCandidateBatch}=
 require('./novel-kotlin-batch-local-judge.cjs');
const HISTORICAL_BLOBS=new Set([
 'fd061b9dad636684184ccf2e96f87084d3b99df5', // JARVIS bounded read
 '7c6f326cb267b56f4ca6b2d0614753695259da56', // JARVIS Termux identity
 '606d1184e7d57e49ef15b983a8646706abadf3da'  // JARVIS voice clock
]);
function outcome(status,checkedCases=0,historicalSourceCase=false,local=false){
 return Object.freeze({
  schema:'ultra-sentinel-phase-one-same-case-evidence/v1',
  status,checkedCases,historicalSourceCase,
  sourceAndCandidateLinked:local,localGitRollbackVerified:local,
  originalJVMExecutionAuthenticated:false,
  externalSourceRepositoryAuthenticated:false,
  independentCausalityVerified:false,
  novelCaseProven:false,phaseOneClosed:false,
  ownerAuthorizationGranted:false,
  remoteWrites:false,mergeAllowed:false,productionReleaseAllowed:false,
  limitation:'This gate reruns Hunter/Fixer intake and local Git Judge/rollback only. The original JVM oracle, remote source authenticity, independent causality and novelty must be established separately inside a trusted permitted execution. Known historical cases cannot close Phase 1.'
 });
}
function assessPhaseOneCase(options={}){
 try{
  const root=snapshotRecord(options,
   ['expectedCommitSha','files','proposals','localEvidence']);
  const files=snapshotArray(root.files,
   ['path','source','expectedBlobSha'],12);
  const proposals=snapshotArray(root.proposals,
   ['path','rule','candidateSource','expectedCandidateBlobSha'],12);
  const evidence=snapshotArray(root.localEvidence,
   ['path','rule','originalBlobSha','candidateBlobSha'],12);
  if(files.length!==proposals.length||proposals.length!==evidence.length)
   return outcome('BLOCKED_CROSS_CASE_EVIDENCE');
  const plan=planNovelKotlinCandidates({
   expectedCommitSha:root.expectedCommitSha,files,proposals
  });
  if(plan.status!=='CANDIDATES_REQUIRE_TRUSTED_ORIGINAL_ORACLE'||
   plan.candidates.length!==evidence.length)
   return outcome('BLOCKED_HUNTER_FIXER_HANDOFF');
  const planned=new Map(plan.candidates.map(c=>[JSON.stringify([c.path,c.rule]),c]));
  const seen=new Set();
  for(const item of evidence){
   if(typeof item.path!=='string'||typeof item.rule!=='string'||
    typeof item.originalBlobSha!=='string'||
    typeof item.candidateBlobSha!=='string')
    return outcome('BLOCKED_CROSS_CASE_EVIDENCE');
   const key=JSON.stringify([item.path,item.rule]),source=planned.get(key);
   if(seen.has(key)||!source||item.originalBlobSha!==source.originalBlobSha||
    item.candidateBlobSha!==source.candidateBlobSha)
    return outcome('BLOCKED_CROSS_CASE_EVIDENCE');
   seen.add(key);
  }
  if(seen.size!==planned.size)return outcome('BLOCKED_CROSS_CASE_EVIDENCE');
  const judge=drillNovelKotlinCandidateBatch({
   expectedCommitSha:root.expectedCommitSha,files,proposals
  });
  if(judge.status!=='LOCAL_BATCH_JUDGE_AND_ROLLBACK_VERIFIED_NEEDS_ORIGINAL_ORACLE'||
   judge.checkedFiles!==evidence.length||
   judge.localGitRollbackVerified!==true||
   judge.originalFunctionalOracleVerified!==false||
   judge.remoteWrites!==false||judge.mergeAllowed!==false||
   judge.cases.length!==evidence.length)
   return outcome('BLOCKED_LOCAL_GIT_JUDGE');
  for(const item of judge.cases){
   const key=JSON.stringify([item.path,item.rule]),candidate=planned.get(key);
   if(!candidate||item.originalBlobSha!==candidate.originalBlobSha||
    item.candidateBlobSha!==candidate.candidateBlobSha)
    return outcome('BLOCKED_JUDGE_SOURCE_MISMATCH');
  }
  const historical=files.some(f=>HISTORICAL_BLOBS.has(f.expectedBlobSha));
  return outcome(historical?'LOCAL_HISTORICAL_CASE_VERIFIED_NOT_PHASE_ONE_CLOSED':
   'LOCAL_UNREGISTERED_CASE_REQUIRES_TRUSTED_ORIGINAL_ORACLE',
   evidence.length,historical,true);
 }catch{
  return outcome('BLOCKED_UNSAFE_CASE_EVIDENCE');
 }
}
module.exports=Object.freeze({assessPhaseOneCase});
