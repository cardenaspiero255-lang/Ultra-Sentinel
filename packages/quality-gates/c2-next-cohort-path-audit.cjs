'use strict';
/* Metadata-only C2 overlap audit. Shared paths signal review risk, NOT
 * proven semantic or label leakage. No candidate outputs, labels or diffs. */
const {NEW_LOCK}=require('./c2-next-holdout.cjs');
const TRAINING=Object.freeze([73,132,159,161,163,172,205,206,208]);
function fail(){throw Error('C2_PATH_AUDIT_UNVERIFIED');}
function exact(x,keys){return x!==null&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));}
function validatePaths(paths,expected){
 if(!Array.isArray(paths)||!paths.length||paths.length>100||
  (expected!==undefined&&paths.length!==expected))fail();
 const seen=new Set();
 for(const path of paths){
  if(typeof path!=='string'||!path||path.length>1024||path.includes('\\')||
   path.startsWith('/')||path.includes('//')||
   path.split('/').some(s=>s==='.'||s==='..'||!s)||
   /[\u0000-\u001f]/.test(path)||seen.has(path))fail();
  seen.add(path);
 }
 return seen;
}
function auditCohortPaths(input){
 if(!exact(input,['schema','repository','holdout','training'])||
  input.schema!=='ultra-sentinel-c2-next-holdout-filelists/v1'||
  input.repository!==NEW_LOCK.repository||
  !Array.isArray(input.holdout)||!Array.isArray(input.training)||
  input.holdout.length!==NEW_LOCK.cases.length||input.training.length!==TRAINING.length)fail();
 const hold=[];
 for(let i=0;i<NEW_LOCK.cases.length;i++){
  const x=input.holdout[i],locked=NEW_LOCK.cases[i];
  if(!exact(x,['pr','headSha','files'])||x.pr!==locked.pr||x.headSha!==locked.headSha)fail();
  hold.push({pr:x.pr,files:validatePaths(x.files,locked.changedFiles)});
 }
 const training=[];
 for(let i=0;i<TRAINING.length;i++){
  const x=input.training[i];
  if(!exact(x,['pr','files'])||x.pr!==TRAINING[i])fail();
  training.push({pr:x.pr,files:validatePaths(x.files)});
 }
 const trainingSet=new Set(training.flatMap(x=>[...x.files]));
 const holdSet=new Set(hold.flatMap(x=>[...x.files]));
 const sharedWithTraining=[...holdSet].filter(x=>trainingSet.has(x)).sort();
 const pairwise=[];
 for(let i=0;i<hold.length;i++)for(let j=i+1;j<hold.length;j++){
  const paths=[...hold[i].files].filter(x=>hold[j].files.has(x));
  if(paths.length)pairwise.push({prs:[hold[i].pr,hold[j].pr],sharedPaths:paths.length});
 }
 return {schema:'ultra-sentinel-c2-next-holdout-path-audit/v1',
  status:sharedWithTraining.length||pairwise.length?'PATH_OVERLAP_REVIEW_REQUIRED':'NO_PATH_OVERLAP_OBSERVED',
  repository:NEW_LOCK.repository,holdoutPRs:hold.map(x=>x.pr),trainingPRs:TRAINING,
  holdoutFileOccurrences:hold.reduce((n,x)=>n+x.files.size,0),
  holdoutUniquePaths:holdSet.size,trainingUniquePaths:trainingSet.size,
  trainingSharedPaths:sharedWithTraining.length,sharedWithTraining,
  withinHoldoutPairsWithSharedPaths:pairwise.length,pairwise,
  pathOverlapIsProofOfLabelLeakage:false,semanticIndependenceVerified:false,
  labelsVerified:0,precision:null,recall:null,f1:null,tripleSPlusCertified:false,
  limitations:'Filename overlap flags possible train/holdout contamination, not proven semantic or label leakage. No filename-only audit can certify independence, oracle validity, or detector performance.'};
}
module.exports={auditCohortPaths};
