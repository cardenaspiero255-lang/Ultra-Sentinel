'use strict';
/**
 * Pre-registered, owner-only and read-only C2 holdout, BEFORE any new labels,
 * predictions or legacy baseline are consulted. This is NOT a benchmark.
 * API evidence is validated against literal commit IDs and repository IDs.
 */
const crypto=require('node:crypto');
const REPO='cardenaspiero255-lang/gamehub-ultra';
const MODEL='bb38bb77983339301cafe8a7594e258e0c2924a6';
const CASES=Object.freeze([
 {pr:172,headSha:'34199fe8e093903c987f59d746661285d6e7caee',baseSha:'7839b5fc6236b428dbcc021878df1f8fdff3a7ec',changedFiles:5,state:'closed'},
 {pr:205,headSha:'1ecf73e789b91354ce9d8b7289d9492930ae5950',baseSha:'22f37acf28677aa8aaa271aac35591950c5addfd',changedFiles:6,state:'closed'},
 {pr:206,headSha:'53cb89551d6e750d263bc0e25dde9f4d3069144f',baseSha:'b1089cb127b79706f30908df9db8fa35bdc1a8e7',changedFiles:14,state:'closed'},
 {pr:208,headSha:'df2bd33416d652480e51994784e511fbcb7ede12',baseSha:'fca3250bd71700045cf9b2fc4e4281421f545d2e',changedFiles:13,state:'open'}
].map(x=>Object.freeze(x)));
const LOCK=Object.freeze({schema:'ultra-sentinel-c2-unseen-holdout-packet/v1',
 repository:REPO,modelSourceSha:MODEL,cases:CASES});
const REQ=['pr','headSha','baseSha','changedFiles','state','baseRepoId','baseOwnerId','headRepoId','headOwnerId'];
function fail(){throw Error('UNVERIFIED_HOLDOUT_SOURCE');}
function exact(x,keys){return x&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));}
function freezeHoldoutEvidence(observations){
 if(!Array.isArray(observations)||observations.length!==CASES.length)fail();
 const seen=new Set();
 for(let i=0;i<CASES.length;i++){
  const x=observations[i],p=CASES[i];
  if(!exact(x,REQ)||!Number.isSafeInteger(x.pr)||seen.has(x.pr)||
   x.pr!==p.pr||x.headSha!==p.headSha||x.baseSha!==p.baseSha||
   x.changedFiles!==p.changedFiles||x.state!==p.state||
   x.baseRepoId!==1375408706||x.headRepoId!==1375408706||
   x.baseOwnerId!==322222186||x.headOwnerId!==322222186)fail();
  seen.add(x.pr);
 }
 if(CASES.some(x=>[73,132,159,161,163].includes(x.pr)))fail();
 const digest=crypto.createHash('sha256')
  .update(JSON.stringify(LOCK),'utf8').digest('hex');
 return Object.freeze({schema:'ultra-sentinel-c2-unseen-holdout-freeze/v1',
  status:'FROZEN_INPUT_ONLY',repository:REPO,modelSourceSha:MODEL,
  packetDigest:digest,cases:CASES,knownCaseTrainingOverlap:0,
  includesPredictions:false,includesTruthLabels:false,includesBaseline:false,
  labelsVerified:0,precision:null,recall:null,f1:null,
  unseenDefectsVerified:0,canCertify:false,canMerge:false,canRepair:false,
  limitations:'Commit identities are frozen; source semantics, label correctness, '+
   'CI provenance and measurement of previously unseen defects remain unverified. '+
   'Do not evaluate the candidate before constructing independent test oracles.'});
}
module.exports={LOCK,freezeHoldoutEvidence};
