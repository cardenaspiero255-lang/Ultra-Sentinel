'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {runHeartbeatMonitor}=require('../../apps/watchdog/heartbeat-monitor.cjs');
const {checkedState}=require('../../apps/watchdog/watchdog-run-once.cjs');
const SHA='a'.repeat(40),now='2026-10-26T16:30:00Z';
const run=(id,created_at)=>({id,created_at,conclusion:'success',status:'completed',event:'schedule',head_sha:SHA,head_branch:'main',name:'Ultra Sentinel — serverless GitHub observer',path:'.github/workflows/serverless-github-monitor.yml'});
const stale=[run(3,'2026-10-26T12:00:00Z'),run(2,'2026-10-26T11:30:00Z'),run(1,'2026-10-26T11:00:00Z')];
const creds={githubToken:'test-github-token-1234567890',endpoint:'https://alerts.example.org/hook',token:'alert-token-12345678901234',signingSecret:'alert-signing-key-123456789'};
const response=(url,body)=>({status:200,url,headers:{get:()=> 'application/json'},text:async()=>JSON.stringify(body)});
const source=(url,req)=>{
 assert.match(url,/^https:\/\/api\.github\.com\/repos\/cardenaspiero255-lang\/Ultra-Sentinel\//);
 assert.equal(req.redirect,'error');
 assert.equal(req.headers.Authorization,'Bearer '+creds.githubToken);
 return response(url,url.includes('/commits/main')?{sha:SHA}:{total_count:stale.length,workflow_runs:stale});
};
function fixture(){let dir=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-heartbeat-monitor-'));return {dir,file:path.join(dir,'state.json')}}
test('GitHub schedule gap reaches webhook through durable outbox',async()=>{
 const {dir,file}=fixture();try{
  assert.equal(typeof runHeartbeatMonitor,'function');
  let payload;
  const report=await runHeartbeatMonitor({stateFile:file,...creds,now,fetchGitHub:source,fetchAlert:async(url,request)=>{
   assert.equal(checkedState(file).pendingAlerts.length,1);
   payload=JSON.parse(request.body);return {status:202,url};
  }});
  assert.equal(payload.alerts[0].verdict,'SCHEDULE_OVERDUE');
  assert.equal(report.verdict,'SCHEDULE_OVERDUE');
  assert.equal(report.deliveryAccepted,true);
  assert.equal(report.endUserDeliveryVerified,false);
  assert.equal(checkedState(file).pendingAlerts.length,0);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('failure to authenticate source queues an unavailable warning without leaking secrets',async()=>{
 const {dir,file}=fixture();try{
  assert.equal(typeof runHeartbeatMonitor,'function');
  let body;
  const result=await runHeartbeatMonitor({stateFile:file,...creds,now,
   fetchGitHub:async()=>{throw Error('sensitive upstream message')},
   fetchAlert:async(url,request)=>{body=request.body;return {status:202,url}}});
  assert.equal(result.verdict,'SCHEDULE_EVIDENCE_UNAVAILABLE');
  assert.match(body,/SCHEDULE_EVIDENCE_UNAVAILABLE/);
  assert.doesNotMatch(body,/sensitive|test-github-token/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('retries the pending batch before requesting new source evidence',async()=>{
 const {dir,file}=fixture();try{
  assert.equal(typeof runHeartbeatMonitor,'function');
  await assert.rejects(runHeartbeatMonitor({stateFile:file,...creds,now,fetchGitHub:source,fetchAlert:async()=>({status:503})}));
  assert.equal(checkedState(file).pendingAlerts.length,1);
  const sequence=[];
  const result=await runHeartbeatMonitor({stateFile:file,...creds,now,
   fetchGitHub:async(...args)=>{sequence.push('read');return source(...args)},
   fetchAlert:async(url)=>{sequence.push('send');return {status:202,url}}});
  assert.equal(sequence[0],'send');
  assert.equal(result.verdict,'SCHEDULE_OVERDUE');
  assert.equal(checkedState(file).pendingAlerts.length,0);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('partial GitHub pagination becomes a source-unavailable warning',async()=>{
 const {dir,file}=fixture();try{
  let body;
  const truncated=(url,req)=>response(url,url.includes('/commits/main')?{sha:SHA}:{total_count:101,workflow_runs:stale});
  const result=await runHeartbeatMonitor({stateFile:file,...creds,now,fetchGitHub:truncated,
   fetchAlert:async(url,req)=>{body=JSON.parse(req.body);return {status:202,url}}});
  assert.equal(result.verdict,'SCHEDULE_EVIDENCE_UNAVAILABLE');
  assert.equal(body.alerts[0].latestRunId,null);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('a moving main SHA prevents trusting the sampled evidence',async()=>{
 const {dir,file}=fixture();try{
  let heads=0,body;
  const moving=(url,req)=>url.includes('/commits/main')?response(url,{sha:heads++===0?SHA:'b'.repeat(40)}):source(url,req);
  const result=await runHeartbeatMonitor({stateFile:file,...creds,now,fetchGitHub:moving,
   fetchAlert:async(url,req)=>{body=JSON.parse(req.body);return {status:202,url}}});
  assert.equal(result.verdict,'SCHEDULE_EVIDENCE_UNAVAILABLE');
  assert.equal(body.alerts[0].verdict,'SCHEDULE_EVIDENCE_UNAVAILABLE');
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('invalid delivery credentials fail even when the observation is healthy',async()=>{
 const {dir,file}=fixture();try{
  const healthy=[run(6,'2026-10-26T16:00:00Z'),run(5,'2026-10-26T15:30:00Z'),run(4,'2026-10-26T15:00:00Z')];
  const read=(url)=>response(url,url.includes('/commits/main')?{sha:SHA}:{total_count:healthy.length,workflow_runs:healthy});
  await assert.rejects(runHeartbeatMonitor({stateFile:file,...creds,now,token:'bad',fetchGitHub:read,fetchAlert:async()=>{throw Error('NO POST')}}),/ALERT_DELIVERY_NOT_CONFIGURED/);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
