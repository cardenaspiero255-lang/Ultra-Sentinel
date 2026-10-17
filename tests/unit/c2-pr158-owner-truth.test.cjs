'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {presealPr158}=require('../../packages/quality-gates/c2-pr158-owner-truth.cjs');
// Synthetic fixtures exercise only the schema; real owner CI authenticates the 11-label artifact.
const prior={
 schema:'ultra-sentinel-c2-pr152-owner-source-truth-seal/v1',
 status:'SOURCE_BEHAVIOR_TRUTH_PARTIAL',repository:'cardenaspiero255-lang/gamehub-ultra',
 packetDigest:'f5f2f66b31e5dc768c18be68bef29cbd0f97c8161fda212ce2ae1e64eb664b34',
 presealDigest:'3872fdcd4e42fe3ed09192f29fe44af3a25ba2f9419f781446b0e549aecd8efc',
 ownerRunId:39057159822,sourceCIAuthenticated:true,benchmarkCertified:false,
 sourcePositiveLabels:6,verifiedScopedNegativeLabels:5,neededAdditionalLabelsAtLeast:109,
 benchmarkScoredLabels:0,precision:null,recall:null,f1:null,fpNonRegressionVerified:false,
 tripleSPlusCertified:false,candidatePredictionsRead:false,baselinePredictionsRead:false,
 canMerge:false,verdict:'TRUTH_CORPUS_INCOMPLETE',
 labels:Array.from({length:11},(_,i)=>({
  pr:150+i,headSha:'a'.repeat(40),blobSha:'b'.repeat(40),
  rule:'CONTROL_'+i,path:'original/control_'+i+'.kt',line:i+1,positive:i<6
 }))
};
const witness={
 schema:'ultra-sentinel-c2-pr158-advanced-ttl-witness/v1',
 pr:158,headSha:'9d8572afedc634ac07dae58a0da326ea62bdc1da',
 blobSha:'0d18a43a8e36ea3edacc2cad72071d96aa31626e',
 sourceSha256:'99a229e357823d65d7b04b642c9cf1ba312a35d0308da635ee38c425c8576591',
 oracleSha256:'a'.repeat(64),originalLogSha256:'b'.repeat(64),
 counterfactualLogSha256:'c'.repeat(64),positiveControlPassed:true,
 originalDefectReproduced:true,counterfactualPassed:true,
 productionCallsitesAttested:true,planningConsumerAttested:true,
 candidateRead:false,baselineRead:false
};
const call=(p=prior,w=witness)=>presealPr158({prior:structuredClone(p),witness:structuredClone(w)});
test('one added original positive, 12 unique labels, scores withheld',()=>{
 const r=call();assert.equal(r.labels.length,12);assert.equal(r.sourcePositiveLabels,7);
 assert.equal(r.verifiedScopedNegativeLabels,5);assert.equal(r.neededAdditionalLabelsAtLeast,108);
 assert.equal(r.status,'OWNER_CI_ATTESTATION_REQUIRED');assert.equal(r.precision,null);
 assert.equal(r.recall,null);assert.equal(r.f1,null);assert.equal(r.tripleSPlusCertified,false);
 assert.equal(r.labels[0].rule,'ADVANCED_SIGNAL_TTL_REFRESH_EXTENSION');
});
test('reject prior owner seal mismatch',()=>{
 assert.throws(()=>call({...prior,presealDigest:'0'.repeat(64)}),/BLOCKED/);
});
test('reject prior owner identity mismatch',()=>{
 assert.throws(()=>call({...prior,ownerRunId:22}),/BLOCKED/);
});
test('reject untrusted or scored prior',()=>{
 for(const values of [{sourceCIAuthenticated:false},{benchmarkScoredLabels:1},{precision:1},{candidatePredictionsRead:true}])
  assert.throws(()=>call({...prior,...values}),/BLOCKED/);
});
test('reject duplicate prior identities',()=>{
 const p=structuredClone(prior);p.labels[1]=structuredClone(p.labels[0]);
 assert.throws(()=>call(p),/BLOCKED/);
});
test('reject same new rule/path/line in historical truth',()=>{
 const p=structuredClone(prior);
 p.labels[0]={...p.labels[0],pr:158,rule:'ADVANCED_SIGNAL_TTL_REFRESH_EXTENSION',
   path:'app/src/main/java/com/cardenaspiero255/gamehubultra/ai/UltraFrontierWorldState.kt',line:114};
 assert.throws(()=>call(p),/BLOCKED/);
});
test('reject unpinned original source or head',()=>{
 for(const patch of [{blobSha:'0'.repeat(40)},{headSha:'a'.repeat(40)},{sourceSha256:'f'.repeat(64)}])
  assert.throws(()=>call(prior,{...witness,...patch}),/BLOCKED/);
});
test('reject unproven original, absent control and absent patch sensitivity',()=>{
 for(const patch of [{originalDefectReproduced:false},{positiveControlPassed:false},{counterfactualPassed:false}])
  assert.throws(()=>call(prior,{...witness,...patch}),/BLOCKED/);
});
test('reject unproven producer, planner, or model contamination',()=>{
 for(const patch of [{productionCallsitesAttested:false},{planningConsumerAttested:false},{candidateRead:true},{baselineRead:true}])
  assert.throws(()=>call(prior,{...witness,...patch}),/BLOCKED/);
});
test('reject malformed or surplus witness fields',()=>{
 for(const patch of [{foo:123},{originalLogSha256:'not-a-hash'},{oracleSha256:'A'.repeat(64)}])
  assert.throws(()=>call(prior,{...witness,...patch}),/BLOCKED/);
});
