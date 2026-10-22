'use strict';
/* All mechanism classifications are hypotheses conditioned on authentic
 * source/mutant JVM replay; no family independence or detector efficacy is
 * inferred from matching or nonmatching PRs, files, APIs or test names.
 */
const crypto=require('node:crypto');
const {STAGES}=require('./c2-twelve-original-oracle-reconciliation.cjs');
const h=s=>crypto.createHash('sha256').update(s).digest('hex');
const fail=()=>{throw Error('C2_PR184_CAUSAL_CLASSIFICATION_BLOCKED');};
const HEX40=/^[a-f0-9]{40}$/,HEX64=/^[a-f0-9]{64}$/;
const groups=Object.freeze({
 '152:110':{key:'JSON_ARRAY_TERMINATION_HYPOTHESIS',mechanism:'Premature closing bracket truncates a parsed JSON sources array',distinguishingIntervention:'Bounded JSON-array scanner repair preserves multi-source array parsing'},
 '152:41':{key:'ROLLBACK_VERSION_MONOTONICITY_HYPOTHESIS',mechanism:'An older applied proposal replaces a newer saved rollback snapshot',distinguishingIntervention:'Guard version monotonicity without rejecting newer independent package writes'},
 '154:100':{key:'NONFINITE_NUMERIC_BOUNDARY_SHARED_HYPOTHESIS',mechanism:'Converting an unbounded quadratic discriminant to Double generates a nonfinite value',distinguishingIntervention:'Reject nonfinite discriminant conversion while preserving ordinary quadratic solutions'},
 '155:12':{key:'NONFINITE_NUMERIC_BOUNDARY_SHARED_HYPOTHESIS',mechanism:'A nonfinite high-drain threshold passes a positive-only configuration requirement',distinguishingIntervention:'Require a finite positive threshold while preserving ordinary battery recommendations'},
 '158:114':{key:'ADVANCED_SIGNAL_OBSERVATION_AGE_HYPOTHESIS',mechanism:'Context refresh resets the apparent age of an older advanced thermal observation',distinguishingIntervention:'Use the original advanced-observation timestamp, preserving still-fresh idle observations'},
 '158:144':{key:'FRESHNESS_QUALIFIER_PARSING_HYPOTHESIS',mechanism:'A current-comparison natural-language qualifier is not recognized as requiring fresh data',distinguishingIntervention:'Add the narrow comparison-qualifier branch without changing already recognized requests'}
});
function classifyTwelve(receipt){
 try{
  if(!receipt||receipt.schema!=='c2-pr183-twelve-original-kotlin-replays-not-causally-certified/v1'||
   receipt.status!=='TWELVE_ORIGINAL_SOURCES_REPLAYED_CAUSAL_FAMILY_INDEPENDENCE_PENDING'||
   receipt.sourceLabels!==23||receipt.sourcePositiveLabels!==11||receipt.sourceNegativeLabels!==12||
   receipt.originalReceipts!==12||receipt.retestedPositive!==6||receipt.retestedNegative!==6||
   receipt.remainingWithoutSourceReplay!==0||receipt.certifiedIndependentCausesAdded!==0||
   receipt.newLabels!==0||receipt.causalFamilyIndependenceVerified!==false||
   receipt.sssPlusCertified!==false||receipt.holdoutFrozen!==false||
   receipt.precision!==null||receipt.recall!==null||receipt.f1!==null||
   !Array.isArray(receipt.entryReviews)||receipt.entryReviews.length!==12)fail();
  const cases=STAGES.flatMap(x=>x.cases),expected=new Map(cases.map(x=>[x.pr+':'+x.line,x]));
  if(expected.size!==12||cases.length!==12)fail();
  const positives=[],negatives=[],seen=new Set();
  for(const x of receipt.entryReviews){
   if(!x||!Number.isInteger(x.pr)||!Number.isInteger(x.line)||
    !HEX40.test(x.headSha)||!HEX40.test(x.blobSha)||
    !HEX64.test(x.sourceReplayLogSha256)||!HEX64.test(x.adversarialControlLogSha256)||
    x.sourceReplayLogSha256===x.adversarialControlLogSha256||
    typeof x.positive!=='boolean'||typeof x.rule!=='string'||
    x.identity!==JSON.stringify([x.pr,x.headSha,x.rule,JSON.parse(x.identity)[3],x.line,x.positive])||
    x.originalSourceReplayed!==true||x.independentRootCauseCertified!==false||
    x.eligibleForGold!==false||x.eligibleForBlindHoldout!==false||
    x.causalFingerprint!==null)fail();
   const key=x.pr+':'+x.line,original=expected.get(key);
   if(!original||seen.has(key)||original.rule!==x.rule||
    original.positive!==x.positive||
    x.causalIndependenceStatus!==(x.positive?
      'CONTRAFACTUAL_REPRODUCED_FAMILY_NOT_YET_DISTINCT':
      'ORIGINAL_NEGATIVE_AND_MUTANT_REPLAYED_NO_POSITIVE_CAUSE'))fail();
   seen.add(key);
   const common={identity:x.identity,pr:x.pr,line:x.line,rule:x.rule,
    positive:x.positive,sourceReplayLogSha256:x.sourceReplayLogSha256,
    variantLogSha256:x.adversarialControlLogSha256,
    evidenceScope:'ORIGINAL_KOTLIN_BEHAVIOR_NOT_DETECTOR',
    eligibleForGold:false,independentRootCauseCertified:false};
   if(x.positive){
    const hypothesis=groups[key];
    if(!hypothesis)fail();
    positives.push(Object.freeze({...common,
     mechanismHypothesis:hypothesis.mechanism,
     distinguishingIntervention:hypothesis.distinguishingIntervention,
     sharedHypothesisKey:hypothesis.key,independentlyCertified:false,
     independenceStatus:'MECHANISM_HYPOTHESIS_NOT_DISTINCT_CAUSE',
     independentContrastResult:'NOT_RUN_ACROSS_ALL_SIX'}));
   }else negatives.push(Object.freeze({...common,
    safeControlStatus:'ORIGINAL_PASSED_MUTANT_FAILED_NOT_POSITIVE_DEFECT',
    role:'SCOPE_BOUNDARY_NEGATIVE_NOT_A_CAUSAL_POSITIVE'}));
  }
  if(seen.size!==12||positives.length!==6||negatives.length!==6)fail();
  const keys=new Set(positives.map(x=>x.sharedHypothesisKey));
  if(keys.size!==5||
    positives.filter(x=>x.sharedHypothesisKey==='NONFINITE_NUMERIC_BOUNDARY_SHARED_HYPOTHESIS').length!==2)fail();
  positives.sort((a,b)=>a.identity.localeCompare(b.identity));
  negatives.sort((a,b)=>a.identity.localeCompare(b.identity));
  return Object.freeze({
   schema:'c2-pr184-all-twelve-causal-mechanism-triage-v1',
   status:'BEHAVIOR_TWELVE_OF_TWELVE_MECHANISM_HYPOTHESES_NOT_INDEPENDENTLY_CERTIFIED',
   parentProofSha256:h(JSON.stringify(receipt)),
   sourceHistoricalCount:23,sourcePositiveLabels:11,sourceNegativeLabels:12,
   sourceIdentitiesReviewed:12,sourceReplaysAuthenticated:12,
   positiveHypotheses:positives,negativeControls:negatives,
   provisionalMechanismCandidateBuckets:5,
   independentlyDistinctRootCausesAccredited:0,
   familiesCertifiedFromThisAdjudication:0,
   positivePredictionsScored:0,newLabels:0,
   causalIndependenceVerified:false,blindHoldout:false,holdoutFrozen:false,
   sssPlusCertified:false,precision:null,recall:null,f1:null,
   nextIndependenceGate:'Orthogonal interventions across shared numeric boundary and other candidate mechanisms, plus detector-level false-positive discrimination and blinded independent labels',
   conclusion:'All twelve historical source behaviors classified for review, but source-level counterfactual sensitivity is not proof of independent causal families or detector accuracy.'
  });
 }catch(e){if(e?.message==='C2_PR184_CAUSAL_CLASSIFICATION_BLOCKED')throw e;fail();}
}
module.exports={classifyTwelve};
