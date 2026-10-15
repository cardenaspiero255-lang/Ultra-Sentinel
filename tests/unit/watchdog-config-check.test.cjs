'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {validateWatchdogConfig}=require('../../apps/watchdog/watchdog-config-check.cjs');
function context(root){
 return {ULTRA_SENTINEL_WATCHDOG_STATE_FILE:path.join(root,'watchdog.json'),
  ULTRA_SENTINEL_SENTRY_ORG:'sample-project',
  ULTRA_SENTINEL_SENTRY_PROJECT_ID:'12345',
  ULTRA_SENTINEL_SENTRY_TOKEN:'production-secret-not-real-123456',
  ULTRA_SENTINEL_READONLY_GITHUB_TOKEN:'github-secret-not-real-123456',
  ULTRA_SENTINEL_ALERT_WEBHOOK_URL:'https://hooks.example.net/ultra',
  ULTRA_SENTINEL_ALERT_AUTH_TOKEN:'alerts-secret-not-real-123456',
  ULTRA_SENTINEL_ALERT_SIGNING_SECRET:'hmac-secret-not-real-123456'};
}
test('safe config validates without displaying secrets or claiming deployment',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ultra-config-'));
 try{
  const r=validateWatchdogConfig(context(dir));
  assert.equal(r.status,'CONFIGURATION_COMPLETE_NOT_DEPLOYED');
  assert.equal(r.monitor24x7Verified,false);
  assert.equal(r.networkTestPerformed,false);
  assert.equal(r.secretsDisplayed,false);
  assert.deepEqual(r.reasons,[]);
  assert.doesNotMatch(JSON.stringify(r),/production-secret|github-secret|alerts-secret|hmac-secret/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('placeholder secrets, webhook injection and unsafe state permissions fail closed',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ultra-config-bad-'));
 try{
  const q=context(dir);
  const tampered={...q,ULTRA_SENTINEL_SENTRY_TOKEN:'REPLACE_WITH_TOKEN',
   ULTRA_SENTINEL_ALERT_WEBHOOK_URL:'http://127.0.0.1:3000/',
   ULTRA_SENTINEL_READONLY_GITHUB_TOKEN:'',ULTRA_SENTINEL_SENTRY_PROJECT_ID:'../../9999'};
  const v=validateWatchdogConfig(tampered);
  assert.equal(v.status,'NOT_READY');
  assert.ok(v.reasons.includes('SENTRY_SECRET_MISSING'));
  assert.ok(v.reasons.includes('ALERT_DESTINATION_INVALID'));
  assert.ok(v.reasons.includes('GITHUB_SECRET_MISSING'));
  assert.ok(v.reasons.includes('SENTRY_PROJECT_INVALID'));
  fs.chmodSync(dir,0o755);
  assert.ok(validateWatchdogConfig(q).reasons.includes('STATE_DIRECTORY_NOT_PRIVATE'));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
