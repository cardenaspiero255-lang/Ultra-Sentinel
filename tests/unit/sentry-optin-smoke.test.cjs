'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const {probeSentryPrivateReadiness}=
 require('../../packages/operations/sentry-optin-smoke.cjs');
const token='test-sentry-readonly-token-123456',organization='gamehub-test-org',
 projectId='12345',checkpointKey=crypto.randomBytes(32).toString('base64url');
const issue={
 id:'984321',project:{id:projectId},count:'3',status:'unresolved',
 level:'error',lastSeen:'2026-10-14T20:15:00Z',
 title:'PRIVATE_TITLE_SECRET_NEVER_LEAK',metadata:{user:{email:'PRIVATE_EMAIL'}}
};
function mock({status=200,items=[issue]}={}){
 let calls=0;
 const fetchImpl=async(url,request)=>{
  calls++;
  assert.equal(request.method,'GET');
  assert.equal(request.redirect,'error');
  assert.equal(request.headers.Authorization,'Bearer '+token);
  assert.ok(url.startsWith('https://sentry.io/api/0/organizations/'+organization+'/issues/?'));
  return {status,url,headers:{get:()=> 'application/json'},
   text:async()=>JSON.stringify(items)};
 };
 return {fetchImpl,count:()=>calls};
}
test('real adapter and encryption can be exercised privately without exposing issue text or IDs',async()=>{
 const api=mock();
 const r=await probeSentryPrivateReadiness({organization,projectId,token,
  checkpointKey,fetchImpl:api.fetchImpl});
 assert.equal(api.count(),1);
 assert.equal(r.sentryApiReadValidated,true);
 assert.equal(r.encryptedStateRoundTripValidated,true);
 assert.equal(r.outputIssueIds,false);
 assert.equal(r.outputIssues,false);
 assert.equal(r.publicArtifactCreated,false);
 assert.equal(r.checkpointPersisted,false);
 assert.equal(r.alertDeliveryVerified,false);
 assert.equal(r.sentry24x7Deployed,false);
 assert.equal(r.tripleSPlusCertified,false);
 assert.doesNotMatch(JSON.stringify(r),/PRIVATE_|984321|test-sentry/);
});
test('bad Sentry response, wrong project, invalid crypto key fail closed without secrets',async()=>{
 for(const config of [
  {fetchImpl:mock({status:403}).fetchImpl},
  {fetchImpl:mock({items:[{...issue,project:{id:'5'}}]}).fetchImpl},
  {checkpointKey:'not-a-real-key'},
  {token:'invalid'},
  {organization:'../private'}
 ]){
  await assert.rejects(probeSentryPrivateReadiness({
   organization,projectId,token,checkpointKey,fetchImpl:mock().fetchImpl,
   ...config
  }),/SENTRY_PRIVATE_SMOKE_BLOCKED/);
 }
});
test('Actions Sentry probe has explicit owner opt-in and no scheduled/PR permissions or uploads',()=>{
 const w=fs.readFileSync(path.resolve(__dirname,
  '../../.github/workflows/sentry-optin-private-smoke.yml'),'utf8');
 for(const item of [
  'workflow_dispatch:',"github.actor_id == '322222186'",
  'inputs.approve_private_probe == true',"github.ref == 'refs/heads/main'",
  'persist-credentials: false','ULTRA_SENTINEL_SENTRY_READ_TOKEN:',
  'ULTRA_SENTINEL_SENTRY_CHECKPOINT_KEY:'
 ])assert.ok(w.includes(item),item);
 assert.match(w,/permissions:\n  contents: read/);
 assert.doesNotMatch(w,/\n  schedule:|\n  pull_request:|actions\/upload-artifact|contents: write|pull-requests: write|pull_request_target/);
 assert.match(w,/node packages\/operations\/sentry-optin-smoke\.cjs/);
});
