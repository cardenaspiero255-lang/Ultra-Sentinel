'use strict';
/*
 * C2 evidence *precondition*, not an evidence certifier.
 * All fields are untrusted until authenticated against GitHub artifact hashes,
 * source Git blobs, separate oracles, and both pinned engine builds.
 */
const crypto=require('node:crypto');
const {NEW_LOCK}=require('./c2-next-holdout.cjs');
const {PACKET_DIGEST}=require('./c2-next-one-positive-truth.cjs');
const {assessSssPlusPreScreen,POLICY}=require('./sssplus-pre-screen.cjs');
const {findingKey}=require('./shadow-parity-metrics.cjs');
const SHA=/^[0-9a-f]{40}$/;
const DIGEST=/^[0-9a-f]{64}$/;
const KEYS=['schema','repository','packetDigest','truth','candidate','baseline'];
function exact(o,keys){
 return !!o&&typeof o==='object'&&!Array.isArray(o)&&
   Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
}
function key(f){return findingKey(f);}
const BASE={
 schema:'ultra-sentinel-c2-frozen-benchmark-gate/v1',
 repository:NEW_LOCK.repository,
 packetDigest:PACKET_DIGEST,
 realEvidenceAuthenticated:false,
 sourceCiAuthenticated:false,
 trainingSeparationAuthenticated:false,
 independentLabelsVerified:false,
 fullPrCoverageAuthenticated:false,
 tripleSPlusCertified:false,
 mergeAllowed:false,
 autoRepair:false
};
function blocked(status,counts,unmet){
 return Object.freeze({...BASE,status,
  labelCounts:counts??null,unmet:Object.freeze(unmet),
  comparisonPerformed:false,precision:null,recall:null,f1:null,
  baseline:null,candidate:null,fpNonRegressionObserved:null,
  limitation:'Caller-provided source/labels/predictions are untrusted. No CI/source oracle/engine SHA authentication and no SSS+ certification.'});
}
function knownLabels(labels){
 if(!Array.isArray(labels)||labels.length>1000)return null;
 const seen=new Set(),evidence=new Set(),out=new Map();
 const prs=new Set(),paths=new Set(),rules=new Set();
 const ruleClasses=new Map();
 let positive=0,negative=0,criticalPos=0,criticalNeg=0;
 const {isCriticalRule}=require('./critical-rule-policy.cjs');
 for(const v of labels){
  if(!exact(v,['pr','headSha','rule','path','line','positive','sourceBlobSha','evidenceSha256'])||
     typeof v.positive!=='boolean'||!SHA.test(v.sourceBlobSha)||
     !DIGEST.test(v.evidenceSha256))return null;
  const frozen=NEW_LOCK.cases.find(x=>x.pr===v.pr);
  if(!frozen||v.headSha!==frozen.headSha)return null;
  let k;
  try{k=key(v);}catch{return null;}
  const id=v.pr+'\0'+k;
  if(seen.has(id)||evidence.has(v.evidenceSha256))return null;
  seen.add(id);evidence.add(v.evidenceSha256);
  if(!out.has(v.pr))out.set(v.pr,new Map());
  out.get(v.pr).set(k,v.positive);
  prs.add(v.pr);paths.add(v.path);rules.add(v.rule);
  if(!ruleClasses.has(v.rule))ruleClasses.set(v.rule,new Set());
  ruleClasses.get(v.rule).add(v.positive);
  if(v.positive){positive++;if(isCriticalRule(v.rule))criticalPos++;}
  else{negative++;if(isCriticalRule(v.rule))criticalNeg++;}
 }
 return {
  byPr:out,ruleClasses,
  counts:{total:labels.length,positive,negative,prs:prs.size,
   paths:paths.size,rules:rules.size,criticalPositive:criticalPos,
   criticalNegative:criticalNeg}
 };
}
function sourceCapture(capture,kind,truthByPr,sourceEngineSha){
 if(!exact(capture,['sourceEngineSha','kind','samples'])||
  capture.kind!==kind||capture.sourceEngineSha!==sourceEngineSha||
  !Array.isArray(capture.samples)||capture.samples.length!==NEW_LOCK.cases.length)return null;
 const out=[],prSeen=new Set();
 for(let i=0;i<NEW_LOCK.cases.length;i++){
  const sample=capture.samples[i],frozen=NEW_LOCK.cases[i];
  if(!exact(sample,['pr','headSha','baseSha','scope','findings'])||
    sample.pr!==frozen.pr||prSeen.has(sample.pr)||
    sample.headSha!==frozen.headSha||sample.baseSha!==frozen.baseSha||
    !exact(sample.scope,['changedFiles','analyzedFiles','omittedFiles',
      'nonPositionalFindings','partial','source'])||
    sample.scope.changedFiles!==frozen.changedFiles||
    sample.scope.analyzedFiles!==frozen.changedFiles||
    sample.scope.omittedFiles!==0||sample.scope.nonPositionalFindings!==0||
    sample.scope.partial!==false||sample.scope.source!=='PINNED_GITHUB_COMPARE'||
    !Array.isArray(sample.findings)||sample.findings.length>500)return null;
  prSeen.add(sample.pr);
  const truth=truthByPr.get(sample.pr);
  if(!truth||truth.size<2)return null;
  const found=new Set(),findings=[];
  for(const f of sample.findings){
   if(!exact(f,['rule','path','line']))return null;
   let k;
   try{k=key(f);}catch{return null;}
   if(found.has(k)||!truth.has(k))return null;
   found.add(k);findings.push(f);
  }
  out.push({repository:NEW_LOCK.repository,pr:sample.pr,
   headSha:frozen.headSha,baseSha:frozen.baseSha,
   sourceCheckState:'SUCCESS',
   findings});
 }
 return out;
}
function assessFrozenC2Benchmark(input){
 if(!exact(input,KEYS)||input.schema!=='ultra-sentinel-c2-frozen-benchmark-input/v1'||
  input.repository!==NEW_LOCK.repository||input.packetDigest!==PACKET_DIGEST||
  !exact(input.truth,['schema','sealedDigest','sourceEngineSha','labels',
   'trainingExclusionDeclared','candidatePredictionsRead','baselinePredictionsRead'])||
  input.truth.schema!=='ultra-sentinel-c2-frozen-truth/v1'||
  !DIGEST.test(input.truth.sealedDigest)||
  input.truth.sourceEngineSha!==NEW_LOCK.engineSourceSha||
  input.truth.trainingExclusionDeclared!==true||
  input.truth.candidatePredictionsRead!==false||
  input.truth.baselinePredictionsRead!==false)
  return blocked('BLOCKED_PROVENANCE_OR_COVERAGE',null,['invalidEnvelopeOrTruth']);
 const expectedTruthDigest=crypto.createHash('sha256').update(JSON.stringify({
  schema:'ultra-sentinel-c2-truth-snapshot/v1',
  packetDigest:PACKET_DIGEST,sourceEngineSha:NEW_LOCK.engineSourceSha,
  labels:input.truth.labels
 })).digest('hex');
 // SHA-256 prevents accidental or opportunistic alterations *after* sealing.
 // It is NOT a signature and does not authenticate the author or source oracles.
 if(input.truth.sealedDigest!==expectedTruthDigest)
  return blocked('BLOCKED_PROVENANCE_OR_COVERAGE',null,['tamperedTruthDigest']);
 const labels=knownLabels(input.truth.labels);
 if(!labels)return blocked('BLOCKED_PROVENANCE_OR_COVERAGE',null,['invalidTruthIdentities']);
 const n=labels.counts;
 const deficiencies=[];
 if(n.total<POLICY.minLabels)deficiencies.push('labels');
 if(n.positive<POLICY.minPositive)deficiencies.push('positive');
 if(n.negative<POLICY.minNegative)deficiencies.push('negative');
 if(n.prs<POLICY.minDistinctPrs)deficiencies.push('prs');
 if(n.paths<POLICY.minDistinctPaths)deficiencies.push('paths');
 if(n.rules<POLICY.minDistinctRules)deficiencies.push('rules');
 if(n.criticalPositive<POLICY.minCriticalPositives)deficiencies.push('criticalPositive');
 if(n.criticalNegative<POLICY.minCriticalNegatives)deficiencies.push('criticalNegative');
 const {isCriticalRule}=require('./critical-rule-policy.cjs');
 const criticalPositiveRules=[...labels.byPr].flatMap(([pr,m])=>[...m].filter(([k,v])=>v===true).map(([k])=>k.split('\0')[0])).filter(isCriticalRule);
 if(new Set(criticalPositiveRules).size<POLICY.minCriticalPositiveRules)deficiencies.push('criticalPositiveRules');
 for(const [rule,classes] of labels.ruleClasses){
  if(classes.size!==2)deficiencies.push('unbalancedRule:'+rule);
 }
 // Never even look at captured detector predictions before the pre-registered
 // truth population is large and diverse enough to support valid comparisons.
 if(deficiencies.length)return blocked('BLOCKED_INSUFFICIENT_TRUTH',n,deficiencies);
 if(!exact(input.candidate,['sourceEngineSha','kind','samples'])||
    !exact(input.baseline,['sourceEngineSha','kind','samples'])||
    input.candidate.sourceEngineSha!==NEW_LOCK.engineSourceSha||
    !SHA.test(input.baseline.sourceEngineSha)||
    input.baseline.sourceEngineSha===input.candidate.sourceEngineSha)
  return blocked('BLOCKED_PROVENANCE_OR_COVERAGE',n,['mismatchedFrozenEngine']);
 const candidate=sourceCapture(input.candidate,'CANDIDATE',labels.byPr,NEW_LOCK.engineSourceSha);
 const baseline=sourceCapture(input.baseline,'BASELINE',labels.byPr,input.baseline.sourceEngineSha);
 if(!candidate||!baseline)
  return blocked('BLOCKED_PROVENANCE_OR_COVERAGE',n,['nonComparableFullPrFindings']);
 const camp={schema:'ultra-sentinel-parity-campaign/v1',
  samples:NEW_LOCK.cases.map((p,i)=>({
   repository:NEW_LOCK.repository,pr:p.pr,headSha:p.headSha,
   baseSha:p.baseSha,sourceCheckState:'SUCCESS',
   labels:input.truth.labels.filter(x=>x.pr===p.pr)
    .map(({rule,path,line,positive})=>({rule,path,line,positive})),
   candidate:candidate[i].findings,
   baseline:baseline[i].findings
  }))};
 let score;
 try{score=assessSssPlusPreScreen(camp);}
 catch{return blocked('BLOCKED_PROVENANCE_OR_COVERAGE',n,['unscorablePopulation']);}
 const ok=score.internalNumericalTargetsObserved===true;
 return Object.freeze({...BASE,
  status:ok?'NUMERICAL_DIAGNOSTIC_ONLY':'NUMERICAL_FAIL_NOT_CERTIFIED',
  labelCounts:score.labelCounts,
  unmet:Object.freeze(score.unmet),
  comparisonPerformed:true,
  candidate:score.candidate,baseline:score.baseline,
  precision:score.candidate.precision,recall:score.candidate.recall,f1:score.candidate.f1,
  fpNonRegressionObserved:score.gates.nonRegression,
  limitation:'Only NUMERICAL comparison of caller-supplied manifests, not evidence authentication. Model training separation, genuine source oracle independence, full GitHub coverage, live CI and SSS+ certification require separate SHA-bound attestations.'});
}
module.exports={assessFrozenC2Benchmark};
