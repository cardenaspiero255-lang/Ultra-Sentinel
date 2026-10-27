'use strict';
/*
 * Cross-file factorial experiments are hypotheses derived from Core findings.
 * Neither a matching rule nor a self-described SHA establishes causality.
 * No Git, network, test execution, filesystem access or write capabilities.
 */
const {analyzeFamilies}=require('./ultra_sentinel_family_fingerprints.cjs');
const {compareFamilySnapshots}=require('./family-delta.cjs');
const MAX_FACTORIAL_FILES=4;
function locationsByRule(report){
 const result=new Map();
 for(const family of report.families){
  if(!result.has(family.rule))result.set(family.rule,new Map());
  const locations=result.get(family.rule);
  for(const l of family.locations){
   const key=JSON.stringify([l.path,l.line,family.id]);
   locations.set(key,{path:l.path,line:l.line,familyId:family.id});
  }
 }
 return result;
}
function freezeExperiment(mask,files){
 const selected=Object.freeze(files.filter((_,i)=>Boolean(mask&(1<<i))));
 return Object.freeze({kind:mask===0?'baseline':mask===(1<<files.length)-1?
  'combined':'subset',selectedFiles:selected,executed:false,
  independentOracleVerified:false});
}
function result(baseSha,headSha,status,candidates=[],truncated=false){
 return Object.freeze({
  schema:'ultra-sentinel-cross-file-interventions/v1',
  status,baseSha,headSha,
  candidates:Object.freeze(candidates),
  truncated,
  sourceAuthenticated:false,causalityVerified:false,
  independentOracleVerified:false,commitAllowed:false,mergeAllowed:false,
  limitation:'Core co-occurrence is a hypothesis. Reproduce the baseline and each intervention on immutable real source with an independent original oracle before causal claims.'
 });
}
function planCrossFileInterventions(beforeCore,afterCore){
 // These validators reject missing, malformed, over-capacity and contradictory
 // Core findings before we construct a single candidate.
 const before=analyzeFamilies(beforeCore);
 const after=analyzeFamilies(afterCore);
 const delta=compareFamilySnapshots(before,after);
 if(delta.status==='INCOMPLETE_EVIDENCE')
  return result(before.sha,after.sha,'INCOMPLETE_EVIDENCE');
 const old=locationsByRule(before),current=locationsByRule(after);
 const candidates=[];
 for(const rule of [...new Set([...old.keys(),...current.keys()])].sort()){
  const previous=old.get(rule)||new Map(),next=current.get(rule)||new Map();
  const oldKeys=[...previous.keys()].sort(),newKeys=[...next.keys()].sort();
  if(oldKeys.length===newKeys.length&&oldKeys.every((x,i)=>x===newKeys[i]))
   continue;
  // A repeated pattern on two files is NOT proof those files interact.
  const all=[...new Set([...previous.values(),...next.values()].map(x=>x.path))].sort();
  if(all.length<2)continue;
  if(all.length>MAX_FACTORIAL_FILES)
   return result(before.sha,after.sha,'SCOPE_EXCEEDED',[],true);
  const newPaths=[...new Set([...next.values()].map(x=>x.path))];
  const previousPaths=new Set([...previous.values()].map(x=>x.path));
  const scenarios=Array.from({length:2**all.length},(_,mask)=>freezeExperiment(mask,all));
  candidates.push(Object.freeze({
   rule,files:Object.freeze(all),
   beforeOccurrences:oldKeys.length,afterOccurrences:newKeys.length,
   newlyObservedFiles:Object.freeze(newPaths.filter(x=>!previousPaths.has(x)).sort()),
   experiments:Object.freeze(scenarios),
   status:'MULTI_FILE_CAUSAL_HYPOTHESIS_NOT_VERIFIED',
   causalLinksProved:false
  }));
 }
 return result(before.sha,after.sha,candidates.length?
  'EXPERIMENTS_REQUIRED':'NO_CROSS_FILE_TRANSITIONS_OBSERVED',candidates);
}
module.exports={planCrossFileInterventions};
