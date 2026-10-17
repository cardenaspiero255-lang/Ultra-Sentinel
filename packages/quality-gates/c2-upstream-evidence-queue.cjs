'use strict';
const crypto=require('node:crypto');
const {UPSTREAM,PROJECTS}=require('./c2-kotlin-upstream-candidate-index.cjs');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const fail=()=>{throw Error('C2_EVIDENCE_QUEUE_REJECTED');};
function buildEvidenceQueue(index,receipts=[]){
 if(!index||index.sourceRepository!==UPSTREAM.repository||
 index.sourceCommit!==UPSTREAM.commit||index.candidateCount!==106||
 index.groundTruthSourceLabels!==0||index.blindHoldout!==false||
 !Array.isArray(index.candidates)||index.candidates.length!==106||
 !Array.isArray(receipts)||receipts.length>106)fail();
 const {indexSha256,...packet}=index;
 if(hash(JSON.stringify(packet))!==indexSha256)fail();
 const items=new Map();
 for(const c of index.candidates){
  if(!c||items.has(c.upstreamTask)||c.status!=='UPSTREAM_TASK_CANDIDATE_NOT_A_LABEL'||
   !Object.values(PROJECTS).some(p=>p.repository===c.upstreamRepo))fail();
  items.set(c.upstreamTask,c);
 }
 const seen=new Set(),causes=new Set();
 for(const r of receipts){
  const c=items.get(r?.upstreamTask);
  if(!c||seen.has(r.upstreamTask)||r.sourceTreeSha!==c.upstreamTreeSha||
   !/^[a-f0-9]{40}$/.test(r.beforeCommit)||
   !/^[a-f0-9]{64}$/.test(r.beforeFailureDigest)||
   !/^[a-f0-9]{64}$/.test(r.originalTestDigest)||
   !/^[a-f0-9]{64}$/.test(r.rootCauseDigest)||
   causes.has(r.rootCauseDigest)||r.detectorIndependent!==true||
   r.licenseReviewed!==true||r.originalReproductionVerified!==true||
   r.stage!=='EVIDENCE_REVIEW_REQUIRED')fail();
  seen.add(r.upstreamTask);causes.add(r.rootCauseDigest);
 }
 return Object.freeze({
  schema:'ultra-sentinel-c2-reproduction-queue/v1',
  sourceIndexSha256:indexSha256,
  tasks:106,receiptsNeedingIndependentReview:seen.size,
  unverified:106-seen.size,
  historicalLabels:23,positive:11,negative:12,
  remaining:97,positiveMinimum:37,negativeMinimum:36,diversityMinimum:24,
  newLabels:0,blindHoldout:false,benchmarkScoredLabels:0,
  precision:null,recall:null,f1:null,tripleSPlusCertified:false,
  status:'SOURCE_REPRODUCTION_NOT_YET_CERTIFIED',
  queue:[...items.values()].map(c=>({
   task:c.upstreamTask,repository:c.upstreamRepo,
   treeSha:c.upstreamTreeSha,
   status:seen.has(c.upstreamTask)?'EVIDENCE_REVIEW_REQUIRED':'SOURCE_REPRODUCTION_REQUIRED',
   admittedLabel:false
  }))
 });
}
module.exports={buildEvidenceQueue};
