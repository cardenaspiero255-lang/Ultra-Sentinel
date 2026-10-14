'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {evaluateParityCampaign}=require('../../packages/quality-gates/shadow-parity-metrics.cjs');
const sha='a'.repeat(40),base='b'.repeat(40),repo='cardenaspiero255-lang/gamehub-ultra';
const a={rule:'SPEECH_REENTRANT_RETRY',path:'app/src/main/java/voice/Ultra.kt',line:34};
const b={rule:'UNSCOPED_COROUTINE',path:'app/src/main/java/voice/Ultra.kt',line:65};
const c={rule:'PRIVILEGED_UNTRUSTED_CHECKOUT',path:'.github/workflows/ci.yml',line:12};
const sample=()=>({repository:repo,pr:132,headSha:sha,baseSha:base,sourceCheckState:'SUCCESS',
 labels:[{...a,positive:true},{...b,positive:false},{...c,positive:true}],
 baseline:[a,b],candidate:[a,c]});
function campaign(s){return {schema:'ultra-sentinel-parity-campaign/v1',samples:[s]};}
test('labeled parity evaluator computes objective precision recall F1 and count deltas',()=>{
 const r=evaluateParityCampaign(campaign(sample()));
 assert.equal(r.verdict,'EVALUATION_ONLY_NOT_CERTIFIED');
 assert.equal(r.samples[0].baseline.tp,1);
 assert.equal(r.samples[0].baseline.fp,1);
 assert.equal(r.samples[0].baseline.fn,1);
 assert.equal(r.samples[0].candidate.tp,2);
 assert.equal(r.samples[0].candidate.fp,0);
 assert.equal(r.samples[0].candidate.fn,0);
 assert.equal(r.samples[0].candidate.precision,1);
 assert.equal(r.samples[0].candidate.recall,1);
 assert.equal(r.samples[0].candidate.f1,1);
 assert.equal(r.candidateNonRegressionInSuppliedLabels,true);
 assert.equal(r.semanticEquivalenceCertified,false);
 assert.equal(r.independentLabelsCertified,false);
 assert.equal(r.autoMerge,false);
});
test('any failing or incomplete source CI blocks parity certification despite perfect fixtures',()=>{
 for(const status of ['BLOCKED_SOURCE_CI','INCOMPLETE_SOURCE_CI']){
  const r=evaluateParityCampaign(campaign({...sample(),sourceCheckState:status}));
  assert.equal(r.verdict,'BLOCKED_SOURCE_CI');
  assert.equal(r.candidateNonRegressionInSuppliedLabels,false);
  assert.equal(r.semanticEquivalenceCertified,false);
 }
});
test('unlabelled, duplicated, malformed and traversal findings fail closed',()=>{
 const x=sample();
 for(const modified of [
  {...x,labels:x.labels.slice(0,2)},
  {...x,baseline:[...x.baseline,...x.baseline]},
  {...x,labels:[...x.labels,x.labels[0]]},
  {...x,candidate:[{...c,path:'../escape.kt'}]},
  {...x,labels:[{...a,positive:true},{...c,positive:true}]},
  {...x,headSha:'invalid'}
 ])assert.throws(()=>evaluateParityCampaign(campaign(modified)));
});
test('campaign never mixes unrelated PR identities or reports a zero-sample victory',()=>{
 assert.throws(()=>evaluateParityCampaign({schema:'ultra-sentinel-parity-campaign/v1',samples:[]}));
 assert.throws(()=>evaluateParityCampaign({schema:'ultra-sentinel-parity-campaign/v1',samples:[sample(),sample()]}),/DUPLICATE_CAMPAIGN_PR/);
 const x=sample(),withRegression={...x,candidate:[a,b]};
 const r=evaluateParityCampaign(campaign(withRegression));
 assert.equal(r.candidateNonRegressionInSuppliedLabels,true);
 assert.equal(r.semanticEquivalenceCertified,false);
});
