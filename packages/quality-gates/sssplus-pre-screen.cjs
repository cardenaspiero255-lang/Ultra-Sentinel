'use strict';
/**
 * Internal SSS+ quantitative PRE-SCREEN over supplied labelled examples.
 * The existing parity calculator validates identity/coverage. This layer
 * supplies fixed thresholds. It NEVER claims external truth, independence,
 * live CI validation or release authorization from caller-provided labels.
 */
const {evaluateParityCampaign,findingKey}=
 require('./shadow-parity-metrics.cjs');
const POLICY=Object.freeze({
 minDistinctPrs:4,minLabels:120,minPositive:48,minNegative:48,
 minDistinctRules:6,minDistinctPaths:4,
 minCriticalPositives:12,minCriticalNegatives:12,minCriticalPositiveRules:3,
 minPrecision:0.95,minRecall:0.95,minF1:0.95,
 maxCriticalFalseNegatives:0
});
const CRITICAL_RULES=Object.freeze(new Set([
 'PRIVILEGED_UNTRUSTED_CHECKOUT','POTENTIAL_HARDCODED_SECRET',
 'SPEECH_REENTRANT_RETRY','UNSCOPED_COROUTINE',
 'POTENTIAL_PRIVATE_LOG'
]));
function fail(code){throw Error(code);}
function aggregate(xs){
 const total={tp:0,fp:0,fn:0,tn:0};
 for(const x of xs){for(const key of Object.keys(total))total[key]+=x[key];}
 const precision=total.tp+total.fp?total.tp/(total.tp+total.fp):0;
 const recall=total.tp+total.fn?total.tp/(total.tp+total.fn):0;
 const f1=precision+recall?2*precision*recall/(precision+recall):0;
 return Object.freeze({...total,precision,recall,f1});
}
function assessSssPlusPreScreen(input){
 // Validate the entire campaign with the already merged evaluator; never
 // duplicate or bypass canonical findingKey or the labelled-universe check.
 const parity=evaluateParityCampaign(input);
 const labels=input.samples.flatMap(s=>s.labels);
 const positive=labels.filter(l=>l.positive===true).length;
 const negative=labels.length-positive;
 const rules=new Set(labels.map(x=>x.rule));
 const paths=new Set(labels.map(x=>x.path));
 const positiveCritical=labels.filter(l=>l.positive&&CRITICAL_RULES.has(l.rule));
 const negativeCritical=labels.filter(l=>!l.positive&&CRITICAL_RULES.has(l.rule));
 const positiveCriticalRules=new Set(positiveCritical.map(l=>l.rule));
 let criticalFalseNegatives=0;
 for(const s of input.samples){
  const predicted=new Set(s.candidate.map(findingKey));
  for(const label of s.labels){
   if(label.positive&&CRITICAL_RULES.has(label.rule)&&
      !predicted.has(findingKey(label)))criticalFalseNegatives++;
  }
 }
 const candidate=aggregate(parity.samples.map(x=>x.candidate));
 const baseline=aggregate(parity.samples.map(x=>x.baseline));
 const gates=Object.freeze({
  cohortSize:input.samples.length>=POLICY.minDistinctPrs,
  labelledPopulation:labels.length>=POLICY.minLabels,
  balancedCorpus:positive>=POLICY.minPositive&&negative>=POLICY.minNegative,
  distinctRules:rules.size>=POLICY.minDistinctRules,
  distinctPaths:paths.size>=POLICY.minDistinctPaths,
  criticalPopulation:positiveCritical.length>=POLICY.minCriticalPositives&&
   negativeCritical.length>=POLICY.minCriticalNegatives&&
   positiveCriticalRules.size>=POLICY.minCriticalPositiveRules,
  selfReportedSourceCiGreen:parity.sourceChecksClaimedGreen,
  nonRegression:parity.candidateNonRegressionInSuppliedLabels,
  precision:candidate.precision>=POLICY.minPrecision,
  recall:candidate.recall>=POLICY.minRecall,
  f1:candidate.f1>=POLICY.minF1,
  criticalRecall:criticalFalseNegatives<=POLICY.maxCriticalFalseNegatives
 });
 const unmet=Object.keys(gates).filter(k=>gates[k]===false);
 return Object.freeze({
  schema:'ultra-sentinel-sssplus-pre-screen/v1',
  repository:'cardenaspiero255-lang/gamehub-ultra',
  labelCounts:Object.freeze({total:labels.length,positive,negative,
   rules:rules.size,paths:paths.size,prs:input.samples.length,
   criticalPositive:positiveCritical.length,criticalNegative:negativeCritical.length,
   criticalPositiveRules:positiveCriticalRules.size}),
  baseline,candidate,criticalFalseNegatives,
  policy:POLICY,gates,unmet:Object.freeze(unmet),
  internalNumericalTargetsObserved:unmet.length===0,
  independentLabelsVerified:false,
  externalSemanticParityVerified:false,
  liveSourceCiIndependentlyVerified:false,
  crossRepoIntegrationCertified:false,
  tripleSPlusCertified:false,mergeAllowed:false,
  verdict:unmet.length?'PRESCREEN_BLOCKED':'NUMERICAL_PRESCREEN_ONLY',
  limitation:'Synthetic or self-labelled data cannot establish real detection quality. Require independent frozen labels, live SHA/CI and supervised external review.'
 });
}
module.exports={assessSssPlusPreScreen,POLICY};
