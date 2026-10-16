'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {sealFiveSourceTruth,EXPECTED_PREVIOUS_SHA}=require('../../packages/quality-gates/c2-next-five-source-truth.cjs');
const {POSITIVES,NEGATIVES}=require('../../packages/quality-gates/c2-next-four-scoped-truth.cjs');
const previous=()=>({
 schema:'ultra-sentinel-c2-next-four-scoped-source-truth-seal/v1',
 sourceRepository:'cardenaspiero255-lang/gamehub-ultra',
 engineSourceSha:'547938ed88804e25bbabecf74a3c3d91b74cf1a4',
 packetDigest:'f5f2f66b31e5dc768c18be68bef29cbd0f97c8161fda212ce2ae1e64eb664b34',
 previousTruthDigest:'c4a573927259fd4c2a66c8b1cf9c58c2a0010bcb23e9412d7026c1a4693a6b65',
 evidence:{positiveTruthRun:38931168454,positiveTruthArtifact:12058802148,
 negativeControlRun:38946358219,negativeControlArtifact:12066196917},
 labels:[...POSITIVES,...NEGATIVES.map(({pr,headSha,blobSha,rule,path,line,positive})=>
 ({pr,headSha,blobSha,rule,path,line,positive}))],
 sourcePositiveLabels:2,verifiedScopedNegativeLabels:2,verifiedNegativeFindingLabels:2,
 benchmarkScoredLabels:0,neededAdditionalPositiveLabelsAtLeast:46,
 neededAdditionalNegativeLabelsAtLeast:46,neededAdditionalLabelsAtLeast:116,
 includesPredictions:false,includesBaseline:false,
 sealedTruthDigest:'13ff038ec3c91c369ebf8eb38a7c9d3579c2c100b2178199335a372d8fdd0260',
 precision:null,recall:null,f1:null,fpNonRegressionVerified:false,
 tripleSPlusCertified:false,canMerge:false,canRepair:false,
 verdict:'TRUTH_CORPUS_INCOMPLETE',
 limitation:'Two original-source positive defects plus two bounded, mutation-sensitive negatives. Unverified other findings and incomplete eight-PR coverage block global scoring. Negative labels cover only precise test predicates, not a whole PR or all rules. Neither detector nor baseline has been compared. 120-label, critical and false-positive non-regression gates remain open.'
});
const witness=()=>({
 schema:'ultra-sentinel-c2-next-original-pr151-nonfinite-witness/v1',
 pr:151,sourceGitBlob:'adb11032b9b7f62f865228dfa1c27258ca3fa0df',
 rule:'NONFINITE_THERMAL_HEADROOM_ACCEPTED',line:264,
 reproducedBehavioralDefect:true,finiteHighControlPassed:true,missingRejected:true,
 nanRejected:true,infiniteMidSessionIncorrectlyAlerted:true,
 infinitePreSessionIncorrectlyAlerted:true,infiniteRecurringIncorrectlyAlerted:true,
 originalSourceExecuted:true,candidateInspected:false,baselineCompared:false,
 positiveFindingLabelsSealed:0,negativeFindingLabelsEstablished:0,
 precision:null,recall:null,f1:null,tripleSPlusCertified:false
});
test('five historical original-source proof identities score zero candidate predictions',()=>{
 const a=sealFiveSourceTruth({previous:previous(),witness:witness()});
 assert.deepEqual(a.labels.map(x=>[x.pr,x.positive]),[[151,true],[152,true],[153,true],[157,false],[158,false]]);
 assert.equal(a.sourcePositiveLabels,3);
 assert.equal(a.verifiedScopedNegativeLabels,2);
 assert.equal(a.verifiedNegativeFindingLabels,2);
 assert.equal(a.neededAdditionalPositiveLabelsAtLeast,45);
 assert.equal(a.neededAdditionalNegativeLabelsAtLeast,46);
 assert.equal(a.neededAdditionalLabelsAtLeast,115);
 assert.equal(a.benchmarkScoredLabels,0);
 assert.equal(a.precision,null);assert.equal(a.recall,null);assert.equal(a.f1,null);
 assert.equal(a.includesPredictions,false);assert.equal(a.includesBaseline,false);
 assert.equal(a.tripleSPlusCertified,false);assert.equal(a.fpNonRegressionVerified,false);
 assert.deepEqual(a,sealFiveSourceTruth({previous:previous(),witness:witness()}));
});
test('tampered previous truth, forged new witness, extra negatives or fake scores fail closed',()=>{
 for(const mut of [
  x=>x.previous.sealedTruthDigest='f'.repeat(64),
  x=>x.previous.labels[2].positive=true,
  x=>x.previous.labels.push({...x.previous.labels[0]}),
  x=>x.previous.verifiedNegativeFindingLabels=200,
  x=>x.previous.extra='untrusted',
  x=>x.witness.pr=150,
  x=>x.witness.sourceGitBlob='a'.repeat(40),
  x=>x.witness.nanRejected=false,
  x=>x.witness.infiniteMidSessionIncorrectlyAlerted=false,
  x=>x.witness.candidateInspected=true,
  x=>x.witness.positiveFindingLabelsSealed=1,
  x=>x.witness.negativeFindingLabelsEstablished=999,
  x=>x.witness.precision=1,
  x=>x.witness.extraLabels=[{positive:false}]
 ]){const args={previous:previous(),witness:witness()};mut(args);
  assert.throws(()=>sealFiveSourceTruth(args),/C2_FIVE_SOURCE_TRUTH_BLOCKED/);}
});
test('precise historical sealed-four digest must be the only accepted baseline',()=>{
 assert.equal(EXPECTED_PREVIOUS_SHA,'13ff038ec3c91c369ebf8eb38a7c9d3579c2c100b2178199335a372d8fdd0260');
});
