'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {captureLiveC2Cohort,findingsEvidence,checksEvidence,PRS}=
 require('../../packages/quality-gates/live-gamehub-c2-cohort.cjs');
const REPO='cardenaspiero255-lang/gamehub-ultra';
const HEAD='a'.repeat(40),BASE='b'.repeat(40);
const token='test-read-only-credential-2026';
const URL='https://api.github.com/repos/'+REPO;
const goodFinding={rule:'UNSCOPED_COROUTINE',
 path:'app/src/main/java/voice/Ultra.kt',line:17};
function review(pr){
 return {pr,state:'open',authenticated:true,headStable:true,completeDiff:true,
  mergeAllowed:false,baseSha:BASE,changedFiles:4,draft:false,
  envelope:{targetRepo:REPO,headSha:HEAD},
  report:{sha:HEAD,verdict:'REVIEW_REQUIRED',omitted:0,
   coverage:{returned:4,analyzed:2,partial:false},
   findings:[{...goodFinding,severity:'HIGH',evidence:'SECRET DO NOT PUBLISH'}]}
 };
}
function mockApi(options={}){
 const calls=[];
 const fetchImpl=async(url,req)=>{
  calls.push({url,req});
  let body;
  if(url.includes('/check-runs?'))body=options.checks||{
   total_count:1,check_runs:[{id:11,name:'build',head_sha:HEAD,
    status:'completed',conclusion:'success'}]};
  else if(url.includes('/pulls/'))body={number:Number(url.split('/').at(-1)),
   state:'open',head:{sha:options.racedHead||HEAD},
   base:{sha:BASE},changed_files:4};
  else throw Error('Unexpected API URL');
  return {status:options.status||200,url,
   headers:{get:()=> 'application/json'},
   text:async()=>JSON.stringify(body)};
 };
 return {fetchImpl,calls};
}
test('four actual PR slots and sanitized candidate-only findings never generate labels or certified claims',async()=>{
 const api=mockApi();
 const r=await captureLiveC2Cohort({token,fetchImpl:api.fetchImpl,
  load:async n=>review(n)});
 assert.deepEqual(PRS,[132,158,161,163]);
 assert.equal(r.samples.length,4);
 assert.equal(r.captureStatus,'CANDIDATE_SNAPSHOT_ONLY');
 assert.equal(r.tripleSPlusCertified,false);
 assert.equal(r.independentLabelsVerified,false);
 assert.equal(r.baselineComparable,false);
 assert.equal(r.samples[0].candidate.findings[0].line,17);
 assert.equal(r.samples[0].candidate.findings[0].rule,'UNSCOPED_COROUTINE');
 assert.equal(r.samples[0].checks.observedState,'OBSERVED_SUCCESS_UNATTESTED');
 assert.doesNotMatch(JSON.stringify(r),/SECRET DO NOT PUBLISH|test-read-only-credential/);
 for(const call of api.calls){
  assert.equal(call.req.method,'GET');
  assert.equal(call.req.redirect,'error');
  assert.ok(call.url.startsWith(URL+'/'));
 }
 assert.equal(api.calls.length,8);
});
test('changed SHA between full diff and checks postflight blocks single PR, no stale clean claim',async()=>{
 const api=mockApi({racedHead:'c'.repeat(40)});
 const r=await captureLiveC2Cohort({token,fetchImpl:api.fetchImpl,load:async n=>review(n)});
 assert.equal(r.captureStatus,'INCOMPLETE_NOT_CERTIFIABLE');
 assert.ok(r.samples.every(x=>x.status==='BLOCKED_INCOMPLETE_OR_STALE'&&
  x.reason==='STALE_PR_SHA'));
});
test('403 and missing check-runs are incomplete, never green',async()=>{
 for(const api of [mockApi({status:403}),mockApi({checks:{total_count:0,check_runs:[]}})]){
  const r=await captureLiveC2Cohort({token,fetchImpl:api.fetchImpl,
   load:async n=>review(n)});
  assert.equal(r.captureStatus,'INCOMPLETE_NOT_CERTIFIABLE');
  assert.ok(r.samples.every(x=>x.status==='BLOCKED_INCOMPLETE_OR_STALE'));
 }
});
test('real CI failures, pending, skipped and missing run identities prevent fully observed state',()=>{
 const base={id:123,name:'build',head_sha:HEAD,
  status:'completed',conclusion:'success'};
 for(const [run,want] of [
  [{...base,conclusion:'failure'},'BLOCKED_SOURCE_CI'],
  [{...base,status:'in_progress',conclusion:null},'INCOMPLETE_SOURCE_CI'],
  [{...base,conclusion:'skipped'},'INCOMPLETE_SOURCE_CI']
 ]){
  const r=checksEvidence({total_count:1,check_runs:[run]},HEAD);
  assert.equal(r.observedState,want);
 }
 assert.throws(()=>checksEvidence({total_count:2,check_runs:[base]},HEAD),/INCOMPLETE_CHECKS/);
 assert.throws(()=>checksEvidence({total_count:1,check_runs:[{...base,head_sha:'b'.repeat(40)}]},HEAD),/INCOMPLETE_CHECKS/);
});
test('ambiguous, sanitized, nonpositional or partial Core results block parity gate',async()=>{
 const r=review(132).report;
 const a=findingsEvidence({...r,findings:[{...goodFinding,line:0}]},HEAD);
 assert.equal(a.coverage.partial,true);
 assert.equal(a.coverage.nonPositional,1);
 const b=findingsEvidence({...r,coverage:{...r.coverage,partial:true}},HEAD);
 assert.equal(b.coverage.partial,true);
 for(const f of [
  {...goodFinding,path:'../secret'},
  {...goodFinding,path:'/absolute'},
  {...goodFinding,path:'app/a|bad'},
  {...goodFinding,rule:'unsafe'},
  {...goodFinding,line:-10},
  {...goodFinding,line:1e9}
 ])assert.throws(()=>findingsEvidence({...r,findings:[f]},HEAD),/INCOMPLETE_CANDIDATE_ANALYSIS/);
 assert.throws(()=>findingsEvidence({...r,findings:[goodFinding,goodFinding]},HEAD),
  /INCOMPLETE_CANDIDATE_ANALYSIS/);
});
test('reader failures are minimized to known codes and do not include exception secrets',async()=>{
 const api=mockApi();
 const r=await captureLiveC2Cohort({token,fetchImpl:api.fetchImpl,
  load:async()=>{throw Error('Bearer github_pat_fake-secret-in-exception');}});
 assert.equal(r.captureStatus,'INCOMPLETE_NOT_CERTIFIABLE');
 assert.ok(r.samples.every(s=>s.reason==='UNVERIFIED_SOURCE_EVIDENCE'));
 assert.doesNotMatch(JSON.stringify(r),/Bearer|github_pat_/);
});
