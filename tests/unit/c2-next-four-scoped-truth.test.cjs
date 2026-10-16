'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {combineSourceTruth}=require('../../packages/quality-gates/c2-next-four-scoped-truth.cjs');

const P='app/src/main/java/com/cardenaspiero255/gamehubultra/';
const prior=()=>({
 schema:'ultra-sentinel-c2-next-two-source-truth-seal/v1',
 status:'SOURCE_BEHAVIOR_TRUTH_PARTIAL',
 sourceRepository:'cardenaspiero255-lang/gamehub-ultra',
 engineSourceSha:'547938ed88804e25bbabecf74a3c3d91b74cf1a4',
 packetDigest:'f5f2f66b31e5dc768c18be68bef29cbd0f97c8161fda212ce2ae1e64eb664b34',
 previousTruthDigest:'4c428cfb9c51edd9b56225e40dd81368c45ef226aebfc6f1d57c89ddecadb11d',
 witnessSha256:'f0c1bd296d028312d16bd128b0fc407bc48e07207256e210467d7e9659bf2c73',
 evidence:{previousSealRun:38890454291,previousSealArtifact:12041790611,
 newWitnessRun:38930244332,newWitnessArtifact:12057454797},
 labels:[
 {pr:152,headSha:'104b7dc33e4c0341cec3fca81e3c8fbe3625357f',blobSha:'549e3b1d619b83e59bc37b31b4860191c25528f1',rule:'SUPPORTED_REFRESH_CANDIDATE_STARVED_BY_UNSUPPORTED_PLURALITY',path:P+'domain/AiProfileBuilder.kt',line:207,positive:true},
 {pr:153,headSha:'6508cc124076b9dea437ea1efc213d3ce55d7baf',blobSha:'d8708fd6245cea2e8dab4404ef5bfb7e682e1a6f',rule:'PENDING_ADAPTIVE_PROFILE_ROLLBACK_DIVERGENCE',path:P+'PerGameAdaptiveRuntime.kt',line:71,positive:true}
 ],sourcePositiveLabels:2,verifiedNegativeFindingLabels:0,benchmarkScoredLabels:0,
 neededAdditionalPositiveLabelsAtLeast:46,neededAdditionalNegativeLabelsAtLeast:48,
 includesPredictions:false,includesBaseline:false,
 sealedTruthDigest:'c4a573927259fd4c2a66c8b1cf9c58c2a0010bcb23e9412d7026c1a4693a6b65',
 precision:null,recall:null,f1:null,fpNonRegressionVerified:false,
 tripleSPlusCertified:false,canMerge:false,canRepair:false,
 verdict:'TRUTH_CORPUS_INCOMPLETE',
 limitation:'Two verified original Kotlin source behaviors, no negative finding labels. Only preregistered positive target files have been checked; the full eight-PR scored universe, baseline parity, critical-FN coverage and 95% benchmarks are unproven. Neither original-source witness uses candidate predictions.'
});
const neg=()=>({
 schema:'ultra-sentinel-c2-next-scoped-original-negatives/v1',
 sourceRepository:'cardenaspiero255-lang/gamehub-ultra',
 frozenPacketDigest:'f5f2f66b31e5dc768c18be68bef29cbd0f97c8161fda212ce2ae1e64eb664b34',
 cases:[
 {pr:157,headSha:'cb184c56d28342e46923d149c0e7f27141ce1a24',blobSha:'a4361860bc51d5473766b6fb82f10bdca2b154ce',rule:'MUTATION_EXECUTES_WITHOUT_TOOL_AUTHORIZATION',path:P+'ai/UltraFrontierToolGateway.kt',line:32,positive:false,originalControlPassed:true,counterfactualFailedAtTarget:true},
 {pr:158,headSha:'9d8572afedc634ac07dae58a0da326ea62bdc1da',blobSha:'d1af5d8c6574c325fdacadec54748cb730c3aacd',rule:'UNBOUNDED_AUDIT_TRAIL_RETENTION',path:P+'ai/UltraFrontierAuditTrail.kt',line:60,positive:false,originalControlPassed:true,counterfactualFailedAtTarget:true}
 ],negativeFindingLabelsProvenUnderControlScope:2,negativeFindingLabelsEstablished:0,
 candidateInspected:false,baselineCompared:false,precision:null,recall:null,f1:null,
 fpNonRegressionVerified:false,tripleSPlusCertified:false,
 limitation:'Two bounded, mutation-sensitive original-source predicates. No closed prediction universe and no baseline; not scored TN evidence.'
});
test('two source-authenticated positives plus two scoped negatives remain unscored',()=>{
 const a=combineSourceTruth({prior:prior(),negativeWitness:neg()});
 assert.deepEqual(a.labels.map(x=>[x.pr,x.positive]),[[152,true],[153,true],[157,false],[158,false]]);
 assert.equal(a.sourcePositiveLabels,2);assert.equal(a.verifiedScopedNegativeLabels,2);
 assert.equal(a.benchmarkScoredLabels,0);
 assert.equal(a.neededAdditionalPositiveLabelsAtLeast,46);
 assert.equal(a.neededAdditionalNegativeLabelsAtLeast,46);
 assert.equal(a.neededAdditionalLabelsAtLeast,116);
 assert.equal(a.precision,null);assert.equal(a.recall,null);assert.equal(a.f1,null);
 assert.equal(a.fpNonRegressionVerified,false);
 assert.equal(a.tripleSPlusCertified,false);
 assert.deepEqual(a,combineSourceTruth({prior:prior(),negativeWitness:neg()}));
});
test('reject compromised source provenance, unsafe negative population and premade scoring',()=>{
 const tamper=[
 x=>x.prior.sealedTruthDigest='f'.repeat(64),x=>x.prior.labels[0].line=208,
 x=>x.prior.verifiedNegativeFindingLabels=1,x=>x.prior.labels.push({...x.prior.labels[0]}),
 x=>x.prior.precision=1,x=>x.prior.sourcePositiveLabels=10,
 x=>x.negativeWitness.cases[0].positive=true,
 x=>x.negativeWitness.cases[1].line=61,
 x=>x.negativeWitness.cases[0].counterfactualFailedAtTarget=false,
 x=>x.negativeWitness.cases[0].originalControlPassed=false,
 x=>x.negativeWitness.candidateInspected=true,
 x=>x.negativeWitness.negativeFindingLabelsProvenUnderControlScope=40,
 x=>x.negativeWitness.cases.push({...x.negativeWitness.cases[0]}),
 x=>x.negativeWitness.extraLabels=[]
 ];
 for(const change of tamper){const a={prior:prior(),negativeWitness:neg()};change(a);
 assert.throws(()=>combineSourceTruth(a),/C2_FOUR_SOURCE_TRUTH_BLOCKED/);}
});
