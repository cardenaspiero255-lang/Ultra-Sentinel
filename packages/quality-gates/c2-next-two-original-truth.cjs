'use strict';
const crypto=require('node:crypto');
const {NEW_LOCK}=require('./c2-next-holdout.cjs');
const {PACKET_DIGEST,WITNESS_SHA256:PR153_WITNESS_SHA256}=
 require('./c2-next-one-positive-truth.cjs');
const WITNESS_SHA256='f0c1bd296d028312d16bd128b0fc407bc48e07207256e210467d7e9659bf2c73';
const RULE='SUPPORTED_REFRESH_CANDIDATE_STARVED_BY_UNSUPPORTED_PLURALITY';
const PR153_LABEL=Object.freeze({
 pr:153,headSha:NEW_LOCK.cases[3].headSha,
 blobSha:'d8708fd6245cea2e8dab4404ef5bfb7e682e1a6f',
 rule:'PENDING_ADAPTIVE_PROFILE_ROLLBACK_DIVERGENCE',
 path:'app/src/main/java/com/cardenaspiero255/gamehubultra/PerGameAdaptiveRuntime.kt',
 line:71,positive:true
});
const PR152_LABEL=Object.freeze({
 pr:152,headSha:NEW_LOCK.cases[2].headSha,
 blobSha:'549e3b1d619b83e59bc37b31b4860191c25528f1',
 rule:RULE,
 path:'app/src/main/java/com/cardenaspiero255/gamehubultra/domain/AiProfileBuilder.kt',
 line:207,positive:true
});
function fail(){throw Error('C2_NEXT_TWO_SOURCE_TRUTH_BLOCKED');}
function exact(x,keys){
 return x!==null&&typeof x==='object'&&!Array.isArray(x)&&
  Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
}
function matchObject(x,expected){
 if(!exact(x,Object.keys(expected)))fail();
 for(const [k,v] of Object.entries(expected))if(x[k]!==v)fail();
}
const EXPECTED_PRIOR_DIGEST=crypto.createHash('sha256').update(JSON.stringify({
 schema:'ultra-sentinel-c2-next-one-positive-truth/v1',
 packetDigest:PACKET_DIGEST,engineSourceSha:NEW_LOCK.engineSourceSha,
 witnessSha256:PR153_WITNESS_SHA256,labels:[PR153_LABEL]
}),'utf8').digest('hex');
function validatePrior(p){
 const keys=['schema','status','sourceRepository','engineSourceSha',
 'packetDigest','witnessSha256','evidence','labels','sourcePositiveLabels',
 'verifiedNegativeFindingLabels','benchmarkScoredLabels',
 'neededAdditionalPositiveLabelsAtLeast','neededAdditionalNegativeLabelsAtLeast',
 'includesPredictions','includesBaseline','sealedTruthDigest',
 'precision','recall','f1','fpNonRegressionVerified','tripleSPlusCertified',
 'canMerge','canRepair','verdict','limitation'];
 if(!exact(p,keys)||p.schema!=='ultra-sentinel-c2-next-source-truth-seal/v1'||
  p.status!=='SOURCE_BEHAVIOR_TRUTH_PARTIAL'||
  p.sourceRepository!==NEW_LOCK.repository||
  p.engineSourceSha!==NEW_LOCK.engineSourceSha||
  p.packetDigest!==PACKET_DIGEST||p.witnessSha256!==PR153_WITNESS_SHA256||
  !Array.isArray(p.labels)||p.labels.length!==1||
  p.sealedTruthDigest!==EXPECTED_PRIOR_DIGEST||
  p.sourcePositiveLabels!==1||p.verifiedNegativeFindingLabels!==0||
  p.benchmarkScoredLabels!==0||
  p.neededAdditionalPositiveLabelsAtLeast!==47||
  p.neededAdditionalNegativeLabelsAtLeast!==48||
  p.includesPredictions!==false||p.includesBaseline!==false||
  p.precision!==null||p.recall!==null||p.f1!==null||
  p.fpNonRegressionVerified!==false||p.tripleSPlusCertified!==false||
  p.canMerge!==false||p.canRepair!==false||
  p.verdict!=='TRUTH_CORPUS_INCOMPLETE'||
  typeof p.limitation!=='string'||p.limitation.length<20)fail();
 matchObject(p.labels[0],PR153_LABEL);
 matchObject(p.evidence,{freezeRun:38856860621,freezeArtifact:12027755925,
  witnessRun:38889693623,witnessArtifact:12040619454});
}
function validateWitness(w){
 const keys=['schema','pr','sourceGitBlob','rule','line',
 'reproducedBehavioralDefect','supportedPluralitySelected',
 'unsupportedOnlyRejected','insufficientSamplesRejected',
 'existingTargetPreserved','executedOriginalSource','candidateInspected',
 'baselineCompared','positiveFindingLabelsSealed',
 'negativeFindingLabelsEstablished','precision','recall','f1',
 'fpNonRegressionVerified','tripleSPlusCertified'];
 if(!exact(w,keys))fail();
 matchObject(w,{
  schema:'ultra-sentinel-c2-next-original-pr152-refresh-witness/v1',
  pr:152,sourceGitBlob:PR152_LABEL.blobSha,rule:RULE,line:207,
  reproducedBehavioralDefect:true,supportedPluralitySelected:true,
  unsupportedOnlyRejected:true,insufficientSamplesRejected:true,
  existingTargetPreserved:true,executedOriginalSource:true,
  candidateInspected:false,baselineCompared:false,
  positiveFindingLabelsSealed:0,negativeFindingLabelsEstablished:0,
  precision:null,recall:null,f1:null,
  fpNonRegressionVerified:false,tripleSPlusCertified:false
 });
}
function sealTwoRealSourcePositives({prior,witness}={}){
 validatePrior(prior);validateWitness(witness);
 const labels=Object.freeze([PR152_LABEL,PR153_LABEL]);
 const sealedTruthDigest=crypto.createHash('sha256').update(JSON.stringify({
  schema:'ultra-sentinel-c2-next-two-original-positives/v1',
  packetDigest:PACKET_DIGEST,engineSourceSha:NEW_LOCK.engineSourceSha,
  previousTruthDigest:EXPECTED_PRIOR_DIGEST,witnessSha256:WITNESS_SHA256,labels
 }), 'utf8').digest('hex');
 return Object.freeze({
  schema:'ultra-sentinel-c2-next-two-source-truth-seal/v1',
  status:'SOURCE_BEHAVIOR_TRUTH_PARTIAL',
  sourceRepository:NEW_LOCK.repository,engineSourceSha:NEW_LOCK.engineSourceSha,
  packetDigest:PACKET_DIGEST,previousTruthDigest:EXPECTED_PRIOR_DIGEST,
  witnessSha256:WITNESS_SHA256,
  evidence:Object.freeze({
   previousSealRun:38890454291,previousSealArtifact:12041790611,
   newWitnessRun:38930244332,newWitnessArtifact:12057454797
  }),
  labels,sourcePositiveLabels:2,verifiedNegativeFindingLabels:0,
  benchmarkScoredLabels:0,neededAdditionalPositiveLabelsAtLeast:46,
  neededAdditionalNegativeLabelsAtLeast:48,
  includesPredictions:false,includesBaseline:false,
  sealedTruthDigest,precision:null,recall:null,f1:null,
  fpNonRegressionVerified:false,tripleSPlusCertified:false,
  canMerge:false,canRepair:false,verdict:'TRUTH_CORPUS_INCOMPLETE',
  limitation:'Two verified original Kotlin source behaviors, no negative finding labels. '
   +'Only preregistered positive target files have been checked; the full eight-PR '
   +'scored universe, baseline parity, critical-FN coverage and 95% benchmarks '
   +'are unproven. Neither original-source witness uses candidate predictions.'
 });
}
module.exports={WITNESS_SHA256,EXPECTED_PRIOR_DIGEST,sealTwoRealSourcePositives};
