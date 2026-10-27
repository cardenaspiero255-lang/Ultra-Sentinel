'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {storeHeartbeatAudit,checkedState}=require('../../apps/watchdog/watchdog-run-once.cjs');
const {deliverPending}=require('../../apps/watchdog/watchdog-deliver.cjs');
const SHA='a'.repeat(40), now='2026-10-26T16:30:00Z';
const run=(id,created_at,conclusion='success')=>({id,created_at,conclusion,status:'completed',event:'schedule',head_sha:SHA,head_branch:'main',name:'Ultra Sentinel — serverless GitHub observer',path:'.github/workflows/serverless-github-monitor.yml'});
const stale=[run(3,'2026-10-26T12:00:00Z'),run(2,'2026-10-26T11:30:00Z'),run(1,'2026-10-26T11:00:00Z')];
const good=[run(6,'2026-10-26T16:00:00Z'),run(5,'2026-10-26T15:30:00Z'),run(4,'2026-10-26T15:00:00Z')];
const audit=runs=>({runs,now,expectedSha:SHA});
function fixture(){let dir=fs.mkdtempSync(path.join(os.tmpdir(),'heartbeat-outbox-'));return {dir,file:path.join(dir,'state.json')}}
const creds={endpoint:'https://alerts.example.org/hook',token:'long-test-credential-123456',signingSecret:'long-test-signing-key-123456'};
test('overdue schedule persists alert and delivery failures preserve it for retry',async()=>{
 const {dir,file}=fixture();try{
  assert.equal(typeof storeHeartbeatAudit,'function');
  let result=storeHeartbeatAudit(file,audit(stale));
  assert.equal(result.status,'HEARTBEAT_ALERT_PENDING');
  assert.deepEqual(checkedState(file).pendingAlerts,[{type:'SCHEDULE_HEARTBEAT',verdict:'SCHEDULE_OVERDUE',latestRunId:3}]);
  await assert.rejects(deliverPending({stateFile:file,...creds,fetchImpl:async()=>({status:503})}));
  assert.equal(checkedState(file).pendingAlerts.length,1);
  let body;
  const receipt=await deliverPending({stateFile:file,...creds,fetchImpl:async(url,req)=>{body=JSON.parse(req.body);return {status:202,url}}});
  assert.equal(receipt.status,'HTTP_DELIVERY_ACCEPTED');
  assert.equal(body.alerts[0].verdict,'SCHEDULE_OVERDUE');
  assert.equal(checkedState(file).pendingAlerts.length,0);
  assert.equal(storeHeartbeatAudit(file,audit(stale)).status,'HEARTBEAT_UNCHANGED');
  assert.equal(storeHeartbeatAudit(file,audit(good)).status,'HEARTBEAT_HEALTHY');
  assert.equal(storeHeartbeatAudit(file,audit(stale)).status,'HEARTBEAT_ALERT_PENDING');
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('invalid evidence creates a safe alert without copying arbitrary source text',()=>{
 const {dir,file}=fixture();try{
  assert.equal(typeof storeHeartbeatAudit,'function');
  storeHeartbeatAudit(file,{runs:'PRIVATE_SECRET',now,expectedSha:SHA});
  assert.deepEqual(checkedState(file).pendingAlerts,[{type:'SCHEDULE_HEARTBEAT',verdict:'SCHEDULE_EVIDENCE_UNAVAILABLE',latestRunId:null}]);
  assert.doesNotMatch(fs.readFileSync(file,'utf8'),/PRIVATE_SECRET/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('an unacknowledged heartbeat cannot be replaced or reused for another watchdog',()=>{
 const {dir,file}=fixture();try{
  storeHeartbeatAudit(file,audit(stale));
  assert.throws(()=>storeHeartbeatAudit(file,audit(good)),/PENDING_ALERT_DELIVERY_REQUIRED/);
  const {storeObservation}=require('../../apps/watchdog/watchdog-run-once.cjs');
  assert.throws(()=>storeObservation(file,null,null,null),/STATE_FILE_RESERVED_FOR_HEARTBEAT/);
  assert.equal(checkedState(file).pendingAlerts[0].verdict,'SCHEDULE_OVERDUE');
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('a delayed response for an older batch cannot acknowledge a later identical incident',async()=>{
 const {dir,file}=fixture();try{
  storeHeartbeatAudit(file,audit(stale));
  let release,started;
  const startedPromise=new Promise(resolve=>{started=resolve});
  const slow=deliverPending({stateFile:file,...creds,fetchImpl:async url=>{
   started();await new Promise(resolve=>{release=resolve});return {status:202,url};
  }});
  await startedPromise;
  await deliverPending({stateFile:file,...creds,fetchImpl:async url=>({status:202,url})});
  storeHeartbeatAudit(file,audit(good));
  storeHeartbeatAudit(file,audit(stale));
  release();
  await assert.rejects(slow,/DELIVERY_RECEIPT_MISMATCH/);
  assert.equal(checkedState(file).pendingAlerts.length,1);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
