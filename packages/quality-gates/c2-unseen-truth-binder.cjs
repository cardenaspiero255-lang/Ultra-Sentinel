'use strict';
/** Separately witnessed behavior, not candidate-scored certification. */
const crypto=require('node:crypto');
const {LOCK}=require('./c2-unseen-holdout.cjs');
const EVIDENCE_SHA256=Object.freeze({
 freeze:'c4f578c62724db0953f0b1c326a27c22c5c7b000dde25cf9491d666b9e5f1905',
 positive:'a3b2a3060451eb640ccbbaeb3c39eb96b1a3f4b5af1dace5023be866fc1faa74',
 benign:'5c80df24751d477521561f115904eddeea2a8e6c507ba89b02595239f8b9813d'
});
const packetDigest='b2a60512a647579b1af857fb0f3dc45c9d756ba076309a04e0acf3f0a3bdc48e';
const sourcePath='app/src/main/java/com/cardenaspiero255/gamehubultra/voice/UltraSpeechChunker.kt';
const expectedLimitation='Commit identities are frozen; source semantics, label correctness, '+
 'CI provenance and measurement of previously unseen defects remain unverified. '+
 'Do not evaluate the candidate before constructing independent test oracles.';
function fail(){throw Error('C2_UNSEEN_TRUTH_UNVERIFIED');}
function exact(x,keys){
 return x!==null&&typeof x==='object'&&!Array.isArray(x)&&
  Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
}
function validateFreeze(f){
 if(!exact(f,['schema','status','repository','modelSourceSha','packetDigest',
  'cases','knownCaseTrainingOverlap','includesPredictions','includesTruthLabels',
  'includesBaseline','labelsVerified','precision','recall','f1',
  'unseenDefectsVerified','canCertify','canMerge','canRepair','limitations'])||
  f.schema!=='ultra-sentinel-c2-unseen-holdout-freeze/v1'||
  f.status!=='FROZEN_INPUT_ONLY'||f.repository!==LOCK.repository||
  f.modelSourceSha!==LOCK.modelSourceSha||f.packetDigest!==packetDigest||
  f.knownCaseTrainingOverlap!==0||f.includesPredictions!==false||
  f.includesTruthLabels!==false||f.includesBaseline!==false||
  f.labelsVerified!==0||f.precision!==null||f.recall!==null||f.f1!==null||
  f.unseenDefectsVerified!==0||f.canCertify!==false||
  f.canMerge!==false||f.canRepair!==false||
  f.limitations!==expectedLimitation||
  !Array.isArray(f.cases)||f.cases.length!==4)fail();
 for(let i=0;i<LOCK.cases.length;i++){
  const item=f.cases[i],expected=LOCK.cases[i];
  if(!exact(item,['pr','headSha','baseSha','changedFiles','state'])||
    Object.keys(expected).some(k=>item[k]!==expected[k]))fail();
 }
}
function validatePositive(p){
 if(!exact(p,['schema','pr','sourceGitBlob','rule','path','line',
  'reproduced','defaultChunkBroken','smallChunkBroken','controlsPassed',
  'labelIsVerifiedOnlyForThisBehavior','baselineCompared','candidateInspected',
  'globalPrecision','globalRecall','globalF1','tripleSPlusCertified'])||
  p.schema!=='ultra-sentinel-c2-unseen-original-behavior/v1'||
  p.pr!==206||p.sourceGitBlob!=='6ce74fb027c0d6e3fe6cfe48d3b0b5fc1ba2497a'||
  p.rule!=='TTS_UTF16_SURROGATE_SPLIT'||p.path!==sourcePath||p.line!==26||
  p.reproduced!==true||p.defaultChunkBroken!==true||
  p.smallChunkBroken!==true||p.controlsPassed!==true||
  p.labelIsVerifiedOnlyForThisBehavior!==true||p.baselineCompared!==false||
  p.candidateInspected!==false||p.globalPrecision!==null||
  p.globalRecall!==null||p.globalF1!==null||p.tripleSPlusCertified!==false)fail();
}
function validateBenign(b){
 if(!exact(b,['schema','sourceOriginal','controls','allControlsPassed',
  'realDefectsVerified','negativeFindingLabelsEstablished','candidateInspected',
  'baselineCompared','precision','recall','f1','tripleSPlusCertified'])||
  b.schema!=='ultra-sentinel-c2-unseen-benign-controls/v1'||
  b.sourceOriginal!==true||!Array.isArray(b.controls)||b.controls.length!==3||
  b.allControlsPassed!==true||b.realDefectsVerified!==0||
  b.negativeFindingLabelsEstablished!==0||b.candidateInspected!==false||
  b.baselineCompared!==false||b.precision!==null||b.recall!==null||
  b.f1!==null||b.tripleSPlusCertified!==false)fail();
 const controls=[{pr:208,kind:'ASR_BACKOFF',passed:true},
  {pr:208,kind:'ASR_ERROR_REBUILD_SELECTIVITY',passed:true},
  {pr:206,kind:'TTS_INIT_LIFECYCLE',passed:true}];
 for(let i=0;i<controls.length;i++){
  if(!exact(b.controls[i],['pr','kind','passed'])||
    Object.keys(controls[i]).some(k=>b.controls[i][k]!==controls[i][k]))fail();
 }
}
function sealUnseenTruth({freeze,positive,benign}={}){
 validateFreeze(freeze);validatePositive(positive);validateBenign(benign);
 // The independent oracle fixture was written before candidate/baseline
 // outputs were consulted. This record never imports model findings.
 const labels=Object.freeze([Object.freeze({
  pr:positive.pr,rule:positive.rule,path:positive.path,line:positive.line,positive:true
 })]);
 const content=JSON.stringify({schema:'ultra-sentinel-c2-unseen-truth-canonical/v1',
  repository:LOCK.repository,packetDigest,modelSourceSha:LOCK.modelSourceSha,
  labels,benignBehaviorControls:3});
 const digest=crypto.createHash('sha256').update(content,'utf8').digest('hex');
 return Object.freeze({
  schema:'ultra-sentinel-c2-owner-truth-seal/v1',
  status:'SOURCE_BEHAVIOR_TRUTH_PARTIAL',repository:LOCK.repository,
  packetDigest,modelSourceSha:LOCK.modelSourceSha,
  sourceArtifacts:Object.freeze({
   freezeRun:38838525845,freezeArtifact:12019324481,
   positiveRun:38839053940,positiveArtifact:12019719566,
   benignRun:38840046800,benignArtifact:12020522075
  }),
  sourceContentSha256:EVIDENCE_SHA256,labels,
  verifiedPositiveBehavior:1,verifiedNegativeFindingLabels:0,
  benignBehaviorControls:3,remainingLabelsTo120:119,
  sealedTruthDigest:digest,includesPredictions:false,includesBaseline:false,
  precision:null,recall:null,f1:null,baselineComparable:false,
  tripleSPlusCertified:false,mergeAllowed:false,autoRepair:false,
  verdict:'TRUTH_CORPUS_INCOMPLETE',
  limitation:'A single source-reproduced positive and three benign behavior controls '+
   'do not establish 120 truth labels, a comparable legacy baseline or global '+
   'precision/recall/F1. Benign behavioral controls are NOT finding-level '+
   'true negatives without rule/path/line attribution.'
 });
}
module.exports={EVIDENCE_SHA256,sealUnseenTruth};
