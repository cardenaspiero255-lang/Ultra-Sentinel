'use strict';
const crypto=require('node:crypto');
const {NEW_LOCK}=require('./c2-next-holdout.cjs');
const WITNESS_SHA256='a3e3d28a8bf3d4b0a59541efd96f698002deea355ec35dd8e17e5662a9830cba';
const PACKET_DIGEST='f5f2f66b31e5dc768c18be68bef29cbd0f97c8161fda212ce2ae1e64eb664b34';
const BLOB='d8708fd6245cea2e8dab4404ef5bfb7e682e1a6f';
const RULE='PENDING_ADAPTIVE_PROFILE_ROLLBACK_DIVERGENCE';
function fail(){throw Error('C2_NEXT_TRUTH_UNVERIFIED');}
function exact(x,keys){return x!==null&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));}
function validatedFreeze(x){
 const keys=['schema','status','repository','engineSourceSha','packetDigest','cases',
 'knownCaseTrainingOverlap','currentFindingsCount','labelsVerified',
 'candidateInspected','truthLabelsInspected','baselineInspected',
 'precision','recall','f1','fpNonRegressionVerified','tripleSPlusCertified',
 'canMerge','canRepair','limitations'];
 if(!exact(x,keys)||x.schema!=='ultra-sentinel-c2-next-holdout-freeze/v1'||
  x.status!=='FROZEN_INPUT_ONLY'||x.repository!==NEW_LOCK.repository||
  x.engineSourceSha!==NEW_LOCK.engineSourceSha||
  x.packetDigest!==PACKET_DIGEST||x.knownCaseTrainingOverlap!==0||
  x.currentFindingsCount!==0||x.labelsVerified!==0||
  x.candidateInspected!==false||x.truthLabelsInspected!==false||
  x.baselineInspected!==false||x.precision!==null||x.recall!==null||
  x.f1!==null||x.fpNonRegressionVerified!==false||
  x.tripleSPlusCertified!==false||x.canMerge!==false||
  x.canRepair!==false||typeof x.limitations!=='string'||
  !Array.isArray(x.cases)||x.cases.length!==NEW_LOCK.cases.length)fail();
 for(let i=0;i<NEW_LOCK.cases.length;i++){
  const item=x.cases[i],expected=NEW_LOCK.cases[i],keys=Object.keys(expected);
  if(!exact(item,keys)||keys.some(k=>item[k]!==expected[k]))fail();
 }
 const expectedPacketDigest=crypto.createHash('sha256')
  .update(JSON.stringify(NEW_LOCK),'utf8').digest('hex');
 if(expectedPacketDigest!==PACKET_DIGEST)fail();
}
function validatedWitness(w){
 const keys=['schema','pr','sourceGitBlob','rule','line',
 'normalSuccessControlPassed','prewriteFailureControlPassed',
 'failureAfterHandledReproduced','replayProfileStateDiverged',
 'idempotentHandledControlPassed','reproduced','candidateInspected',
 'baselineCompared','negativeFindingLabelsEstablished','precision','recall','f1',
 'tripleSPlusCertified'];
 if(!exact(w,keys)||
  w.schema!=='ultra-sentinel-c2-next-original-pr153-rollback-witness/v1'||
  w.pr!==153||w.sourceGitBlob!==BLOB||w.rule!==RULE||
  w.line!==71||w.normalSuccessControlPassed!==true||
  w.prewriteFailureControlPassed!==true||
  w.failureAfterHandledReproduced!==true||
  w.replayProfileStateDiverged!==true||
  w.idempotentHandledControlPassed!==true||w.reproduced!==true||
  w.candidateInspected!==false||w.baselineCompared!==false||
  w.negativeFindingLabelsEstablished!==0||
  w.precision!==null||w.recall!==null||w.f1!==null||
  w.tripleSPlusCertified!==false)fail();
}
function sealNextSourceTruth({freeze,witness}={}){
 validatedFreeze(freeze);validatedWitness(witness);
 const label=Object.freeze({pr:153,headSha:NEW_LOCK.cases[3].headSha,
  blobSha:BLOB,rule:RULE,
  path:'app/src/main/java/com/cardenaspiero255/gamehubultra/PerGameAdaptiveRuntime.kt',
  line:71,positive:true});
 const labels=Object.freeze([label]);
 const sealedTruthDigest=crypto.createHash('sha256')
  .update(JSON.stringify({schema:'ultra-sentinel-c2-next-one-positive-truth/v1',
   packetDigest:PACKET_DIGEST,engineSourceSha:NEW_LOCK.engineSourceSha,
   witnessSha256:WITNESS_SHA256,labels}),'utf8').digest('hex');
 return Object.freeze({
  schema:'ultra-sentinel-c2-next-source-truth-seal/v1',
  status:'SOURCE_BEHAVIOR_TRUTH_PARTIAL',
  sourceRepository:NEW_LOCK.repository,
  engineSourceSha:NEW_LOCK.engineSourceSha,
  packetDigest:PACKET_DIGEST,witnessSha256:WITNESS_SHA256,
  evidence:Object.freeze({freezeRun:38856860621,freezeArtifact:12027755925,
   witnessRun:38889693623,witnessArtifact:12040619454}),
  labels,sourcePositiveLabels:1,verifiedNegativeFindingLabels:0,
  benchmarkScoredLabels:0,neededAdditionalPositiveLabelsAtLeast:47,
  neededAdditionalNegativeLabelsAtLeast:48,
  includesPredictions:false,includesBaseline:false,
  sealedTruthDigest,precision:null,recall:null,f1:null,
  fpNonRegressionVerified:false,tripleSPlusCertified:false,
  canMerge:false,canRepair:false,verdict:'TRUTH_CORPUS_INCOMPLETE',
  limitation:'Only one original-source behavior was reproduced in the next '+
   'eight-PR cohort. Candidate/baseline predictions have not been inspected. '+
   'No negative finding labels or statistically representative universe. '+
   'The technical oracle establishes a failure under deterministic dependency '+
   'fault injection; independent scope, population coverage and FP parity remain unknown.'
 });
}
module.exports={WITNESS_SHA256,PACKET_DIGEST,sealNextSourceTruth};
