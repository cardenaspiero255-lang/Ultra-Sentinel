'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process'),path=require('node:path');
const {requireAuthenticatedActionsContext,requestGitHubOidcJwt}=
 require('../../scripts/run-owner-oidc-ed25519-sandbox.cjs');
const defaultContext={
 GITHUB_ACTIONS:'true',GITHUB_EVENT_NAME:'workflow_dispatch',
 GITHUB_WORKFLOW_REF:'cardenaspiero255-lang/Ultra-Sentinel/.github/workflows/gamehub-pr151-owner-e2e.yml@refs/heads/main',
 GITHUB_REPOSITORY:'cardenaspiero255-lang/Ultra-Sentinel',GITHUB_REPOSITORY_ID:'1418338512',
 GITHUB_ACTOR:'cardenaspiero255-lang',GITHUB_ACTOR_ID:'322222186',
 GITHUB_REF:'refs/heads/main',GITHUB_RUN_ATTEMPT:'1',
 GITHUB_SHA:'a'.repeat(40),GITHUB_RUN_ID:'123456789',
 ACTIONS_ID_TOKEN_REQUEST_URL:'https://pipelines.actions.githubusercontent.com/12345678/idtoken?nonce=abc',
 ACTIONS_ID_TOKEN_REQUEST_TOKEN:'fixture-actions-token-0123456789',
 ULTRA_SENTINEL_OWNER_GITHUB_TOKEN:'fixture-owner-session-token-1234567890'
};
test('trusted GitHub workflow dispatch has fixed issuer, scope and audience',()=>{
 const url=requireAuthenticatedActionsContext(defaultContext);
 const v=new URL(url);
 assert.equal(v.origin,'https://pipelines.actions.githubusercontent.com');
 assert.equal(v.searchParams.get('audience'),'urn:ultra-sentinel:gamehub-pr151:sandbox');
});
test('comment, PR, rerun, different workflow or actor cannot start signed repair even with tokens',()=>{
 for(const patch of [
  {GITHUB_ACTIONS:'false'}, {GITHUB_EVENT_NAME:'issue_comment'},
  {GITHUB_EVENT_NAME:'pull_request'}, {GITHUB_WORKFLOW_REF:'rogue'},
  {GITHUB_REPOSITORY_ID:'987'},{GITHUB_ACTOR_ID:'123'},
  {GITHUB_ACTOR:'unknown'}, {GITHUB_REF:'refs/heads/feature'},
  {GITHUB_RUN_ATTEMPT:'2'},{GITHUB_SHA:'b'.repeat(39)},
  {GITHUB_RUN_ID:'0'},{ACTIONS_ID_TOKEN_REQUEST_TOKEN:undefined},
  {ULTRA_SENTINEL_OWNER_GITHUB_TOKEN:undefined}
 ])assert.throws(()=>requireAuthenticatedActionsContext({...defaultContext,...patch}),
  /DUAL_OWNER_ACTIONS_CONTEXT_DENIED/);
});
test('OIDC issuer endpoint rejects arbitrary hosts, HTTP, user-info and nonstandard port',()=>{
 for(const url of [
  'https://evil.example/idtoken', 'http://pipelines.actions.githubusercontent.com/idtoken',
  'https://attacker@pipelines.actions.githubusercontent.com/idtoken',
  'https://pipelines.actions.githubusercontent.com:444/idtoken',
  'https://pipelines.actions.githubusercontent.com.evil.example/idtoken'
 ])assert.throws(()=>requireAuthenticatedActionsContext({...defaultContext,
  ACTIONS_ID_TOKEN_REQUEST_URL:url}),/DUAL_OWNER_TOKEN_ISSUER_DENIED/);
});
test('issuer request uses bearer token only for trusted GitHub issuer and rejects bad responses',async()=>{
 const issuerResponse='x'.repeat(200);
 let called=0;
 const res=await requestGitHubOidcJwt(defaultContext,async(url,opts)=>{
  called++;
  assert.match(url,/^https:\/\/pipelines\.actions\.githubusercontent\.com\//);
  assert.equal(opts.redirect,'error');
  assert.equal(opts.headers.Authorization,'bearer '+defaultContext.ACTIONS_ID_TOKEN_REQUEST_TOKEN);
  return {ok:true,json:async()=>({value:issuerResponse})};
 });
 assert.equal(res,issuerResponse);assert.equal(called,1);
 await assert.rejects(requestGitHubOidcJwt(defaultContext,async()=>({ok:false})),
  /DUAL_OWNER_OIDC_ISSUANCE_FAILED/);
 await assert.rejects(requestGitHubOidcJwt(defaultContext,async()=>({ok:true,json:async()=>({value:'tiny'})})),
  /DUAL_OWNER_OIDC_INVALID/);
});
test('standalone operator cannot execute outside authenticated Actions; no secret in output',()=>{
 const command=path.resolve(__dirname,'../../scripts/run-owner-oidc-ed25519-sandbox.cjs');
 const r=spawnSync(process.execPath,[command],{encoding:'utf8',
  env:{PATH:process.env.PATH,HOME:process.env.HOME},timeout:10000});
 assert.equal(r.status,1);
 assert.equal(r.stdout,'');
 assert.match(r.stderr,/DUAL_OWNER_SIGNED_SANDBOX_BLOCKED/);
 assert.doesNotMatch(r.stderr,/token|secret|BEGIN PRIVATE KEY|bearer/i);
});
