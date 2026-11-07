'use strict';
/**
 * Complete mocked GitHub API integration: real RSA signature verification,
 * independent owner comment and nonce, actual original Git blobs,
 * expected-head GraphQL restoration and exact original Git tree.
 *
 * No remote GitHub writes occur in this test (all requests intercepted).
 */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const crypto=require('node:crypto');
const {createPinnedRollbackPlan,formatRollbackApproval,AUDIENCE,WORKFLOW}=
 require('../../packages/recovery/github-remote-owner-rollback.cjs');
const {digestRollbackPlan,runSupervisedGitHubBranchRollback}=
 require('../../packages/recovery/supervised-github-branch-rollback.cjs');
const OWNER='cardenaspiero255-lang',US=OWNER+'/Ultra-Sentinel';
const REPO=OWNER+'/JARVIS',US_SHA='9'.repeat(40);
const BASE='747c14b5d97750a7b2736968e2d516f02448558d';
const REPAIR='d'.repeat(40),REPAIR_TREE='e'.repeat(40),RESTORED='f'.repeat(40);
const plan=createPinnedRollbackPlan({repairHeadSha:REPAIR,repairTreeSha:REPAIR_TREE});
const pair=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
const jwk={...pair.publicKey.export({format:'jwk'}),kid:'github-jwks-test-rollback',alg:'RS256',use:'sig'};
const response=(status,obj)=>({status,ok:status>=200&&status<300,json:async()=>obj});
const b64=obj=>Buffer.from(JSON.stringify(obj)).toString('base64url');
function signedJwt(now,changes={}){
 const t=Math.floor(now/1000);
 const payload={iss:'https://token.actions.githubusercontent.com',aud:AUDIENCE,
  sub:'repo:cardenaspiero255-lang@322222186/Ultra-Sentinel@1418338512:ref:refs/heads/main',
  repository:US,repository_id:'1418338512',actor:OWNER,actor_id:'322222186',
  ref:'refs/heads/main',sha:US_SHA,event_name:'issue_comment',
  run_id:'44400000001',run_attempt:'1',workflow_ref:WORKFLOW,
  runner_environment:'github-hosted',jti:'rollback-full-cycle-fixture',
  iat:t-15,nbf:t-15,exp:t+300,...changes};
 const prefix=b64({alg:'RS256',typ:'JWT',kid:jwk.kid})+'.'+b64(payload);
 return prefix+'.'+crypto.sign('RSA-SHA256',Buffer.from(prefix),pair.privateKey).toString('base64url');
}
function fixture(opts={}){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-github-rollback-e2e-'));
 const now=Date.now();
 const fields={workflowSha:US_SHA,planDigest:digestRollbackPlan(plan),
  repairHeadSha:REPAIR,nonce:'rollback-owner-unique-nonce-5533769999',
  expiresAt:now+600000};
 const timestamp=new Date(now-1000).toISOString();
 const comment={id:114455,body:formatRollbackApproval(fields),
  user:{id:322222186,login:OWNER},
  created_at:timestamp,updated_at:timestamp};
 const event={action:'created',repository:{id:1418338512,full_name:US},
  sender:{id:322222186,login:OWNER},
  issue:{number:50,pull_request:null},comment};
 const eventPath=path.join(dir,'issue.json');
 fs.writeFileSync(eventPath,JSON.stringify(event));
 const env={
  GITHUB_ACTIONS:'true',GITHUB_EVENT_NAME:'issue_comment',
  GITHUB_WORKFLOW_REF:WORKFLOW,GITHUB_REPOSITORY:US,
  GITHUB_REPOSITORY_ID:'1418338512',GITHUB_ACTOR:OWNER,
  GITHUB_ACTOR_ID:'322222186',GITHUB_REF:'refs/heads/main',
  GITHUB_RUN_ATTEMPT:'1',GITHUB_SHA:US_SHA,GITHUB_RUN_ID:'44400000001',
  GITHUB_EVENT_PATH:eventPath,RUNNER_TEMP:dir,
  ACTIONS_ID_TOKEN_REQUEST_URL:'https://pipelines.actions.githubusercontent.com/oidc',
  ACTIONS_ID_TOKEN_REQUEST_TOKEN:'github-internal-test-token',
  ULTRA_OWNER_COMMENT_READ_TOKEN:'github-read-token-example-long-enough'
 };
 const originalPairs=plan.files.map(x=>{
  const name=path.basename(x.path);
  const contents=fs.readFileSync(path.join(__dirname,'../fixtures/jarvis-polite-original',name));
  const bytes=Buffer.from(contents);
  return {path:x.path,sha:x.beforeBlobSha,bytes};
 });
 const unchanged={path:'README.md',mode:'100644',type:'blob',sha:'1'.repeat(40)};
 const origTree={sha:plan.originalTreeSha,truncated:false,
  tree:[unchanged,...plan.files.map(f=>({path:f.path,mode:'100644',type:'blob',sha:f.beforeBlobSha}))]};
 const repairTree={sha:REPAIR_TREE,truncated:false,
  tree:[unchanged,...plan.files.map(f=>({path:f.path,mode:'100644',type:'blob',sha:f.afterBlobSha}))]};
 let branchSha=REPAIR;
 const calls=[];
 async function fetchImpl(url,options={}){
  const u=new URL(url),route=u.pathname,method=options.method||'GET';
  calls.push({route,method});
  if(u.hostname==='pipelines.actions.githubusercontent.com')
   return response(200,{value:signedJwt(Date.now(),opts.claims)});
  if(url==='https://token.actions.githubusercontent.com/.well-known/jwks')
   return response(200,{keys:[jwk]});
  if(route==='/repos/'+US+'/issues/50/comments')return response(200,
   opts.duplicateNonce?[comment,{...comment,id:114456}]:[comment]);
  if(route==='/repos/'+US+'/git/ref/heads/main')
   return response(200,{ref:'refs/heads/main',object:{type:'commit',sha:US_SHA}});
  if(route==='/repos/'+REPO)return response(200,{id:1349889592,full_name:REPO});
  if(route==='/user')return response(200,{login:OWNER,id:322222186});
  if(route==='/repos/'+REPO+'/git/ref/heads/main')
   return response(200,{ref:'refs/heads/main',object:{type:'commit',sha:BASE}});
  if(route==='/repos/'+REPO+'/pulls/105')
   return response(200,{number:105,state:'open',draft:true,merged:false,
    user:{login:OWNER,id:322222186},
    head:{repo:{full_name:REPO},ref:plan.branch,sha:branchSha},
    base:{repo:{full_name:REPO},ref:'main',sha:BASE}});
  if(route==='/repos/'+REPO+'/git/ref/heads/'+plan.branch)
   return response(200,{ref:'refs/heads/'+plan.branch,
    object:{type:'commit',sha:branchSha}});
  if(route==='/repos/'+REPO+'/git/commits/'+REPAIR)
   return response(200,{sha:REPAIR,tree:{sha:REPAIR_TREE},
    parents:[{sha:plan.originalHeadSha}]});
  if(route==='/repos/'+REPO+'/git/commits/'+plan.originalHeadSha)
   return response(200,{sha:plan.originalHeadSha,tree:{sha:plan.originalTreeSha}});
  if(route==='/repos/'+REPO+'/git/commits/'+RESTORED)
   return response(200,{sha:RESTORED,tree:{sha:plan.originalTreeSha},
    parents:[{sha:REPAIR}]});
  if(route==='/repos/'+REPO+'/git/trees/'+plan.originalTreeSha)
   return response(200,origTree);
  if(route==='/repos/'+REPO+'/git/trees/'+REPAIR_TREE)
   return response(200,opts.extraChange?{...repairTree,
    tree:[...repairTree.tree,{path:'unapproved.kt',mode:'100644',
     type:'blob',sha:'2'.repeat(40)}]}:repairTree);
  for(const file of originalPairs){
   if(route==='/repos/'+REPO+'/git/blobs/'+file.sha)
    return response(200,{sha:file.sha,encoding:'base64',
     size:file.bytes.length,content:file.bytes.toString('base64')});
  }
  if(route==='/graphql'&&method==='POST'){
   const body=JSON.parse(options.body);
   const input=body.variables?.input;
   assert.equal(input.branch.repositoryNameWithOwner,REPO);
   assert.equal(input.branch.branchName,plan.branch);
   assert.equal(input.expectedHeadOid,REPAIR);
   assert.equal(input.fileChanges.additions.length,2);
   for(const f of input.fileChanges.additions){
    const original=originalPairs.find(x=>x.path===f.path);
    assert.ok(original);
    assert.equal(f.contents,original.bytes.toString('base64'));
   }
   branchSha=RESTORED;
   if(opts.lostGraphqlReply)throw Error('SIMULATED_RESPONSE_LOST');
   return response(200,{data:{createCommitOnBranch:{commit:{oid:RESTORED}}}});
  }
  throw Error('UNEXPECTED_GITHUB_API_CALL '+method+' '+url);
 }
 return {dir,env,fetchImpl,calls,plan,getHead:()=>branchSha};
}
async function runMock(opts={}){
 const f=fixture(opts);
 const prior={};
 for(const [key,value] of Object.entries(f.env)){prior[key]=process.env[key];process.env[key]=value;}
 try{
  const outcome=await runSupervisedGitHubBranchRollback({
   plan:f.plan,githubOwnerRollbackApproval:true,
   token:'owner-JARVIS-restricted-write-test-token',
   nonceStorePath:path.join(f.dir,'persist-nonces'),fetchImpl:f.fetchImpl,
   apply:opts.apply===true});
  return {outcome,calls:f.calls,head:f.getHead()};
 }finally{
  for(const [key,value] of Object.entries(prior)){
   if(value===undefined)delete process.env[key];else process.env[key]=value;
  }
  fs.rmSync(f.dir,{recursive:true,force:true});
 }
}
test('GitHub/OIDC owner rollback preflight validates actual source blobs, independent nonce and creates NO commit',async()=>{
 const {outcome,calls,head}=await runMock();
 assert.equal(outcome.remoteWrites,false);
 assert.equal(outcome.ownerNonceConsumed,false);
 assert.equal(outcome.restoredTreeSha,plan.originalTreeSha);
 assert.equal(head,REPAIR);
 assert.equal(calls.every(c=>c.method==='GET'),true);
});
test('mocked true GitHub OIDC approval creates only atomic RESTORATION commit and verifies exact original tree',async()=>{
 const {outcome,calls,head}=await runMock({apply:true});
 assert.equal(outcome.status,'OWNER_APPROVED_REMOTE_ROLLBACK_VERIFIED');
 assert.equal(outcome.remoteWrites,true);
 assert.equal(outcome.ownerNonceConsumed,true);
 assert.equal(outcome.commitSha,RESTORED);
 assert.equal(outcome.restoredTreeSha,plan.originalTreeSha);
 assert.equal(outcome.mergeAllowed,false);
 assert.equal(head,RESTORED);
 assert.equal(calls.filter(c=>c.method!=='GET').length,1);
 assert.equal(calls.filter(c=>c.method==='POST')[0].route,'/graphql');
});
test('stale claim, duplicate nonce, altered tree and uncertain GraphQL outcome fail closed',async()=>{
 for(const opts of [
  {claims:{actor_id:'999'}},{duplicateNonce:true},{extraChange:true},
  {apply:true,lostGraphqlReply:true}
 ]){
  await assert.rejects(()=>runMock(opts),
   /ROLLBACK|DENIED|UNCERTAIN|STALE|TREE|GITHUB/);
 }
});
