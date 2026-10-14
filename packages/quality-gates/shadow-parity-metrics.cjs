'use strict';
/* Objective, offline comparison over an explicitly labelled corpus.
 * This calculator does NOT attest who labelled samples, prove coverage of
 * real code or make a certification/merge decision. Never execute PR code.
 */
const REPO='cardenaspiero255-lang/gamehub-ultra';
const SHA=/^[0-9a-f]{40}$/;
const RULE=/^[A-Z][A-Z0-9_]{2,80}$/;
function fail(reason){throw Error(reason);}
function findingKey(f){
 if(!f||typeof f!=='object'||Array.isArray(f)||!RULE.test(f.rule||'')||
  typeof f.path!=='string'||f.path.length>240||
  !/^[A-Za-z0-9_.\/-]+$/.test(f.path)||f.path.startsWith('/')||
  f.path.includes('..')||!Number.isSafeInteger(f.line)||f.line<=0||f.line>1000000)
  fail('INVALID_FINDING_IDENTITY');
 return f.rule+'\u0000'+f.path+'\u0000'+f.line;
}
function uniqueFindings(items,max=500){
 if(!Array.isArray(items)||items.length>max)fail('UNBOUNDED_FINDINGS');
 const out=new Set();
 for(const finding of items){
  const id=findingKey(finding);
  if(out.has(id))fail('DUPLICATE_FINDING_IDENTITY');
  out.add(id);
 }
 return out;
}
function scored(predictions,truth){
 let tp=0,fp=0,fn=0,tn=0;
 for(const [key,positive] of truth.entries()){
  const hit=predictions.has(key);
  if(positive&&hit)tp++;
  else if(positive)fn++;
  else if(hit)fp++;
  else tn++;
 }
 const precision=tp+fp?tp/(tp+fp):0;
 const recall=tp+fn?tp/(tp+fn):0;
 const f1=precision+recall?2*precision*recall/(precision+recall):0;
 return Object.freeze({tp,fp,fn,tn,precision,recall,f1});
}
function checkSample(raw){
 if(!raw||raw.repository!==REPO||!Number.isSafeInteger(raw.pr)||raw.pr<=0||
  !SHA.test(raw.headSha||'')||!SHA.test(raw.baseSha||'')||
  raw.sourceCheckState!=='SUCCESS'&&raw.sourceCheckState!=='BLOCKED_SOURCE_CI'&&
  raw.sourceCheckState!=='INCOMPLETE_SOURCE_CI')
  fail('UNTRUSTED_SOURCE_SAMPLE');
 if(!Array.isArray(raw.labels)||raw.labels.length<2||raw.labels.length>500)
  fail('MISSING_LABEL_CORPUS');
 const truth=new Map();
 for(const label of raw.labels){
  if(typeof label.positive!=='boolean')fail('INVALID_LABEL');
  const id=findingKey(label);
  if(truth.has(id))fail('DUPLICATE_LABEL');
  truth.set(id,label.positive);
 }
 if(![...truth.values()].includes(true)||![...truth.values()].includes(false))
  fail('UNBALANCED_OR_INCOMPLETE_LABELS');
 const baseline=uniqueFindings(raw.baseline),candidate=uniqueFindings(raw.candidate);
 for(const key of [...baseline,...candidate]){
  if(!truth.has(key))fail('UNLABELLED_FINDING');
 }
 const b=scored(baseline,truth),c=scored(candidate,truth);
 return Object.freeze({
  pr:raw.pr,headSha:raw.headSha,baseSha:raw.baseSha,
  sourceCheckState:raw.sourceCheckState,truthSize:truth.size,
  baseline:b,candidate:c,
  nonRegressionObserved:c.tp>=b.tp&&c.fp<=b.fp&&c.fn<=b.fn
 });
}
function evaluateParityCampaign(input){
 if(!input||input.schema!=='ultra-sentinel-parity-campaign/v1'||
   !Array.isArray(input.samples)||input.samples.length<1||input.samples.length>16)
  fail('INVALID_CAMPAIGN');
 const ids=new Set(),samples=[];
 for(const item of input.samples){
  const r=checkSample(item);
  if(ids.has(r.pr))fail('DUPLICATE_CAMPAIGN_PR');
  ids.add(r.pr);samples.push(r);
 }
 const blocked=samples.some(x=>x.sourceCheckState!=='SUCCESS');
 return Object.freeze({
  schema:'ultra-sentinel-parity-report/v1',repository:REPO,samples,
  candidateNonRegressionInSuppliedLabels:!blocked&&samples.every(x=>x.nonRegressionObserved),
  sourceChecksVerified:!blocked,
  semanticEquivalenceCertified:false,
  independentLabelsCertified:false,
  mergeAllowed:false,autoRepair:false,autoMerge:false,
  verdict:blocked?'BLOCKED_SOURCE_CI':'EVALUATION_ONLY_NOT_CERTIFIED',
  note:'Labels and source-check provenance are inputs; independently audit them before any performance or release claim.'
 });
}
module.exports={evaluateParityCampaign,findingKey};
