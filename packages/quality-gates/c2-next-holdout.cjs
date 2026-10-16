'use strict';
/*
 * Next untouched C2 batch, preregistered AFTER three prior defect families
 * were disclosed and converted to training regressions. Only immutable
 * PR metadata, no diffs, candidate predictions, labels or baseline.
 */
const crypto=require('node:crypto');
const REPO='cardenaspiero255-lang/gamehub-ultra';
const ENGINE='547938ed88804e25bbabecf74a3c3d91b74cf1a4';
const CASES=Object.freeze([
 {pr:150,headSha:'4c6912d7ca17df0669f8a0d9667f34d2f2b205a9',baseSha:'74c5fb9697b2855a1395c9562c2f9b74df9c34c1',changedFiles:21,state:'closed'},
 {pr:151,headSha:'9ad983576c16c6c34d59283979d83c69ede50dce',baseSha:'c594cb5383591d5040b1e88930fc76a5e5c9c6fa',changedFiles:41,state:'closed'},
 {pr:152,headSha:'104b7dc33e4c0341cec3fca81e3c8fbe3625357f',baseSha:'e2050a76af7fa3010032604e6537ab124e7b4c38',changedFiles:41,state:'closed'},
 {pr:153,headSha:'6508cc124076b9dea437ea1efc213d3ce55d7baf',baseSha:'86565d51b021e9834062552522dda0424a9cb2bc',changedFiles:26,state:'closed'},
 {pr:154,headSha:'858c9ce5cb6a7916d63f2348432013e49d02ba79',baseSha:'260c184932052a7cde0ce4f761e47cdea5f02725',changedFiles:24,state:'closed'},
 {pr:155,headSha:'2289f4e4cda55ddaa50f2016113ded82dc17203c',baseSha:'362675d4e013fe79c57526ef7e3a7ca4c98a7115',changedFiles:26,state:'closed'},
 {pr:157,headSha:'cb184c56d28342e46923d149c0e7f27141ce1a24',baseSha:'362675d4e013fe79c57526ef7e3a7ca4c98a7115',changedFiles:39,state:'closed'},
 {pr:158,headSha:'9d8572afedc634ac07dae58a0da326ea62bdc1da',baseSha:'1060ce8b9f35d191ce8639337e4cff50085cbd7e',changedFiles:23,state:'closed'}
].map(x=>Object.freeze(x)));
const NEW_LOCK=Object.freeze({schema:'ultra-sentinel-c2-next-holdout-packet/v1',
 repository:REPO,engineSourceSha:ENGINE,cases:CASES});
const REQ=['pr','headSha','baseSha','changedFiles','state',
 'baseRepoId','baseOwnerId','headRepoId','headOwnerId'];
const USED=Object.freeze([73,132,159,161,163,172,205,206,208]);
function fail(){throw Error('C2_NEXT_HOLDOUT_UNVERIFIED');}
function exact(x,keys){return x!==null&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));}
function freezeNextHoldout(observed){
 if(!Array.isArray(observed)||observed.length!==CASES.length)fail();
 const seen=new Set();
 for(let i=0;i<CASES.length;i++){
  const x=observed[i],p=CASES[i];
  if(!exact(x,REQ)||seen.has(x.pr)||x.pr!==p.pr||
   x.headSha!==p.headSha||x.baseSha!==p.baseSha||
   x.changedFiles!==p.changedFiles||x.state!==p.state||
   x.headRepoId!==1375408706||x.baseRepoId!==1375408706||
   x.headOwnerId!==322222186||x.baseOwnerId!==322222186)fail();
  seen.add(x.pr);
 }
 if(CASES.some(x=>USED.includes(x.pr)))fail();
 const digest=crypto.createHash('sha256')
  .update(JSON.stringify(NEW_LOCK),'utf8').digest('hex');
 return Object.freeze({schema:'ultra-sentinel-c2-next-holdout-freeze/v1',
  status:'FROZEN_INPUT_ONLY',repository:REPO,engineSourceSha:ENGINE,
  packetDigest:digest,cases:CASES,knownCaseTrainingOverlap:0,
  currentFindingsCount:0,labelsVerified:0,
  candidateInspected:false,truthLabelsInspected:false,baselineInspected:false,
  precision:null,recall:null,f1:null,fpNonRegressionVerified:false,
  tripleSPlusCertified:false,canMerge:false,canRepair:false,
  limitations:'Eight PR identities are preregistered; no blind defects or negatives '+
   'have yet been validated. Compare a fixed baseline and candidate only AFTER '+
   'technical ground-truth oracles are frozen. This is not certification.'});
}
module.exports={NEW_LOCK,freezeNextHoldout};
