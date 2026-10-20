'use strict';
/*
 * Original GameHub PR #150 development-only causal intervention experiment.
 * Two orthogonal control-flow guards; do not equate them to independent root
 * causes or admit new labels from synthetic repairs.
 */
const {createHash}=require('node:crypto');
const EXPECTED_BLOB='37866fd3dbfcd19d9daaf29a5e1e426391c723d4';
const ORIGINAL_HEAD='4c6912d7ca17df0669f8a0d9667f34d2f2b205a9';
const SOURCE_PATH='app/src/main/java/com/cardenaspiero255/gamehubultra/domain/SmartRecommendationExplanation.kt';
const HISTORY='input.historicalObservations.isNotEmpty() ||';
const HISTORY_REPAIR='(input.historicalObservations.isNotEmpty() &&\n'+
  '                (measuredGood.getOrDefault(recommendedProfile, 0) > 0 ||\n'+
  '                 acceptedFeedback.getOrDefault(recommendedProfile, 0) > 0)) ||';
const EXTERNAL='input.externalEvidence.any { it.fresh && it.authoritative } ->';
const EXTERNAL_REPAIR='input.externalEvidence.any { it.fresh && it.authoritative && it.supportsRecommendation == true } ->';
const fail=()=>{throw Error('C2_PR150_CAUSAL_MATRIX_BLOCKED');};
function hashBlob(s){
 const b=Buffer.from(s,'utf8');
 return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
}
function replaceOne(src,from,to){
 if(src.split(from).length!==2)fail();
 return src.replace(from,to);
}
function buildCausalVariants(original,{requireOriginalBlob=true}={}){
 if(typeof original!=='string'||original.length<50||original.length>100000||
  original.includes('\0')|| (requireOriginalBlob&&hashBlob(original)!==EXPECTED_BLOB))fail();
 const historyOnly=replaceOne(original,HISTORY,HISTORY_REPAIR);
 const externalOnly=replaceOne(original,EXTERNAL,EXTERNAL_REPAIR);
 const both=replaceOne(historyOnly,EXTERNAL,EXTERNAL_REPAIR);
 if(historyOnly===externalOnly||both===original||hashBlob(both)===EXPECTED_BLOB)fail();
 return Object.freeze({original,historyOnly,externalOnly,both});
}
const NAMES=['negativeOnlyHistory','opposingExternalEvidence','weakExternalEvidence',
 'affirmativeExternalEvidence','positiveHistory','emptyContext'];
const expected=(history,external)=>({
 negativeOnlyHistory:history,opposingExternalEvidence:external,
 weakExternalEvidence:'MEDIUM',affirmativeExternalEvidence:'HIGH',
 positiveHistory:'HIGH',emptyContext:'MEDIUM'
});
const MATRIX=Object.freeze({
 original:expected('HIGH','HIGH'),
 historyOnly:expected('MEDIUM','HIGH'),
 externalOnly:expected('HIGH','MEDIUM'),
 both:expected('MEDIUM','MEDIUM')
});
function adjudicateMatrix(actual){
 if(!actual||typeof actual!=='object'||Array.isArray(actual)||
   Object.keys(actual).length!==4)fail();
 for(const [variant,want] of Object.entries(MATRIX)){
  const got=actual[variant];
  if(!got||typeof got!=='object'||Array.isArray(got)||
    Object.keys(got).length!==NAMES.length)fail();
  for(const k of NAMES)if(got[k]!==want[k])fail();
 }
 return Object.freeze({
  schema:'ultra-sentinel-c2-pr150-factorial-causal-adjudication/v1',
  originalRepo:'cardenaspiero255-lang/gamehub-ultra',
  originalPr:150,originalHeadSha:ORIGINAL_HEAD,sourcePath:SOURCE_PATH,
  sourceBlobSha:EXPECTED_BLOB,originalDefectPredicates:2,
  testMatrix:actual,
  historyOnlyFixResolvesHistoryButNotOpposingEvidence:true,
  externalOnlyFixResolvesOpposingEvidenceButNotHistory:true,
  bothFixesResolveBoth:true,
  benignNegativeControlsPassed:4,
  negativeControlFailures:0,
  causalGuardIndependence:'SEPARABLE_GUARDS_SHARED_POLICY_FAMILY',
  rootCauseFamily:'RECOMMENDATION_CONFIDENCE_CALIBRATION',
  independentRootCausesCertified:false,independentGroupsCounted:1,
  evidenceForDistinctPhysicalIncidents:false,
  historicalLabelsModified:false,corpusNewLabels:0,
  benchmarkScoredLabels:0,precision:null,recall:null,f1:null,
  holdoutFrozen:false,tripleSPlusCertified:false,
  verdict:'TWO_SEPARABLE_SOURCE_GUARDS_ONE_CONSERVATIVE_CAUSAL_FAMILY',
  limitation:'Orthogonal repairs demonstrate two separately addressable source guard defects, not independent causal families. The weak-evidence control is a valid negative; no new labels, no blind score, and no device incidence claim.'
 });
}
module.exports={EXPECTED_BLOB,ORIGINAL_HEAD,SOURCE_PATH,buildCausalVariants,adjudicateMatrix,hashBlob};
