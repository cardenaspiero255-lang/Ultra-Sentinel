'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {sealSevenOriginalTruth}=require('../../packages/quality-gates/c2-next-seven-source-truth.cjs');
const {NEW}=require('../../packages/quality-gates/c2-next-five-source-truth.cjs');
const {POSITIVES,NEGATIVES}=require('../../packages/quality-gates/c2-next-four-scoped-truth.cjs');
const p='app/src/main/java/com/cardenaspiero255/gamehubultra/domain/';
function prior(){return {
 schema:'ultra-sentinel-c2-next-five-original-source-truth-seal/v1',
 status:'SOURCE_BEHAVIOR_TRUTH_PARTIAL',
 sourceRepository:'cardenaspiero255-lang/gamehub-ultra',
 engineSourceSha:'547938ed88804e25bbabecf74a3c3d91b74cf1a4',
 packetDigest:'f5f2f66b31e5dc768c18be68bef29cbd0f97c8161fda212ce2ae1e64eb664b34',
 previousTruthDigest:'13ff038ec3c91c369ebf8eb38a7c9d3579c2c100b2178199335a372d8fdd0260',
 evidence:{previousSealRun:38947142683,previousSealArtifact:12065927799,
  newWitnessRun:38968765586,newWitnessArtifact:12075688473},
 labels:[NEW,...POSITIVES,...NEGATIVES.map(({pr,headSha,blobSha,rule,path,line,positive})=>({pr,headSha,blobSha,rule,path,line,positive}))].map(x=>({...x})),
 sourcePositiveLabels:3,verifiedScopedNegativeLabels:2,
 verifiedNegativeFindingLabels:2,benchmarkScoredLabels:0,
 neededAdditionalPositiveLabelsAtLeast:45,neededAdditionalNegativeLabelsAtLeast:46,
 neededAdditionalLabelsAtLeast:115,includesPredictions:false,includesBaseline:false,
 sealedTruthDigest:'c1806b94f2ddeb026a2d8eb0009398cc5a660445220abfd2dde4f391a7d4a8d0',
 precision:null,recall:null,f1:null,fpNonRegressionVerified:false,
 tripleSPlusCertified:false,canMerge:false,canRepair:false,
 verdict:'TRUTH_CORPUS_INCOMPLETE',
 limitation:'Three independently reproduced original-source fault predicates and two bounded negative predicates. Invalid Infinity is a deterministic original-code test input, not a claim about Android hardware. Missing 115 additional representative real labels, complete frozen eight-PR universe, authenticated old/new model predictions, per-rule critical population and FP parity. No measured precision, recall, F1 or Triple S+ certification.'
}}
function neg(){return{
 schema:'ultra-sentinel-c2-next-scoped-original-thermal-battery-negatives/v1',
 sourceRepository:'cardenaspiero255-lang/gamehub-ultra',
 frozenPacketDigest:'f5f2f66b31e5dc768c18be68bef29cbd0f97c8161fda212ce2ae1e64eb664b34',
 cases:[
 {pr:154,headSha:'858c9ce5cb6a7916d63f2348432013e49d02ba79',blobSha:'b2e15247536ecc00d4811021774ab2f34608ac3e',rule:'THERMAL_WARNING_WITHOUT_PREVENTIVE_PERMISSION',path:p+'ThermalPredictionAdvisor.kt',line:22,positive:false,originalControlPassed:true,counterfactualFailedAtTarget:true},
 {pr:155,headSha:'2289f4e4cda55ddaa50f2016113ded82dc17203c',blobSha:'8696360219231f3f1477d5ad21c93bca2197e281',rule:'BATTERY_DRAIN_CROSSES_CHARGING_BOUNDARY',path:p+'BatteryAwareGamingEngine.kt',line:47,positive:false,originalControlPassed:true,counterfactualFailedAtTarget:true}
 ],
 negativeFindingLabelsProvenUnderControlScope:2,negativeFindingLabelsEstablished:0,
 candidateInspected:false,baselineCompared:false,precision:null,recall:null,f1:null,
 fpNonRegressionVerified:false,tripleSPlusCertified:false,
 limitation:'Two distinct bounded original Kotlin defenses with sensitive counterfactual mutants. No whole-PR clean finding universe, baseline or TN scores.'
}}
test('exact five-source truth plus two counterfactual-safe negatives gives seven unscored labels',()=>{
 const r=sealSevenOriginalTruth({previous:prior(),witness:neg()});
 assert.deepEqual(r.labels.map(x=>[x.pr,x.positive]),[[151,true],[152,true],[153,true],[154,false],[155,false],[157,false],[158,false]]);
 assert.equal(r.sourcePositiveLabels,3);assert.equal(r.verifiedScopedNegativeLabels,4);
 assert.equal(r.verifiedNegativeFindingLabels,4);
 assert.equal(r.neededAdditionalPositiveLabelsAtLeast,45);
 assert.equal(r.neededAdditionalNegativeLabelsAtLeast,44);
 assert.equal(r.neededAdditionalLabelsAtLeast,113);
 assert.equal(r.benchmarkScoredLabels,0);
 assert.equal(r.precision,null);assert.equal(r.recall,null);assert.equal(r.f1,null);
 assert.equal(r.includesPredictions,false);assert.equal(r.includesBaseline,false);
 assert.equal(r.tripleSPlusCertified,false);
});
test('forged original labels, changed policy flags and mutations not caught fail closed',()=>{
 const changes=[
 x=>x.previous.sealedTruthDigest='f'.repeat(64),
 x=>x.previous.labels[1].positive=false,
 x=>x.previous.neededAdditionalLabelsAtLeast=0,
 x=>x.previous.extraEvidence=true,
 x=>x.witness.cases[0].counterfactualFailedAtTarget=false,
 x=>x.witness.cases[1].originalControlPassed=false,
 x=>x.witness.cases[1].line=48,
 x=>x.witness.cases[1].positive=true,
 x=>x.witness.cases.push({...x.witness.cases[0]}),
 x=>x.witness.negativeFindingLabelsProvenUnderControlScope=200,
 x=>x.witness.candidateInspected=true,
 x=>x.witness.precision=1
 ];
 for(const mutate of changes){const x={previous:prior(),witness:neg()};mutate(x);
  assert.throws(()=>sealSevenOriginalTruth(x),/C2_SEVEN_ORIGINAL_TRUTH_BLOCKED/);}
});
