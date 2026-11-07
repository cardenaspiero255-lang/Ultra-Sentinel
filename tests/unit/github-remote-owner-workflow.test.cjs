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
 // Read-only GitHub OIDC verification must never require a write-scoped PAT.
 assert.equal(environment({...good,ULTRA_SENTINEL_JARVIS_OWNER_TOKEN:''}),false);
 assert.equal(environment({...good,ULTRA_SENTINEL_JARVIS_OWNER_TOKEN:undefined}),false);
 for(const changes of [
  {GITHUB_ACTIONS:'false'},
  {GITHUB_ACTOR_ID:'123'},
  {GITHUB_WORKFLOW_REF:'attacker.yml'},
  {ULTRA_SENTINEL_REMOTE_REPAIR_APPLY:'true',ULTRA_SENTINEL_JARVIS_OWNER_TOKEN:''},
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

test('byte-pinned original JARVIS Kotlin yields the exact expected proposed remote repair digest',()=>{
 const {PLAN,validateTrialFiles}=require('../../packages/recovery/owner-jarvis-polite-operator.cjs');
 const {makePoliteCandidate}=require('../../packages/investigation/jarvis-polite-candidate.cjs');
 const {digestBranchCandidate}=require('../../packages/recovery/supervised-github-branch-commit.cjs');
 const {blobSha}=require('../../packages/investigation/novel-kotlin-hypotheses.cjs');
 const base=path.resolve(__dirname,'../fixtures/jarvis-polite-original');
 const gate=fs.readFileSync(path.join(base,'OfflineVoiceQuestionGate.kt'),'utf8');
 const policy=fs.readFileSync(path.join(base,'LocalGgufPolicy.kt'),'utf8');
 const generated=makePoliteCandidate({gate,policy});
 const prefix='apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/';
 const files=validateTrialFiles([
  {path:prefix+'OfflineVoiceQuestionGate.kt',before:gate,after:generated.gate,
   beforeBlobSha:blobSha(gate),afterBlobSha:blobSha(generated.gate)},
  {path:prefix+'LocalGgufPolicy.kt',before:policy,after:generated.policy,
   beforeBlobSha:blobSha(policy),afterBlobSha:blobSha(generated.policy)}
 ]);
 assert.equal(digestBranchCandidate(PLAN,files),TARGET_PLAN_DIGEST);
});
test('trusted JARVIS source loader reconstructs real Kotlin candidate from pinned Git blobs',async()=>{
 const {buildPinnedCandidate}=require('../../scripts/run-github-owner-jarvis-remote.cjs');
 const {digestBranchCandidate}=require('../../packages/recovery/supervised-github-branch-commit.cjs');
 const base=path.resolve(__dirname,'../fixtures/jarvis-polite-original');
 const {blobSha}=require('../../packages/investigation/novel-kotlin-hypotheses.cjs');
 let reads=0;
 const fake=async url=>{
  reads++;
  const name=url.includes('OfflineVoiceQuestionGate.kt')?'OfflineVoiceQuestionGate.kt':
   url.includes('LocalGgufPolicy.kt')?'LocalGgufPolicy.kt':null;
  assert.ok(name,'unexpected path');
  assert.match(url,/ref=747c14b5d97750a7b2736968e2d516f02448558d/);
  const content=fs.readFileSync(path.join(base,name),'utf8');
  const bytes=Buffer.from(content,'utf8');
  return {status:200,json:async()=>({type:'file',
   path:'apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/'+name,
   sha:blobSha(content),encoding:'base64',
   size:bytes.length,content:bytes.toString('base64')})};
 };
 const candidate=await buildPinnedCandidate('trusted-read-only-token',fake);
 assert.equal(reads,2);
 assert.equal(candidate.plan.prNumber,105);
 assert.equal(candidate.files.length,2);
 assert.equal(digestBranchCandidate(candidate.plan,candidate.files),TARGET_PLAN_DIGEST);
});
test('GitHub OIDC authorization reaches original signed executor in NO-WRITE preview without Ed25519',async()=>{
 const {runSupervisedGitHubBranchCommit,digestBranchCandidate}=
  require('../../packages/recovery/supervised-github-branch-commit.cjs');
 const {PLAN,validateTrialFiles}=require('../../packages/recovery/owner-jarvis-polite-operator.cjs');
 const {makePoliteCandidate}=require('../../packages/investigation/jarvis-polite-candidate.cjs');
 const {blobSha}=require('../../packages/investigation/novel-kotlin-hypotheses.cjs');
 const base=path.resolve(__dirname,'../fixtures/jarvis-polite-original');
 const gate=fs.readFileSync(path.join(base,'OfflineVoiceQuestionGate.kt'),'utf8');
 const policy=fs.readFileSync(path.join(base,'LocalGgufPolicy.kt'),'utf8');
 const generated=makePoliteCandidate({gate,policy});
 const prefix='apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/';
 const files=validateTrialFiles([
  {path:prefix+'OfflineVoiceQuestionGate.kt',before:gate,after:generated.gate,
   beforeBlobSha:blobSha(gate),afterBlobSha:blobSha(generated.gate)},
  {path:prefix+'LocalGgufPolicy.kt',before:policy,after:generated.policy,
   beforeBlobSha:blobSha(policy),afterBlobSha:blobSha(generated.policy)}
 ]);
 const f=fixture(),old={};
 for(const [k,v] of Object.entries(f.env)){old[k]=process.env[k];process.env[k]=v;}
 const originalTransport=transport(f);
 const calls=[];
 const mockedFetch=async (url,options={})=>{
  const u=new URL(url),p=u.pathname;calls.push({p,method:options.method||'GET'});
  if(p==='/user')return {ok:true,status:200,json:async()=>({login:OWNER,id:322222186})};
  if(p==='/repos/'+TARGET+'/git/ref/heads/main')
   return {ok:true,status:200,json:async()=>({ref:'refs/heads/main',
    object:{type:'commit',sha:BASE}})};
  if(p==='/repos/'+TARGET+'/git/ref/heads/fix/ultra-sentinel-polite-voice-20261106')
   return {ok:true,status:200,json:async()=>({ref:'refs/heads/fix/ultra-sentinel-polite-voice-20261106',
    object:{type:'commit',sha:HEAD}})};
  if(p==='/repos/'+TARGET+'/git/trees/'+TREE)
   return {ok:true,status:200,json:async()=>({sha:TREE,truncated:false,
    tree:files.map(x=>({path:x.path,type:'blob',mode:'100644',sha:x.beforeBlobSha}))})};
  const result=await originalTransport(url,options);
  return {...result,status:200};
 };
 try{
  const proof=await runSupervisedGitHubBranchCommit({
   plan:PLAN,files,ownerSignature:undefined,ownerGrant:undefined,
   trustedOwnerPublicKey:undefined,
   token:'owner-finegrained-pat-placeholder',githubOwnerSingleApproval:true,
   nonceStorePath:path.join(f.dir,'nonce.ledger'),fetchImpl:mockedFetch,
   verifyOriginalJVM:async({plan,files,planDigest})=>({
    status:'TRUSTED_ORIGINAL_KOTLIN_JVM_RED_GREEN',
    baselineHeadSha:plan.expectedHeadSha,planDigest,
    sourceBlobs:files.map(x=>x.beforeBlobSha),
    candidateBlobs:files.map(x=>x.afterBlobSha),
    genuineOriginalRed:true,originalJVMGreen:true,
    benignControlsPassed:true,isolatedExecution:true,
    remoteWrites:false,mergeAllowed:false
   }),apply:false
  });
  assert.equal(proof.status,'OWNER_AUTHENTICATED_DRAFT_PR_READY');
  assert.equal(proof.planDigest,TARGET_PLAN_DIGEST);
  assert.equal(proof.remoteWrites,false);
  assert.equal(calls.every(x=>x.method==='GET'),true);
  // The issuer-signed OIDC JWT is the owner identity for read-only previews.
  // /user must remain mandatory when apply=true (tested by the write path).
  assert.equal(calls.some(x=>x.p==='/user'),false);
 }finally{
  for(const [k,v] of Object.entries(old)){
   if(v===undefined)delete process.env[k];else process.env[k]=v;
  }
  fs.rmSync(f.dir,{recursive:true,force:true});
 }
});
