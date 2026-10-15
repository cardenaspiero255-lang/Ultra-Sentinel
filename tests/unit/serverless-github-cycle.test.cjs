'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {runGithubOnlyCycle}=require('../../apps/watchdog/serverless-github-cycle.cjs');
const {checkedState,pendingDigest,acknowledgeDelivery}=require('../../apps/watchdog/watchdog-run-once.cjs');
const GH='https://api.github.com/repos/';
const sha='a'.repeat(40);
function github(){
 const data={jarvisSha:sha,gamehubSha:sha,fail:false,requests:[]};
 const fetchImpl=async(url,options)=>{
  data.requests.push({url,method:options.method});
  assert.equal(options.method,'GET');
  assert.equal(options.redirect,'error');
  if(data.fail)return {status:503,url,headers:{get:()=> 'application/json'},
   text:async()=>JSON.stringify({error:'FAILURE'})};
  let body;
  switch(url.slice(GH.length)){
   case 'cardenaspiero255-lang/JARVIS':
    body={id:1349889592,full_name:'cardenaspiero255-lang/JARVIS',
     owner:{id:322222186},default_branch:'main',archived:false};break;
   case 'cardenaspiero255-lang/JARVIS/pulls?state=open&per_page=30&page=1':
    body=[{number:7,state:'open',draft:false,head:{sha:data.jarvisSha},
     base:{repo:{id:1349889592}}}];break;
   case 'cardenaspiero255-lang/gamehub-ultra/pulls?state=open&sort=updated&direction=desc&per_page=100':
    body=[{number:132,state:'open',title:'GameHub voice',head:{sha:data.gamehubSha}}];break;
   case 'cardenaspiero255-lang/gamehub-ultra/pulls/132':
    body={number:132,state:'open',head:{sha:data.gamehubSha},
     base:{repo:{id:1375408706,full_name:'cardenaspiero255-lang/gamehub-ultra',
      owner:{id:322222186}}}};break;
   default:throw Error('UNEXPECTED_ROUTE');
  }
  return {status:200,url,headers:{get:()=> 'application/json'},
   text:async()=>JSON.stringify(body)};
 };
 return {data,fetchImpl};
}
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'ultra-serverless-'));
 return {root,stateFile:path.join(root,'github-checkpoint.json')};
}
const token='test-read-only-github-token';
test('serverless explicit bootstrap and successive read-only polls persist only public repository state',async()=>{
 const f=fixture(),gh=github();
 try{
  await assert.rejects(runGithubOnlyCycle({stateFile:f.stateFile,githubToken:token,
   fetchImpl:gh.fetchImpl}),/PERSISTED_STATE_REQUIRED_MANUAL_BOOTSTRAP/);
  const first=await runGithubOnlyCycle({stateFile:f.stateFile,
   githubToken:token,bootstrap:true,fetchImpl:gh.fetchImpl});
  assert.equal(first.status,'BASELINE_INITIALIZED_NO_ALERT');
  assert.equal(first.publicArtifactOnly,true);
  assert.equal(first.sentryConnected,false);
  assert.equal(first.deploy24x7,false);
  assert.equal(checkedState(f.stateFile).checkpoint.issues.length,0);
  assert.equal(checkedState(f.stateFile).checkpoint.gamehub.pr,132);
  await assert.rejects(runGithubOnlyCycle({stateFile:f.stateFile,githubToken:token,
   bootstrap:true,fetchImpl:gh.fetchImpl}),/BOOTSTRAP_WOULD_DISCARD_PRIOR_STATE/);
  const same=await runGithubOnlyCycle({stateFile:f.stateFile,
   githubToken:token,fetchImpl:gh.fetchImpl});
  assert.equal(same.status,'NO_CHANGES');
  assert.deepEqual(same.alerts,[]);
  assert.ok(gh.data.requests.every(x=>x.method==='GET'));
  assert.doesNotMatch(fs.readFileSync(f.stateFile,'utf8'),/test-read-only-github-token|sentry|email/i);
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
test('serverless emitted alerts replay after restart until durable Actions output acknowledgment',async()=>{
 const f=fixture(),gh=github();
 try{
  await runGithubOnlyCycle({stateFile:f.stateFile,githubToken:token,
   bootstrap:true,fetchImpl:gh.fetchImpl});
  gh.data.jarvisSha='b'.repeat(40);
  gh.data.gamehubSha='c'.repeat(40);
  const changed=await runGithubOnlyCycle({stateFile:f.stateFile,
   githubToken:token,fetchImpl:gh.fetchImpl});
  assert.deepEqual(changed.alerts.map(x=>x.type),
   ['JARVIS_PR_HEAD_CHANGED','GAMEHUB_PR_HEAD_CHANGED']);
  const replay=await runGithubOnlyCycle({stateFile:f.stateFile,
   githubToken:token,fetchImpl:async()=>{throw Error('NO_POLL_WHEN_PENDING')}});
  assert.equal(replay.status,'REPLAY_PERSISTED_ALERTS');
  assert.deepEqual(replay.alerts,changed.alerts);
  acknowledgeDelivery(f.stateFile,pendingDigest(changed.alerts));
  assert.equal((await runGithubOnlyCycle({stateFile:f.stateFile,
   githubToken:token,fetchImpl:gh.fetchImpl})).status,'NO_CHANGES');
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
test('incompatible private incident checkpoint is rejected before GitHub requests',async()=>{
 const f=fixture(),gh=github();
 try{
  await runGithubOnlyCycle({stateFile:f.stateFile,githubToken:token,
   bootstrap:true,fetchImpl:gh.fetchImpl});
  const state=checkedState(f.stateFile);
  state.checkpoint.issues=['a'.repeat(24)];
  fs.writeFileSync(f.stateFile,JSON.stringify(state),{mode:0o600});
  await assert.rejects(runGithubOnlyCycle({stateFile:f.stateFile,
   githubToken:token,fetchImpl:async()=>{throw Error('NO_CALLS')} }),
   /PRIVATE_OR_INCOMPATIBLE_STATE_FORBIDDEN/);
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
test('GitHub REST failure never overwrites checkpoint with a fake healthy baseline',async()=>{
 const f=fixture(),gh=github();
 try{
  await runGithubOnlyCycle({stateFile:f.stateFile,githubToken:token,
   bootstrap:true,fetchImpl:gh.fetchImpl});
  const before=fs.readFileSync(f.stateFile,'utf8');
  gh.data.fail=true;
  await assert.rejects(runGithubOnlyCycle({stateFile:f.stateFile,
   githubToken:token,fetchImpl:gh.fetchImpl}));
  assert.equal(fs.readFileSync(f.stateFile,'utf8'),before);
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
test('serverless workflow has main-only schedule, no writes, explicit artifact recovery and bounded retention',()=>{
 const workflow=fs.readFileSync(path.resolve(__dirname,
  '../../.github/workflows/serverless-github-monitor.yml'),'utf8');
 for(const token of [
  "cron: '17,47 * * * *'","workflow_dispatch:",
  "contents: read","pull-requests: read","actions: read",
  "cancel-in-progress: false","github.ref == 'refs/heads/main'",
  'persist-credentials: false','PERSISTED_STATE_REQUIRED_MANUAL_BOOTSTRAP',
  'retention-days: 7','steps.observe.outputs.checkpoint_valid',
  'actions/upload-artifact@b7c566a772e6b6bfb58ed0dc250532a479d7789f'
 ])assert.ok(workflow.includes(token),token);
 assert.doesNotMatch(workflow,/contents: write|pull-requests: write|pull_request_target|secrets\.|git push|workflow_run:/);
 assert.match(workflow,/\.path == "\.github\/workflows\/serverless-github-monitor\.yml"/);
});
