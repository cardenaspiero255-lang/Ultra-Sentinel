'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {main,parseComment,trustedContext}=require('../../scripts/verify-remote-jarvis-owner-workflow.cjs');
const {TARGET_PLAN_DIGEST,REMOTE_WORKFLOW,REMOTE_AUDIENCE,
 formatRemoteOwnerApproval}=require('../../packages/recovery/github-remote-owner-approval.cjs');
const OWNER='cardenaspiero255-lang',US=OWNER+'/Ultra-Sentinel',TARGET=OWNER+'/JARVIS';
const WORKFLOW=fs.readFileSync(path.join(__dirname,'../../.github/workflows/owner-remote-jarvis-approval.yml'),'utf8');
const HEAD='a88a29ba4119d3f68b2268367f594a0ac1168f9e';
const BASE='747c14b5d97750a7b2736968e2d516f02448558d';
const TREE='b48da9292d1f26669eb30b483ee19e59944041e5';
const rsa=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
const jwk={...rsa.publicKey.export({format:'jwk'}),kid:'remote-issuer-fixture',alg:'RS256',use:'sig'};
const SHA='b'.repeat(40),RUN='42345678901';
function b64(o){return Buffer.from(JSON.stringify(o)).toString('base64url');}
function jwt(now){
 const t=Math.floor(now/1000);
 const claims={iss:'https://token.actions.githubusercontent.com',aud:REMOTE_AUDIENCE,
  sub:'repo:cardenaspiero255-lang@322222186/Ultra-Sentinel@1418338512:ref:refs/heads/main',
  repository:US,repository_id:'1418338512',actor:OWNER,actor_id:'322222186',
  ref:'refs/heads/main',sha:SHA,event_name:'issue_comment',run_id:RUN,
  run_attempt:'1',workflow_ref:REMOTE_WORKFLOW,runner_environment:'github-hosted',
  jti:'remote-workflow-integration-jti',iat:t-10,nbf:t-10,exp:t+120};
 const prefix=b64({alg:'RS256',typ:'JWT',kid:jwk.kid})+'.'+b64(claims);
 return prefix+'.'+crypto.sign('RSA-SHA256',Buffer.from(prefix),rsa.privateKey).toString('base64url');
}
function fixture(){
 const now=Date.now();
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'us-remote-approval-test-'));
 const expiresAt=now+120000;
 const request={workflowSha:SHA,planDigest:TARGET_PLAN_DIGEST,
  nonce:'one-remote-oidc-approval-unique-67890',expiresAt};
 const stamp=new Date(now-1000).toISOString();
 const comment={id:998822,body:formatRemoteOwnerApproval(request),
  user:{id:322222186,login:OWNER},created_at:stamp,updated_at:stamp};
 const event={action:'created',repository:{id:1418338512,full_name:US},
  sender:{id:322222186,login:OWNER},issue:{number:50,pull_request:null},comment};
 const eventPath=path.join(dir,'event.json');
 fs.writeFileSync(eventPath,JSON.stringify(event));
 const env={
  GITHUB_ACTIONS:'true',GITHUB_EVENT_NAME:'issue_comment',
  GITHUB_WORKFLOW_REF:REMOTE_WORKFLOW,GITHUB_REPOSITORY:US,
  GITHUB_REPOSITORY_ID:'1418338512',GITHUB_ACTOR:OWNER,
  GITHUB_ACTOR_ID:'322222186',GITHUB_REF:'refs/heads/main',
  GITHUB_RUN_ATTEMPT:'1',GITHUB_SHA:SHA,GITHUB_RUN_ID:RUN,
  GITHUB_EVENT_PATH:eventPath,RUNNER_TEMP:dir,
  ACTIONS_ID_TOKEN_REQUEST_URL:'https://pipelines.actions.githubusercontent.com/fakeoidc',
  ACTIONS_ID_TOKEN_REQUEST_TOKEN:'issuer-token-123456',
  ULTRA_OWNER_COMMENT_READ_TOKEN:'gha-remote-owner-read-token'
 };
 return {dir,event,env};
}
function response(value){return {ok:true,json:async()=>value};}
function transport(f,{stalePr=false}={}){
 const issued=jwt(Date.now());
 return async (url,options)=>{
  const u=new URL(url),p=u.pathname;
  if(u.hostname==='pipelines.actions.githubusercontent.com')return response({value:issued});
  if(url==='https://token.actions.githubusercontent.com/.well-known/jwks')return response({keys:[jwk]});
  if(p==='/repos/'+US+'/issues/50/comments')return response([f.event.comment]);
  if(p==='/repos/'+US+'/git/ref/heads/main')
   return response({ref:'refs/heads/main',object:{sha:SHA}});
  if(p==='/repos/'+TARGET+'/git/ref/heads/main')
   return response({ref:'refs/heads/main',object:{sha:BASE}});
  if(p==='/repos/'+TARGET+'/pulls/105')
   return response({number:105,state:'open',draft:true,merged:false,
    user:{id:322222186,login:OWNER},head:{repo:{full_name:TARGET},
      ref:'fix/ultra-sentinel-polite-voice-20261106',
      sha:stalePr?'c'.repeat(40):HEAD},
    base:{repo:{full_name:TARGET},ref:'main',sha:BASE}});
  if(p==='/repos/'+TARGET+'/git/commits/'+HEAD)
   return response({sha:HEAD,tree:{sha:TREE}});
  if(p==='/repos/'+TARGET)return response({id:1349889592,full_name:TARGET});
  throw Error('UNEXPECTED_TEST_REQUEST '+url);
 };
}
test('GitHub workflow grants read-only and OIDC only, keeps source and merge protected',()=>{
 assert.match(WORKFLOW,/issue_comment:\s*\n\s*types:\s*\[created\]/);
 assert.match(WORKFLOW,/contents: read/);assert.match(WORKFLOW,/id-token: write/);
 assert.match(WORKFLOW,/github\.event\.issue\.number == 50/);
 assert.match(WORKFLOW,/github\.event\.comment\.user\.id == 322222186/);
 assert.match(WORKFLOW,/cancel-in-progress: false/);
 assert.doesNotMatch(WORKFLOW,/contents: write|pull-requests: write/);
 assert.match(WORKFLOW,/vars\.ULTRA_SENTINEL_GITHUB_REMOTE_ENABLED == 'true'/);
 assert.match(WORKFLOW,/vars\.ULTRA_SENTINEL_REMOTE_DRAFT_APPLY/);
 assert.match(WORKFLOW,/secrets\.ULTRA_SENTINEL_JARVIS_OWNER_TOKEN/);
 assert.match(WORKFLOW,/Reauthenticate owner OIDC and run the pinned original JVM/);
 assert.doesNotMatch(WORKFLOW,/git push|createCommitOnBranch|merge_pull_request/);
});
test('read-only OIDC live verification accepts exact owner comment and authentic JARVIS ref',async()=>{
 const f=fixture();
 try{
  const proof=await main({env:f.env,fetchImpl:transport(f)});
  assert.equal(proof.status,'REMOTE_OWNER_GITHUB_APPROVAL_VERIFIED');
  assert.equal(proof.remoteWrites,false);
  assert.equal(proof.sourceAuthenticatedAtCheck,true);
  const receipt=JSON.parse(fs.readFileSync(path.join(f.dir,'owner-remote-approval-receipt.json'),'utf8'));
  assert.equal(receipt.nonceReplayBlocked,true);
  assert.equal(receipt.requiresSeparateWriteExecutor,true);
 }finally{fs.rmSync(f.dir,{recursive:true,force:true});}
});
test('changed PR head, edited comment, changed workflow context all fail closed',async()=>{
 for(const kind of ['stale','edited','context']){
  const f=fixture();
  try{
   if(kind==='edited'){
    f.event.comment.updated_at=new Date(Date.now()).toISOString();
    fs.writeFileSync(f.env.GITHUB_EVENT_PATH,JSON.stringify(f.event));
   }
   if(kind==='context')f.env.GITHUB_WORKFLOW_REF='attacker.yml';
   await assert.rejects(()=>main({env:f.env,fetchImpl:transport(f,{stalePr:kind==='stale'})}),
    /REMOTE_OWNER_WORKFLOW_BLOCKED/);
  }finally{fs.rmSync(f.dir,{recursive:true,force:true});}
 }
});
test('only exact pinned digest is approved, never remote deployment or other PR',()=>{
 assert.throws(()=>parseComment('not-an-approval',SHA),/REMOTE_OWNER_WORKFLOW_BLOCKED/);
 assert.throws(()=>trustedContext({GITHUB_ACTIONS:'true'}),/REMOTE_OWNER_WORKFLOW_BLOCKED/);
 assert.match(WORKFLOW,/remoteWrites!==false/);
});

