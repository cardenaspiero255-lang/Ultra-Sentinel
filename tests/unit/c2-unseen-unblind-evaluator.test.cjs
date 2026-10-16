'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {evaluateFirstUnseenHoldout,TRUTH_SHA256}=
 require('../../packages/quality-gates/c2-unseen-unblind-evaluator.cjs');
const {LOCK}=require('../../packages/quality-gates/c2-unseen-holdout.cjs');
const POS=[
 {pr:205,rule:'CLAIM_VALUE_UNIT_CASE_COLLISION',
  path:'app/src/main/java/com/cardenaspiero255/gamehubultra/ai/UltraFrontierV2.kt',line:318,positive:true},
 {pr:206,rule:'TTS_UTF16_SURROGATE_SPLIT',
  path:'app/src/main/java/com/cardenaspiero255/gamehubultra/voice/UltraSpeechChunker.kt',line:26,positive:true},
 {pr:208,rule:'STALE_VOICE_ENABLED_AFTER_MIC_PERMISSION_REVOKED',
  path:'app/src/main/java/com/cardenaspiero255/gamehubultra/voice/ContinuousVoiceController.kt',line:52,positive:true}
];
function truth(){return {schema:'ultra-sentinel-c2-owner-truth-seal/v3',
 status:'SOURCE_BEHAVIOR_TRUTH_PARTIAL',repository:LOCK.repository,
 modelSourceSha:LOCK.modelSourceSha,
 sealedTruthDigest:'544fb6e0c035239166097bf5abac894ccf8d0bedc234626326a31cd7e6ee7dec',
 labels:structuredClone(POS),
 verifiedPositiveBehavior:3,verifiedNegativeFindingLabels:0,
 benignBehaviorControls:3,includesPredictions:false,includesBaseline:false,
 precision:null,recall:null,f1:null,baselineComparable:false,
 tripleSPlusCertified:false}};
function finding(p){return {rule:p.rule,path:p.path,line:p.line};}
function candidate(byPr={}){return {
 schema:'ultra-sentinel-c2-unseen-core-capture/v1',
 repository:LOCK.repository,modelSourceSha:LOCK.modelSourceSha,
 coreGitBlobs:{core:'db29f94be1e0afb791a241d26f449695df0eafd0',
  semantic:'b8b6e79c1c544a9c22ea5aa0ea857881a0e1b6d9'},
 sourceKind:'FROZEN_ORIGINAL_PR_DIFF',
 samples:[205,206,208].map(pr=>{const x=LOCK.cases.find(c=>c.pr===pr);return {
  pr,headSha:x.headSha,baseSha:x.baseSha,changedFiles:x.changedFiles,
  source:'AUTHENTICATED_IMMUTABLE_GITHUB_DIFF',partial:false,nonPositionalFindings:0,
  findings:byPr[pr]||[]};}),
 candidateOnly:true,labelsRead:false,baselineRead:false,
 allSamplesComplete:true,globalPrecision:null,globalRecall:null,globalF1:null,
 fpNonRegressionVerified:false,tripleSPlusCertified:false,
 mergeAllowed:false,autoRepair:false
};}
test('first unblinding gives true held-out hit rate but no global precision/recall/F1',()=>{
 const r=evaluateFirstUnseenHoldout({truth:truth(),candidate:candidate({
  205:[finding(POS[0])],206:[finding(POS[1])],208:[finding(POS[2])]
 })});
 assert.deepEqual(r.observedKnownPositives,{total:3,detected:3,missed:0,observedHitRate:1});
 assert.equal(r.globalPrecision,null);assert.equal(r.globalRecall,null);
 assert.equal(r.globalF1,null);assert.equal(r.fpNonRegressionVerified,false);
 assert.equal(r.certified95Percent,false);assert.equal(r.tripleSPlusCertified,false);
 assert.equal(r.verdict,'SMALL_HOLDOUT_NOT_CERTIFIABLE');
 assert.match(TRUTH_SHA256,/^[0-9a-f]{64}$/);
});
test('missed or extra predictions are observed, not silently scored as TN or FP',()=>{
 const extra={rule:'UNSCOPED_COROUTINE',path:POS[2].path,line:50};
 const r=evaluateFirstUnseenHoldout({truth:truth(),candidate:candidate({
  205:[finding(POS[0]),extra],206:[],208:[]
 })});
 assert.deepEqual(r.observedKnownPositives,{total:3,detected:1,missed:2,observedHitRate:1/3});
 assert.equal(r.unlabelledCandidateFindings,1);
 assert.equal(r.verifiedFalsePositives,null);
 assert.equal(r.globalRecall,null);
 assert.equal(r.falsePositiveRate,null);
});
test('no detections means zero selected hits, not falsely 0% global recall',()=>{
 const r=evaluateFirstUnseenHoldout({truth:truth(),candidate:candidate()});
 assert.equal(r.observedKnownPositives.detected,0);
 assert.equal(r.observedKnownPositives.missed,3);
 assert.equal(r.globalRecall,null);
});
test('changed model SHA, mismatched files, duplicates and forged metrics block unblinding',()=>{
 const mutate=[
  z=>z.truth.modelSourceSha='a'.repeat(40),
  z=>z.truth.sealedTruthDigest='f'.repeat(64),
  z=>z.truth.labels[0].path='../invalid',
  z=>z.truth.labels.push(POS[0]),
  z=>z.truth.verifiedNegativeFindingLabels=40,
  z=>z.truth.includesPredictions=true,
  z=>z.candidate.coreGitBlobs.core='b'.repeat(40),
  z=>z.candidate.samples[1].headSha='b'.repeat(40),
  z=>z.candidate.samples[0].partial=true,
  z=>z.candidate.samples[0].findings.push({...POS[0],positive:true}),
  z=>z.candidate.samples[0].findings.push({...POS[0],line:0}),
  z=>z.candidate.samples[0].findings.push({...POS[0],line:5,untrusted:'secret'}),
  z=>z.candidate.samples[1].findings.push({...POS[1],line:27}),
  z=>z.candidate.globalPrecision=0.96,
  z=>z.candidate.fpNonRegressionVerified=true,
  z=>z.candidate.baselineRead=true,
  z=>z.candidate.samples.push(z.candidate.samples[0])
 ];
 for(const change of mutate){
  const z={truth:truth(),candidate:candidate()};change(z);
  assert.throws(()=>evaluateFirstUnseenHoldout(z),/C2_UNSEEN_UNBLIND_BLOCKED/);
 }
});
