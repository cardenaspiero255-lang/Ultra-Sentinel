'use strict';
/* Compare already-clustered Core snapshots without asserting root-cause resolution. */
const SHA=/^[0-9a-f]{40}$/;
const RULE=/^[A-Z][A-Z0-9_]{2,80}$/;
const FINGERPRINT=/^[a-f0-9]{24}$/;
const STATES=new Set(['INCOMPLETE','REVIEW_REQUIRED','NO_CRITICAL_PATTERN']);
function fail(){throw Error('INVALID_FAMILY_SNAPSHOT');}
function parse(report){
 if(!report||typeof report!=='object'||Array.isArray(report)||
  report.engine!=='Ultra Sentinel Family Hunter'||!SHA.test(report.sha||'')||
  !STATES.has(report.status)||!Array.isArray(report.families)||report.families.length>40||
  report.autoMergeAllowed!==false||report.autoCommitAllowed!==false)fail();
 const map=new Map();
 for(const family of report.families){
  if(!family||!RULE.test(family.rule||'')||!FINGERPRINT.test(family.id||'')||
   family.status!=='HYPOTHESIS_REQUIRES_TESTS'||
   !Number.isSafeInteger(family.occurrences)||family.occurrences<1||
   !Number.isSafeInteger(family.distinctFiles)||family.distinctFiles<1||
   !Array.isArray(family.locations)||family.locations.length!==family.occurrences)fail();
  const locations=new Set(),paths=new Set();
  for(const l of family.locations){
   if(!l||typeof l.path!=='string'||!l.path||l.path.length>350||
    l.path.startsWith('/')||l.path.split('/').some(x=>x==='..'||!x)||
    !Number.isSafeInteger(l.line)||l.line<0||
    !['BLOCKER','HIGH','MEDIUM','LOW'].includes(l.severity))fail();
   const loc=l.path+'\0'+l.line;
   if(locations.has(loc))fail();locations.add(loc);paths.add(l.path);
  }
  if(paths.size!==family.distinctFiles)fail();
  const id=family.rule+':'+family.id;
  if(map.has(id))fail();
  map.set(id,{...family,locationKeys:locations});
 }
 return map;
}
function compareFamilySnapshots(before,after){
 const old=parse(before),current=parse(after);
 if(before.sha===after.sha)throw Error('SAME_SNAPSHOT_SHA');
 if(before.status==='INCOMPLETE'||after.status==='INCOMPLETE')return Object.freeze({
  baseSha:before.sha,headSha:after.sha,status:'INCOMPLETE_EVIDENCE',
  changes:[],verifiedResolved:0,autoCommitAllowed:false,autoMergeAllowed:false});
 const changes=[];
 for(const [id,f] of current){
  const prior=old.get(id);
  const sameRule=[...old.values()].some(o=>o.rule===f.rule);
  let state='NEW_FAMILY_HYPOTHESIS';
  if(prior){
   const same=prior.locationKeys.size===f.locationKeys.size&&
    [...prior.locationKeys].every(k=>f.locationKeys.has(k));
   state=same?'STILL_OBSERVED':'RELOCATED_OR_REPEATED_HYPOTHESIS';
  }else if(sameRule)state='SAME_RULE_VARIANT_CANDIDATE';
  changes.push({familyId:id,rule:f.rule,state,occurrences:f.occurrences,
   files:f.distinctFiles,verification:'REVIEW_REQUIRED'});
 }
 for(const [id,f] of old)if(!current.has(id))changes.push({
  familyId:id,rule:f.rule,state:'NOT_OBSERVED_REQUIRES_VERIFICATION',
  occurrences:0,files:0,verification:'REVIEW_REQUIRED'});
 changes.sort((a,b)=>a.familyId.localeCompare(b.familyId));
 return Object.freeze({baseSha:before.sha,headSha:after.sha,
  status:'HYPOTHESES_ONLY',changes,verifiedResolved:0,
  autoCommitAllowed:false,autoMergeAllowed:false,
  limitation:'A missing or moved heuristic finding never proves a root cause is fixed. Validate source identity, regressions and full patch coverage.'});
}
/** Canonical adapter: only Core reports passing Family Hunter's existing
 * structural validation can enter the cross-SHA comparison. */
function compareCoreFamilySnapshots(beforeCore,afterCore){
 const {analyzeFamilies}=require('./ultra_sentinel_family_fingerprints.cjs');
 return compareFamilySnapshots(analyzeFamilies(beforeCore),analyzeFamilies(afterCore));
}
module.exports={compareFamilySnapshots,compareCoreFamilySnapshots};
