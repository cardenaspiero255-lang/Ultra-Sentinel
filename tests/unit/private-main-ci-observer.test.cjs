'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {observePrivateMainCI}=require('../../packages/quality-gates/private-main-ci-observer.cjs');
const REPO='cardenaspiero255-lang/Ultra-Sentinel',SHA='a'.repeat(40),ID=12345;
const PATH='.github/workflows/architecture.yml';
const blob=fs.readFileSync(path.join(__dirname,'../../',PATH));
function fixture(){
 const repo={id:1418338512,full_name:REPO,owner:{id:322222186}};
 const run={id:ID,workflow_id:383941728,path:PATH,event:'push',head_branch:'main',head_sha:SHA,
  head_commit:{id:SHA},status:'completed',conclusion:'success',run_attempt:1,
  repository:repo,head_repository:{id:repo.id,full_name:REPO}};
 const source={type:'file',path:PATH,sha:'1a211ffa81107f6caa6f31eb6d67680cb3b943a9',
  encoding:'base64',size:blob.length,content:blob.toString('base64')};
 const job={id:102,run_id:ID,head_sha:SHA,name:'structure-and-contracts',
  status:'completed',conclusion:'success',steps:[{name:'Verify architecture (no external integrations)',
   status:'completed',conclusion:'success'}]};
 return {run,source,page:{total_count:1,jobs:[job]},job};
}
function remote(f,{onRequest=()=>{}}={}){
 const calls=[];let runReads=0;
 return {calls,fetchImpl:async(url,opts)=>{
  calls.push({url,opts});onRequest({url,opts,calls,runReads});
  assert.equal(opts.method,'GET');assert.equal(opts.redirect,'error');
  assert.equal(opts.headers.Authorization,'Bearer private-token-for-tests');
  const p=new URL(url).pathname;
  let data;
  if(p.endsWith('/actions/runs/'+ID)){runReads++;data=f.run;}
  else if(p.endsWith('/contents/'+PATH))data=f.source;
  else if(p.endsWith('/actions/runs/'+ID+'/attempts/1/jobs'))data=f.page;
  else throw Error('UNEXPECTED_URL');
  return new Response(JSON.stringify(data),{status:200,headers:{'content-type':'application/json'}});
 }};
}
async function execute(mutate=()=>{},options={}){
 const f=fixture();mutate(f);const r=remote(f,options);
 const result=await observePrivateMainCI({headSha:SHA,runId:ID,token:'private-token-for-tests',fetchImpl:r.fetchImpl});
 return {result,calls:r.calls};
}
test('observes pinned main CI metadata and keeps all release authority disabled',async()=>{
 const {result,calls}=await execute();
 assert.equal(result.status,'PINNED_MAIN_CI_METADATA_OBSERVED');
 assert.equal(result.headSha,SHA);assert.equal(result.attempt,1);
 assert.equal(result.realWorldEvidenceAuthenticated,false);
 assert.equal(result.artifactDigestsVerified,false);
 assert.equal(result.releaseAuthorized,false);assert.equal(result.mergeAllowed,false);
 assert.equal(result.autoRepairAllowed,false);assert.equal(result.deploymentAllowed,false);
 assert.equal(calls.length,4);assert.ok(calls.every(c=>c.opts.method==='GET'));
 assert.ok(calls.some(c=>c.url.endsWith('?ref='+SHA)));
});
test('rejects wrong SHA, fork, branch, workflow, failure, incomplete or wrong run identity',async()=>{
 for(const mutate of [
  f=>{f.run.head_sha='b'.repeat(40);},f=>{f.run.head_commit.id='b'.repeat(40);},
  f=>{f.run.head_repository.id=42;},f=>{f.run.repository.owner.id=1;},
  f=>{f.run.head_branch='other';},f=>{f.run.event='pull_request';},
  f=>{f.run.workflow_id=7;},f=>{f.run.path='.github/workflows/other.yml';},
  f=>{delete f.run.path;},f=>{f.run.id++;},f=>{f.run.status='in_progress';},
  f=>{f.run.conclusion='failure';},f=>{f.run.run_attempt=0;}
 ])await assert.rejects(()=>execute(mutate),/RUN_MISMATCH/);
});
test('rejects tampered or unpinned workflow bytes, incomplete jobs and skipped required step',async()=>{
 for(const mutate of [
  f=>{f.source.sha='b'.repeat(40);},f=>{f.source.content=Buffer.alloc(blob.length).toString('base64');},
  f=>{f.source.path='other.yml';},f=>{f.source.size++;},
  f=>{f.page.total_count=2;},f=>{f.page.jobs=[];},f=>{f.job.head_sha='b'.repeat(40);},
  f=>{f.job.run_id++;},f=>{f.job.conclusion='failure';},
  f=>{f.job.steps[0].conclusion='skipped';},f=>{f.job.steps.push({...f.job.steps[0]});}
 ])await assert.rejects(()=>execute(mutate),/SOURCE_MISMATCH|JOBS_INCOMPLETE|JOB_MISMATCH|REQUIRED_STEP_MISMATCH/);
});
test('rerun during observation invalidates the snapshot',async()=>{
 const f=fixture(),r=remote(f,{onRequest:({runReads,url})=>{
  if(runReads===1&&url.endsWith('/actions/runs/'+ID))f.run.run_attempt=2;
 }});
 await assert.rejects(()=>observePrivateMainCI({headSha:SHA,runId:ID,token:'private-token-for-tests',fetchImpl:r.fetchImpl}),/RUN_CHANGED/);
});
test('fails closed on redirect, non-JSON and oversized response',async()=>{
 for(const response of [
  new Response('{}',{status:302,headers:{location:'https://other.invalid'}}),
  new Response('{}',{status:200,headers:{'content-type':'text/html'}}),
  new Response('x'.repeat(1024*1024+1),{status:200,headers:{'content-type':'application/json'}})
 ])await assert.rejects(()=>observePrivateMainCI({headSha:SHA,runId:ID,token:'private-token-for-tests',fetchImpl:async()=>response}),
  /API_UNAVAILABLE|INVALID_CONTENT_TYPE|RESPONSE_TOO_LARGE/);
});
test('transport errors never expose credentials or backend error text',async()=>{
 await assert.rejects(()=>observePrivateMainCI({headSha:SHA,runId:ID,
  token:'private-token-for-tests',fetchImpl:async()=>{throw Error('private-token-for-tests');}}),
  e=>e.message==='PRIVATE_MAIN_CI_TRANSPORT_UNAVAILABLE');
});
