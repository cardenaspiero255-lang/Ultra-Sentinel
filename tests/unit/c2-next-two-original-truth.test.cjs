'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {NEW_LOCK}=require('../../packages/quality-gates/c2-next-holdout.cjs');
const {sealTwoRealSourcePositives,WITNESS_SHA256}=require('../../packages/quality-gates/c2-next-two-original-truth.cjs');
const {PACKET_DIGEST,WITNESS_SHA256:PREVIOUS_SHA}=require('../../packages/quality-gates/c2-next-one-positive-truth.cjs');

function prior(){
 const label={pr:153,headSha:NEW_LOCK.cases[3].headSha,
   blobSha:'d8708fd6245cea2e8dab4404ef5bfb7e682e1a6f',
   rule:'PENDING_ADAPTIVE_PROFILE_ROLLBACK_DIVERGENCE',
   path:'app/src/main/java/com/cardenaspiero255/gamehubultra/PerGameAdaptiveRuntime.kt',
   line:71,positive:true};
 const digest=crypto.createHash('sha256').update(JSON.stringify({
  schema:'ultra-sentinel-c2-next-one-positive-truth/v1',packetDigest:PACKET_DIGEST,
  engineSourceSha:NEW_LOCK.engineSourceSha,witnessSha256:PREVIOUS_SHA,labels:[label]
 })).digest('hex');
 return {schema:'ultra-sentinel-c2-next-source-truth-seal/v1',
 status:'SOURCE_BEHAVIOR_TRUTH_PARTIAL',sourceRepository:NEW_LOCK.repository,
 engineSourceSha:NEW_LOCK.engineSourceSha,packetDigest:PACKET_DIGEST,
 witnessSha256:PREVIOUS_SHA,
 evidence:{freezeRun:38856860621,freezeArtifact:12027755925,
 witnessRun:38889693623,witnessArtifact:12040619454},
 labels:[label],sourcePositiveLabels:1,verifiedNegativeFindingLabels:0,
 benchmarkScoredLabels:0,neededAdditionalPositiveLabelsAtLeast:47,
 neededAdditionalNegativeLabelsAtLeast:48,includesPredictions:false,
 includesBaseline:false,sealedTruthDigest:digest,precision:null,recall:null,f1:null,
 fpNonRegressionVerified:false,tripleSPlusCertified:false,canMerge:false,
 canRepair:false,verdict:'TRUTH_CORPUS_INCOMPLETE',limitation:'Only one reproduced fault'};
}
function witness(){return {
 schema:'ultra-sentinel-c2-next-original-pr152-refresh-witness/v1',
 pr:152,sourceGitBlob:'549e3b1d619b83e59bc37b31b4860191c25528f1',
 rule:'SUPPORTED_REFRESH_CANDIDATE_STARVED_BY_UNSUPPORTED_PLURALITY',
 line:207,reproducedBehavioralDefect:true,
 supportedPluralitySelected:true,unsupportedOnlyRejected:true,
 insufficientSamplesRejected:true,existingTargetPreserved:true,
 executedOriginalSource:true,candidateInspected:false,baselineCompared:false,
 positiveFindingLabelsSealed:0,negativeFindingLabelsEstablished:0,
 precision:null,recall:null,f1:null,fpNonRegressionVerified:false,
 tripleSPlusCertified:false};
}
test('two real original-source positives produce no synthetic negatives and no score',()=>{
 const a=sealTwoRealSourcePositives({prior:prior(),witness:witness()});
 assert.equal(a.labels.length,2);
 assert.deepEqual(a.labels.map(x=>x.pr),[152,153]);
 assert.equal(a.sourcePositiveLabels,2);
 assert.equal(a.verifiedNegativeFindingLabels,0);
 assert.equal(a.benchmarkScoredLabels,0);
 assert.equal(a.neededAdditionalPositiveLabelsAtLeast,46);
 assert.equal(a.neededAdditionalNegativeLabelsAtLeast,48);
 assert.equal(a.includesPredictions,false);assert.equal(a.includesBaseline,false);
 assert.equal(a.precision,null);assert.equal(a.recall,null);assert.equal(a.f1,null);
 assert.equal(a.fpNonRegressionVerified,false);
 assert.equal(a.tripleSPlusCertified,false);
 assert.deepEqual(a,sealTwoRealSourcePositives({prior:prior(),witness:witness()}));
});
test('tampering of prior truth or current witness fails closed',()=>{
 const mutations=[
  z=>z.prior.labels[0].line=72,
  z=>z.prior.labels[0].positive=false,
  z=>z.prior.sealedTruthDigest='f'.repeat(64),
  z=>z.prior.includesPredictions=true,
  z=>z.prior.verifiedNegativeFindingLabels=3,
  z=>z.prior.evidence.freezeArtifact=10,
  z=>z.prior.labels.push({...z.prior.labels[0]}),
  z=>z.prior.unreviewed=true,
  z=>z.witness.reproducedBehavioralDefect=false,
  z=>z.witness.line=208,
  z=>z.witness.candidateInspected=true,
  z=>z.witness.negativeFindingLabelsEstablished=10,
  z=>z.witness.extraLabels=[],
 ];
 for(const change of mutations){const a={prior:prior(),witness:witness()};change(a);
  assert.throws(()=>sealTwoRealSourcePositives(a),/C2_NEXT_TWO_SOURCE_TRUTH_BLOCKED/);}
});
test('witness byte hash is pinned to original Kotlin workflow output',()=>{
 assert.equal(WITNESS_SHA256,'f0c1bd296d028312d16bd128b0fc407bc48e07207256e210467d7e9659bf2c73');
});
