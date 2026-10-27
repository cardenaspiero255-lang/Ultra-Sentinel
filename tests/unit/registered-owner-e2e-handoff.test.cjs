'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {verifyRegisteredOwnerRepairE2E}=require('../../packages/recovery/registered-owner-e2e-handoff.cjs');
const REPO='cardenaspiero255-lang/gamehub-ultra';
const API='https://api.github.com/repos/'+REPO;
const BASE='a'.repeat(40),HEAD='b'.repeat(40),BLOB='c'.repeat(40),ORIG='d'.repeat(40);
const FLOW='e'.repeat(40),DIGEST='f'.repeat(64);
const SOURCE='app/src/main/java/com/cardenaspiero255/gamehubultra/domain/BatteryAwareGamingEngine.kt';
const TESTFILE='app/src/test/java/com/cardenaspiero255/gamehubultra/domain/BatteryAwareGamingEngineTest.kt';
const plan={id:'gamehub-battery-valid-range',targetRepo:REPO,targetFile:SOURCE,
 baseSha:BASE,candidateSha:HEAD,baseBlob:ORIG,candidateBlob:BLOB,
 maxChangedFiles:1,remoteWrites:false,mergeAllowed:false};
const approval={schema:'ultra-sentinel-single-approval-github-receipt/v1',
 status:'SINGLE_GITHUB_OWNER_APPROVAL_VERIFIED',workflowSha:FLOW,runId:'56789',
 ownerId:322222186,commentId:21234,registeredPlanId:plan.id,planDigest:DIGEST,
 planKind:'registered',nonceReplayBlocked:true,githubOwnerIdentityVerified:true,
 ed25519Required:false,remoteWrites:false,mergeAllowed:false,productionReleaseCertified:false};
const rollback={schema:'ultra-sentinel-registered-candidate-rollback/v1',
 status:'REGISTERED_GIT_CANDIDATE_ROLLBACK_VERIFIED',
 workflowSha:FLOW,runId:'56789',ownerCommentId:21234,planDigest:DIGEST,
 originalCommit:BASE,candidateCommit:HEAD,originalBlob:ORIG,proposedBlob:BLOB,
 originalTree:'1'.repeat(40),restoredTree:'1'.repeat(40),remoteWrites:false,mergeAllowed:false,productionCertified:false};
const kotlin={schema:'ultra-sentinel-registered-battery-real-kotlin/v1',
 originalCommit:BASE,candidateCommit:HEAD,originalBlob:ORIG,candidateBlob:BLOB,
 redOriginalFailedAtExactPredicate:true,greenPatchedPassed:true,independentJudgePassed:true,
 bubblewrapOffline:true,remoteWrites:false,productionCertified:false,redLogSha256:'2'.repeat(64),
 greenLogSha256:'3'.repeat(64),judgeLogSha256:'4'.repeat(64)};
const sealed={schema:'ultra-sentinel-registered-owner-repair/v1',
 status:'REGISTERED_OWNER_APPROVED_SANDBOX_REPAIR_VERIFIED',workflowSha:FLOW,
 runId:'56789',ownerId:322222186,commentId:21234,planId:plan.id,planDigest:DIGEST,
 originalCommit:BASE,candidateCommit:HEAD,originalBlob:ORIG,candidateBlob:BLOB,
 realKotlinRedGreenJudge:true,originalGitTreeRestored:true,
 pullRequestReviewRequired:true,car29ChecksRequired:true,
 remoteWrites:false,autoMerge:false,productionCertified:false};
const token='read-only-owner-test-token-12345';
const checks=['build','quality','android-test-shards','device-validation','coverage','quality-contracts',
 'SonarCloud Code Analysis'].map((name,i)=>({id:i+1,name,head_sha:HEAD,status:'completed',conclusion:'success'}));
