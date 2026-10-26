'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {verifyGitHubOidcApproval}=require('../../packages/recovery/github-oidc-approval.cjs');
const {privateKey,publicKey}=crypto.generateKeyPairSync('rsa',{modulusLength:2048,publicExponent:0x10001});
const pub={...publicKey.export({format:'jwk'}),kid:'fixture-rsa-1',alg:'RS256',use:'sig'};
const REPO='cardenaspiero255-lang/Ultra-Sentinel',SHA='a'.repeat(40),NOW=1785000000;
const ctx={sha:SHA,runId:'123456789',actorId:'322222186',repoId:'1418338512',
  audience:'urn:ultra-sentinel:gamehub-pr151:sandbox',now:NOW};
function jwt(overrides={},header={}){
 const claims={iss:'https://token.actions.githubusercontent.com',
  aud:ctx.audience,sub:'repo:'+ 'cardenaspiero255-lang@322222186/Ultra-Sentinel@1418338512' +':ref:refs/heads/main',
  repository:REPO,repository_id:ctx.repoId,actor:'cardenaspiero255-lang',
  actor_id:ctx.actorId,ref:'refs/heads/main',sha:SHA,event_name:'workflow_dispatch',
  run_id:ctx.runId,run_attempt:'1',
  workflow_ref:REPO+'/.github/workflows/gamehub-pr151-owner-e2e.yml@refs/heads/main',
  runner_environment:'github-hosted',iat:NOW-20,nbf:NOW-20,exp:NOW+100,jti:'oidc-unique',
  ...overrides};
 const h={alg:'RS256',kid:pub.kid,typ:'JWT',...header};
 const b=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
 const input=b(h)+'.'+b(claims);const sig=crypto.sign('RSA-SHA256',Buffer.from(input),privateKey).toString('base64url');
 return input+'.'+sig;
}
test('GitHub issuer RSA signature binds fixed source SHA, run and owner identity to sandbox only',()=>{
 const approved=verifyGitHubOidcApproval({jwt:jwt(),jwks:{keys:[pub]},context:ctx});
 assert.equal(approved.status,'GITHUB_OIDC_OWNER_SANDBOX_APPROVED');
 assert.equal(approved.sha,SHA);
 assert.equal(approved.runId,ctx.runId);
 assert.equal(approved.cryptographicallyVerified,true);
 assert.equal(approved.authorizedForProductionRepair,false);
 assert.equal(approved.ed25519OwnerSignatureVerified,false);
 assert.equal(approved.remoteWrites,false);
});
test('forged actor, SHA, repo, run, audience, environment and workflow cannot authorize',()=>{
 for(const claim of [
  {actor_id:'123'},{actor:'bad-actor'},{repository_id:'999'},
  {repository:'evil/repo'},{sha:'b'.repeat(40)},{run_id:'200'},
  {run_attempt:'2'},{event_name:'pull_request'},{ref:'refs/heads/dev'},
  {aud:'evil'},{iss:'https://another.example'},
  {runner_environment:'self-hosted'},
  {workflow_ref:REPO+'/.github/workflows/fake.yml@refs/heads/main'},
  {sub:'repo:evil/repo:ref:refs/heads/main'},
 ])assert.throws(()=>verifyGitHubOidcApproval({jwt:jwt(claim),jwks:{keys:[pub]},context:ctx}),/OIDC_APPROVAL_DENIED/);
});
test('token expiry, future issuance, algorithm confusion and tampering fail closed',()=>{
 for(const token of [
  jwt({exp:NOW-1}),jwt({iat:NOW+90}),jwt({nbf:NOW+90}),
  jwt({}, {alg:'none'}),jwt({}, {alg:'HS256'}),
  jwt().slice(0,-10)+'tamperedx'
 ])assert.throws(()=>verifyGitHubOidcApproval({jwt:token,jwks:{keys:[pub]},context:ctx}),/OIDC_APPROVAL_DENIED/);
 const attacker=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
 const wrong={...attacker.publicKey.export({format:'jwk'}),kid:pub.kid,alg:'RS256',use:'sig'};
 assert.throws(()=>verifyGitHubOidcApproval({jwt:jwt(),jwks:{keys:[wrong]},context:ctx}),/OIDC_APPROVAL_DENIED/);
});
test('wrong GitHub run-bound context and malformed JWK fail closed',()=>{
 for(const patch of [
  {runId:'1'}, {actorId:'5'}, {repoId:'100'}, {sha:'b'.repeat(40)},
  {audience:'test'}, {now:NOW+2000}
 ])assert.throws(()=>verifyGitHubOidcApproval({jwt:jwt(),jwks:{keys:[pub]},context:{...ctx,...patch}}),/OIDC_APPROVAL_DENIED/);
 assert.throws(()=>verifyGitHubOidcApproval({jwt:jwt(),jwks:{keys:[]},context:ctx}),/OIDC_APPROVAL_DENIED/);
 assert.throws(()=>verifyGitHubOidcApproval({jwt:jwt(),jwks:{keys:[{...pub,kty:'oct'}]},context:ctx}),/OIDC_APPROVAL_DENIED/);
});

test('OIDC issue comment is restricted to separately verified owner-only event and exact workflow',()=>{
 const issueJwt=jwt({event_name:'issue_comment'});
 assert.throws(()=>verifyGitHubOidcApproval({jwt:issueJwt,jwks:{keys:[pub]},context:ctx}),/OIDC_APPROVAL_DENIED/);
 const approved=verifyGitHubOidcApproval({jwt:issueJwt,jwks:{keys:[pub]},
  context:{...ctx,eventName:'issue_comment',approvedOwnerIssueComment:true}});
 assert.equal(approved.status,'GITHUB_OIDC_OWNER_SANDBOX_APPROVED');
 assert.equal(approved.authorizedForProductionRepair,false);
 for(const change of [
  {approvedOwnerIssueComment:false},{eventName:'workflow_dispatch'},
  {actorId:'1212'}, {runId:'1'}
 ])assert.throws(()=>verifyGitHubOidcApproval({jwt:issueJwt,jwks:{keys:[pub]},
  context:{...ctx,eventName:'issue_comment',approvedOwnerIssueComment:true,...change}}),/OIDC_APPROVAL_DENIED/);
});