test('unsigned GitHub-mode remote executor cannot bypass a trusted live issue_comment/OIDC run',async()=>{
 const {runSupervisedGitHubBranchCommit}=
  require('../../packages/recovery/supervised-github-branch-commit.cjs');
 const {blobSha}=require('../../packages/investigation/novel-kotlin-hypotheses.cjs');
 const before='package p\nclass Original { fun okay() = true }\n';
 const after='package p\nclass Original { fun okay() = false }\n';
 const prefix='apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/';
 const files=['OfflineVoiceQuestionGate.kt','LocalGgufPolicy.kt'].map(name=>({
  path:prefix+name,before,after,beforeBlobSha:blobSha(before),afterBlobSha:blobSha(after)
 }));
 const plan={repository:TARGET,prNumber:105,
  branch:'fix/ultra-sentinel-polite-voice-20261106',
  expectedHeadSha:HEAD,expectedMainSha:BASE,expectedTreeSha:TREE,
  operation:'COMMIT_TO_EXISTING_DRAFT_PR_BRANCH'};
 const calls=[];
 await assert.rejects(()=>runSupervisedGitHubBranchCommit({
  plan,files,token:'test-owner-token-placeholder',githubOwnerSingleApproval:true,
  nonceStorePath:path.join(os.tmpdir(),'nonexistent-github-mode-ledger'),
  verifyOriginalJVM:async()=>{throw Error('SHOULD_NOT_RUN');},
  fetchImpl:async()=>{calls.push(1);throw Error('BAD_REQUEST');},apply:true
 }),/REMOTE_OWNER_WORKFLOW_BLOCKED|REMOTE_GITHUB_APPROVAL/);
 assert.equal(calls.length,0);
});

