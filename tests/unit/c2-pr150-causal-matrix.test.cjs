'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {buildCausalVariants,adjudicateMatrix,EXPECTED_BLOB}=require('../../packages/quality-gates/c2-pr150-causal-matrix.cjs');
const H='HIGH',M='MEDIUM';
const vector=(badOnly,opposed)=>({
 negativeOnlyHistory:badOnly,opposingExternalEvidence:opposed,
 weakExternalEvidence:M,affirmativeExternalEvidence:H,
 positiveHistory:H,emptyContext:M
});
const observed={
 original:vector(H,H),
 historyOnly:vector(M,H),
 externalOnly:vector(H,M),
 both:vector(M,M)
};
test('source interventions affect exactly separate confidence predicates',()=>{
 const original=[
 'val confidence = when {',
 '  input.historicalObservations.isNotEmpty() ||',
 '                input.externalEvidence.any { it.fresh && it.authoritative } ->',
 '                RecommendationConfidenceBand.HIGH','}'
 ].join('\n');
 const source=buildCausalVariants(original,{requireOriginalBlob:false});
 assert.deepEqual(Object.keys(source),['original','historyOnly','externalOnly','both']);
 assert.equal(source.original,original);
 assert.ok(source.historyOnly.includes('measuredGood.getOrDefault(recommendedProfile, 0) > 0'));
 assert.ok(source.externalOnly.includes('it.supportsRecommendation == true'));
 assert.ok(!source.historyOnly.includes('it.supportsRecommendation == true'));
 assert.ok(!source.externalOnly.includes('measuredGood.getOrDefault(recommendedProfile, 0) > 0'));
 assert.ok(source.both.includes('it.supportsRecommendation == true'));
 assert.notEqual(source.historyOnly,source.externalOnly);
});
test('cross intervention matrix yields separable code guards but conservatively ONE causal family',()=>{
 const result=adjudicateMatrix(observed);
 assert.equal(result.sourceBlobSha,EXPECTED_BLOB);
 assert.equal(result.originalDefectPredicates,2);
 assert.equal(result.causalGuardIndependence,'SEPARABLE_GUARDS_SHARED_POLICY_FAMILY');
 assert.equal(result.independentRootCausesCertified,false);
 assert.equal(result.independentGroupsCounted,1);
 assert.equal(result.negativeControlFailures,0);
 assert.equal(result.corpusNewLabels,0);
 assert.equal(result.holdoutFrozen,false);
 assert.equal(result.precision,null);
});
test('mixed/accidentally fixed results fail closed (not another presumed cause)',()=>{
 for(const key of ['historyOnly','externalOnly','both','original']){
  for(const testcase of ['negativeOnlyHistory','opposingExternalEvidence','weakExternalEvidence','affirmativeExternalEvidence','positiveHistory','emptyContext']){
   const altered=structuredClone(observed);
   altered[key][testcase]=(observed[key][testcase]===H)?M:H;
   assert.throws(()=>adjudicateMatrix(altered),/C2_PR150_CAUSAL_MATRIX_BLOCKED/);
  }
 }
});
test('intervention rejects fabricated or duplicate source fragments and conflicting observations',()=>{
 const missing='fun build() { return 42 }';
 assert.throws(()=>buildCausalVariants(missing,{requireOriginalBlob:false}),/C2_PR150_CAUSAL_MATRIX_BLOCKED/);
 const duplicate=['input.historicalObservations.isNotEmpty() ||','                input.externalEvidence.any { it.fresh && it.authoritative } ->'].join('\n');
 assert.throws(()=>buildCausalVariants(duplicate+'\n'+duplicate,{requireOriginalBlob:false}),/C2_PR150_CAUSAL_MATRIX_BLOCKED/);
 const extra=structuredClone(observed);extra.original.fake='HIGH';
 assert.throws(()=>adjudicateMatrix(extra),/C2_PR150_CAUSAL_MATRIX_BLOCKED/);
});
