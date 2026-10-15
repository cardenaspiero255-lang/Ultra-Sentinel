'use strict';
/* Supplied labels by rule: a diagnostic only, never certification. */
const {evaluateParityCampaign,findingKey}=require('./shadow-parity-metrics.cjs');
const {isCriticalRule}=require('./critical-rule-policy.cjs');
const POLICY=Object.freeze({minPositive:2,minNegative:2,minPrs:2,
 minPrecision:0.95,minRecall:0.95,minF1:0.95});
function calc({tp,fp,fn,tn}){
 const precision=tp+fp?tp/(tp+fp):0,recall=tp+fn?tp/(tp+fn):0;
 return {tp,fp,fn,tn,precision,recall,
  f1:precision+recall?2*precision*recall/(precision+recall):0};
}
function evaluateStratifiedBenchmark(input){
 const parity=evaluateParityCampaign(input);
 const groups=new Map();
 for(const s of input.samples){
  const actual=new Set(s.candidate.map(findingKey));
  const baseline=new Set(s.baseline.map(findingKey));
  for(const label of s.labels){
   const rule=label.rule;
   if(!groups.has(rule))groups.set(rule,{rule,critical:isCriticalRule(rule),prs:new Set(),
    positive:0,negative:0,candidate:{tp:0,fp:0,fn:0,tn:0},
    baseline:{tp:0,fp:0,fn:0,tn:0}});
   const g=groups.get(rule);g.prs.add(s.pr);
   if(label.positive)g.positive++;else g.negative++;
   const k=findingKey(label);
   for(const [where,set] of [['candidate',actual],['baseline',baseline]]){
    g[where][label.positive?(set.has(k)?'tp':'fn'):(set.has(k)?'fp':'tn')]++;
   }
  }
 }
 const strata=[...groups.values()].sort((a,b)=>a.rule.localeCompare(b.rule)).map(g=>{
  const candidate=calc(g.candidate),base=calc(g.baseline);
  const represented=g.positive>=POLICY.minPositive&&g.negative>=POLICY.minNegative&&g.prs.size>=POLICY.minPrs;
  const nonRegressed=candidate.fn<=base.fn&&candidate.fp<=base.fp&&candidate.tp>=base.tp;
  const passes=represented&&nonRegressed&&candidate.precision>=POLICY.minPrecision&&
   candidate.recall>=POLICY.minRecall&&candidate.f1>=POLICY.minF1&&
   (!g.critical||candidate.fn===0);
  return Object.freeze({rule:g.rule,critical:g.critical,
   support:Object.freeze({positive:g.positive,negative:g.negative,prs:g.prs.size}),
   candidate:Object.freeze(candidate),baseline:Object.freeze(base),represented,nonRegressed,passes});
 });
 const allPass=strata.length>=6&&strata.every(s=>s.passes)&&parity.candidateNonRegressionInSuppliedLabels;
 return Object.freeze({schema:'ultra-sentinel-stratified-benchmark/v1',
  repository:parity.repository,ruleCount:strata.length,strata:Object.freeze(strata),
  policy:POLICY,internalStrataPassed:allPass,
  independentLabelsVerified:false,sourceCiIndependentlyVerified:false,
  tripleSPlusCertified:false,mergeAllowed:false,autoRepair:false,
  verdict:!parity.sourceChecksClaimedGreen?'BLOCKED_SOURCE_CI':
   allPass?'STRATA_NUMERIC_ONLY':'STRATA_INCOMPLETE',
  limitation:'Rule names proxy families; synthetic/self-labelled findings and CI claims are untrusted. Requires independently blind-labelled real faults.'});
}
module.exports={evaluateStratifiedBenchmark,POLICY};
