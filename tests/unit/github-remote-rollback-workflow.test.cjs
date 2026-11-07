'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {createPinnedRollbackPlan}=require('../../packages/recovery/github-remote-owner-rollback.cjs');
const {loadVerifiedRemotePlan,parseRollbackComment}=require('../../scripts/verify-remote-jarvis-rollback-workflow.cjs');
const {environment}=require('../../scripts/run-github-owner-jarvis-rollback.cjs');
const {runSupervisedGitHubBranchRollback}=require('../../packages/recovery/supervised-github-branch-rollback.cjs');
const {digestRollbackPlan}=require('../../packages/recovery/supervised-github-branch-rollback.cjs');
const ROOT=path.resolve(__dirname,'../..');
const workflow=fs.readFileSync(path.join(ROOT,'.github/workflows/owner-remote-jarvis-rollback.yml'),'utf8');
const repairWorkflow=fs.readFileSync(path.join(ROOT,'.github/workflows/owner-remote-jarvis-approval.yml'),'utf8');
const REPAIR='d'.repeat(40),REPAIR_TREE='e'.repeat(40),US_SHA='a'.repeat(40);
const OP='ROLLBACK_EXISTING_DRAFT_PR_BRANCH';
const TARGET='cardenaspiero255-lang/JARVIS';
const PLAN=createPinnedRollbackPlan({repairHeadSha:REPAIR,repairTreeSha:REPAIR_TREE});
const response=(body)=>({status:200,ok:true,json:async()=>body});
function fakeRemote({stale=false,extra=false,wrongParent=false}={}){
 const requests=[],root='/repos/'+TARGET;
 const orig=PLAN.files.map(f=>({path:f.path,type:'blob',mode:'100644',sha:f.beforeBlobSha}));
 const fixed=PLAN.files.map(f=>({path:f.path,type:'blob',mode:'100644',sha:f.afterBlobSha}));
 const unchanged={path:'README.md',type:'blob',mode:'100644',sha:'1'.repeat(40)};
 async function fetchImpl(url,opts={}){
  const u=new URL(url),route=u.pathname,method=opts.method||'GET';
  requests.push({route,method});
  if(method!=='GET')throw Error('NO_WRITE_PERMITTED');
  if(route==='/repos/cardenaspiero255-lang/Ultra-Sentinel/git/ref/heads/main')
   return response({ref:'refs/heads/main',object:{type:'commit',sha:US_SHA}});
  if(route===root)return response({id:1349889592,full_name:TARGET});
  if(route===root+'/git/ref/heads/main')
   return response({ref:'refs/heads/main',object:{type:'commit',
    sha:'747c14b5d97750a7b2736968e2d516f02448558d'}});
  if(route===root+'/pulls/105')
   return response({number:105,state:'open',draft:true,merged:false,
    user:{id:322222186,login:'cardenaspiero255-lang'},
    head:{repo:{full_name:TARGET},ref:'fix/ultra-sentinel-polite-voice-20261106',
     sha:stale?'a'.repeat(40):REPAIR},
    base:{repo:{full_name:TARGET},ref:'main',
     sha:'747c14b5d97750a7b2736968e2d516f02448558d'}});
  if(route===root+'/git/commits/'+REPAIR)
   return response({sha:REPAIR,tree:{sha:REPAIR_TREE},
    parents:[{sha:wrongParent?'f'.repeat(40):PLAN.originalHeadSha}]});
  if(route===root+'/git/commits/'+PLAN.originalHeadSha)
   return response({sha:PLAN.originalHeadSha,tree:{sha:PLAN.originalTreeSha}});
  if(route===root+'/git/trees/'+PLAN.originalTreeSha)
   return response({sha:PLAN.originalTreeSha,truncated:false,tree:[unchanged,...orig]});
  if(route===root+'/git/trees/'+REPAIR_TREE)
   return response({sha:REPAIR_TREE,truncated:false,
    tree:[unchanged,...fixed,...(extra?[{path:'evil.kt',type:'blob',
      mode:'100644',sha:'2'.repeat(40)}]:[])]});
  throw Error('Unexpected '+route);
 }
 return {fetchImpl,requests};
}
test('remote rollback workflow is separate owner-authorized issue comment and no-write by default',()=>{
 assert.match(workflow,/issue_comment:\s*\n\s*types:\s*\[created\]/);
 assert.match(workflow,/contents: read/);assert.match(workflow,/id-token: write/);
 assert.match(workflow,/github\.event\.comment\.user\.id == 322222186/);
 assert.match(workflow,/vars\.ULTRA_SENTINEL_GITHUB_REMOTE_ROLLBACK_ENABLED == 'true'/);
 assert.match(workflow,/vars\.ULTRA_SENTINEL_REMOTE_ROLLBACK_APPLY/);
 assert.match(workflow,/secrets\.ULTRA_SENTINEL_JARVIS_OWNER_TOKEN/);
 assert.doesNotMatch(workflow,/contents: write|pull-requests: write|git push|force: true/);
 assert.match(workflow,/group: ultra-owner-remote-jarvis-transaction/);
 assert.match(repairWorkflow,/group: ultra-owner-remote-jarvis-transaction/);
});
test('rollback plan is built from actual Git tree delta and repaired commit parent, not a supplied receipt',async()=>{
 const mock=fakeRemote();
 const x=await loadVerifiedRemotePlan({workflowSha:US_SHA,expectedRepairSha:REPAIR,
  readToken:'read-token-at-least-sixteen',fetchImpl:mock.fetchImpl});
 assert.equal(x.authenticatedLiveSource,true);
 assert.equal(x.planDigest,digestRollbackPlan(PLAN));
 assert.deepEqual(x.plan,PLAN);
 assert.equal(mock.requests.some(x=>x.method!=='GET'),false);
 for(const changes of [{stale:true},{extra:true},{wrongParent:true}]){
  await assert.rejects(()=>loadVerifiedRemotePlan({workflowSha:US_SHA,
   expectedRepairSha:REPAIR,readToken:'read-token-at-least-sixteen',
   fetchImpl:fakeRemote(changes).fetchImpl}),/OWNER_REMOTE_ROLLBACK_WORKFLOW_BLOCKED|UNEXPECTED_REMOTE_REPAIR_TREE_DELTA/);
 }
});
test('rollback command rejects original repair intent, short nonce and different original SHA',()=>{
 for(const data of ['ULTRA_SENTINEL_REMOTE_APPROVAL_V1|'+OP,
  'ULTRA_SENTINEL_REMOTE_ROLLBACK_V1|'+OP+'|'+US_SHA+'|'+digestRollbackPlan(PLAN)+'|'+
  PLAN.originalHeadSha+'|unique-rollback-nonce-12345|1794000120000'])
  assert.throws(()=>parseRollbackComment(data,US_SHA),/OWNER_REMOTE_ROLLBACK_WORKFLOW_BLOCKED/);
});
test('owner rollback runner refuses writes by default, invalid owner and unattended opt-in',()=>{
 const good={GITHUB_ACTIONS:'true',GITHUB_WORKFLOW_REF:
  'cardenaspiero255-lang/Ultra-Sentinel/.github/workflows/owner-remote-jarvis-rollback.yml@refs/heads/main',
  GITHUB_EVENT_NAME:'issue_comment',GITHUB_ACTOR_ID:'322222186',
  GITHUB_REPOSITORY:'cardenaspiero255-lang/Ultra-Sentinel',
  GITHUB_REF:'refs/heads/main',GITHUB_RUN_ATTEMPT:'1',RUNNER_TEMP:'/tmp',
  ULTRA_OWNER_COMMENT_READ_TOKEN:'owner-read-token-with-length',
  ULTRA_SENTINEL_JARVIS_OWNER_TOKEN:'owner-jarvis-write-token'};
 assert.equal(environment(good),false);
 for(const change of [
  {GITHUB_ACTOR_ID:'1'},{GITHUB_WORKFLOW_REF:'fake'},
  {ULTRA_SENTINEL_JARVIS_OWNER_TOKEN:''},
  {ULTRA_SENTINEL_REMOTE_ROLLBACK_APPLY:'true'},
  {ULTRA_SENTINEL_REMOTE_ROLLBACK_APPLY:'invalid'}
 ])assert.throws(()=>environment({...good,...change}),/OWNER_GITHUB_REMOTE_ROLLBACK_BLOCKED/);
 assert.equal(environment({...good,ULTRA_SENTINEL_REMOTE_ROLLBACK_APPLY:'true',
  ULTRA_SENTINEL_REMOTE_ROLLBACK_APPLY_CONFIRMED:'true'}),true);
});
test('a forged GitHub approval flag cannot call rollback executor, even in apply mode',async()=>{
 const mock=fakeRemote();
 await assert.rejects(()=>runSupervisedGitHubBranchRollback({plan:PLAN,
  token:'owner-fine-grained-token-123456',nonceStorePath:'/tmp/sentinel-unspent-test',
  githubOwnerRollbackApproval:true,fetchImpl:mock.fetchImpl,apply:true}),
 /OWNER_REMOTE_ROLLBACK_WORKFLOW_BLOCKED/);
 assert.equal(mock.requests.length,0);
});

