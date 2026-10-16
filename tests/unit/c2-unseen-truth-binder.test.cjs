'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {LOCK}=require('../../packages/quality-gates/c2-unseen-holdout.cjs');
const {sealUnseenTruth,EVIDENCE_SHA256}=require('../../packages/quality-gates/c2-unseen-truth-binder.cjs');
function freeze(){
 return {schema:'ultra-sentinel-c2-unseen-holdout-freeze/v1',status:'FROZEN_INPUT_ONLY',
  repository:LOCK.repository,modelSourceSha:LOCK.modelSourceSha,
  packetDigest:'b2a60512a647579b1af857fb0f3dc45c9d756ba076309a04e0acf3f0a3bdc48e',
  cases:LOCK.cases,knownCaseTrainingOverlap:0,includesPredictions:false,
  includesTruthLabels:false,includesBaseline:false,labelsVerified:0,
  precision:null,recall:null,f1:null,unseenDefectsVerified:0,
  canCertify:false,canMerge:false,canRepair:false,
  limitations:'Commit identities are frozen; source semantics, label correctness, '+
  'CI provenance and measurement of previously unseen defects remain unverified. '+
  'Do not evaluate the candidate before constructing independent test oracles.'};
}
const positive=()=>({schema:'ultra-sentinel-c2-unseen-original-behavior/v1',
 pr:206,sourceGitBlob:'6ce74fb027c0d6e3fe6cfe48d3b0b5fc1ba2497a',
 rule:'TTS_UTF16_SURROGATE_SPLIT',
 path:'app/src/main/java/com/cardenaspiero255/gamehubultra/voice/UltraSpeechChunker.kt',
 line:26,reproduced:true,defaultChunkBroken:true,smallChunkBroken:true,
 controlsPassed:true,labelIsVerifiedOnlyForThisBehavior:true,
 baselineCompared:false,candidateInspected:false,
 globalPrecision:null,globalRecall:null,globalF1:null,tripleSPlusCertified:false});
const benign=()=>({schema:'ultra-sentinel-c2-unseen-benign-controls/v1',
 sourceOriginal:true,controls:[
 {pr:208,kind:'ASR_BACKOFF',passed:true},
 {pr:208,kind:'ASR_ERROR_REBUILD_SELECTIVITY',passed:true},
 {pr:206,kind:'TTS_INIT_LIFECYCLE',passed:true}
 ],allControlsPassed:true,realDefectsVerified:0,
 negativeFindingLabelsEstablished:0,candidateInspected:false,baselineCompared:false,
 precision:null,recall:null,f1:null,tripleSPlusCertified:false});
test('seals one novel original-source positive without manufacturing three truth negatives',()=>{
 const z=sealUnseenTruth({freeze:freeze(),positive:positive(),benign:benign()});
 assert.equal(z.status,'SOURCE_BEHAVIOR_TRUTH_PARTIAL');
 assert.equal(z.labels.length,1);assert.equal(z.labels[0].positive,true);
 assert.deepEqual(z.labels[0],{pr:206,rule:'TTS_UTF16_SURROGATE_SPLIT',
  path:'app/src/main/java/com/cardenaspiero255/gamehubultra/voice/UltraSpeechChunker.kt',
  line:26,positive:true});
 assert.equal(z.verifiedPositiveBehavior,1);
 assert.equal(z.verifiedNegativeFindingLabels,0);
 assert.equal(z.benignBehaviorControls,3);
 assert.equal(z.remainingLabelsTo120,119);
 assert.equal(z.includesPredictions,false);
 assert.equal(z.includesBaseline,false);
 assert.equal(z.precision,null);assert.equal(z.recall,null);assert.equal(z.f1,null);
 assert.equal(z.tripleSPlusCertified,false);
 assert.equal(z.mergeAllowed,false);assert.equal(z.autoRepair,false);
 assert.match(z.sealedTruthDigest,/^[a-f0-9]{64}$/);
 assert.deepEqual(sealUnseenTruth({freeze:freeze(),positive:positive(),benign:benign()}),z);
});
test('any tamper of source, line, control result, labels or baseline leaks blocks sealing',()=>{
 const mods=[
 a=>a.positive.pr=205,
 a=>a.positive.line=27,
 a=>a.positive.sourceGitBlob='a'.repeat(40),
 a=>a.positive.defaultChunkBroken=false,
 a=>a.positive.candidateInspected=true,
 a=>a.positive.baselineCompared=true,
 a=>a.positive.fakeLabel=true,
 a=>a.benign.controls[0].passed=false,
 a=>a.benign.controls[1].kind='UNKNOWN',
 a=>a.benign.controls.push(a.benign.controls[0]),
 a=>a.benign.negativeFindingLabelsEstablished=3,
 a=>a.freeze.packetDigest='b'.repeat(64),
 a=>a.freeze.cases[0].pr=73,
 a=>a.freeze.modelSourceSha='a'.repeat(40),
 a=>a.freeze.includesPredictions=true,
 a=>a.freeze.fakeBaseline=[],
 ];
 for(const mutate of mods){
  const a=structuredClone({freeze:freeze(),positive:positive(),benign:benign()});
  mutate(a);assert.throws(()=>sealUnseenTruth(a),/C2_UNSEEN_TRUTH_UNVERIFIED/);
 }
});
test('pinned SHA-256s tie all three real artifacts to exact bytes',()=>{
 assert.deepEqual(Object.keys(EVIDENCE_SHA256).sort(),['benign','freeze','positive']);
 for(const value of Object.values(EVIDENCE_SHA256))assert.match(value,/^[a-f0-9]{64}$/);
 assert.equal(EVIDENCE_SHA256.positive,'a3b2a3060451eb640ccbbaeb3c39eb96b1a3f4b5af1dace5023be866fc1faa74');
 assert.equal(EVIDENCE_SHA256.benign,'5c80df24751d477521561f115904eddeea2a8e6c507ba89b02595239f8b9813d');
 assert.equal(EVIDENCE_SHA256.freeze,'c4f578c62724db0953f0b1c326a27c22c5c7b000dde25cf9491d666b9e5f1905');
});
