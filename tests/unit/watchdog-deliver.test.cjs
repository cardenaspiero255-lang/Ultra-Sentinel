'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const crypto=require('node:crypto');
const {storeObservation,checkedState}=require('../../apps/watchdog/watchdog-run-once.cjs');
const {deliverPending,validateEndpoint}=require('../../apps/watchdog/watchdog-deliver.cjs');
const goodUrl='https://alerts.example.org/sentinel';
const token='sample-super-secret-token-very-long';
const secret='sample-hmac-secret-very-long';
const sentry=issues=>({schema:'ultra-sentinel-sentry-sample/v1',
 projectId:'555',sampleOnly:true,completeIssueInventory:false,
 issues:issues.map(issueId=>({issueId,projectId:'555'}))});
const jarvis=()=>({schema:'ultra-sentinel-jarvis-readonly/v1',
 repository:'cardenaspiero255-lang/JARVIS',remoteWrites:false,openPrs:[]});
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-deliver-'));
 const stateFile=path.join(root,'watchdog.json');
 storeObservation(stateFile,null,sentry(['123']),jarvis());
 storeObservation(stateFile,null,sentry(['123','456']),jarvis());
 return {root,stateFile};
}
test('HTTP 202 triggers durable acknowledgment and signed stable idempotency key',async()=>{
 const f=fixture();let request;
 try{
  const fetchImpl=async(url,options)=>{
   assert.equal(url,goodUrl);
   request=options;
   assert.equal(options.method,'POST');
   assert.equal(options.redirect,'error');
   assert.equal(options.headers.Authorization,'Bearer '+token);
   const computed=crypto.createHmac('sha256',secret).update(options.body).digest('hex');
   assert.equal(options.headers['X-Ultra-Sentinel-Signature'],'sha256='+computed);
   assert.match(options.headers['Idempotency-Key'],/^[a-f0-9]{64}$/);
   const body=JSON.parse(options.body);
   assert.equal(body.schema,'ultra-sentinel-alert-envelope/v1');
   assert.equal(body.alerts.length,1);
   assert.equal(body.alerts[0].type,'NEW_SENTRY_ISSUE');
   return {status:202,url};
  };
  const accepted=await deliverPending({stateFile:f.stateFile,
   endpoint:goodUrl,token,signingSecret:secret,fetchImpl});
  assert.equal(accepted.status,'HTTP_DELIVERY_ACCEPTED');
  assert.equal(accepted.endUserDeliveryUnverified,true);
  assert.equal(checkedState(f.stateFile).pendingAlerts.length,0);
  const repeat=await deliverPending({stateFile:f.stateFile,
   endpoint:goodUrl,token,signingSecret:secret,fetchImpl:async()=>{throw Error('not called')}});
  assert.equal(repeat.status,'NO_PENDING_ALERTS');
  assert.ok(request);
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
test('network rejection and HTTP failures preserve outbox and idempotency identifier',async()=>{
 const f=fixture(),keys=[];
 try{
  for(const response of [
   async()=>{throw Error('network down')},
   async(url,req)=>{keys.push(req.headers['Idempotency-Key']);return {status:503,url};},
   async(url,req)=>{keys.push(req.headers['Idempotency-Key']);return {status:302,url:'https://other.example.org/'};}
  ]){
   await assert.rejects(()=>deliverPending({
    stateFile:f.stateFile,endpoint:goodUrl,token,signingSecret:secret,fetchImpl:response}));
   assert.equal(checkedState(f.stateFile).pendingAlerts.length,1);
  }
  assert.equal(keys[0],keys[1]);
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
test('webhook cannot be plain HTTP, loopback, credentials, query token or internal host',()=>{
 for(const url of [
  'http://alerts.example.org/path','https://localhost/path',
  'https://127.0.0.1/path','https://192.168.1.1/path',
  'https://alerts.example.org:8080/path','https://name:pass@alerts.example.org/path',
  'https://alerts.example.org/path?token=secret',
  'https://alerts.example.org/path#fragment',
  'https://alert.local/path','https://[::1]/private',
  'https://169.254.169.254/latest/meta-data',
  'https://100.100.100.200/latest/meta-data',
  'https://0.0.0.0/','https://224.0.0.1/',
  'https://198.18.0.1/','https://8.8.8.8/path',
  'https://255.255.255.255/',
  'https://alerts..example.org/path'
 ])assert.throws(()=>validateEndpoint(url),/INVALID_ALERT_DESTINATION/,url);
 assert.equal(validateEndpoint(goodUrl),goodUrl);
});
test('tampered checkpoint cannot leak arbitrary text to webhook',async()=>{
 const f=fixture();
 try{
  const data=checkedState(f.stateFile);
  data.pendingAlerts[0].attacker='SECRET_FROM_DISK';
  fs.writeFileSync(f.stateFile,JSON.stringify(data),{mode:0o600});
  await assert.rejects(()=>deliverPending({
   stateFile:f.stateFile,endpoint:goodUrl,token,signingSecret:secret,
   fetchImpl:async()=>{throw Error('MUST_NOT_SEND');}}),/STATE_ALERT_UNTRUSTED/);
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});

test('initial service invocation has no checkpoint and safely sends nothing',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-first-'));
 try{
  const result=await deliverPending({stateFile:path.join(root,'new.json'),
   endpoint:goodUrl,token,signingSecret:secret,
   fetchImpl:async()=>{throw Error('NO_NETWORK_BEFORE_BASELINE')}});
  assert.equal(result.status,'NO_CHECKPOINT_YET');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('systemd service uses locked-down read-only runtime and timer, not PR secrets',()=>{
 const service=fs.readFileSync(path.resolve(__dirname,'../../deploy/systemd/ultra-sentinel-watchdog.service'),'utf8');
 const timer=fs.readFileSync(path.resolve(__dirname,'../../deploy/systemd/ultra-sentinel-watchdog.timer'),'utf8');
 for(const required of ['User=ultra-sentinel','NoNewPrivileges=true','ProtectSystem=strict',
  'PrivateTmp=true','StateDirectoryMode=0700','UMask=0077','ReadWritePaths=/var/lib/ultra-sentinel',
  'ExecStartPre=/usr/bin/node /opt/ultra-sentinel/apps/watchdog/watchdog-config-check.cjs',
  'ExecStartPre=/usr/bin/node /opt/ultra-sentinel/apps/watchdog/watchdog-deliver.cjs',
  'ExecStart=/usr/bin/node /opt/ultra-sentinel/apps/watchdog/watchdog-run-once.cjs',
  'ExecStartPost=/usr/bin/node /opt/ultra-sentinel/apps/watchdog/watchdog-deliver.cjs']){
  assert.ok(service.includes(required),required);
 }
 assert.match(timer,/OnCalendar=\*:0\/5/);
 assert.match(timer,/Persistent=true/);
 assert.doesNotMatch(service,/GITHUB_TOKEN=ghp_|pull_request_target|curl|wget/);
});

test('identical alert payload in later incident gets distinct idempotency key; same batch retry stays stable',async()=>{
 const f=fixture();
 try{
  const seen=[];
  const transport=async(url,req)=>{
   seen.push(req.headers['Idempotency-Key']);
   return {url,status:202};
  };
  await deliverPending({stateFile:f.stateFile,endpoint:goodUrl,token,
   signingSecret:secret,fetchImpl:transport});
  // Issue temporarily falls outside the sampled window.
  storeObservation(f.stateFile,null,sentry(['123']),jarvis());
  // The same issue appears again as a new observation.
  const next=storeObservation(f.stateFile,null,sentry(['123','456']),jarvis());
  assert.equal(next.alerts.length,1);
  await deliverPending({stateFile:f.stateFile,endpoint:goodUrl,token,
   signingSecret:secret,fetchImpl:transport});
  assert.equal(seen.length,2);
  assert.notEqual(seen[0],seen[1],'distinct occurrences must not be deduplicated together');
  assert.equal(checkedState(f.stateFile).pendingAlerts.length,0);
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
test('corrupt sequence counter cannot reset delivery identity or cause webhook POST',async()=>{
 const f=fixture();
 try{
  const data=checkedState(f.stateFile);
  data.batchSequence=-3;
  fs.writeFileSync(f.stateFile,JSON.stringify(data),{mode:0o600});
  await assert.rejects(()=>deliverPending({stateFile:f.stateFile,
   endpoint:goodUrl,token,signingSecret:secret,
   fetchImpl:async()=>{throw Error('MUST_NOT_POST')}}),/STATE_SEQUENCE_INVALID/);
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
