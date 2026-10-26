'use strict';
/**
 * Deterministic read-only bisect planner over supplied, ordered Git commit IDs.
 * Observations are not authenticated; no code is checked out or executed.
 */
const SHA=/^[a-f0-9]{40}$/;
const REPOSITORIES=new Set([
 'cardenaspiero255-lang/Ultra-Sentinel',
 'cardenaspiero255-lang/gamehub-ultra',
 'cardenaspiero255-lang/JARVIS'
]);
function exact(obj,keys){
 return obj!==null&&typeof obj==='object'&&!Array.isArray(obj)&&
  Object.getPrototypeOf(obj)===Object.prototype&&
  Object.keys(obj).length===keys.length&&keys.every(k=>Object.hasOwn(obj,k));
}
function fail(){throw Error('INVALID_REGRESSION_EVIDENCE');}
function planRegressionBisect(input){
 if(!exact(input,['repository','commits','observations'])||
  !REPOSITORIES.has(input.repository)||!Array.isArray(input.commits)||
  input.commits.length<2||input.commits.length>512||
  !input.commits.every(s=>typeof s==='string'&&SHA.test(s))||
  new Set(input.commits).size!==input.commits.length||
  !Array.isArray(input.observations)||input.observations.length>input.commits.length)
  fail();
 const indices=new Map(input.commits.map((sha,i)=>[sha,i]));
 const found=new Map();
 for(const receipt of input.observations){
  if(!exact(receipt,['sha','result'])||!indices.has(receipt.sha)||
   !['GOOD','BAD'].includes(receipt.result)||found.has(receipt.sha))fail();
  found.set(receipt.sha,receipt.result);
 }
 const first=input.commits[0],last=input.commits.at(-1);
 let status,nextSha=null,suspectedFirstBadSha=null;
 const positive=[...found].filter(([,r])=>r==='GOOD').map(([sha])=>indices.get(sha));
 const negative=[...found].filter(([,r])=>r==='BAD').map(([sha])=>indices.get(sha));
 if(found.get(first)!=='GOOD'||found.get(last)!=='BAD')status='MISSING_BOUNDARY_OBSERVATIONS';
 else{
  const good=Math.max(...positive),bad=Math.min(...negative);
  if(good>=bad)status='NON_MONOTONIC_INCONCLUSIVE';
  else if(bad===good+1){status='CANDIDATE_REQUIRES_REPRO';suspectedFirstBadSha=input.commits[bad];}
  else{status='TEST_REQUIRED';nextSha=input.commits[Math.floor((good+bad)/2)];}
 }
 return Object.freeze({schema:'ultra-sentinel-regression-bisect-plan/v1',
  repository:input.repository,status,nextSha,suspectedFirstBadSha,
  observedCount:input.observations.length,commitsConsidered:input.commits.length,
  commitsVerifiedExternally:false,causalityVerified:false,executable:false,
  mergeAllowed:false,autoRepairAllowed:false,
  limitation:'Supplied commit ordering, build outcomes and test receipts are untrusted. Authenticate source Git ancestry and independent CI before any causal conclusion.'});
}
module.exports={planRegressionBisect};
