'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {scoreKnownRegressions,EXPECTED}=require('../../packages/quality-gates/c2-known-regression-replay.cjs');
const {LOCK}=require('../../packages/quality-gates/c2-unseen-holdout.cjs');
function samples(){
 return EXPECTED.map(t=>{
  const f=LOCK.cases.find(c=>c.pr===t.pr);
  return {pr:t.pr,headSha:f.headSha,baseSha:f.baseSha,
   changedFiles:f.changedFiles,source:'VERIFIED_PINNED_GITHUB_COMPARE_TARGET',
   partial:false,nonPositionalFindings:0,findings:[]};
 });
}
function finding(x){return {rule:x.rule,path:x.path,line:x.line};}
test('three corrections replay positively while scorecard correctly stays unmeasured',()=>{
 const input=samples();for(let i=0;i<3;i++)input[i].findings=[finding(EXPECTED[i])];
 const r=scoreKnownRegressions(input,'a'.repeat(40));
 assert.equal(r.schema,'ultra-sentinel-c2-known-regressions/v1');
 assert.deepEqual(r.knownRegressionMatches,{total:3,detected:3,missed:0});
 assert.equal(r.legacyFrozenBaselineMatches,0);
 assert.equal(r.unlabelledAdditionalFindings,0);
 assert.equal(r.trainingOnly,true);assert.equal(r.freshHoldout,false);
 assert.equal(r.wholePrCoverage,false);assert.equal(r.precision,null);
 assert.equal(r.recall,null);assert.equal(r.f1,null);
 assert.equal(r.fpNonRegressionVerified,false);
 assert.equal(r.tripleSPlusCertified,false);assert.equal(r.autoRepair,false);
});
test('additional alerts cannot be turned into unverified false positives or truth negatives',()=>{
 const x=samples();x[0].findings=[finding(EXPECTED[0]),
  {rule:'UNSCOPED_COROUTINE',path:EXPECTED[0].path,line:300}];
 const r=scoreKnownRegressions(x,'b'.repeat(40));
 assert.equal(r.knownRegressionMatches.detected,1);
 assert.equal(r.unlabelledAdditionalFindings,1);
 assert.equal(r.falsePositivesVerified,null);
 assert.equal(r.precision,null);
});
test('stale source, forged rule, duplicates and old model ID fail closed',()=>{
 const mutations=[
  x=>x[0].headSha='f'.repeat(40),
  x=>x[1].baseSha='0'.repeat(40),
  x=>x[0].source='UNVERIFIED',
  x=>x[0].findings.push({...finding(EXPECTED[0]),positive:true}),
  x=>x[0].findings.push({...finding(EXPECTED[0]),line:0}),
  x=>x[0].findings.push({...finding(EXPECTED[0]),line:45,fakeLabel:true}),
  x=>x[0].findings.push(finding(EXPECTED[0]),finding(EXPECTED[0])),
  x=>x[1].nonPositionalFindings=-1,
  x=>x[2].partial=true
 ];
 for(const m of mutations){const x=samples();m(x);
  assert.throws(()=>scoreKnownRegressions(x,'a'.repeat(40)),/C2_KNOWN_REPLAY_UNVERIFIED/);}
 assert.throws(()=>scoreKnownRegressions(samples(),LOCK.modelSourceSha),
  /C2_KNOWN_REPLAY_UNVERIFIED/);
});
