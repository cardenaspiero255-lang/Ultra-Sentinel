'use strict';
/* Independent observer: run on a separate host, not in the monitored workflow.
 * GitHub is read-only. The outbox sends sanitized events with at-least-once
 * delivery; HTTP acceptance does not establish that a person received them.
 */
const {checkedState,storeHeartbeatAudit}=require('./watchdog-run-once.cjs');
const {deliverPending,validateDeliveryConfiguration}=require('./watchdog-deliver.cjs');
const BASE='https://api.github.com/repos/cardenaspiero255-lang/Ultra-Sentinel';
const RUNS=BASE+'/actions/workflows/serverless-github-monitor.yml/runs?event=schedule&per_page=100';
const MAIN=BASE+'/commits/main';
const SHA=/^[a-f0-9]{40}$/;
function blocked(){throw Error('HEARTBEAT_SOURCE_UNAVAILABLE');}
async function readJson(url,token,fetchImpl){
 let response;
 try{response=await fetchImpl(url,{method:'GET',redirect:'error',signal:AbortSignal.timeout(12000),
  headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
   'X-GitHub-Api-Version':'2022-11-28','User-Agent':'Ultra-Sentinel-Heartbeat'}});}
 catch{blocked();}
 if(!response||response.status!==200||response.url!==url||
  !/application\/(?:json|[^;]+\+json)/i.test(response.headers?.get?.('content-type')||''))blocked();
 let raw;
 try{raw=await response.text();}catch{blocked();}
 if(typeof raw!=='string'||Buffer.byteLength(raw,'utf8')>4*1024*1024)blocked();
 try{return JSON.parse(raw)}catch{blocked();}
}
async function loadSchedule({githubToken,fetchGitHub,now}){
 if(typeof githubToken!=='string'||githubToken.length<16||githubToken.length>2048||
  !/^[\x21-\x7e]+$/.test(githubToken)||typeof fetchGitHub!=='function')blocked();
 if(typeof now!=='string'||!Number.isFinite(Date.parse(now)))blocked();
 const cutoff=new Date(Date.parse(now)-24*60*60*1000).toISOString();
 const first=await readJson(MAIN,githubToken,fetchGitHub);
 if(typeof first?.sha!=='string'||!SHA.test(first.sha))blocked();
 const runs=[];let expectedTotal=null;
 for(let page=1;page<=5;page++){
  const data=await readJson(RUNS+'&created='+encodeURIComponent('>='+cutoff)+'&page='+page,githubToken,fetchGitHub);
  if(!Number.isSafeInteger(data?.total_count)||data.total_count<0||data.total_count>500||
   !Array.isArray(data.workflow_runs)||data.workflow_runs.length>100)blocked();
  if(expectedTotal===null)expectedTotal=data.total_count;
  if(data.total_count!==expectedTotal)blocked();
  runs.push(...data.workflow_runs);
  if(runs.length>expectedTotal)blocked();
  if(runs.length===expectedTotal)break;
  if(data.workflow_runs.length!==100)blocked();
 }
 if(runs.length!==expectedTotal)blocked();
 const last=await readJson(MAIN,githubToken,fetchGitHub);
 if(last?.sha!==first.sha)blocked();
 return {runs,expectedSha:first.sha};
}
async function runHeartbeatMonitor({stateFile,githubToken,endpoint,token,signingSecret,
 fetchGitHub=globalThis.fetch,fetchAlert=globalThis.fetch,now}={}){
 validateDeliveryConfiguration({endpoint,token,signingSecret,fetchImpl:fetchAlert});
 const existing=checkedState(stateFile);
 if(existing&&existing.heartbeat===undefined)throw Error('STATE_FILE_NOT_HEARTBEAT');
 const delivery={stateFile,endpoint,token,signingSecret,fetchImpl:fetchAlert};
 let accepted=false;
 if(existing?.pendingAlerts.length){
  await deliverPending(delivery);
  accepted=true;
 }
 let input;
 try{
  const captured=await loadSchedule({githubToken,fetchGitHub,now:now??new Date().toISOString()});
  input={...captured,now:now??new Date().toISOString()};
 }catch{input={runs:null,expectedSha:'',now:now??new Date().toISOString()};}
 const observation=storeHeartbeatAudit(stateFile,input);
 if(observation.status==='HEARTBEAT_ALERT_PENDING'){
  await deliverPending(delivery);
  accepted=true;
 }
 return Object.freeze({schema:'ultra-sentinel-external-heartbeat/v1',
  verdict:observation.verdict,status:observation.status,
  deliveryAccepted:accepted,endUserDeliveryVerified:false,
  certified24x7:false,sourceAuthenticityVerified:input.runs!==null});
}
if(require.main===module){
 runHeartbeatMonitor({stateFile:process.env.ULTRA_SENTINEL_HEARTBEAT_STATE_FILE,
  githubToken:process.env.ULTRA_SENTINEL_READONLY_GITHUB_TOKEN,
  endpoint:process.env.ULTRA_SENTINEL_ALERT_WEBHOOK_URL,
  token:process.env.ULTRA_SENTINEL_ALERT_AUTH_TOKEN,
  signingSecret:process.env.ULTRA_SENTINEL_ALERT_SIGNING_SECRET
 }).then(result=>{
  process.stdout.write(JSON.stringify(result)+'\n');
  if(result.verdict!=='PUNCTUALITY_OBSERVED_NOT_24X7')process.exitCode=2;
 }).catch(()=>{process.stderr.write('HEARTBEAT_MONITOR_BLOCKED\n');process.exitCode=1;});
}
module.exports={loadSchedule,runHeartbeatMonitor};
