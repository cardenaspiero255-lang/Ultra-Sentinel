'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {verifyGitHubSingleApproval,formatGitHubSingleApproval}=require('../../packages/recovery/github-single-approval.cjs');
const OWNER='cardenaspiero255-lang',REPO=OWNER+'/Ultra-Sentinel',SHA='a'.repeat(40);
const DIGEST='b'.repeat(64),NOW=1792975000000,COMMENT_ID=55555;
const RSA=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
const JWK={...RSA.publicKey.export({format:'jwk'}),kid:'issuer-fixture-1',alg:'RS256',use:'sig'};
const CONTEXT={sha:SHA,runId:'98436789',actorId:'322222186',repoId:'1418338512',
 audience:'urn:ultra-sentinel:one-owner-approval:sandbox',eventName:'issue_comment',
 approvedOwnerIssueComment:true,purpose:'ONE_APPROVAL',now:Math.floor(NOW/1000)};
function jwt(claims={}){
 const c={iss:'https://token.actions.githubusercontent.com',
  aud:CONTEXT.audience,
  sub:'repo:cardenaspiero255-lang@322222186/Ultra-Sentinel@1418338512:ref:refs/heads/main',
  repository:REPO,repository_id:'1418338512',actor:OWNER,actor_id:'322222186',
  ref:'refs/heads/main',sha:SHA,event_name:'issue_comment',run_id:CONTEXT.runId,
  run_attempt:'1',workflow_ref:REPO+'/.github/workflows/owner-single-approval.yml@refs/heads/main',
  runner_environment:'github-hosted',jti:'issuer-unique-xy',iat:Math.floor(NOW/1000)-15,
  nbf:Math.floor(NOW/1000)-15,exp:Math.floor(NOW/1000)+120,...claims};
 const b=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
 const data=b({alg:'RS256',typ:'JWT',kid:JWK.kid})+'.'+b(c);
 return data+'.'+crypto.sign('RSA-SHA256',Buffer.from(data),RSA.privateKey).toString('base64url');
}
const approved={
 operation:'SANDBOX_HUNTER_FIXER_JUDGE',
 workflowSha:SHA,planDigest:DIGEST,nonce:'owner-oneclick-unique1234567890',
 expiresAt:NOW+120000
};
function event(overrides={}){
 const created=new Date(NOW-15000).toISOString();
 return {action:'created',
  repository:{id:1418338512,full_name:REPO},
  sender:{id:322222186,login:OWNER},
  issue:{number:50,pull_request:null},
  comment:{id:COMMENT_ID,body:formatGitHubSingleApproval(approved),
   user:{id:322222186,login:OWNER},created_at:created,updated_at:created},
  ...overrides};
}
function verify(extra={}){
 return verifyGitHubSingleApproval({oidcJwt:jwt(),jwks:{keys:[JWK]},oidcContext:CONTEXT,
  event:event(),approvedPlan:{...approved},now:NOW,...extra});
}
test('one owner-authored GitHub comment + issuer JWT approves exactly one SANDBOX plan',()=>{
 const x=verify();
 assert.equal(x.status,'SINGLE_GITHUB_OWNER_APPROVAL_VERIFIED');
 assert.equal(x.workflowSha,SHA);
 assert.equal(x.planDigest,DIGEST);
 assert.equal(x.nonce,approved.nonce);
 assert.equal(x.commentId,COMMENT_ID);
 assert.equal(x.githubOwnerIdentityVerified,true);
 assert.equal(x.ed25519Required,false);
 assert.equal(x.productionWritesAllowed,false);
 assert.equal(x.mergeAllowed,false);
});
test('rejects incomplete/forged/expired/changed approval and commenter',()=>{
 for(const approval of [
  {...approved,planDigest:'c'.repeat(64)},
  {...approved,workflowSha:'d'.repeat(40)},
  {...approved,expiresAt:NOW+900001},
  {...approved,expiresAt:NOW-1},
  {...approved,operation:'PRODUCTION_PUSH'}
 ])assert.throws(()=>verify({approvedPlan:approval}),/SINGLE_APPROVAL_DENIED/);
 for(const e of [
  {action:'edited'},{sender:{id:1,login:OWNER}},
  {issue:{number:49,pull_request:null}},
  {issue:{number:50,pull_request:{url:'https://example.invalid'}}},
  {repository:{id:1,full_name:REPO}},
  {comment:{...event().comment,user:{id:1,login:OWNER}}},
  {comment:{...event().comment,body:'te autorizo'}},
  {comment:{...event().comment,updated_at:new Date(NOW+100).toISOString()}},
  {comment:{...event().comment,created_at:new Date(NOW-20*60*1000).toISOString(),
    updated_at:new Date(NOW-20*60*1000).toISOString()}},
 ])assert.throws(()=>verify({event:event(e)}),/SINGLE_APPROVAL_DENIED/);
});
test('rejects altered issuer JWT and an invalid trust anchor',()=>{
 assert.throws(()=>verify({oidcJwt:jwt({actor_id:'3'})}),/OIDC_APPROVAL_DENIED/);
 assert.throws(()=>verify({oidcJwt:jwt({event_name:'workflow_dispatch'})}),/OIDC_APPROVAL_DENIED/);
 assert.throws(()=>verify({jwks:{keys:[]}}),/OIDC_APPROVAL_DENIED/);
 assert.throws(()=>verify({oidcContext:{...CONTEXT,sha:'1'.repeat(40)}}),/OIDC_APPROVAL_DENIED/);
});
test('format fails closed on invalid digest, nonce, or scope',()=>{
 for(const payload of [
  {...approved,operation:'PRODUCTION_PUSH'},
  {...approved,nonce:'short'},
  {...approved,planDigest:'bad'},
  {...approved,workflowSha:'bad'},
  {...approved,expiresAt:'never'},
 ])assert.throws(()=>formatGitHubSingleApproval(payload),/SINGLE_APPROVAL_DENIED/);
});
