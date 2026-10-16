'use strict';
const crypto=require('node:crypto');
const HASHES=Object.freeze({
 previousSeal:'6aa98b59650c76e2bf4da7641975c2830b2a7d6a4ed5dc65cf020e894105592c',
 witness208:'7e49616a3e8aa156b1708d84667b1d67ef937cc32c271fab15896da41e41f8f8'
});
const REPO='cardenaspiero255-lang/gamehub-ultra';
const PACKET='b2a60512a647579b1af857fb0f3dc45c9d756ba076309a04e0acf3f0a3bdc48e';
const MODEL='bb38bb77983339301cafe8a7594e258e0c2924a6';
const PREVIOUS_DIGEST='4c47368b09d33dbb7a8d4580dfb43d63f56e25b00a3f324d7128d4042472ea3a';
const LABELED=Object.freeze([
 Object.freeze({pr:205,rule:'CLAIM_VALUE_UNIT_CASE_COLLISION',
  path:'app/src/main/java/com/cardenaspiero255/gamehubultra/ai/UltraFrontierV2.kt',
  line:318,positive:true}),
 Object.freeze({pr:206,rule:'TTS_UTF16_SURROGATE_SPLIT',
  path:'app/src/main/java/com/cardenaspiero255/gamehubultra/voice/UltraSpeechChunker.kt',
  line:26,positive:true})
]);
const LAST=Object.freeze({pr:208,rule:'STALE_VOICE_ENABLED_AFTER_MIC_PERMISSION_REVOKED',
 path:'app/src/main/java/com/cardenaspiero255/gamehubultra/voice/ContinuousVoiceController.kt',
 line:52,positive:true});
const ALLOWED_PREVIOUS=new Set(['schema','status','repository','packetDigest','modelSourceSha',
 'predecessorDigest','sourceHashes','provenance','labels','verifiedPositiveBehavior',
 'verifiedNegativeFindingLabels','benignBehaviorControls','remainingLabelsTo120',
 'neededAdditionalPositivesAtLeast','neededAdditionalNegativesAtLeast',
 'sealedTruthDigest','includesPredictions','includesBaseline','precision','recall',
 'f1','baselineComparable','unseenRecallCertified','noFalsePositiveIncreaseCertified',
 'tripleSPlusCertified','mergeAllowed','autoRepair','verdict','limitation']);
function fail(){throw Error('C2_V3_UNVERIFIED_TRUTH');}
function exact(o,keys){return o!==null&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));}
function previous(s){
 if(!s||typeof s!=='object'||Array.isArray(s)||
  Object.keys(s).some(k=>!ALLOWED_PREVIOUS.has(k))||
  s.schema!=='ultra-sentinel-c2-owner-truth-seal/v2'||
  s.status!=='SOURCE_BEHAVIOR_TRUTH_PARTIAL'||
  s.repository!==REPO||s.packetDigest!==PACKET||
  s.modelSourceSha!==MODEL||s.sealedTruthDigest!==PREVIOUS_DIGEST||
  s.verifiedPositiveBehavior!==2||s.verifiedNegativeFindingLabels!==0||
  s.benignBehaviorControls!==3||s.remainingLabelsTo120!==118||
  s.neededAdditionalPositivesAtLeast!==46||
  s.neededAdditionalNegativesAtLeast!==48||
  s.includesPredictions!==false||s.includesBaseline!==false||
  s.precision!==null||s.recall!==null||s.f1!==null||
  s.baselineComparable!==false||s.unseenRecallCertified!==false||
  s.noFalsePositiveIncreaseCertified!==false||
  s.tripleSPlusCertified!==false||s.mergeAllowed!==false||
  s.autoRepair!==false||s.verdict!=='TRUTH_CORPUS_INCOMPLETE'||
  !Array.isArray(s.labels)||s.labels.length!==2)fail();
 for(let i=0;i<2;i++){
  if(!exact(s.labels[i],['pr','rule','path','line','positive'])||
   Object.keys(LABELED[i]).some(k=>s.labels[i][k]!==LABELED[i][k]))fail();
 }
}
function witness(w){
 const keys=['schema','pr','sourceGitBlob','rule','path','line','reproduced',
  'staleEnabledAfterDenied','stopCallMissing','freshPermissionControlPassed',
  'resumeControlPassed','systemRestrictionControlPassed',
  'securityExceptionControlPassed','disableControlPassed','candidateInspected',
  'baselineCompared','physicalMicObserved','negativeFindingLabelsEstablished',
  'precision','recall','f1','tripleSPlusCertified'];
 if(!exact(w,keys)||
  w.schema!=='ultra-sentinel-c2-unseen-pr208-voice-permission-witness/v1'||
  w.sourceGitBlob!=='9298fe614e1ddbad27e2253c02e9415122cfa263'||
  Object.keys(LAST).some(k=>k!=='positive'&&w[k]!==LAST[k])||
  w.reproduced!==true||w.staleEnabledAfterDenied!==true||
  w.stopCallMissing!==true||w.freshPermissionControlPassed!==true||
  w.resumeControlPassed!==true||w.systemRestrictionControlPassed!==true||
  w.securityExceptionControlPassed!==true||w.disableControlPassed!==true||
  w.candidateInspected!==false||w.baselineCompared!==false||
  w.physicalMicObserved!==false||w.negativeFindingLabelsEstablished!==0||
  w.precision!==null||w.recall!==null||w.f1!==null||
  w.tripleSPlusCertified!==false)fail();
}
function extendUnseenTruthV3({previousSeal,witness208}={}){
 previous(previousSeal);witness(witness208);
 const labels=Object.freeze([...LABELED,LAST]);
 const sealedTruthDigest=crypto.createHash('sha256').update(JSON.stringify({
  schema:'ultra-sentinel-c2-unseen-truth-canonical/v3',
  repository:REPO,packetDigest:PACKET,modelSourceSha:MODEL,
  previousTruthDigest:PREVIOUS_DIGEST,sourceHashes:HASHES,
  labels,benignBehaviorControls:3
 }),'utf8').digest('hex');
 return Object.freeze({
  schema:'ultra-sentinel-c2-owner-truth-seal/v3',
  status:'SOURCE_BEHAVIOR_TRUTH_PARTIAL',
  repository:REPO,packetDigest:PACKET,modelSourceSha:MODEL,
  predecessorDigest:PREVIOUS_DIGEST,sourceHashes:HASHES,
  provenance:Object.freeze({previousRun:38841966994,previousArtifact:12021274341,
    newRun:38842384635,newArtifact:12021074190}),
  labels,verifiedPositiveBehavior:3,verifiedNegativeFindingLabels:0,
  benignBehaviorControls:3,remainingLabelsTo120:117,
  neededAdditionalPositivesAtLeast:45,neededAdditionalNegativesAtLeast:48,
  sealedTruthDigest,includesPredictions:false,includesBaseline:false,
  precision:null,recall:null,f1:null,baselineComparable:false,
  unseenRecallCertified:false,noFalsePositiveIncreaseCertified:false,
  tripleSPlusCertified:false,mergeAllowed:false,autoRepair:false,
  verdict:'TRUTH_CORPUS_INCOMPLETE',
  limitation:'Three reproductions from original Git sources do not establish '+
   'a representative 120-case truth set, negatives tied to rule/path/line, '+
   'an equal-SHA legacy baseline or 95% precision and recall.'
 });
}
module.exports={HASHES,extendUnseenTruthV3};