function github({open=true,checksList=checks}={}){
 const pr={number:245,state:open?'open':'closed',draft:false,mergeable:open,
  changed_files:2,updated_at:'2026-10-26T00:00:00Z',
  head:{sha:HEAD,repo:{full_name:REPO}},base:{sha:BASE,ref:'main',repo:{full_name:REPO}}};
 const files=[{filename:SOURCE,status:'modified',sha:BLOB},
  {filename:TESTFILE,status:'modified',sha:'5'.repeat(40)}];
 return async(url,req)=>{
  assert.equal(req.method,'GET');
  assert.equal(req.headers.Authorization,'Bearer '+token);
  let data;
  if(url===API+'/pulls/245')data=pr;
  else if(url===API+'/pulls/245/files?per_page=100&page=1')data=files;
  else if(url===API+'/commits/'+HEAD+'/check-runs?filter=latest&per_page=100&page=1')
   data={total_count:checksList.length,check_runs:checksList};
  else throw Error('unknown URL');
  return {status:200,url,headers:{get:()=> 'application/json'},
   text:async()=>JSON.stringify(data)};
 };
}
function input(extra={}){return {plan,planDigest:DIGEST,approval,rollback,kotlin,sealed,
 expectedWorkflowSha:FLOW,expectedRunId:'56789',githubToken:token,
 fetchImpl:github(),...extra};}
test('one authenticated owner receipt + isolated Kotlin + exact rollback + live CAR-29 checks: review only',async()=>{
 const proof=await verifyRegisteredOwnerRepairE2E(input());
 assert.equal(proof.status,'SANDBOX_E2E_VERIFIED_CAR29_CHECKS_READY_FOR_REVIEW');
 assert.equal(proof.workflowSha,FLOW);
 assert.equal(proof.candidateSha,HEAD);
 assert.equal(proof.prNumber,245);
 assert.equal(proof.car29Required,true);
 assert.equal(proof.car29ChecksVerified,true);
 assert.equal(proof.car29FullySatisfied,false);
 assert.equal(proof.protectedReviewVerified,false);
 assert.equal(proof.sandboxRecoveryVerified,true);
 assert.equal(proof.productionCertified,false);
 assert.equal(proof.autoMergeAllowed,false);
 assert.equal(proof.remoteWrites,false);
});
test('already merged PR #245 leaves valid sandbox evidence but NEVER yields review clearance',async()=>{
 const proof=await verifyRegisteredOwnerRepairE2E(input({fetchImpl:github({open:false})}));
 assert.equal(proof.status,'SANDBOX_E2E_VERIFIED_PR_REVIEW_BLOCKED');
 assert.equal(proof.car29ChecksVerified,false);
 assert.equal(proof.autoMergeAllowed,false);
 assert.equal(proof.sandboxRecoveryVerified,true);
});
test('incomplete checks, API failure, or unknown check result blocks CAR-29 review',async()=>{
 for(const fetchImpl of [
  github({checksList:checks.slice(1)}),
  github({checksList:[...checks,{id:42,name:'security',head_sha:HEAD,status:'completed',conclusion:'failure'}]}),
  async()=>{throw Error('upstream network failure')}
 ]){
  const proof=await verifyRegisteredOwnerRepairE2E(input({fetchImpl}));
  assert.equal(proof.status,'SANDBOX_E2E_VERIFIED_PR_REVIEW_BLOCKED');
  assert.equal(proof.car29Verified,false);
 }
});
test('tampered owner authorization, plan, Kotlin proof, or rollback must fail BEFORE any GitHub call',async()=>{
 const cases=[
  {approval:{...approval,nonceReplayBlocked:false}},
  {approval:{...approval,commentId:999}},
  {rollback:{...rollback,restoredTree:'6'.repeat(40)}},
  {rollback:{...rollback,proposedBlob:'7'.repeat(40)}},
  {kotlin:{...kotlin,greenPatchedPassed:false}},
  {kotlin:{...kotlin,judgeLogSha256:'missing'}},
  {sealed:{...sealed,car29ChecksRequired:false}},
  {sealed:{...sealed,autoMerge:true}},
  {plan:{...plan,remoteWrites:true}},
  {expectedWorkflowSha:'8'.repeat(40)},
  {expectedRunId:'56790'},
  {planDigest:'0'.repeat(64)}
 ];
 for(const entry of cases){
  let called=false;
  await assert.rejects(verifyRegisteredOwnerRepairE2E(input({
   ...entry,fetchImpl:async()=>{called=true;throw Error('unexpected network')}
  })),/REGISTERED_E2E_RECEIPT_DENIED/,JSON.stringify(entry));
  assert.equal(called,false);
 }
});
