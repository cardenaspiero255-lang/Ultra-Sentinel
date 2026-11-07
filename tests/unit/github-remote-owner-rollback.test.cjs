'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {digestRollbackPlan}=require('../../packages/recovery/supervised-github-branch-rollback.cjs');
const {
 MARKER,AUDIENCE,WORKFLOW,createPinnedRollbackPlan,formatRollbackApproval,
 verifyRollbackOwnerApproval,verifyRollbackNonce
}=require('../../packages/recovery/github-remote-owner-rollback.cjs');
const OWNER='cardenaspiero255-lang',REPO=OWNER+'/Ultra-Sentinel';
const NOW=1794000000000,SHA='a'.repeat(40),REPAIR='d'.repeat(40);
const TREE='e'.repeat(40),NONCE='unique-independent-rollback-20261106';
const keys=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
const jwk={...keys.publicKey.export({format:'jwk'}),kid:'github-roll-1',alg:'RS256',use:'sig'};
const plan=createPinnedRollbackPlan({repairHeadSha:REPAIR,repairTreeSha:TREE});
const input={workflowSha:SHA,planDigest:digestRollbackPlan(plan),repairHeadSha:REPAIR,nonce:NONCE,expiresAt:NOW+120000};
const created=new Date(NOW-10000).toISOString();
const event={action:'created',repository:{id:1418338512,full_name:REPO},
 sender:{id:322222186,login:OWNER},issue:{number:50,pull_request:null},
 comment:{id:12345,body:formatRollbackApproval(input),
  user:{id:322222186,login:OWNER},created_at:created,updated_at:created}};
const ctx={sha:SHA,runId:'42354321010',repoId:'1418338512',
 actorId:'322222186',audience:AUDIENCE,workflowRef:WORKFLOW,
 eventName:'issue_comment',runAttempt:'1'};
function jwt(mod={}){
 const t=Math.floor(NOW/1000);
 const claims={iss:'https://token.actions.githubusercontent.com',
 aud:AUDIENCE,
 sub:'repo:cardenaspiero255-lang@322222186/Ultra-Sentinel@1418338512:ref:refs/heads/main',
 repository:REPO,repository_id:'1418338512',actor:OWNER,actor_id:'322222186',
 ref:'refs/heads/main',sha:SHA,event_name:'issue_comment',
 run_id:ctx.runId,run_attempt:'1',workflow_ref:WORKFLOW,
 runner_environment:'github-hosted',jti:'rollback-oidc-unique',
 iat:t-10,nbf:t-10,exp:t+120,...mod};
 const b=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
 const msg=b({alg:'RS256',typ:'JWT',kid:jwk.kid})+'.'+b(claims);
 return msg+'.'+crypto.sign('RSA-SHA256',Buffer.from(msg),keys.privateKey).toString('base64url');
}
test('rollback plan pins initial PR and exact two Kotlin blobs but binds unknown future repair SHA',()=>{
 assert.equal(plan.repository,OWNER+'/JARVIS');
 assert.equal(plan.prNumber,105);
 assert.equal(plan.originalHeadSha,'a88a29ba4119d3f68b2268367f594a0ac1168f9e');
 assert.equal(plan.originalTreeSha,'b48da9292d1f26669eb30b483ee19e59944041e5');
 assert.equal(plan.repairHeadSha,REPAIR); assert.equal(plan.repairTreeSha,TREE);
 assert.equal(plan.files.length,2);
 for(const x of [{repairHeadSha:plan.originalHeadSha,repairTreeSha:TREE},
  {repairHeadSha:REPAIR,repairTreeSha:plan.originalTreeSha},
  {repairHeadSha:'short',repairTreeSha:TREE}])
  assert.throws(()=>createPinnedRollbackPlan(x),/REMOTE_GITHUB_ROLLBACK_DENIED/);
});
test('separate JWT audience and comment bind the full rollback digest, exact repair HEAD and independent nonce',()=>{
 const p=verifyRollbackOwnerApproval({jwt:jwt(),jwks:{keys:[jwk]},event,
  context:ctx,plan,request:input,now:NOW});
 assert.equal(p.status,'GITHUB_REMOTE_ROLLBACK_OWNER_VERIFIED');
 assert.equal(p.rollbackAuthorized,true);
 assert.equal(p.remoteWrites,false); assert.equal(p.mergeAllowed,false);
 assert.equal(p.planDigest,digestRollbackPlan(plan));
 assert.equal(p.nonce,NONCE);assert.equal(p.repairHeadSha,REPAIR);
 assert.notEqual(MARKER,'ULTRA_SENTINEL_REMOTE_APPROVAL_V1');
});
test('reject previous repair OIDC, mismatched digest, forged actor, changed comment and expired approval',()=>{
 for(const bad of [
  {request:{...input,planDigest:'f'.repeat(64)}},
  {request:{...input,repairHeadSha:'f'.repeat(40)}},
  {request:{...input,expiresAt:NOW-1}},
  {request:{...input,expiresAt:NOW+900001}},
  {jwt:jwt({aud:'urn:ultra-sentinel:one-owner-approval:jarvis-remote-105'})},
  {jwt:jwt({workflow_ref:REPO+'/.github/workflows/owner-remote-jarvis-approval.yml@refs/heads/main'})},
  {jwt:jwt({run_attempt:'2'})},
  {jwt:jwt({actor_id:'123'})},
  {jwks:{keys:[]}},
  {event:{...event,comment:{...event.comment,body:'te autorizo'}}},
  {event:{...event,sender:{id:1,login:OWNER}}},
  {event:{...event,comment:{...event.comment,updated_at:new Date(NOW).toISOString()}}},
  {context:{...ctx,runAttempt:'2'}}
 ])assert.throws(()=>verifyRollbackOwnerApproval({jwt:jwt(),jwks:{keys:[jwk]},
  event,context:ctx,plan,request:input,now:NOW,...bad}),/REMOTE_GITHUB_ROLLBACK_DENIED/);
});
test('nonce is verified against independent repair/sandbox and rollback comments and rejects replay',async()=>{
 const token='owner-read-token-long-enough';
 const row=event.comment;
 const response=rows=>({ok:true,json:async()=>rows});
 const verify=fn=>verifyRollbackNonce({event,token,fetchImpl:fn});
 assert.deepEqual((await verify(async()=>response([row]))).nonce,NONCE);
 await assert.rejects(()=>verify(async()=>response([row,
  {...row,id:12346,body:'ULTRA_SENTINEL_REMOTE_APPROVAL_V1|COMMIT_TO_EXISTING_DRAFT_PR_BRANCH|'+SHA+'|'+input.planDigest+'|'+NONCE+'|'+input.expiresAt}
 ])),/REMOTE_GITHUB_ROLLBACK_NONCE_DENIED/);
 await assert.rejects(()=>verify(async()=>response([{...row,updated_at:new Date(NOW).toISOString()}])),/REMOTE_GITHUB_ROLLBACK_NONCE_DENIED/);
 await assert.rejects(()=>verify(async()=>response(Array(100).fill({...row,body:'unrelated'}))),/REMOTE_GITHUB_ROLLBACK_NONCE_DENIED/);
});
