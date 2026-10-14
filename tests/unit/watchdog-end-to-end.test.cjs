'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {observeOnce,checkedState}=require('../../apps/watchdog/watchdog-run-once.cjs');
const {deliverPending}=require('../../apps/watchdog/watchdog-deliver.cjs');
const GITHUB='https://api.github.com/repos/',SENTRY='https://sentry.io/api/0/organizations/example-org/issues/';
const ghToken='test-readonly-github-token-123456';
const sentryToken='test-readonly-sentry-token-123456';
const webhookToken='test-telegram-relay-token-123456';
const webhookSecret='test-strong-hmac-secret-123456';
const sha='a'.repeat(40);
function response(url,data,status=200){
 return {url,status,headers:{get:()=> 'application/json'},
  text:async()=>JSON.stringify(data)};
}
function fakeSystem(){
 const state={sentryIssues:['900'],jarvisHead:sha,gamehubHead:sha,
  failSentry:false,forgedRepo:false,requests:[]};
 const fetchSentry=async(url,req)=>{
  state.requests.push({url,method:req.method});
  assert.equal(req.method,'GET');assert.equal(req.redirect,'error');
  assert.equal(req.headers.Authorization,'Bearer '+sentryToken);
  assert.match(url,/^https:\/\/sentry\.io\/api\/0\/organizations\/example-org\/issues\/\?/);
  if(state.failSentry)return response(url,{detail:'denied'},403);
  return response(url,state.sentryIssues.map(id=>({
   id,project:{id:'123456'},count:'1',level:'error',
   status:'unresolved',lastSeen:'2026-10-14T22:00:00Z',
   title:'sensitive-private-error-name'
  })));
 };
 const fetchGitHub=async(url,req)=>{
  state.requests.push({url,method:req.method});
  assert.equal(req.method,'GET');assert.equal(req.redirect,'error');
  assert.equal(req.headers.Authorization,'Bearer '+ghToken);
  const suffix=url.slice(GITHUB.length);
  if(suffix==='cardenaspiero255-lang/JARVIS')return response(url,{
   id:state.forgedRepo?1:1349889592,full_name:'cardenaspiero255-lang/JARVIS',
   owner:{id:322222186},default_branch:'main',archived:false
  });
  if(suffix==='cardenaspiero255-lang/JARVIS/pulls?state=open&per_page=30&page=1')
   return response(url,[{number:2,state:'open',draft:false,
    head:{sha:state.jarvisHead},base:{repo:{id:1349889592}}}]);
  if(suffix==='cardenaspiero255-lang/gamehub-ultra/pulls?state=open&sort=updated&direction=desc&per_page=100')
   return response(url,[{number:132,title:'Voice bugfix',state:'open',head:{sha:state.gamehubHead}}]);
  if(suffix==='cardenaspiero255-lang/gamehub-ultra/pulls/132')
   return response(url,{number:132,state:'open',head:{sha:state.gamehubHead},
    base:{repo:{id:1375408706,full_name:'cardenaspiero255-lang/gamehub-ultra',
     owner:{id:322222186}}}});
  throw Error('UNKNOWN_EXTERNAL_ROUTE');
 };
 return {state,fetchSentry,fetchGitHub};
}
test('E2E three repositories → persisted alerts → HMAC webhook ACK → idempotent polling',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-integration-'));
 const stateFile=path.join(root,'watchdog.json');
 const system=fakeSystem();
 const observe=()=>observeOnce({stateFile,sentryOrg:'example-org',sentryProjectId:'123456',
  sentryToken,githubToken:ghToken,fetchSentry:system.fetchSentry,
  fetchGitHub:system.fetchGitHub});
 try{
  const baseline=await observe();
  assert.equal(baseline.status,'BASELINE_INITIALIZED_NO_ALERT');
  assert.equal(baseline.alerts.length,0);
  assert.equal(checkedState(stateFile).checkpoint.gamehub.pr,132);
  system.state.sentryIssues=['900','901'];
  system.state.jarvisHead='b'.repeat(40);
  system.state.gamehubHead='c'.repeat(40);
  const changed=await observe();
  assert.equal(changed.status,'CHANGES_OBSERVED');
  assert.deepEqual(changed.alerts.map(x=>x.type),
   ['NEW_SENTRY_ISSUE','JARVIS_PR_HEAD_CHANGED','GAMEHUB_PR_HEAD_CHANGED']);
  await assert.rejects(observe(),/PENDING_ALERT_DELIVERY_REQUIRED/);
  let deliveries=0;
  const transport=async(url,req)=>{
   deliveries++;
   assert.equal(req.method,'POST');
   assert.equal(url,'https://trusted-relay.example.org/ss');
   assert.equal(req.headers.Authorization,'Bearer '+webhookToken);
   assert.equal(JSON.parse(req.body).alertCount,3);
   assert.doesNotMatch(req.body,/sensitive-private-error-name|test-readonly-github-token/);
   return {url,status:202};
  };
  const acknowledged=await deliverPending({stateFile,endpoint:'https://trusted-relay.example.org/ss',
   token:webhookToken,signingSecret:webhookSecret,fetchImpl:transport});
  assert.equal(acknowledged.status,'HTTP_DELIVERY_ACCEPTED');
  assert.equal(acknowledged.endUserDeliveryUnverified,true);
  assert.equal(deliveries,1);
  assert.equal(checkedState(stateFile).pendingAlerts.length,0);
  const unchanged=await observe();
  assert.equal(unchanged.status,'NO_CHANGES');
  assert.equal(unchanged.alerts.length,0);
  assert.ok(system.state.requests.every(x=>x.method==='GET'));
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('E2E source errors never replace a durable checkpoint',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-integration-fail-'));
 const stateFile=path.join(root,'watchdog.json'),system=fakeSystem();
 const opts=()=>({stateFile,sentryOrg:'example-org',sentryProjectId:'123456',
  sentryToken,githubToken:ghToken,fetchSentry:system.fetchSentry,fetchGitHub:system.fetchGitHub});
 try{
  await observeOnce(opts());const before=fs.readFileSync(stateFile,'utf8');
  system.state.failSentry=true;
  await assert.rejects(()=>observeOnce(opts()));
  assert.equal(fs.readFileSync(stateFile,'utf8'),before);
  system.state.failSentry=false;system.state.forgedRepo=true;
  await assert.rejects(()=>observeOnce(opts()),/JARVIS_REPO_IDENTITY_MISMATCH/);
  assert.equal(fs.readFileSync(stateFile,'utf8'),before);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