test('reverse replay: legacy repair and sandbox approval reject a reused rollback nonce',async()=>{
 const {verifyUniqueRemoteOwnerComment}=
  require('../../packages/recovery/github-remote-owner-approval.cjs');
 const {verifyUniqueOwnerComment}=
  require('../../packages/recovery/owner-comment-replay-gate.cjs');
 const nonce='same-owner-nonce-across-operation-12345',date=new Date().toISOString();
 const make=(id,body)=>({id,body,user:{id:322222186,login:'cardenaspiero255-lang'},
  created_at:date,updated_at:date});
 const repair=make(11,'ULTRA_SENTINEL_REMOTE_APPROVAL_V1|COMMIT_TO_EXISTING_DRAFT_PR_BRANCH|'+
  'a'.repeat(40)+'|'+'b'.repeat(64)+'|'+nonce+'|1794000120000');
 const sandbox=make(12,'ULTRA_SENTINEL_OWNER_APPROVAL_V1|SANDBOX_HUNTER_FIXER_JUDGE|'+
  'a'.repeat(40)+'|'+'b'.repeat(64)+'|'+nonce+'|1794000120000');
 const rollback=make(13,'ULTRA_SENTINEL_REMOTE_ROLLBACK_V1|ROLLBACK_EXISTING_DRAFT_PR_BRANCH|'+
  'a'.repeat(40)+'|'+'b'.repeat(64)+'|'+'d'.repeat(40)+'|'+nonce+'|1794000120000');
 const event=comment=>({action:'created',repository:{id:1418338512},
  issue:{number:50,pull_request:null},sender:{id:322222186},comment});
 const fetchImpl=async()=>({ok:true,json:async()=>[repair,sandbox,rollback]});
 const args={token:'github-readable-owner-token',fetchImpl};
 await assert.rejects(()=>verifyUniqueRemoteOwnerComment({
  ...args,event:event(repair)}),/REMOTE_OWNER_NONCE_REPLAY_DENIED/);
 await assert.rejects(()=>verifyUniqueOwnerComment({
  ...args,event:event(sandbox)}),/OWNER_NONCE_REPLAY_OR_UNVERIFIED/);
});
