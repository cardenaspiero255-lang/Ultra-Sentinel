'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {formatRemoteOwnerApproval,verifyRemoteOwnerApproval,verifyUniqueRemoteOwnerComment,
 TARGET_PLAN_DIGEST,REMOTE_AUDIENCE,REMOTE_WORKFLOW}=
 require('../../packages/recovery/github-remote-owner-approval.cjs');
const OWNER='cardenaspiero255-lang',REPO=OWNER+'/Ultra-Sentinel';
const SHA='a'.repeat(40),NOW=1794000000000,COMMENT_ID=923700;
const rsa=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
const jwk={...rsa.publicKey.export({format:'jwk'}),kid:'remote-jwks-test',alg:'RS256',use:'sig'};
const context={sha:SHA,runId:'42354321001',repoId:'1418338512',
 actorId:'322222186',audience:REMOTE_AUDIENCE,now:Math.floor(NOW/1000),
 workflowRef:REMOTE_WORKFLOW,eventName:'issue_comment',runAttempt:'1'};
const request={workflowSha:SHA,planDigest:TARGET_PLAN_DIGEST,
 nonce:'unique-remote-repair-request-20261106',expiresAt:NOW+120000};
const created=new Date(NOW-15000).toISOString();
const event={action:'created',repository:{id:1418338512,full_name:REPO},
 sender:{id:322222186,login:OWNER},issue:{number:50,pull_request:null},
 comment:{id:COMMENT_ID,body:formatRemoteOwnerApproval(request),
  user:{id:322222186,login:OWNER},created_at:created,updated_at:created}};
function jwt(overrides={},tamper=false){
 const claim={iss:'https://token.actions.githubusercontent.com',
  aud:REMOTE_AUDIENCE,
  sub:'repo:cardenaspiero255-lang@322222186/Ultra-Sentinel@1418338512:ref:refs/heads/main',
  repository:REPO,repository_id:'1418338512',actor:OWNER,actor_id:'322222186',
  ref:'refs/heads/main',sha:SHA,event_name:'issue_comment',run_id:context.runId,
  run_attempt:'1',workflow_ref:REMOTE_WORKFLOW,runner_environment:'github-hosted',
  jti:'owner-unique-oidc-remote',iat:Math.floor(NOW/1000)-15,
  nbf:Math.floor(NOW/1000)-15,exp:Math.floor(NOW/1000)+120,...overrides};
 const b=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
 const parts=b({alg:'RS256',typ:'JWT',kid:jwk.kid})+'.'+b(claim);
 const signature=crypto.sign('RSA-SHA256',Buffer.from(parts),rsa.privateKey).toString('base64url');
 return parts+'.'+(tamper?'not-a-valid-signature':signature);
}
function verify(opts={}){
 return verifyRemoteOwnerApproval({jwt:jwt(),jwks:{keys:[jwk]},context,
  event,request,now:NOW,...opts});
}
test('one owner GitHub OIDC approval is limited to exact JARVIS #105 draft repair, never a merge',()=>{
 const x=verify();
 assert.equal(x.status,'REMOTE_OWNER_GITHUB_APPROVAL_VERIFIED');
 assert.equal(x.prNumber,105);assert.equal(x.targetRepo,OWNER+'/JARVIS');
 assert.equal(x.planDigest,TARGET_PLAN_DIGEST);
 assert.equal(x.commentId,COMMENT_ID);assert.equal(x.nonce,request.nonce);
 assert.equal(x.ownerId,322222186);assert.equal(x.ed25519Required,false);
 assert.equal(x.remoteCommitEligibilityVerified,true);
 assert.equal(x.remoteWrites,false);assert.equal(x.mergeAllowed,false);
 assert.equal(x.rollbackAuthorized,false);
});
test('reject changed plan, comment, identities, PR and expiration',()=>{
 for(const r of [
  {...request,planDigest:'b'.repeat(64)},
  {...request,workflowSha:'c'.repeat(40)},
  {...request,expiresAt:NOW+900001},
  {...request,expiresAt:NOW-1},
  {...request,operation:'MERGE_MAIN'}
 ])assert.throws(()=>verify({request:r}),/REMOTE_GITHUB_APPROVAL_DENIED/);
 for(const e of [
  {...event,action:'edited'},
  {...event,sender:{id:1,login:OWNER}},
  {...event,repository:{id:1,full_name:REPO}},
  {...event,issue:{number:105,pull_request:{url:'pull'}}},
  {...event,comment:{...event.comment,body:'te autorizo'}},
  {...event,comment:{...event.comment,user:{id:1,login:OWNER}}},
  {...event,comment:{...event.comment,updated_at:new Date(NOW).toISOString()}},
  {...event,comment:{...event.comment,created_at:new Date(NOW-400000).toISOString(),
   updated_at:new Date(NOW-400000).toISOString()}}
 ])assert.throws(()=>verify({event:e}),/REMOTE_GITHUB_APPROVAL_DENIED/);
});
test('reject fake issuer keys, JWT signature, wrong audience/workflow and run reruns',()=>{
 for(const opts of [
  {jwt:jwt({},true)},{jwt:jwt({workflow_ref:'other.yml'})},
  {jwt:jwt({aud:'urn:ultra-sentinel:one-owner-approval:sandbox'})},
  {jwt:jwt({actor_id:'42'})},{jwt:jwt({run_attempt:'2'})},
  {jwt:jwt({repository_id:'42'})},{jwt:jwt({ref:'refs/heads/evil'})},
  {jwks:{keys:[]}},
  {context:{...context,sha:'c'.repeat(40)}},
  {context:{...context,runAttempt:'2'}}
 ])assert.throws(()=>verify(opts),/REMOTE_GITHUB_APPROVAL_DENIED/);
});
test('format requires precise pin, unique nonce and fixed operation',()=>{
 for(const changes of [{planDigest:'b'.repeat(64)},{workflowSha:'short'},
  {nonce:'weak'},{expiresAt:0},{prNumber:99},{operation:'PRODUCTION_PUSH'}])
 assert.throws(()=>formatRemoteOwnerApproval({...request,...changes}),
  /REMOTE_GITHUB_APPROVAL_DENIED/);
});
test('GitHub live uniqueness fails closed on reused nonce, edited comment or absent pagination',async()=>{
 const row={...event.comment};
 const response=(rows,ok=true)=>({ok,json:async()=>rows});
 const base={event,token:'github-valid-owner-read-token',now:NOW};
 const good=async()=>response([row]);
 const verified=await verifyUniqueRemoteOwnerComment({...base,fetchImpl:good});
 assert.equal(verified.commentId,COMMENT_ID);
 assert.equal(verified.unique,true);
 await assert.rejects(()=>verifyUniqueRemoteOwnerComment({...base,
  fetchImpl:async()=>response([row,{...row,id:COMMENT_ID+1}])}),
  /REMOTE_OWNER_NONCE_REPLAY_DENIED/);
 await assert.rejects(()=>verifyUniqueRemoteOwnerComment({...base,
  fetchImpl:async()=>response([{...row,updated_at:new Date(NOW).toISOString()}])}),
  /REMOTE_OWNER_NONCE_REPLAY_DENIED/);
 await assert.rejects(()=>verifyUniqueRemoteOwnerComment({...base,
  fetchImpl:async()=>response(Array(100).fill({...row,body:'unrelated'}))}),
  /REMOTE_OWNER_NONCE_REPLAY_DENIED/);
});
