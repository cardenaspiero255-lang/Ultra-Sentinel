'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {inspect}=require('../../apps/watchdog/watchdog-outbox.cjs');
const {storeObservation,pendingDigest,acknowledgeDelivery,checkedState}=
 require('../../apps/watchdog/watchdog-run-once.cjs');
const sha='a'.repeat(40);
const sentry=ids=>({schema:'ultra-sentinel-sentry-sample/v1',projectId:'555',
 sampleOnly:true,completeIssueInventory:false,issues:ids.map(id=>({issueId:id,projectId:'555'}))});
const jarvis=head=>({schema:'ultra-sentinel-jarvis-readonly/v1',
 repository:'cardenaspiero255-lang/JARVIS',remoteWrites:false,
 openPrs:[{pr:2,headSha:head}]});
test('durable checkpoint survives iterations; no synthetic alert on first run',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-watchdog-'));
 try{
  const stateFile=path.join(root,'state.json');
  const first=storeObservation(stateFile,null,sentry(['100']),jarvis(sha));
  assert.equal(first.status,'BASELINE_INITIALIZED_NO_ALERT');
  assert.equal(first.alerts.length,0);
  assert.equal(fs.existsSync(stateFile),true);
  const noChange=storeObservation(stateFile,null,sentry(['100']),jarvis(sha));
  assert.equal(noChange.status,'NO_CHANGES');
  assert.equal(noChange.alerts.length,0);
  assert.equal(fs.existsSync(stateFile+'.lock'),false);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('outbox blocks new observation until explicitly acknowledged by matching digest',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-watchdog-outbox-'));
 try{
  const file=path.join(root,'checkpoint');
  storeObservation(file,null,sentry(['100']),jarvis(sha));
  const changed=storeObservation(file,null,sentry(['100','200']),jarvis('b'.repeat(40)));
  assert.equal(changed.status,'CHANGES_OBSERVED');
  assert.equal(changed.alerts.length,2);
  assert.throws(()=>storeObservation(file,null,sentry(['100','200']),jarvis('b'.repeat(40))),
   /PENDING_ALERT_DELIVERY_REQUIRED/);
  assert.throws(()=>acknowledgeDelivery(file,'0'.repeat(64)),/DELIVERY_RECEIPT_MISMATCH/);
  const receipt=pendingDigest(changed.alerts);
  assert.equal(acknowledgeDelivery(file,receipt).status,'DELIVERY_ACKNOWLEDGED');
  assert.equal(checkedState(file).pendingAlerts.length,0);
  assert.equal(storeObservation(file,null,sentry(['100','200']),jarvis('b'.repeat(40))).status,'NO_CHANGES');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('watchdog lock, symlink and unreadable private directory fail closed',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-watchdog-negative-'));
 try{
  const file=path.join(root,'state.json');
  fs.writeFileSync(file+'.lock','someone else',{mode:0o600});
  assert.throws(()=>storeObservation(file,null,sentry([]),jarvis(sha)),
   /WATCHDOG_ALREADY_RUNNING_OR_RECOVERY_REQUIRED/);
  fs.unlinkSync(file+'.lock');
  const link=path.join(root,'linked.json');
  fs.symlinkSync(path.join(root,'victim'),link);
  assert.throws(()=>storeObservation(link,null,sentry([]),jarvis(sha)),/STATE_FILE_UNSAFE/);
  const world=path.join(root,'world');
  fs.mkdirSync(world,{mode:0o755});fs.chmodSync(world,0o755);
  assert.throws(()=>storeObservation(path.join(world,'state'),null,sentry([]),jarvis(sha)),
   /STATE_DIRECTORY_UNSAFE/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('malformed previously stored state is never overwritten',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-watchdog-corrupt-'));
 try{
  const file=path.join(root,'state.json');
  fs.writeFileSync(file,'garbled',{mode:0o600});
  assert.throws(()=>storeObservation(file,null,sentry([]),jarvis(sha)),/STATE_CORRUPTED/);
  assert.equal(fs.readFileSync(file,'utf8'),'garbled');
  assert.equal(fs.existsSync(file+'.lock'),false);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('operator can inspect sanitized pending events and must explicitly confirm delivery',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-watchdog-ops-'));
 try{
  const file=path.join(root,'checkpoint');
  storeObservation(file,null,sentry(['100']),jarvis(sha));
  storeObservation(file,null,sentry(['100','200']),jarvis(sha));
  const pending=inspect(file);
  assert.equal(pending.status,'PENDING_ALERT_DELIVERY_REQUIRED');
  assert.equal(pending.pendingAlerts.length,1);
  assert.equal(pending.deliveryVerified,false);
  assert.match(pending.pendingDigest,/^[a-f0-9]{64}$/);
  assert.equal(acknowledgeDelivery(file,pending.pendingDigest).status,'DELIVERY_ACKNOWLEDGED');
  assert.equal(inspect(file).status,'NO_PENDING_ALERTS');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
