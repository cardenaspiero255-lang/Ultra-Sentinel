'use strict';
const crypto=require('node:crypto');
const {NEW_LOCK}=require('./c2-next-holdout.cjs');
const {PACKET_DIGEST}=require('./c2-next-one-positive-truth.cjs');
const {NEW}=require('./c2-next-five-source-truth.cjs');
const {POSITIVES,NEGATIVES}=require('./c2-next-four-scoped-truth.cjs');
const PREVIOUS_SHA='c1806b94f2ddeb026a2d8eb0009398cc5a660445220abfd2dde4f391a7d4a8d0';
const ROOT='app/src/main/java/com/cardenaspiero255/gamehubultra/domain/';
const SAFE=Object.freeze([
 Object.freeze({pr:154,headSha:NEW_LOCK.cases[4].headSha,
  blobSha:'b2e15247536ecc00d4811021774ab2f34608ac3e',
  rule:'THERMAL_WARNING_WITHOUT_PREVENTIVE_PERMISSION',path:ROOT+'ThermalPredictionAdvisor.kt',line:22,
  positive:false,originalControlPassed:true,counterfactualFailedAtTarget:true}),
 Object.freeze({pr:155,headSha:NEW_LOCK.cases[5].headSha,
  blobSha:'8696360219231f3f1477d5ad21c93bca2197e281',
  rule:'BATTERY_DRAIN_CROSSES_CHARGING_BOUNDARY',path:ROOT+'BatteryAwareGamingEngine.kt',line:47,
  positive:false,originalControlPassed:true,counterfactualFailedAtTarget:true})
]);
function fail(){throw Error('C2_SEVEN_ORIGINAL_TRUTH_BLOCKED');}
function exact(o,fields){return o!==null&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).length===fields.length&&fields.every(k=>Object.hasOwn(o,k));}
function matching(o,e){if(!exact(o,Object.keys(e)))fail();
 for(const [k,v] of Object.entries(e))if(o[k]!==v)fail();}
