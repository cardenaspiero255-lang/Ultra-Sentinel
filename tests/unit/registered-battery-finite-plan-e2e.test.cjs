'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {loadRegisteredPlan}=require('../../packages/recovery/registered-owner-plans.cjs');
const {verifyRegisteredOwnerRepairE2E}=require('../../packages/recovery/registered-owner-e2e-handoff.cjs');
const root=path.resolve(__dirname,'../..');
const bytes=fs.readFileSync(path.join(root,'docs/quality/owner-gamehub-battery-finite-plan.json'));
const digest=crypto.createHash('sha256').update(bytes).digest('hex');
const plan=loadRegisteredPlan(root,digest).plan;
const ownerRunSha='a'.repeat(40),runId='999999',commentId=55991;
function receipts(){
 const approval={schema:'ultra-sentinel-single-approval-github-receipt/v1',
  status:'SINGLE_GITHUB_OWNER_APPROVAL_VERIFIED',planKind:'registered',
  registeredPlanId:plan.id,planDigest:digest,workflowSha:ownerRunSha,runId,
  ownerId:322222186,commentId,githubOwnerIdentityVerified:true,nonceReplayBlocked:true,
  remoteWrites:false,mergeAllowed:false,productionReleaseCertified:false,ed25519Required:false};
 const rollback={schema:'ultra-sentinel-registered-candidate-rollback/v1',
  status:'REGISTERED_GIT_CANDIDATE_ROLLBACK_VERIFIED',
  planDigest:digest,workflowSha:ownerRunSha,runId,ownerCommentId:commentId,
  originalCommit:plan.baseSha,candidateCommit:plan.candidateSha,
  originalBlob:plan.baseBlob,proposedBlob:plan.candidateBlob,
  originalTree:'b'.repeat(40),restoredTree:'b'.repeat(40),
  remoteWrites:false,mergeAllowed:false,productionCertified:false};
 const kotlin={schema:'ultra-sentinel-registered-battery-finite-kotlin/v2',
  originalCommit:plan.baseSha,candidateCommit:plan.candidateSha,
  originalBlob:plan.baseBlob,candidateBlob:plan.candidateBlob,
  redOriginalFailedAtExactPredicate:true,greenPatchedPassed:true,
  independentJudgePassed:true,bubblewrapOffline:true,
  redLogSha256:'c'.repeat(64),greenLogSha256:'d'.repeat(64),
  judgeLogSha256:'e'.repeat(64),remoteWrites:false,productionCertified:false};
 const sealed={schema:'ultra-sentinel-registered-owner-repair/v1',
  status:'REGISTERED_OWNER_APPROVED_SANDBOX_REPAIR_VERIFIED',
  workflowSha:ownerRunSha,runId,ownerId:322222186,commentId,
  planId:plan.id,planDigest:digest,originalCommit:plan.baseSha,
  candidateCommit:plan.candidateSha,originalBlob:plan.baseBlob,candidateBlob:plan.candidateBlob,
  realKotlinRedGreenJudge:true,originalGitTreeRestored:true,
  pullRequestReviewRequired:true,car29ChecksRequired:true,
  remoteWrites:false,autoMerge:false,productionCertified:false};
 return {plan,planDigest:digest,approval,rollback,kotlin,sealed,
  expectedWorkflowSha:ownerRunSha,expectedRunId:runId,githubToken:'fake-read-token-1234567890'};
}
test('new registered immutable GameHub 252 finite-policy plan belongs to exact source and candidate',()=>{
 assert.equal(plan.id,'gamehub-battery-finite-drain-e2e');
 assert.equal(plan.oracle,'gamehub-kotlin-domain-battery-finite-v2');
 assert.equal(plan.baseSha,'458be1a1c7ec29d6c29f6d0944971f55a0ce8ac7');
 assert.equal(plan.candidateSha,'b74791d9ea7e1e4b88f0ef1e286d87f036c6e7be');
 assert.equal(plan.baseBlob,'976e3aa53ec94d14317e8caa1e6bf71088553650');
 assert.equal(plan.candidateBlob,'28f163b0551479b925d702941c99235eded3a0d3');
 assert.equal(plan.remoteWrites,false);
 assert.equal(plan.mergeAllowed,false);
 assert.equal(plan.productionReleaseAllowed,false);
});
test('GitHub 252 closed/draft PR blocks review without discarding authentic sandbox proof',async()=>{
 let urlSeen='';
 const x=receipts();
 const result=await verifyRegisteredOwnerRepairE2E({...x,fetchImpl:async(url,request)=>{
  urlSeen=url;
  assert.equal(request.method,'GET');
  return {status:200,url,headers:{get:()=> 'application/json'},text:async()=>JSON.stringify({
   number:252,state:'open',draft:true,changed_files:2,
   head:{sha:plan.candidateSha},base:{sha:plan.baseSha}
  })};
 }});
 assert.match(urlSeen,/\/pulls\/252$/);
 assert.equal(result.status,'SANDBOX_E2E_VERIFIED_PR_REVIEW_BLOCKED');
 assert.equal(result.prNumber,252);
 assert.equal(result.car29ChecksVerified,false);
 assert.equal(result.car29FullySatisfied,false);
 assert.equal(result.autoMergeAllowed,false);
 assert.equal(result.remoteWrites,false);
});
test('finite Kotlin proof cannot be replaced by old battery schema or reused PR 245 SHA',async()=>{
 for(const mutate of [
  {kotlin:{...receipts().kotlin,schema:'ultra-sentinel-registered-battery-real-kotlin/v1'}},
  {plan:{...plan,candidateSha:'f'.repeat(40)}},
  {rollback:{...receipts().rollback,originalTree:'0'.repeat(40)}}
 ]){
  let queried=false;
  await assert.rejects(verifyRegisteredOwnerRepairE2E({...receipts(),...mutate,
   fetchImpl:async()=>{queried=true;throw Error('should not fetch')}}),
   /REGISTERED_E2E_RECEIPT_DENIED/);
  assert.equal(queried,false);
 }
});
