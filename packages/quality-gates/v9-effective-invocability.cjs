'use strict';
// V9 prospective second-stage acceptance. Only authenticated counters from
// frozen Hunter are allowed; neither a label, prediction nor oracle answer
// can enter the cohort selector. Original predictions were sealed first.
const SHA=/^[a-f0-9]{40}$/,HASH=/^[a-f0-9]{64}$/,REPO=/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const NUM={minimumProbedMethods:3,minimumIndependentRepositories:2,
 minimumCompletedTriplesPerRepository:1,minimumSuccessfulInvocationsPerRepository:6};
const ENGINE='689583c23277807345edb715d8c2d277a3d4bda7',
 BLOB='430b4e928527b20fe305d63f3efb85909f1dfa06';
const FORBIDDEN=/(oracle(?!Executed$)|expected|observed|actual|finding|hypothes|prediction(?!sSealedBeforeSelection$)|function(?:al)?Result|defect|groundTruth|verdict|repair)/i;
function fail(m){throw Error('V9_EFFECTIVE_'+m);}
function rejectHiddenData(value){
 if(value&&typeof value==='object'){
  if(Array.isArray(value)){for(const v of value)rejectHiddenData(v);return;}
  for(const [k,v] of Object.entries(value)){
   if(FORBIDDEN.test(k))fail('FUNCTIONAL_LEAKAGE');
   rejectHiddenData(v);
  }
 }
}
function validateRecord(r){
 if(!r||!Number.isSafeInteger(r.rank)||r.rank<1||!r.source||!REPO.test(r.source.repository)||
  !SHA.test(r.source.commitSha)||!SHA.test(r.source.treeSha)||!Array.isArray(r.source.files)||
  r.source.files.length<1||r.source.files.length>12||
  !HASH.test(r.frozenReportSha256))fail('REPORT_INTEGRITY');
 let total=0;
 for(const f of r.source.files){
  if(!f||!/^(?:src\/main\/)(?:[^/]+\/)*[^/]+\.kt$/.test(f.path)||
   f.path.split('/').some(x=>!x||x==='..'||x==='.')||!SHA.test(f.blobSha)||
   !Number.isSafeInteger(f.sizeBytes)||f.sizeBytes<1)fail('SOURCE_INTEGRITY');
  total+=f.sizeBytes;
 }
 if(total>196608||r.source.totalBytes!==total)fail('SOURCE_INTEGRITY');
 const c=r.report;
 if(!c||typeof c.probeExecutionSucceeded!=='boolean'||c.originalSourceAuthenticated!==true||
  c.oracleExecuted!==false||c.hunterRetuned!==false)fail('COUNTER_INTEGRITY');
 const fields=['classesInspected','methodCandidates','methodsProbed','completedTriples','successfulInvocations'];
 for(const field of fields)if(!Number.isSafeInteger(c[field])||c[field]<0||c[field]>250000)
  fail('COUNTER_INTEGRITY');
 if((c.probeExecutionSucceeded===false&&fields.some(field=>c[field]!==0))||
  c.methodsProbed>c.methodCandidates||c.methodsProbed>c.completedTriples||
  c.successfulInvocations<c.completedTriples*6||
  (c.methodsProbed>0&&c.successfulInvocations<6)||c.completedTriples>80000)
  fail('COUNTER_INTEGRITY');
 return r;
}
function admitFrozenHunterInvocability(evidence,threshold=NUM){
 if(Object.keys(threshold).length!==4||
  Object.keys(NUM).some(k=>threshold[k]!==NUM[k]))fail('FROZEN_THRESHOLD');
 if(!evidence||evidence.schema!=='ultra-sentinel-v9-sealed-hunter-counter-evidence/v1'||
  evidence.frozenEngineCommit!==ENGINE||evidence.frozenEngineBlob!==BLOB||
  evidence.predictionsSealedBeforeSelection!==true||
  evidence.oracleExecuted!==false||evidence.originalSourcesNowExposed!==true||
  !Array.isArray(evidence.rows)||evidence.rows.length<1||evidence.rows.length>18)
  fail('NOT_PROSPECTIVE');
 rejectHiddenData(evidence);
 const repos=new Set(),blobs=new Set();let previous=0;
 for(const r of evidence.rows){
  validateRecord(r);
  if(r.rank<=previous)fail('RANK_ORDER');
  previous=r.rank;
  const name=r.source.repository.toLowerCase();
  if(repos.has(name))fail('DUPLICATE_REPOSITORY');
  repos.add(name);
  for(const f of r.source.files){
   if(blobs.has(f.blobSha))fail('DUPLICATE_BLOB');
   blobs.add(f.blobSha);
  }
 }
 let probed=0,success=0,cohorts=0;
 const accepted=[];
 for(const r of evidence.rows){
  const c=r.report;
  if(c.methodsProbed<1||c.completedTriples<NUM.minimumCompletedTriplesPerRepository||
   c.successfulInvocations<NUM.minimumSuccessfulInvocationsPerRepository)continue;
  accepted.push({rank:r.rank,source:r.source,probedMethods:c.methodsProbed,
   completedTriples:c.completedTriples,successfulInvocations:c.successfulInvocations,
   frozenReportSha256:r.frozenReportSha256});
  probed+=c.methodsProbed;success+=c.successfulInvocations;cohorts++;
  if(probed>=NUM.minimumProbedMethods&&cohorts>=NUM.minimumIndependentRepositories)break;
 }
 const eligible=probed>=NUM.minimumProbedMethods&&cohorts>=NUM.minimumIndependentRepositories;
 return Object.freeze({
  schema:'ultra-sentinel-v9-effective-invocability-admission/v1',
  eligible,reason:eligible?null:'INSUFFICIENT_EFFECTIVE_HUNTER_DIVERSITY',
  frozenEngineCommit:ENGINE,frozenEngineBlob:BLOB,
  frozenThreshold:{...NUM},probedMethods:probed,
  successfulInvocations:success,independentProbedRepositories:cohorts,
  selected:eligible?accepted:[],
  allScoutedRepositories:evidence.rows.map(x=>x.source.repository),
  allScoutedBlobs:evidence.rows.flatMap(x=>x.source.files.map(f=>f.blobSha)),
  fullPredictionsMustRemainSealed:true,originalSourcesNowExposed:true,
  oracleExecuted:false,engineRetuned:false,block26Closed:false,
  block27Allowed:false,confirmedNewDefects:null
 });
}
module.exports=Object.freeze({admitFrozenHunterInvocability,validateRecord});
