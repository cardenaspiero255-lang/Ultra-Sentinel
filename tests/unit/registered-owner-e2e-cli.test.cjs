'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),
 crypto=require('node:crypto');
const {main}=require('../../scripts/registered-owner-e2e-handoff.cjs');
const repoRoot=path.resolve(__dirname,'../..');
const approved=JSON.parse(fs.readFileSync(path.join(repoRoot,
 'docs/quality/owner-gamehub-battery-plan.json'),'utf8'));
const planPath=path.join(repoRoot,'docs/quality/owner-gamehub-battery-plan.json');
const planDigest=crypto.createHash('sha256').update(fs.readFileSync(planPath)).digest('hex');
const flow='cardenaspiero255-lang/Ultra-Sentinel/.github/workflows/owner-single-approval.yml@refs/heads/main';
const SHA='a'.repeat(40),runId='99998',commentId=65432;
function receiptDirectory(){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'owner-e2e-cli-'));
 const kotlinDirectory=path.join(directory,'gamehub-battery-domain-proof');
 fs.mkdirSync(kotlinDirectory,{mode:0o700});
 const owner={schema:'ultra-sentinel-single-approval-github-receipt/v1',
  status:'SINGLE_GITHUB_OWNER_APPROVAL_VERIFIED',
  workflowSha:SHA,runId,ownerId:322222186,commentId,
  registeredPlanId:approved.id,planDigest,planKind:'registered',
  githubOwnerIdentityVerified:true,nonceReplayBlocked:true,ed25519Required:false,
  remoteWrites:false,mergeAllowed:false,productionReleaseCertified:false};
 const rollback={schema:'ultra-sentinel-registered-candidate-rollback/v1',
  status:'REGISTERED_GIT_CANDIDATE_ROLLBACK_VERIFIED',
  workflowSha:SHA,runId,ownerCommentId:commentId,planDigest,
  originalCommit:approved.baseSha,candidateCommit:approved.candidateSha,
  originalBlob:approved.baseBlob,proposedBlob:approved.candidateBlob,
  originalTree:'b'.repeat(40),restoredTree:'b'.repeat(40),
  remoteWrites:false,mergeAllowed:false,productionCertified:false};
 const kotlin={schema:'ultra-sentinel-registered-battery-real-kotlin/v1',
  originalCommit:approved.baseSha,candidateCommit:approved.candidateSha,
  originalBlob:approved.baseBlob,candidateBlob:approved.candidateBlob,
  redOriginalFailedAtExactPredicate:true,greenPatchedPassed:true,
  independentJudgePassed:true,bubblewrapOffline:true,remoteWrites:false,
  productionCertified:false,redLogSha256:'1'.repeat(64),
  greenLogSha256:'2'.repeat(64),judgeLogSha256:'3'.repeat(64)};
 const sealed={schema:'ultra-sentinel-registered-owner-repair/v1',
  status:'REGISTERED_OWNER_APPROVED_SANDBOX_REPAIR_VERIFIED',
  workflowSha:SHA,runId,ownerId:322222186,commentId,
  planId:approved.id,planDigest,originalCommit:approved.baseSha,
  candidateCommit:approved.candidateSha,originalBlob:approved.baseBlob,
  candidateBlob:approved.candidateBlob,
  realKotlinRedGreenJudge:true,originalGitTreeRestored:true,
  pullRequestReviewRequired:true,car29ChecksRequired:true,
  remoteWrites:false,autoMerge:false,productionCertified:false};
 const write=(file,record)=>fs.writeFileSync(path.join(directory,file),
  JSON.stringify(record)+'\n',{flag:'wx',mode:0o600});
 write('owner-single-approval-receipt.json',owner);
 write('registered-owner-rollback.json',rollback);
 write('gamehub-battery-domain-proof/receipt.json',kotlin);
 write('registered-owner-proof.json',sealed);
 const env={GITHUB_ACTIONS:'true',GITHUB_EVENT_NAME:'issue_comment',
  GITHUB_WORKFLOW_REF:flow,GITHUB_REPOSITORY:'cardenaspiero255-lang/Ultra-Sentinel',
  GITHUB_REPOSITORY_ID:'1418338512',GITHUB_ACTOR_ID:'322222186',
  GITHUB_REF:'refs/heads/main',GITHUB_RUN_ATTEMPT:'1',
  GITHUB_SHA:SHA,GITHUB_RUN_ID:runId,RUNNER_TEMP:directory,
  ULTRA_READONLY_GITHUB_TOKEN:'mocked-read-only-gh-token-123456'};
 return {directory,env,dispose:()=>fs.rmSync(directory,{recursive:true,force:true})};
}
test('trusted-main runner reads four actual private files, emits blocked closed GameHub PR receipt',async()=>{
 const x=receiptDirectory();
 try{
  let count=0;
  const fetchImpl=async(url,request)=>{
   count++;
   assert.equal(request.method,'GET');
   assert.equal(request.headers.Authorization,'Bearer '+x.env.ULTRA_READONLY_GITHUB_TOKEN);
   assert.equal(url,'https://api.github.com/repos/cardenaspiero255-lang/gamehub-ultra/pulls/245');
   const body={number:245,state:'closed',draft:false,
    changed_files:2,head:{sha:approved.candidateSha},
    base:{sha:approved.baseSha}};
   return {status:200,url,headers:{get:()=> 'application/json'},
    text:async()=>JSON.stringify(body)};
  };
  const response=await main({env:x.env,fetchImpl});
  assert.equal(count,1);
  assert.equal(response.status,'SANDBOX_E2E_VERIFIED_PR_REVIEW_BLOCKED');
  const output=path.join(x.directory,'registered-owner-review-handoff.json');
  const stat=fs.statSync(output);
  assert.equal(stat.mode&0o077,0);
  const receipt=JSON.parse(fs.readFileSync(output,'utf8'));
  assert.equal(receipt.car29ChecksVerified,false);
  assert.equal(receipt.car29FullySatisfied,false);
  assert.equal(receipt.autoMergeAllowed,false);
  assert.equal(receipt.remoteWrites,false);
  assert.doesNotMatch(fs.readFileSync(output,'utf8'),/mocked-read-only-gh-token/);
 }finally{x.dispose();}
});
test('tampered rollback receipt blocks before network or artifact creation',async()=>{
 const x=receiptDirectory();
 try{
  const target=path.join(x.directory,'registered-owner-rollback.json');
  const tampered=JSON.parse(fs.readFileSync(target,'utf8'));
  tampered.restoredTree='f'.repeat(40);
  fs.writeFileSync(target,JSON.stringify(tampered)+'\n',{mode:0o600});
  let called=false;
  await assert.rejects(main({env:x.env,fetchImpl:async()=>{called=true;}}),
   /REGISTERED_OWNER_E2E_HANDOFF_BLOCKED/);
  assert.equal(called,false);
  assert.equal(fs.existsSync(path.join(x.directory,'registered-owner-review-handoff.json')),false);
 }finally{x.dispose();}
});
