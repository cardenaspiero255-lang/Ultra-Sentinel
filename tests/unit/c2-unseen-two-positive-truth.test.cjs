'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {extendUnseenTruthV2,SOURCE_HASHES}=require('../../packages/quality-gates/c2-unseen-two-positive-truth.cjs');
const seal=()=>({
 schema:'ultra-sentinel-c2-owner-truth-seal/v1',
 status:'SOURCE_BEHAVIOR_TRUTH_PARTIAL',
 repository:'cardenaspiero255-lang/gamehub-ultra',
 packetDigest:'b2a60512a647579b1af857fb0f3dc45c9d756ba076309a04e0acf3f0a3bdc48e',
 modelSourceSha:'bb38bb77983339301cafe8a7594e258e0c2924a6',
 sealedTruthDigest:'f5bfde8f804882cf0bc5e01b34bbc962709d94dbf9f6d8b5a39faa3b747fc8f9',
 labels:[{pr:206,rule:'TTS_UTF16_SURROGATE_SPLIT',
  path:'app/src/main/java/com/cardenaspiero255/gamehubultra/voice/UltraSpeechChunker.kt',
  line:26,positive:true}],
 verifiedPositiveBehavior:1,verifiedNegativeFindingLabels:0,benignBehaviorControls:3,
 remainingLabelsTo120:119,includesPredictions:false,includesBaseline:false,
 precision:null,recall:null,f1:null,baselineComparable:false,
 tripleSPlusCertified:false,mergeAllowed:false,autoRepair:false,
 verdict:'TRUTH_CORPUS_INCOMPLETE'
});
const witness=()=>({
 schema:'ultra-sentinel-c2-unseen-pr205-value-witness/v1',
 pr:205,sourceGitBlob:'f0461cd51e00d2d7b2bc4225aeefee400e2e9fa4',
 rule:'CLAIM_VALUE_UNIT_CASE_COLLISION',
 path:'app/src/main/java/com/cardenaspiero255/gamehubultra/ai/UltraFrontierV2.kt',
 line:318,reproduced:true,observedSupportingSources:2,observedConflictingSources:0,
 numericConflictControlPassed:true,ordinaryProseControlPassed:true,
 distinctUnitClaimIdControlPassed:true,candidateInspected:false,baselineCompared:false,
 negativeFindingLabelsEstablished:0,globalPrecision:null,globalRecall:null,
 globalF1:null,tripleSPlusCertified:false
});
test('extend a previously sealed original-source dossier, not recomputing any global score',()=>{
 const r=extendUnseenTruthV2({previousSeal:seal(),pr205:witness()});
 assert.equal(r.status,'SOURCE_BEHAVIOR_TRUTH_PARTIAL');
 assert.equal(r.labels.length,2);
 assert.deepEqual(r.labels.map(l=>l.pr),[205,206]);
 assert.equal(r.labels.every(l=>l.positive===true),true);
 assert.equal(r.verifiedPositiveBehavior,2);
 assert.equal(r.verifiedNegativeFindingLabels,0);
 assert.equal(r.benignBehaviorControls,3);
 assert.equal(r.remainingLabelsTo120,118);
 assert.equal(r.neededAdditionalPositivesAtLeast,46);
 assert.equal(r.neededAdditionalNegativesAtLeast,48);
 assert.equal(r.precision,null);assert.equal(r.recall,null);assert.equal(r.f1,null);
 assert.equal(r.includesPredictions,false);assert.equal(r.includesBaseline,false);
 assert.equal(r.tripleSPlusCertified,false);assert.equal(r.mergeAllowed,false);
 assert.match(r.sealedTruthDigest,/^[0-9a-f]{64}$/);
 assert.deepEqual(extendUnseenTruthV2({previousSeal:seal(),pr205:witness()}),r);
});
test('treat tampering, missing controls or extra labels as BLOCKED, not as scores',()=>{
 const edits=[
  p=>p.pr205.pr=208,p=>p.pr205.reproduced=false,
  p=>p.pr205.observedSupportingSources=1,p=>p.pr205.observedConflictingSources=1,
  p=>p.pr205.numericConflictControlPassed=false,
  p=>p.pr205.distinctUnitClaimIdControlPassed=false,
  p=>p.pr205.candidateInspected=true,p=>p.pr205.baselineCompared=true,
  p=>p.pr205.path='another.kt',p=>p.pr205.sourceGitBlob='f'.repeat(40),
  p=>p.pr205.globalPrecision=1,p=>p.pr205.fakeFinding=false,
  p=>p.previousSeal.labels.push({pr:206,rule:'INVENTED',positive:false}),
  p=>p.previousSeal.sealedTruthDigest='f'.repeat(64),
  p=>p.previousSeal.includesPredictions=true,
  p=>p.previousSeal.verifiedNegativeFindingLabels=10,
  p=>p.previousSeal.benignBehaviorControls=100,
  p=>p.previousSeal.labels[0].line=100
 ];
 for(const edit of edits){const x={previousSeal:seal(),pr205:witness()};edit(x);
  assert.throws(()=>extendUnseenTruthV2(x),/UNVERIFIED_C2_TRUTH_EXTENSION/);}
});
test('exact source hashes and immutable evidence identities stay anchored',()=>{
 assert.deepEqual(Object.keys(SOURCE_HASHES).sort(),['pr205','previousSeal']);
 assert.equal(SOURCE_HASHES.pr205,'acfad2f0c457103819206a15e2a8f5d59382cc9f37a54a07fb3f3ca2983ae918');
 assert.equal(SOURCE_HASHES.previousSeal,'53192822e5736996a6040c914972a7ce0de17835ae03480e484a6a79766b612e');
});
