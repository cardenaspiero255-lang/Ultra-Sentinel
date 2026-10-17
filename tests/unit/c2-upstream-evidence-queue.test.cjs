'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {UPSTREAM,PROJECTS}=require('../../packages/quality-gates/c2-kotlin-upstream-candidate-index.cjs');
const {buildEvidenceQueue}=require('../../packages/quality-gates/c2-upstream-evidence-queue.cjs');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
function fixture(){
 const candidates=[];
 for(const [prefix,info] of Object.entries(PROJECTS))
  for(let i=1;i<=info.tasks;i++)candidates.push({
   upstreamTask:prefix+'-'+i,upstreamRepo:info.repository,
   upstreamTreeSha:sha(prefix+':'+i).slice(0,40),
   status:'UPSTREAM_TASK_CANDIDATE_NOT_A_LABEL'});
 const p={sourceRepository:UPSTREAM.repository,sourceCommit:UPSTREAM.commit,
  candidateCount:106,groundTruthSourceLabels:0,blindHoldout:false,candidates};
 return {...p,indexSha256:sha(JSON.stringify(p))};
}
test('all 106 tasks remain unlabelled and historical quotas remain explicit',()=>{
 const r=buildEvidenceQueue(fixture());
 assert.equal(r.tasks,106);assert.equal(r.unverified,106);
 assert.equal(r.newLabels,0);assert.equal(r.remaining,97);
 assert.equal(r.positiveMinimum,37);assert.equal(r.negativeMinimum,36);
 assert.equal(r.diversityMinimum,24);assert.equal(r.blindHoldout,false);
 assert.equal(r.queue.filter(x=>x.admittedLabel).length,0);
});
test('tampering, duplicates and model-unverified evidence are rejected',()=>{
 const attacks=[
  x=>x.indexSha256='f'.repeat(64),
  x=>x.candidates.pop(),
  x=>x.candidates[1].upstreamTask=x.candidates[0].upstreamTask,
  x=>x.candidates[0].status='CERTIFIED',
  x=>x.blindHoldout=true
 ];
 for(const a of attacks){
  const x=fixture();a(x);
  assert.throws(()=>buildEvidenceQueue(x),/C2_EVIDENCE_QUEUE_REJECTED/);
 }
 const x=fixture(),c=x.candidates[0];
 const r={upstreamTask:c.upstreamTask,sourceTreeSha:c.upstreamTreeSha,
  beforeCommit:'a'.repeat(40),beforeFailureDigest:'b'.repeat(64),
  originalTestDigest:'c'.repeat(64),rootCauseDigest:'d'.repeat(64),
  detectorIndependent:true,licenseReviewed:true,
  originalReproductionVerified:true,stage:'EVIDENCE_REVIEW_REQUIRED'};
 const result=buildEvidenceQueue(x,[r]);
 assert.equal(result.newLabels,0);assert.equal(result.receiptsNeedingIndependentReview,1);
 assert.throws(()=>buildEvidenceQueue(x,[r,r]),/C2_EVIDENCE_QUEUE_REJECTED/);
 assert.throws(()=>buildEvidenceQueue(x,[{...r,detectorIndependent:false}]),/C2_EVIDENCE_QUEUE_REJECTED/);
});
