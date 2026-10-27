'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {assessLiveRegisteredRepairPr}=require('../../packages/recovery/registered-pr-live-handoff.cjs');

const SHA='a'.repeat(40), HEAD='b'.repeat(40), BLOB='c'.repeat(40);
const REPO='cardenaspiero255-lang/gamehub-ultra';
const BASE='https://api.github.com/repos/'+REPO;
const SOURCE='app/src/main/java/com/cardenaspiero255/gamehubultra/domain/BatteryAwareGamingEngine.kt';
const REGRESSION='app/src/test/java/com/cardenaspiero255/gamehubultra/domain/BatteryAwareGamingEngineTest.kt';
const TOKEN='read-only-token-for-e2e-123456';
const plan={targetRepo:REPO,targetFile:SOURCE,maxChangedFiles:1,baseSha:SHA,
 candidateSha:HEAD,candidateBlob:BLOB,remoteWrites:false,mergeAllowed:false};
const pr={number:245,state:'open',draft:false,mergeable:true,changed_files:2,
 head:{sha:HEAD,repo:{full_name:REPO}},
 base:{sha:SHA,ref:'main',repo:{full_name:REPO}}};
const files=[{filename:SOURCE,status:'modified',sha:BLOB},
 {filename:REGRESSION,status:'modified',sha:'d'.repeat(40)}];
const names=['build','quality','android-test-shards','device-validation',
 'coverage','quality-contracts','SonarCloud Code Analysis'];
const checks=names.map((name,i)=>({id:i+1,name,head_sha:HEAD,
 status:'completed',conclusion:'success'}));
function ok(url,data){return {status:200,url,headers:{get:()=> 'application/json'},
 text:async()=>JSON.stringify(data)};}
function gateway({first=pr,last=pr,results=checks,listed=files,total=results.length,
 secondPage=null}={}){
 let read=0;const urls=[];
 const fetchImpl=async (url,options)=>{
  urls.push(url);
  assert.equal(options.method,'GET');
  assert.equal(options.redirect,'error');
  assert.equal(options.headers.Authorization,'Bearer '+TOKEN);
  if(url===BASE+'/pulls/245')return ok(url,++read===1?first:last);
  if(url===BASE+'/pulls/245/files?per_page=100&page=1')return ok(url,listed);
  if(url===BASE+'/commits/'+HEAD+'/check-runs?filter=latest&per_page=100&page=1')
   return ok(url,{total_count:total,check_runs:results});
  if(url===BASE+'/commits/'+HEAD+'/check-runs?filter=latest&per_page=100&page=2')
   return ok(url,{total_count:total,check_runs:secondPage});
  throw Error('UNEXPECTED_NETWORK_TARGET');
 };
 return {fetchImpl,urls};
}
test('GitHub PR -> complete files -> pinned CI -> re-read PR -> protected review (no writes)',async()=>{
 const mock=gateway();
 const result=await assessLiveRegisteredRepairPr({plan,prNumber:245,token:TOKEN,
  fetchImpl:mock.fetchImpl});
 assert.equal(result.status,'PR_REVIEW_READY_NO_AUTO_MERGE');
 assert.equal(result.headSha,HEAD);
 assert.equal(result.requiredChecksPassed,7);
 assert.equal(result.remoteWrites,false);
 assert.equal(result.autoMergeAllowed,false);
 assert.equal(result.releaseAuthorized,false);
 assert.equal(mock.urls.filter(u=>u===BASE+'/pulls/245').length,2);
 assert.equal(mock.urls.length,4);
});
test('partial check-run list cannot pass the required gate',async()=>{
 const mock=gateway({total:101});
 await assert.rejects(
  assessLiveRegisteredRepairPr({plan,prNumber:245,token:TOKEN,fetchImpl:mock.fetchImpl}),
  /LIVE_HANDOFF_EVIDENCE_BLOCKED/);
});
test('SHA change between first and last GitHub PR fetch fails closed',async()=>{
 const mock=gateway({last:{...pr,head:{...pr.head,sha:'e'.repeat(40)}}});
 await assert.rejects(
  assessLiveRegisteredRepairPr({plan,prNumber:245,token:TOKEN,fetchImpl:mock.fetchImpl}),
  /LIVE_HANDOFF_EVIDENCE_BLOCKED/);
});
test('an extra failed check or tampered source blob blocks a handoff',async()=>{
 for(const options of [
  {results:[...checks,{id:99,name:'security',head_sha:HEAD,status:'completed',conclusion:'failure'}]},
  {listed:[{...files[0],sha:'e'.repeat(40)},files[1]]}
 ]){
  const mock=gateway(options);
  await assert.rejects(assessLiveRegisteredRepairPr({plan,prNumber:245,token:TOKEN,
   fetchImpl:mock.fetchImpl}),/LIVE_HANDOFF_EVIDENCE_BLOCKED/);
 }
});
test('a complete second page of check runs is included before final approval',async()=>{
 const extras=Array.from({length:100},(_,i)=>({id:1000+i,name:'optional-'+i,
  head_sha:HEAD,status:'completed',conclusion:'success'}));
 const mock=gateway({results:extras,total:107,secondPage:checks});
 const result=await assessLiveRegisteredRepairPr({plan,prNumber:245,token:TOKEN,
  fetchImpl:mock.fetchImpl});
 assert.equal(result.status,'PR_REVIEW_READY_NO_AUTO_MERGE');
 assert.ok(mock.urls.some(u=>u.includes('page=2')));
});
test('API redirect, unauthenticated response and malformed input never authorize review',async()=>{
 const mock=gateway();
 await assert.rejects(assessLiveRegisteredRepairPr({plan,prNumber:245,token:'',
  fetchImpl:mock.fetchImpl}),/LIVE_HANDOFF_EVIDENCE_BLOCKED/);
 const redirect=async url=>({status:200,url:'https://attacker.example/payload',
  headers:{get:()=> 'application/json'},text:async()=>JSON.stringify(pr)});
 await assert.rejects(assessLiveRegisteredRepairPr({plan,prNumber:245,token:TOKEN,
  fetchImpl:redirect}),/LIVE_HANDOFF_EVIDENCE_BLOCKED/);
});