test('GitHub runner refuses unsigned, non-owner and unconfigured real writes',()=>{
 const {environment}=require('../../scripts/run-github-owner-jarvis-remote.cjs');
 const good={GITHUB_ACTIONS:'true',GITHUB_WORKFLOW_REF:REMOTE_WORKFLOW,
  GITHUB_ACTOR_ID:'322222186',GITHUB_EVENT_NAME:'issue_comment',
  GITHUB_REPOSITORY:US,GITHUB_REF:'refs/heads/main',
  GITHUB_RUN_ATTEMPT:'1',RUNNER_TEMP:'/tmp',
  JARVIS_KOTLIN_HOME:'/trusted/kotlinc',
  ULTRA_OWNER_COMMENT_READ_TOKEN:'owner-github-issue-read-token',
  ULTRA_SENTINEL_JARVIS_OWNER_TOKEN:'owner-remote-write-token'};
 assert.equal(environment(good),false);
 for(const changes of [
  {GITHUB_ACTIONS:'false'},
  {GITHUB_ACTOR_ID:'123'},
  {GITHUB_WORKFLOW_REF:'attacker.yml'},
  {ULTRA_SENTINEL_JARVIS_OWNER_TOKEN:''},
  {ULTRA_SENTINEL_REMOTE_REPAIR_APPLY:'true'},
  {ULTRA_SENTINEL_REMOTE_REPAIR_APPLY:'unknown'},
  {JARVIS_KOTLIN_HOME:'relative/path'}
 ])assert.throws(()=>environment({...good,...changes}),/OWNER_GITHUB_REMOTE_REPAIR_BLOCKED/);
 assert.equal(environment({...good,ULTRA_SENTINEL_REMOTE_REPAIR_APPLY:'true',
  ULTRA_SENTINEL_REMOTE_DRAFT_APPLY_CONFIRMED:'true'}),true);
});
test('remote JARVIS source loader rejects tampered, redirected and noncanonical Git blobs',async()=>{
 const {fetchOriginalFile}=require('../../scripts/run-github-owner-jarvis-remote.cjs');
 const expected='bdc3a6a576b3473454df232cd21e3a9a3c4e6465';
 const response=async()=>({status:200,json:async()=>({type:'file',
  path:'apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/OfflineVoiceQuestionGate.kt',
  sha:expected,encoding:'base64',size:999,content:Buffer.from('forged Kotlin').toString('base64')})});
 await assert.rejects(()=>fetchOriginalFile('OfflineVoiceQuestionGate.kt',expected,
  'owner-read-token',response),/OWNER_GITHUB_REMOTE_REPAIR_BLOCKED/);
 await assert.rejects(()=>fetchOriginalFile('OfflineVoiceQuestionGate.kt',expected,
  'owner-read-token',async()=>({status:302})),/OWNER_GITHUB_REMOTE_REPAIR_BLOCKED/);
});
