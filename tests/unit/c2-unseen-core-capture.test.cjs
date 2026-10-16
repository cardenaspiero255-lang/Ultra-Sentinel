'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {captureUnseenCoreHoldout,CORE_BLOBS}=require('../../packages/quality-gates/c2-unseen-core-capture.cjs');
const {LOCK}=require('../../packages/quality-gates/c2-unseen-holdout.cjs');
const PRS=[205,206,208];
function source(pr){
 const pinned=LOCK.cases.find(x=>x.pr===pr);
 return {pr,state:pinned.state,authenticated:true,headStable:true,completeDiff:true,
  mergeAllowed:false,changedFiles:pinned.changedFiles,baseSha:pinned.baseSha,
  envelope:{targetRepo:LOCK.repository,headSha:pinned.headSha},
  report:{sha:pinned.headSha,omitted:0,verdict:'NO_CRITICAL_PATTERN',
   coverage:{returned:pinned.changedFiles,analyzed:pinned.changedFiles,partial:false},
   findings:[{rule:'POSSIBLE_SECURITY_BUG',path:'app/src/main/java/com/example/Test.kt',line:16},
    {rule:'REGRESSION_TEST_COVERAGE',path:'app/src/main/java/com/example/Test.kt',line:0}]}
 };
}
test('captures three immutable holdout PRs without looking at oracle truth',async()=>{
 const called=[];
 const r=await captureUnseenCoreHoldout({token:'valid-mock-auth',load:async(pr,opt)=>{
  called.push({pr,hydrate:opt.hydrateSource});return source(pr);
 }});
 assert.deepEqual(called.map(x=>x.pr),PRS);
 assert.ok(called.every(x=>x.hydrate));
 assert.equal(r.schema,'ultra-sentinel-c2-unseen-core-capture/v1');
 assert.equal(r.modelSourceSha,LOCK.modelSourceSha);
 assert.deepEqual(r.samples.map(s=>s.pr),PRS);
 assert.deepEqual(r.samples.map(s=>s.findings[0].rule),Array(3).fill('POSSIBLE_SECURITY_BUG'));
 assert.ok(r.samples.every(s=>s.nonPositionalFindings===1));
 assert.equal(r.candidateOnly,true);
 assert.equal(r.labelsRead,false);assert.equal(r.baselineRead,false);
 assert.equal(r.globalPrecision,null);assert.equal(r.globalRecall,null);assert.equal(r.globalF1,null);
 assert.equal(r.tripleSPlusCertified,false);
 assert.doesNotMatch(JSON.stringify(r),/\"evidence\"|\"patch\"|\"fullSource\"|\"token\"/);
 assert.deepEqual(Object.keys(CORE_BLOBS).sort(),['core','semantic']);
 assert.match(CORE_BLOBS.core,/^[a-f0-9]{40}$/);
});
test('never certifies a PR whose HEAD/base/coverage/identity changed',async()=>{
 const mutants=[
 x=>x.envelope.headSha='a'.repeat(40),
 x=>x.baseSha='b'.repeat(40),
 x=>x.state='open',
 x=>x.changedFiles++,
 x=>x.authenticated=false,
 x=>x.completeDiff=false,
 x=>x.headStable=false,
 x=>x.envelope.targetRepo='other/repo',
 x=>x.report.coverage.partial=true,
 x=>x.report.omitted=1,
 x=>x.report.sha='f'.repeat(40),
 x=>x.report.verdict='INCOMPLETE',
 x=>x.report.findings.push({...x.report.findings[0],rule:'POSSIBLE_SECURITY_BUG'})
 ];
 for(const change of mutants){
  await assert.rejects(captureUnseenCoreHoldout({token:'valid-mock-auth',
   load:async pr=>{const x=source(pr);if(pr===205)change(x);return x}}),
   /C2_UNSEEN_CORE_CAPTURE_BLOCKED/);
 }
});
test('forged prediction schema and invalid token are rejected',async()=>{
 await assert.rejects(captureUnseenCoreHoldout({token:'bad',load:async pr=>source(pr)}),
  /C2_UNSEEN_CORE_CAPTURE_BLOCKED/);
 for(const mutation of [r=>{r.report.findings[0].line=-1},
   r=>{r.report.findings[0].path='../escape'},
   r=>{r.report.findings[0].rule='unexpected format'},
   r=>{r.report.findings[0].evidence='untrusted code'},
   r=>{r.report.findings[0].baseline='same'},
   r=>{r.report.findings=Array(41).fill(r.report.findings[0])}]){
  await assert.rejects(captureUnseenCoreHoldout({token:'valid-mock-auth',
   load:async pr=>{const r=source(pr);if(pr===206)mutation(r);return r}}),
  /C2_UNSEEN_CORE_CAPTURE_BLOCKED/);
 }
});
