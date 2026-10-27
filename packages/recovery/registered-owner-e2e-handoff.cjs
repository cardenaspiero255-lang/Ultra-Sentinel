'use strict';
/*
 * Trust boundaries: owner, rollback and Kotlin receipts are generated in
 * ONE trusted-main OIDC-authenticated GitHub Actions job with private files.
 * Never accept PR-provided receipts or externally sourced plans. The second
 * live GitHub query is only a review gate, NOT permission to write or merge.
 */
const {assessLiveRegisteredRepairPr}=require('./registered-pr-live-handoff.cjs');
const SOURCE='app/src/main/java/com/cardenaspiero255/gamehubultra/domain/BatteryAwareGamingEngine.kt';
const REPO='cardenaspiero255-lang/gamehub-ultra';
const SHA=/^[a-f0-9]{40}$/,DIGEST=/^[a-f0-9]{64}$/;
function deny(){throw Error('REGISTERED_E2E_RECEIPT_DENIED');}
function truth(...items){if(items.some(v=>v!==true))deny();}
function falseOnly(...items){if(items.some(v=>v!==false))deny();}
async function verifyRegisteredOwnerRepairE2E({plan,planDigest,approval,rollback,
 kotlin,sealed,expectedWorkflowSha,expectedRunId,githubToken,
 fetchImpl=globalThis.fetch}={}){
 if(!plan||plan.id!=='gamehub-battery-valid-range'||plan.targetRepo!==REPO||
  plan.targetFile!==SOURCE||plan.maxChangedFiles!==1||
  !SHA.test(plan.baseSha||'')||!SHA.test(plan.candidateSha||'')||
  !SHA.test(plan.baseBlob||'')||!SHA.test(plan.candidateBlob||'')||
  plan.baseSha===plan.candidateSha||plan.baseBlob===plan.candidateBlob||
  plan.remoteWrites!==false||plan.mergeAllowed!==false||
  !DIGEST.test(planDigest||'')||!SHA.test(expectedWorkflowSha||'')||
  !/^[1-9]\d{0,16}$/.test(expectedRunId||''))deny();
 // This receipt is generated after the actual owner GitHub OIDC JWKS and
 // immutable comment nonce gate. Do not reinterpret chat text as approval.
 if(approval?.schema!=='ultra-sentinel-single-approval-github-receipt/v1'||
  approval.status!=='SINGLE_GITHUB_OWNER_APPROVAL_VERIFIED'||
  approval.planKind!=='registered'||approval.registeredPlanId!==plan.id||
  approval.planDigest!==planDigest||
  approval.workflowSha!==expectedWorkflowSha||
  approval.runId!==expectedRunId||
  approval.ownerId!==322222186||
  !Number.isSafeInteger(approval.commentId)||approval.commentId<=0)deny();
 truth(approval.githubOwnerIdentityVerified,approval.nonceReplayBlocked);
 falseOnly(approval.remoteWrites,approval.mergeAllowed,
  approval.productionReleaseCertified,approval.ed25519Required);

 if(rollback?.schema!=='ultra-sentinel-registered-candidate-rollback/v1'||
  rollback.status!=='REGISTERED_GIT_CANDIDATE_ROLLBACK_VERIFIED'||
  rollback.planDigest!==planDigest||rollback.workflowSha!==expectedWorkflowSha||
  rollback.runId!==expectedRunId||rollback.ownerCommentId!==approval.commentId||
  rollback.originalCommit!==plan.baseSha||
  rollback.candidateCommit!==plan.candidateSha||
  rollback.originalBlob!==plan.baseBlob||
  rollback.proposedBlob!==plan.candidateBlob||
  !SHA.test(rollback.originalTree||'')||
  rollback.restoredTree!==rollback.originalTree)deny();
 falseOnly(rollback.remoteWrites,rollback.mergeAllowed,rollback.productionCertified);

 if(kotlin?.schema!=='ultra-sentinel-registered-battery-real-kotlin/v1'||
  kotlin.originalCommit!==plan.baseSha||kotlin.candidateCommit!==plan.candidateSha||
  kotlin.originalBlob!==plan.baseBlob||kotlin.candidateBlob!==plan.candidateBlob||
  ![kotlin.redLogSha256,kotlin.greenLogSha256,kotlin.judgeLogSha256]
   .every(d=>DIGEST.test(d||'')))deny();
 truth(kotlin.redOriginalFailedAtExactPredicate,kotlin.greenPatchedPassed,
  kotlin.independentJudgePassed,kotlin.bubblewrapOffline);
 falseOnly(kotlin.remoteWrites,kotlin.productionCertified);

 if(sealed?.schema!=='ultra-sentinel-registered-owner-repair/v1'||
  sealed.status!=='REGISTERED_OWNER_APPROVED_SANDBOX_REPAIR_VERIFIED'||
  sealed.workflowSha!==expectedWorkflowSha||
  sealed.runId!==expectedRunId||sealed.ownerId!==322222186||
  sealed.commentId!==approval.commentId||
  sealed.planId!==plan.id||sealed.planDigest!==planDigest||
  sealed.originalCommit!==plan.baseSha||sealed.candidateCommit!==plan.candidateSha||
  sealed.originalBlob!==plan.baseBlob||sealed.candidateBlob!==plan.candidateBlob)deny();
 truth(sealed.realKotlinRedGreenJudge,sealed.originalGitTreeRestored,
  sealed.pullRequestReviewRequired,sealed.car29ChecksRequired);
 falseOnly(sealed.remoteWrites,sealed.autoMerge,sealed.productionCertified);
 // The map is owned by trusted source, not the issue comment, PR or caller.
 const prNumber=245;
 let decision='SANDBOX_E2E_VERIFIED_PR_REVIEW_BLOCKED';
 let car29ChecksVerified=false;
 try{
  const live=await assessLiveRegisteredRepairPr({plan,prNumber,
   token:githubToken,fetchImpl});
  if(live.status!=='PR_REVIEW_READY_NO_AUTO_MERGE'||
   live.headSha!==plan.candidateSha||live.baseSha!==plan.baseSha||
   live.car29Required!==true||live.humanReviewRequired!==true||
   live.remoteWrites!==false||live.autoMergeAllowed!==false||
   live.releaseAuthorized!==false)deny();
  car29ChecksVerified=true;
  decision='SANDBOX_E2E_VERIFIED_CAR29_CHECKS_READY_FOR_REVIEW';
 }catch{
  // Sandbox proof remains valid, but no CI claim or merge authority survives
  // a closed PR, moving SHA, missing permissions or incomplete GitHub pages.
 }
 return Object.freeze({
  schema:'ultra-sentinel-registered-owner-e2e-handoff/v1',
  status:decision,workflowSha:expectedWorkflowSha,runId:expectedRunId,
  approvalCommentId:approval.commentId,planDigest,planId:plan.id,
  targetRepo:REPO,prNumber,baseSha:plan.baseSha,candidateSha:plan.candidateSha,
  sandboxRecoveryVerified:true,car29Required:true,car29ChecksVerified,
  car29FullySatisfied:false,protectedReviewVerified:false,
  sourceOwnerOidcPreviouslyVerified:true,
  githubPrReadyForProtectedReview:car29ChecksVerified,
  productionCertified:false,remoteWrites:false,autoMergeAllowed:false,
  releaseAuthorized:false,externalHostRecoveryCertified:false
 });
}
module.exports={verifyRegisteredOwnerRepairE2E};
