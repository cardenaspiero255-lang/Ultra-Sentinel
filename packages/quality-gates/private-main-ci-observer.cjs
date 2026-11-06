'use strict';
/**
 * Read-only GitHub observation of one narrowly pinned main-branch CI policy.
 * The transport and this module must run in a trusted operator environment.
 * This is not artifact attestation, a review, an evaluation of all gates, or
 * authority to repair, release, merge, deploy, or change repository visibility.
 */
const crypto=require('node:crypto');
const REPOSITORY='cardenaspiero255-lang/Ultra-Sentinel';
const REPOSITORY_ID=1418338512,OWNER_ID=322222186,WORKFLOW_ID=383941728;
const WORKFLOW_PATH='.github/workflows/architecture.yml';
// The known workflow policy must be independently reviewed before updating.
const WORKFLOW_BLOB='1a211ffa81107f6caa6f31eb6d67680cb3b943a9';
const JOB='structure-and-contracts',STEP='Verify architecture (no external integrations)';
const API='https://api.github.com/repos/'+REPOSITORY;
const SHA=/^[a-f0-9]{40}$/,MAX_BYTES=1024*1024;
function fail(code){throw Error('PRIVATE_MAIN_CI_'+code);}
function validRun(x,{runId,headSha}){
 return x&&x.id===runId&&x.workflow_id===WORKFLOW_ID&&x.path===WORKFLOW_PATH&&x.event==='push'&&
  x.head_branch==='main'&&x.head_sha===headSha&&x.head_commit?.id===headSha&&
  x.status==='completed'&&x.conclusion==='success'&&
  Number.isSafeInteger(x.run_attempt)&&x.run_attempt>0&&
  x.repository?.id===REPOSITORY_ID&&x.repository?.full_name===REPOSITORY&&
  x.repository?.owner?.id===OWNER_ID&&x.head_repository?.id===REPOSITORY_ID&&
  x.head_repository?.full_name===REPOSITORY;
}
async function observePrivateMainCI({headSha,runId,token,fetchImpl=globalThis.fetch}={}){
 if(!SHA.test(headSha||'')||!Number.isSafeInteger(runId)||runId<1||
  typeof token!=='string'||token.length<8||token.length>2048||
  !/^[\x21-\x7e]+$/.test(token)||typeof fetchImpl!=='function')fail('INVALID_INPUT');
 async function get(path){
  const url=API+path;
  let response;
  try{response=await fetchImpl(url,{method:'GET',redirect:'error',signal:AbortSignal.timeout(15000),
   headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
    'X-GitHub-Api-Version':'2022-11-28','User-Agent':'Ultra-Sentinel-Private-CI-Observer'}});}
  catch{fail('TRANSPORT_UNAVAILABLE');}
  if(!response||response.status!==200||(response.url&&response.url!==url))fail('API_UNAVAILABLE');
  if(!/application\/(?:json|vnd\.github\+json)/i.test(response.headers?.get?.('content-type')||''))
   fail('INVALID_CONTENT_TYPE');
  const declared=response.headers?.get?.('content-length');
  if(declared&&(!/^\d+$/.test(declared)||Number(declared)>MAX_BYTES))fail('RESPONSE_TOO_LARGE');
  if(!response.body||typeof response.body.getReader!=='function')fail('STREAM_REQUIRED');
  const reader=response.body.getReader(),chunks=[];
  let size=0;
  try{
   while(true){
    const {done,value}=await reader.read();if(done)break;
    if(!(value instanceof Uint8Array))fail('INVALID_RESPONSE');
    size+=value.byteLength;
    if(size>MAX_BYTES){await reader.cancel();fail('RESPONSE_TOO_LARGE');}
    chunks.push(Buffer.from(value));
   }
  }catch(e){if(e?.message?.startsWith('PRIVATE_MAIN_CI_'))throw e;fail('INVALID_RESPONSE');}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{fail('INVALID_JSON');}
 }
 const runPath='/actions/runs/'+runId;
 const first=await get(runPath);
 if(!validRun(first,{runId,headSha}))fail('RUN_MISMATCH');
 const attempt=first.run_attempt;
 const source=await get('/contents/'+WORKFLOW_PATH+'?ref='+headSha);
 if(source?.type!=='file'||source.path!==WORKFLOW_PATH||source.sha!==WORKFLOW_BLOB||
  source.encoding!=='base64'||typeof source.content!=='string'||
  !Number.isSafeInteger(source.size)||source.size<1||source.size>MAX_BYTES)fail('WORKFLOW_SOURCE_MISMATCH');
 const base64=source.content.replace(/\n/g,'');
 if(!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64))
  fail('WORKFLOW_SOURCE_MISMATCH');
 const bytes=Buffer.from(base64,'base64');
 const blob=crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
 if(bytes.length!==source.size||bytes.toString('base64')!==base64||blob!==WORKFLOW_BLOB)
  fail('WORKFLOW_SOURCE_MISMATCH');
 const page=await get(runPath+'/attempts/'+attempt+'/jobs?per_page=100&page=1');
 if(page?.total_count!==1||!Array.isArray(page.jobs)||page.jobs.length!==1)fail('JOBS_INCOMPLETE');
 const job=page.jobs[0];
 if(!job||!Number.isSafeInteger(job.id)||job.id<1||job.run_id!==runId||
  job.head_sha!==headSha||job.name!==JOB||job.status!=='completed'||
  job.conclusion!=='success'||!Array.isArray(job.steps))fail('JOB_MISMATCH');
 const steps=job.steps.filter(s=>s?.name===STEP);
 if(steps.length!==1||steps[0].status!=='completed'||steps[0].conclusion!=='success')
  fail('REQUIRED_STEP_MISMATCH');
 const last=await get(runPath);
 if(!validRun(last,{runId,headSha})||last.run_attempt!==attempt)fail('RUN_CHANGED');
 return Object.freeze({schema:'ultra-sentinel-private-main-ci-observation/v1',
  repository:REPOSITORY,headSha,runId,attempt,workflowId:WORKFLOW_ID,
  workflowBlobSha:WORKFLOW_BLOB,jobId:job.id,requiredStep:STEP,
  status:'PINNED_MAIN_CI_METADATA_OBSERVED',githubApiTransportRequired:true,
  artifactDigestsVerified:false,workflowExecutionIndependentlyAttested:false,
  allPrivateControlsVerified:false,realWorldEvidenceAuthenticated:false,
  releaseAuthorized:false,mergeAllowed:false,autoRepairAllowed:false,deploymentAllowed:false,
  limitation:'Snapshot of GitHub run, job, required step and pinned workflow source only; does not attest test semantics, logs, artifacts, other controls, current main, or later reruns. Trusted host and GitHub API transport are required.'});
}
module.exports={observePrivateMainCI};
