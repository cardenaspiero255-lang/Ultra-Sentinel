'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const roster=require('../fixtures/c2-upstream-106-task-tree.json');
const {metadataOnlyCandidateIndex}=require('../../packages/quality-gates/c2-kotlin-upstream-candidate-index.cjs');
const {buildEvidenceQueue}=require('../../packages/quality-gates/c2-upstream-evidence-queue.cjs');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
function fixture(){
 const items=roster.entries.map(({name,sha})=>({
  type:'dir',name,path:'tasks/'+name,sha,_links:{git:'https://api.github.com/git/trees/'+sha}
 }));
 return metadataOnlyCandidateIndex(Buffer.from(JSON.stringify(items)));
}
function reseal(x){
 const {indexSha256,...packet}=x;
 return {...packet,indexSha256:sha(JSON.stringify(packet))};
}
function receipt(c){
 return {upstreamTask:c.upstreamTask,sourceTreeSha:c.upstreamTreeSha,
  beforeCommit:'a'.repeat(40),fixedCommit:'b'.repeat(40),
  beforeFailureDigest:'c'.repeat(64),afterPassDigest:'d'.repeat(64),
  originalTestDigest:'e'.repeat(64),rootCauseDigest:'f'.repeat(64),
  detectorIndependent:true,licenseReviewed:true,
  originalReproductionVerified:true,correctedVersionPassVerified:true,
  stage:'EVIDENCE_REVIEW_REQUIRED'};
}
test('authenticated 106 original Git tree remains a candidate-only queue',()=>{
 const r=buildEvidenceQueue(fixture());
 assert.equal(r.tasks,106);assert.equal(r.unverified,106);
 assert.equal(r.newLabels,0);assert.equal(r.remaining,97);
 assert.equal(r.positiveMinimum,37);assert.equal(r.negativeMinimum,36);
 assert.equal(r.diversityMinimum,24);assert.equal(r.blindHoldout,false);
 assert.equal(r.queue.filter(x=>x.admittedLabel).length,0);
});
test('P1: recomputing the self-supplied index SHA cannot counterfeit upstream Git tree',()=>{
 const forged=fixture();
 forged.candidates[0].upstreamTreeSha='0'.repeat(40);
 assert.throws(()=>buildEvidenceQueue(reseal(forged)),/C2_EVIDENCE_QUEUE_REJECTED/);
 const forgedRepo=fixture();
 forgedRepo.candidates[0].upstreamRepo='detekt/detekt';
 assert.throws(()=>buildEvidenceQueue(reseal(forgedRepo)),/C2_EVIDENCE_QUEUE_REJECTED/);
});
test('P2: failure-only receipts cannot advance without fixed SHA and PASS evidence',()=>{
 const index=fixture(),r=receipt(index.candidates[0]);
 for(const patch of [
  {fixedCommit:undefined},{fixedCommit:r.beforeCommit},
  {afterPassDigest:undefined},{correctedVersionPassVerified:false},
  {originalReproductionVerified:false},{beforeFailureDigest:undefined}
 ]){
  assert.throws(()=>buildEvidenceQueue(index,[{...r,...patch}]),/C2_EVIDENCE_QUEUE_REJECTED/);
 }
});
test('P2: independent historical dedup is never implied by new-only cause uniqueness',()=>{
 const index=fixture(),c=index.candidates[0],r=receipt(c);
 const queued=buildEvidenceQueue(index,[r]);
 assert.equal(queued.newLabels,0);
 assert.equal(queued.receiptsNeedingIndependentReview,0);
 assert.equal(queued.receiptsAwaitingHistoricalDedup,1);
 assert.equal(queued.queue.find(x=>x.task===c.upstreamTask).status,'HISTORICAL_CAUSE_COMPARISON_REQUIRED');
 assert.throws(()=>buildEvidenceQueue(index,[r,r]),/C2_EVIDENCE_QUEUE_REJECTED/);
 assert.throws(()=>buildEvidenceQueue(index,[{...r,detectorIndependent:false}]),/C2_EVIDENCE_QUEUE_REJECTED/);
});
test('tampered index, duplicate tasks and invalid status are rejected',()=>{
 for(const a of [
  x=>x.indexSha256='f'.repeat(64),
  x=>x.candidates.pop(),
  x=>x.candidates[1].upstreamTask=x.candidates[0].upstreamTask,
  x=>x.candidates[0].status='CERTIFIED',
  x=>x.blindHoldout=true
 ]){
  const baseline=fixture();
  const x={...baseline,candidates:baseline.candidates.map(c=>({...c}))};
  a(x);
  assert.throws(()=>buildEvidenceQueue(x),/C2_EVIDENCE_QUEUE_REJECTED/);
 }
});
