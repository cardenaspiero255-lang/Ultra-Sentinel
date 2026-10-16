'use strict';
const crypto=require('node:crypto');
const {NEW_LOCK}=require('./c2-next-holdout.cjs');
const {PACKET_DIGEST}=require('./c2-next-one-positive-truth.cjs');
const {POSITIVES,NEGATIVES,PREVIOUS_SEAL}=require('./c2-next-four-scoped-truth.cjs');
const EXPECTED_PREVIOUS_SHA='13ff038ec3c91c369ebf8eb38a7c9d3579c2c100b2178199335a372d8fdd0260';
const ROOT='app/src/main/java/com/cardenaspiero255/gamehubultra/';
const NEW=Object.freeze({
 pr:151,headSha:NEW_LOCK.cases[1].headSha,
 blobSha:'adb11032b9b7f62f865228dfa1c27258ca3fa0df',
 rule:'NONFINITE_THERMAL_HEADROOM_ACCEPTED',
 path:ROOT+'domain/AiSessionCoach.kt',line:264,positive:true
});
function fail(){throw Error('C2_FIVE_SOURCE_TRUTH_BLOCKED');}
function exact(o,keys){
 return o!==null&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).length===keys.length&&keys.every(x=>Object.hasOwn(o,x));
}
function same(o,e){if(!exact(o,Object.keys(e)))fail();
 for(const [k,v] of Object.entries(e))if(o[k]!==v)fail();}
function validatePrevious(p){
 const keys=['schema','sourceRepository','engineSourceSha','packetDigest',
 'previousTruthDigest','evidence','labels','sourcePositiveLabels',
 'verifiedScopedNegativeLabels','verifiedNegativeFindingLabels',
 'benchmarkScoredLabels','neededAdditionalPositiveLabelsAtLeast',
 'neededAdditionalNegativeLabelsAtLeast','neededAdditionalLabelsAtLeast',
 'includesPredictions','includesBaseline','sealedTruthDigest',
 'precision','recall','f1','fpNonRegressionVerified','tripleSPlusCertified',
 'canMerge','canRepair','verdict','limitation'];
 if(!exact(p,keys)||p.schema!=='ultra-sentinel-c2-next-four-scoped-source-truth-seal/v1'||
 p.sourceRepository!==NEW_LOCK.repository||p.engineSourceSha!==NEW_LOCK.engineSourceSha||
 p.packetDigest!==PACKET_DIGEST||p.previousTruthDigest!==PREVIOUS_SEAL||
 p.sealedTruthDigest!==EXPECTED_PREVIOUS_SHA||
 !Array.isArray(p.labels)||p.labels.length!==4||
 p.sourcePositiveLabels!==2||p.verifiedScopedNegativeLabels!==2||
 p.verifiedNegativeFindingLabels!==2||p.benchmarkScoredLabels!==0||
 p.neededAdditionalPositiveLabelsAtLeast!==46||
 p.neededAdditionalNegativeLabelsAtLeast!==46||
 p.neededAdditionalLabelsAtLeast!==116||
 p.includesPredictions!==false||p.includesBaseline!==false||
 p.precision!==null||p.recall!==null||p.f1!==null||
 p.fpNonRegressionVerified!==false||p.tripleSPlusCertified!==false||
 p.canMerge!==false||p.canRepair!==false||
 p.verdict!=='TRUTH_CORPUS_INCOMPLETE'||typeof p.limitation!=='string'||
 p.limitation.length<100)fail();
 same(p.evidence,{positiveTruthRun:38931168454,positiveTruthArtifact:12058802148,
  negativeControlRun:38946358219,negativeControlArtifact:12066196917});
 const expected=[...POSITIVES,...NEGATIVES.map(({pr,headSha,blobSha,rule,path,line,positive})=>
  ({pr,headSha,blobSha,rule,path,line,positive}))];
 for(let i=0;i<4;i++)same(p.labels[i],expected[i]);
}
function validateWitness(w){
 const keys=['schema','pr','sourceGitBlob','rule','line','reproducedBehavioralDefect',
 'finiteHighControlPassed','missingRejected','nanRejected',
 'infiniteMidSessionIncorrectlyAlerted','infinitePreSessionIncorrectlyAlerted',
 'infiniteRecurringIncorrectlyAlerted','originalSourceExecuted',
 'candidateInspected','baselineCompared','positiveFindingLabelsSealed',
 'negativeFindingLabelsEstablished','precision','recall','f1',
 'tripleSPlusCertified'];
 if(!exact(w,keys))fail();
 same(w,{
  schema:'ultra-sentinel-c2-next-original-pr151-nonfinite-witness/v1',
  pr:151,sourceGitBlob:NEW.blobSha,rule:NEW.rule,line:NEW.line,
  reproducedBehavioralDefect:true,finiteHighControlPassed:true,
  missingRejected:true,nanRejected:true,
  infiniteMidSessionIncorrectlyAlerted:true,
  infinitePreSessionIncorrectlyAlerted:true,
  infiniteRecurringIncorrectlyAlerted:true,originalSourceExecuted:true,
  candidateInspected:false,baselineCompared:false,
  positiveFindingLabelsSealed:0,negativeFindingLabelsEstablished:0,
  precision:null,recall:null,f1:null,tripleSPlusCertified:false
 });
}
function sealFiveSourceTruth({previous,witness}={}){
 validatePrevious(previous);validateWitness(witness);
 const labels=Object.freeze([NEW,...previous.labels.map(x=>Object.freeze({...x}))]);
 const sealedTruthDigest=crypto.createHash('sha256').update(JSON.stringify({
  schema:'ultra-sentinel-c2-next-five-original-source-truth/v1',
  packetDigest:PACKET_DIGEST,engineSourceSha:NEW_LOCK.engineSourceSha,
  previousTruthDigest:EXPECTED_PREVIOUS_SHA,labels
 }), 'utf8').digest('hex');
 return Object.freeze({
  schema:'ultra-sentinel-c2-next-five-original-source-truth-seal/v1',
  status:'SOURCE_BEHAVIOR_TRUTH_PARTIAL',
  sourceRepository:NEW_LOCK.repository,engineSourceSha:NEW_LOCK.engineSourceSha,
  packetDigest:PACKET_DIGEST,previousTruthDigest:EXPECTED_PREVIOUS_SHA,
  evidence:Object.freeze({previousSealRun:38947142683,previousSealArtifact:12065927799,
    newWitnessRun:38968765586,newWitnessArtifact:12075688473}),
  labels,sourcePositiveLabels:3,verifiedScopedNegativeLabels:2,
  verifiedNegativeFindingLabels:2,benchmarkScoredLabels:0,
  neededAdditionalPositiveLabelsAtLeast:45,
  neededAdditionalNegativeLabelsAtLeast:46,
  neededAdditionalLabelsAtLeast:115,
  includesPredictions:false,includesBaseline:false,sealedTruthDigest,
  precision:null,recall:null,f1:null,fpNonRegressionVerified:false,
  tripleSPlusCertified:false,canMerge:false,canRepair:false,
  verdict:'TRUTH_CORPUS_INCOMPLETE',
  limitation:'Three independently reproduced original-source fault predicates and two bounded negative predicates. '
   +'Invalid Infinity is a deterministic original-code test input, not a claim about Android hardware. '
   +'Missing 115 additional representative real labels, complete frozen eight-PR universe, authenticated '
   +'old/new model predictions, per-rule critical population and FP parity. '
   +'No measured precision, recall, F1 or Triple S+ certification.'
 });
}
module.exports={sealFiveSourceTruth,EXPECTED_PREVIOUS_SHA,NEW};
