'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {CASES,presealTwoNegatives}=require('../../packages/quality-gates/c2-run16-two-negatives.cjs');
// Synthetic fixtures test validator only: they are NEVER source-truth labels.
const prior={schema:'ultra-sentinel-c2-pr158-owner-source-truth-seal/v1',
 status:'SOURCE_BEHAVIOR_TRUTH_PARTIAL',
 repository:'cardenaspiero255-lang/gamehub-ultra',
 packetDigest:'f5f2f66b31e5dc768c18be68bef29cbd0f97c8161fda212ce2ae1e64eb664b34',
 presealDigest:'aa5de2d6028806b2f88aa1b027a5a8ede2d1aa75c3edd6385879ab100d68f0e3',
 ownerRunId:39059101315,sourceCIAuthenticated:true,benchmarkCertified:false,
 sourcePositiveLabels:7,verifiedScopedNegativeLabels:5,neededAdditionalLabelsAtLeast:108,
 benchmarkScoredLabels:0,precision:null,recall:null,f1:null,
 tripleSPlusCertified:false,fpNonRegressionVerified:false,
 candidatePredictionsRead:false,baselinePredictionsRead:false,canMerge:false,
 verdict:'TRUTH_CORPUS_INCOMPLETE',
 labels:Array.from({length:12},(_,i)=>({
  pr:150+i,headSha:'a'.repeat(40),blobSha:'b'.repeat(40),
  rule:'PREVIOUS_RULE_'+i,path:'previous/file'+i+'.kt',line:i+1,positive:i<7
 }))};
const witnesses=CASES.map((c,i)=>({
 schema:'ultra-sentinel-c2-run16-negative-witness/v1',
 pr:c.pr,headSha:c.headSha,blobSha:c.blobSha,sourceSha256:c.sourceSha256,
 oracleSha256:String(i+1).repeat(64),originalLogSha256:'a'.repeat(64),
 mutantLogSha256:'b'.repeat(64),originalPassed:true,controlsPassed:true,mutantKilled:true,
 productionCallsitesAttested:true,candidateInspected:false,baselineInspected:false
}));
const review=(p=prior,w=witnesses)=>presealTwoNegatives({prior:structuredClone(p),witnesses:structuredClone(w)});
test('two authentic candidates are appended without artificial scoring',()=>{
 const r=review();assert.equal(r.labels.length,14);
 assert.equal(r.sourcePositiveLabels,7);assert.equal(r.verifiedScopedNegativeLabels,7);
 assert.equal(r.neededAdditionalLabelsAtLeast,106);assert.equal(r.precision,null);
 assert.equal(r.recall,null);assert.equal(r.f1,null);
 assert.equal(r.canMerge,false);assert.equal(r.tripleSPlusCertified,false);
 assert.equal(r.status,'OWNER_CI_ATTESTATION_REQUIRED');
 assert.equal(r.labels[0].positive,false);assert.equal(r.labels[1].positive,false);
});
test('reject bad prior truth digest and incorrect owner run',()=>{
 for(const patch of [{presealDigest:'c'.repeat(64)},{ownerRunId:5},
  {sourceCIAuthenticated:false},{sourcePositiveLabels:8},{verifiedScopedNegativeLabels:6}])
  assert.throws(()=>review({...prior,...patch}),/BLOCKED/);
});
test('reject contaminated previous labels and wrong old counts',()=>{
 const p=structuredClone(prior);p.labels[1]={...p.labels[0]};
 assert.throws(()=>review(p),/BLOCKED/);
 const q=structuredClone(prior);q.labels[0].positive=false;
 assert.throws(()=>review(q),/BLOCKED/);
});
test('reject reused new identity and duplicate witness',()=>{
 const p=structuredClone(prior);p.labels[0]={...p.labels[0],
  pr:CASES[0].pr,rule:CASES[0].rule,path:CASES[0].path,line:CASES[0].line};
 assert.throws(()=>review(p),/BLOCKED/);
 assert.throws(()=>review(prior,[witnesses[0],witnesses[0]]),/BLOCKED/);
});
test('reject SHA change or changed PR order',()=>{
 for(const patch of [{blobSha:'f'.repeat(40)},{headSha:'b'.repeat(40)},
  {sourceSha256:'a'.repeat(64)},{pr:153}])
  assert.throws(()=>review(prior,[{...witnesses[0],...patch},witnesses[1]]),/BLOCKED/);
});
test('reject oracle that did not prove sensitive original safe behavior',()=>{
 for(const patch of [{originalPassed:false},{controlsPassed:false},{mutantKilled:false},
  {productionCallsitesAttested:false}])
  assert.throws(()=>review(prior,[witnesses[0],{...witnesses[1],...patch}]),/BLOCKED/);
});
test('reject inference from detector outputs or prior benchmark scores',()=>{
 for(const patch of [{candidateInspected:true},{baselineInspected:true}])
  assert.throws(()=>review(prior,[{...witnesses[0],...patch},witnesses[1]]),/BLOCKED/);
 for(const patch of [{benchmarkScoredLabels:12},{precision:0.98},{f1:1}])
  assert.throws(()=>review({...prior,...patch}),/BLOCKED/);
});
test('reject evidence with extra properties or malformed hash',()=>{
 assert.throws(()=>review(prior,[{...witnesses[0],extras:true},witnesses[1]]),/BLOCKED/);
 assert.throws(()=>review(prior,[{...witnesses[0],oracleSha256:'not-a-sha'},witnesses[1]]),/BLOCKED/);
});
