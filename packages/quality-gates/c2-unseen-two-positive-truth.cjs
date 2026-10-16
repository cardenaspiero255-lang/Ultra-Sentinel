'use strict';
const crypto=require('node:crypto');
const SOURCE_HASHES=Object.freeze({
 previousSeal:'53192822e5736996a6040c914972a7ce0de17835ae03480e484a6a79766b612e',
 pr205:'acfad2f0c457103819206a15e2a8f5d59382cc9f37a54a07fb3f3ca2983ae918'
});
const REPO='cardenaspiero255-lang/gamehub-ultra';
const PACKET='b2a60512a647579b1af857fb0f3dc45c9d756ba076309a04e0acf3f0a3bdc48e';
const MODEL='bb38bb77983339301cafe8a7594e258e0c2924a6';
const FIRST_DIGEST='f5bfde8f804882cf0bc5e01b34bbc962709d94dbf9f6d8b5a39faa3b747fc8f9';
const PATH_206='app/src/main/java/com/cardenaspiero255/gamehubultra/voice/UltraSpeechChunker.kt';
const PATH_205='app/src/main/java/com/cardenaspiero255/gamehubultra/ai/UltraFrontierV2.kt';
const ALLOWED_PREVIOUS=new Set(['schema','status','repository','packetDigest','modelSourceSha',
 'sourceArtifacts','sourceContentSha256','labels','verifiedPositiveBehavior',
 'verifiedNegativeFindingLabels','benignBehaviorControls','remainingLabelsTo120',
 'sealedTruthDigest','includesPredictions','includesBaseline','precision','recall',
 'f1','baselineComparable','tripleSPlusCertified','mergeAllowed','autoRepair',
 'verdict','limitation']);
function fail(){throw Error('UNVERIFIED_C2_TRUTH_EXTENSION');}
function exact(o,keys){return o!==null&&typeof o==='object'&&!Array.isArray(o)&&
  Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));}
function validatePrevious(s){
 if(!s||typeof s!=='object'||Array.isArray(s)||
  Object.keys(s).some(k=>!ALLOWED_PREVIOUS.has(k))||
  s.schema!=='ultra-sentinel-c2-owner-truth-seal/v1'||
  s.status!=='SOURCE_BEHAVIOR_TRUTH_PARTIAL'||
  s.repository!==REPO||s.packetDigest!==PACKET||
  s.modelSourceSha!==MODEL||s.sealedTruthDigest!==FIRST_DIGEST||
  s.verifiedPositiveBehavior!==1||s.verifiedNegativeFindingLabels!==0||
  s.benignBehaviorControls!==3||s.remainingLabelsTo120!==119||
  s.includesPredictions!==false||s.includesBaseline!==false||
  s.precision!==null||s.recall!==null||s.f1!==null||
  s.baselineComparable!==false||s.tripleSPlusCertified!==false||
  s.mergeAllowed!==false||s.autoRepair!==false||
  s.verdict!=='TRUTH_CORPUS_INCOMPLETE'||
  !Array.isArray(s.labels)||s.labels.length!==1)fail();
 const label=s.labels[0];
 if(!exact(label,['pr','rule','path','line','positive'])||
  label.pr!==206||label.rule!=='TTS_UTF16_SURROGATE_SPLIT'||
  label.path!==PATH_206||label.line!==26||label.positive!==true)fail();
}
function validate205(w){
 if(!exact(w,['schema','pr','sourceGitBlob','rule','path','line','reproduced',
  'observedSupportingSources','observedConflictingSources',
  'numericConflictControlPassed','ordinaryProseControlPassed',
  'distinctUnitClaimIdControlPassed','candidateInspected','baselineCompared',
  'negativeFindingLabelsEstablished','globalPrecision','globalRecall','globalF1',
  'tripleSPlusCertified'])||w.schema!=='ultra-sentinel-c2-unseen-pr205-value-witness/v1'||
  w.pr!==205||w.sourceGitBlob!=='f0461cd51e00d2d7b2bc4225aeefee400e2e9fa4'||
  w.rule!=='CLAIM_VALUE_UNIT_CASE_COLLISION'||w.path!==PATH_205||
  w.line!==318||w.reproduced!==true||w.observedSupportingSources!==2||
  w.observedConflictingSources!==0||
  w.numericConflictControlPassed!==true||
  w.ordinaryProseControlPassed!==true||
  w.distinctUnitClaimIdControlPassed!==true||
  w.candidateInspected!==false||w.baselineCompared!==false||
  w.negativeFindingLabelsEstablished!==0||
  w.globalPrecision!==null||w.globalRecall!==null||w.globalF1!==null||
  w.tripleSPlusCertified!==false)fail();
}
function extendUnseenTruthV2({previousSeal,pr205}={}){
 validatePrevious(previousSeal);validate205(pr205);
 const labels=Object.freeze([
  Object.freeze({pr:205,rule:'CLAIM_VALUE_UNIT_CASE_COLLISION',path:PATH_205,line:318,positive:true}),
  Object.freeze({pr:206,rule:'TTS_UTF16_SURROGATE_SPLIT',path:PATH_206,line:26,positive:true})
 ]);
 const sealedTruthDigest=crypto.createHash('sha256').update(JSON.stringify({
  schema:'ultra-sentinel-c2-unseen-truth-canonical/v2',
  repository:REPO,packetDigest:PACKET,modelSourceSha:MODEL,
  previousTruthDigest:FIRST_DIGEST,sourceHashes:SOURCE_HASHES,labels,
  benignBehaviorControls:3
 }),'utf8').digest('hex');
 return Object.freeze({
  schema:'ultra-sentinel-c2-owner-truth-seal/v2',
  status:'SOURCE_BEHAVIOR_TRUTH_PARTIAL',repository:REPO,
  packetDigest:PACKET,modelSourceSha:MODEL,
  predecessorDigest:FIRST_DIGEST,sourceHashes:SOURCE_HASHES,
  provenance:Object.freeze({
   previousRun:38840604111,previousArtifact:12021635251,
   newRun:38841470698,newArtifact:12021616975
  }),
  labels,verifiedPositiveBehavior:2,verifiedNegativeFindingLabels:0,
  benignBehaviorControls:3,remainingLabelsTo120:118,
  neededAdditionalPositivesAtLeast:46,neededAdditionalNegativesAtLeast:48,
  sealedTruthDigest,includesPredictions:false,includesBaseline:false,
  precision:null,recall:null,f1:null,baselineComparable:false,
  unseenRecallCertified:false,noFalsePositiveIncreaseCertified:false,
  tripleSPlusCertified:false,mergeAllowed:false,autoRepair:false,
  verdict:'TRUTH_CORPUS_INCOMPLETE',
  limitation:'Two original-source behavior positives across two PRs do not '+
   'establish representative recall, 48 real negatives, a comparable baseline '+
   'or a 95 percent benchmark. Candidate predictions were not inspected.'
 });
}
module.exports={SOURCE_HASHES,extendUnseenTruthV2};