function validatePrevious(p){
 const fields=['schema','status','sourceRepository','engineSourceSha','packetDigest',
  'previousTruthDigest','evidence','labels','sourcePositiveLabels','verifiedScopedNegativeLabels',
  'verifiedNegativeFindingLabels','benchmarkScoredLabels','neededAdditionalPositiveLabelsAtLeast',
  'neededAdditionalNegativeLabelsAtLeast','neededAdditionalLabelsAtLeast','includesPredictions',
  'includesBaseline','sealedTruthDigest','precision','recall','f1','fpNonRegressionVerified',
  'tripleSPlusCertified','canMerge','canRepair','verdict','limitation'];
 if(!exact(p,fields)||p.schema!=='ultra-sentinel-c2-next-five-original-source-truth-seal/v1'||
  p.status!=='SOURCE_BEHAVIOR_TRUTH_PARTIAL'||
  p.sourceRepository!==NEW_LOCK.repository||p.engineSourceSha!==NEW_LOCK.engineSourceSha||
  p.packetDigest!==PACKET_DIGEST||
  p.previousTruthDigest!=='13ff038ec3c91c369ebf8eb38a7c9d3579c2c100b2178199335a372d8fdd0260'||
  p.sealedTruthDigest!==PREVIOUS_SHA||
  !Array.isArray(p.labels)||p.labels.length!==5||p.sourcePositiveLabels!==3||
  p.verifiedScopedNegativeLabels!==2||p.verifiedNegativeFindingLabels!==2||
  p.benchmarkScoredLabels!==0||p.neededAdditionalPositiveLabelsAtLeast!==45||
  p.neededAdditionalNegativeLabelsAtLeast!==46||p.neededAdditionalLabelsAtLeast!==115||
  p.includesPredictions!==false||p.includesBaseline!==false||
  p.precision!==null||p.recall!==null||p.f1!==null||p.fpNonRegressionVerified!==false||
  p.tripleSPlusCertified!==false||p.canMerge!==false||p.canRepair!==false||
  p.verdict!=='TRUTH_CORPUS_INCOMPLETE'||typeof p.limitation!=='string'||
  p.limitation.length<100)fail();
 matching(p.evidence,{previousSealRun:38947142683,previousSealArtifact:12065927799,
   newWitnessRun:38968765586,newWitnessArtifact:12075688473});
 const prior=[NEW,...POSITIVES,...NEGATIVES.map(({pr,headSha,blobSha,rule,path,line,positive})=>
  ({pr,headSha,blobSha,rule,path,line,positive}))];
 for(let i=0;i<5;i++)matching(p.labels[i],prior[i]);
}
function validateWitness(w){
 const fields=['schema','sourceRepository','frozenPacketDigest','cases',
  'negativeFindingLabelsProvenUnderControlScope','negativeFindingLabelsEstablished',
  'candidateInspected','baselineCompared','precision','recall','f1','fpNonRegressionVerified',
  'tripleSPlusCertified','limitation'];
 if(!exact(w,fields)||
  w.schema!=='ultra-sentinel-c2-next-scoped-original-thermal-battery-negatives/v1'||
  w.sourceRepository!==NEW_LOCK.repository||w.frozenPacketDigest!==PACKET_DIGEST||
  !Array.isArray(w.cases)||w.cases.length!==2||
  w.negativeFindingLabelsProvenUnderControlScope!==2||
  w.negativeFindingLabelsEstablished!==0||
  w.candidateInspected!==false||w.baselineCompared!==false||
  w.precision!==null||w.recall!==null||w.f1!==null||
  w.fpNonRegressionVerified!==false||w.tripleSPlusCertified!==false||
  typeof w.limitation!=='string'||w.limitation.length<100)fail();
 for(let i=0;i<2;i++)matching(w.cases[i],SAFE[i]);
}
function sealSevenOriginalTruth({previous,witness}={}){
 validatePrevious(previous);validateWitness(witness);
 const withoutProof=SAFE.map(({pr,headSha,blobSha,rule,path,line,positive})=>
  Object.freeze({pr,headSha,blobSha,rule,path,line,positive}));
 const labels=Object.freeze([...previous.labels.slice(0,3),...withoutProof,...previous.labels.slice(3)].map(x=>Object.freeze({...x})));
 const sealedTruthDigest=crypto.createHash('sha256').update(JSON.stringify({
  schema:'ultra-sentinel-c2-next-seven-original-source-truth/v1',
  packetDigest:PACKET_DIGEST,engineSourceSha:NEW_LOCK.engineSourceSha,
  previousTruthDigest:PREVIOUS_SHA,labels
 }), 'utf8').digest('hex');
 return Object.freeze({
  schema:'ultra-sentinel-c2-next-seven-original-source-truth-seal/v1',
  status:'SOURCE_BEHAVIOR_TRUTH_PARTIAL',sourceRepository:NEW_LOCK.repository,
  engineSourceSha:NEW_LOCK.engineSourceSha,packetDigest:PACKET_DIGEST,
  previousTruthDigest:PREVIOUS_SHA,
  evidence:Object.freeze({previousSealRun:38969278857,previousSealArtifact:12075338764,
    newWitnessRun:38969804193,newWitnessArtifact:12076406708}),
  labels,sourcePositiveLabels:3,verifiedScopedNegativeLabels:4,
  verifiedNegativeFindingLabels:4,benchmarkScoredLabels:0,
  neededAdditionalPositiveLabelsAtLeast:45,neededAdditionalNegativeLabelsAtLeast:44,
  neededAdditionalLabelsAtLeast:113,
  includesPredictions:false,includesBaseline:false,sealedTruthDigest,
  precision:null,recall:null,f1:null,fpNonRegressionVerified:false,
  tripleSPlusCertified:false,canMerge:false,canRepair:false,
  verdict:'TRUTH_CORPUS_INCOMPLETE',
  limitation:'Three reproduced positive source defects and four separately tested bounded negative source predicates. '
   +'Mutation tests do not prove whole-PR cleanliness or independent negative population beyond explicit predicates. '
   +'At least 113 more authentic distinct labels required; no full eight-PR candidate/baseline prediction capture '
   +'or equal-coverage FP parity and no valid precision/recall/F1 or internal Triple S+ certification.'
 });
}
module.exports={sealSevenOriginalTruth,SAFE,PREVIOUS_SHA};
