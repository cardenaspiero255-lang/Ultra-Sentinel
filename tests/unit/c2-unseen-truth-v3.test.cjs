'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {extendUnseenTruthV3,HASHES}=require('../../packages/quality-gates/c2-unseen-truth-v3.cjs');
const previous=()=>({
 schema:'ultra-sentinel-c2-owner-truth-seal/v2',status:'SOURCE_BEHAVIOR_TRUTH_PARTIAL',
 repository:'cardenaspiero255-lang/gamehub-ultra',
 packetDigest:'b2a60512a647579b1af857fb0f3dc45c9d756ba076309a04e0acf3f0a3bdc48e',
 modelSourceSha:'bb38bb77983339301cafe8a7594e258e0c2924a6',
 sealedTruthDigest:'4c47368b09d33dbb7a8d4580dfb43d63f56e25b00a3f324d7128d4042472ea3a',
 labels:[
  {pr:205,rule:'CLAIM_VALUE_UNIT_CASE_COLLISION',
   path:'app/src/main/java/com/cardenaspiero255/gamehubultra/ai/UltraFrontierV2.kt',
   line:318,positive:true},
  {pr:206,rule:'TTS_UTF16_SURROGATE_SPLIT',
   path:'app/src/main/java/com/cardenaspiero255/gamehubultra/voice/UltraSpeechChunker.kt',
   line:26,positive:true}
 ],
 verifiedPositiveBehavior:2,verifiedNegativeFindingLabels:0,benignBehaviorControls:3,
 remainingLabelsTo120:118,neededAdditionalPositivesAtLeast:46,
 neededAdditionalNegativesAtLeast:48,includesPredictions:false,includesBaseline:false,
 precision:null,recall:null,f1:null,baselineComparable:false,
 unseenRecallCertified:false,noFalsePositiveIncreaseCertified:false,
 tripleSPlusCertified:false,mergeAllowed:false,autoRepair:false,
 verdict:'TRUTH_CORPUS_INCOMPLETE'
});
const witness=()=>({
 schema:'ultra-sentinel-c2-unseen-pr208-voice-permission-witness/v1',
 pr:208,sourceGitBlob:'9298fe614e1ddbad27e2253c02e9415122cfa263',
 rule:'STALE_VOICE_ENABLED_AFTER_MIC_PERMISSION_REVOKED',
 path:'app/src/main/java/com/cardenaspiero255/gamehubultra/voice/ContinuousVoiceController.kt',
 line:52,reproduced:true,staleEnabledAfterDenied:true,stopCallMissing:true,
 freshPermissionControlPassed:true,resumeControlPassed:true,
 systemRestrictionControlPassed:true,securityExceptionControlPassed:true,
 disableControlPassed:true,candidateInspected:false,baselineCompared:false,
 physicalMicObserved:false,negativeFindingLabelsEstablished:0,
 precision:null,recall:null,f1:null,tripleSPlusCertified:false
});
test('extend without changing older certified source receipts or computing false percentages',()=>{
 const r=extendUnseenTruthV3({previousSeal:previous(),witness208:witness()});
 assert.equal(r.labels.length,3);
 assert.deepEqual(r.labels.map(x=>x.pr),[205,206,208]);
 assert.equal(r.verifiedPositiveBehavior,3);
 assert.equal(r.verifiedNegativeFindingLabels,0);
 assert.equal(r.benignBehaviorControls,3);
 assert.equal(r.remainingLabelsTo120,117);
 assert.equal(r.neededAdditionalPositivesAtLeast,45);
 assert.equal(r.neededAdditionalNegativesAtLeast,48);
 assert.equal(r.precision,null);assert.equal(r.recall,null);assert.equal(r.f1,null);
 assert.equal(r.includesPredictions,false);assert.equal(r.includesBaseline,false);
 assert.equal(r.noFalsePositiveIncreaseCertified,false);
 assert.equal(r.tripleSPlusCertified,false);
 assert.match(r.sealedTruthDigest,/^[0-9a-f]{64}$/);
 assert.deepEqual(r,extendUnseenTruthV3({previousSeal:previous(),witness208:witness()}));
});
test('reject all forged input, and never classify controls as negative findings',()=>{
 const mutants=[
 x=>x.witness208.pr=172,x=>x.witness208.line=20,
 x=>x.witness208.reproduced=false,
 x=>x.witness208.securityExceptionControlPassed=false,
 x=>x.witness208.staleEnabledAfterDenied=false,
 x=>x.witness208.physicalMicObserved=true,
 x=>x.witness208.candidateInspected=true,
 x=>x.witness208.negativeFindingLabelsEstablished=5,
 x=>x.witness208.fakePredictions=[],
 x=>x.previousSeal.sealedTruthDigest='f'.repeat(64),
 x=>x.previousSeal.labels[0].line=500,
 x=>x.previousSeal.labels.push({pr:205,rule:'DUPLICATE',line:318,positive:true}),
 x=>x.previousSeal.verifiedNegativeFindingLabels=20,
 x=>x.previousSeal.includesPredictions=true
 ];
 for(const mutate of mutants){const x={previousSeal:previous(),witness208:witness()};
  mutate(x);assert.throws(()=>extendUnseenTruthV3(x),/C2_V3_UNVERIFIED_TRUTH/);}
});
test('two exact artifacts are SHA-256 fixed',()=>{
 assert.deepEqual(Object.keys(HASHES).sort(),['previousSeal','witness208']);
 assert.equal(HASHES.previousSeal,'6aa98b59650c76e2bf4da7641975c2830b2a7d6a4ed5dc65cf020e894105592c');
 assert.equal(HASHES.witness208,'7e49616a3e8aa156b1708d84667b1d67ef937cc32c271fab15896da41e41f8f8');
});
