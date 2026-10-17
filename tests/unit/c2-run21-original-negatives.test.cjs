'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {CASES,presealRun21}=require('../../packages/quality-gates/c2-run21-original-negatives.cjs');
const {NEW_LOCK}=require('../../packages/quality-gates/c2-next-holdout.cjs');
const h=x=>crypto.createHash('sha256').update(x).digest('hex');
const P='f5f2f66b31e5dc768c18be68bef29cbd0f97c8161fda212ce2ae1e64eb664b34';
const PREV='6bac3d64f843455c3f95728404ad53b25ece0748f1ed5c0e5439ae5a8cea97d4';
function fixture(){
 const labels=Array.from({length:18},(_,i)=>{
  const p=NEW_LOCK.cases[i%8];
  return {pr:p.pr,headSha:p.headSha,blobSha:'a'.repeat(40),
   path:'app/src/main/java/fixture/Control'+i+'.kt',line:20+i,
   rule:'ORIGINAL_RULE_'+i,positive:i%2===0,
   evidenceSha256:String(i+1).padStart(64,'0')};
 });
 const prior={
  schema:'ultra-sentinel-c2-run18-owner-source-truth-seal/v1',
  status:'SOURCE_BEHAVIOR_TRUTH_PARTIAL',repository:NEW_LOCK.repository,
  packetDigest:P,previousTruthDigest:PREV,
  ownerRunId:39071144969,sourceCIAuthenticated:true,benchmarkCertified:false,
  sourcePositiveLabels:9,verifiedScopedNegativeLabels:9,
  neededAdditionalLabelsAtLeast:102,benchmarkScoredLabels:0,
  precision:null,recall:null,f1:null,tripleSPlusCertified:false,
  fpNonRegressionVerified:false,candidatePredictionsRead:false,
  baselinePredictionsRead:false,canMerge:false,verdict:'TRUTH_CORPUS_INCOMPLETE',
  labels,witnessDigest:'a'.repeat(64)
 };
 prior.presealDigest=h(JSON.stringify({
  schema:'ultra-sentinel-c2-run18-two-truths-preseal/v1',previous:PREV,labels}));
 const witnesses=CASES.map((c,i)=>({
  schema:'ultra-sentinel-c2-run21-original-negative-witness/v1',
  pr:c.pr,headSha:c.headSha,blobSha:c.blobSha,
  sourceSha256:String(i+11).padStart(64,'0'),
  oracleSha256:String(i+21).padStart(64,'0'),
  originalLogSha256:String(i+31).padStart(64,'0'),
  counterfactualLogSha256:String(i+41).padStart(64,'0'),
  normalControlPassed:true,behaviorWitnessed:true,sensitivityProven:true,
  originalCallsitePinned:true,candidateRead:false,baselineRead:false
 }));
 return {prior,witnesses};
}
test('source controls increment authentic *candidate receipts* 18 to 20, no detection score',()=>{
 const r=presealRun21(fixture());
 assert.equal(r.labels.length,20);
 assert.equal(r.sourcePositiveLabels,9);
 assert.equal(r.verifiedScopedNegativeLabels,11);
 assert.equal(r.neededAdditionalLabelsAtLeast,100);
 assert.equal(r.minimumAdditionalPositiveLabels,39);
 assert.equal(r.minimumAdditionalNegativeLabels,37);
 assert.equal(r.remainingDiversitySlots,24);
 assert.equal(r.benchmarkScoredLabels,0);
 assert.equal(r.precision,null);assert.equal(r.recall,null);assert.equal(r.f1,null);
 assert.equal(r.tripleSPlusCertified,false);
 assert.equal(r.status,'OWNER_CI_ATTESTATION_REQUIRED');
 assert.equal(r.candidatePredictionsRead,false);
 assert.equal(r.blindHoldoutCertified,false);
 assert.equal(r.canMerge,false);
});
test('fake witnesses, reused proofs, old seal tampering and model leakage fail closed',()=>{
 const cases=[
  x=>x.prior.presealDigest='f'.repeat(64),
  x=>x.prior.ownerRunId=1,
  x=>x.prior.labels[1].evidenceSha256=x.prior.labels[0].evidenceSha256,
  x=>x.prior.labels[0].headSha='f'.repeat(40),
  x=>x.prior.labels[0].positive=false,
  x=>x.prior.labels.push(x.prior.labels[0]),
  x=>x.witnesses[0].candidateRead=true,
  x=>x.witnesses[1].baselineRead=true,
  x=>x.witnesses[1].sensitivityProven=false,
  x=>x.witnesses[1].oracleSha256='tampered',
  x=>x.witnesses[0].blobSha='f'.repeat(40),
  x=>x.witnesses[0].pr=154,
  x=>x.witnesses[0].extra=true,
  x=>x.prior.benchmarkScoredLabels=1
 ];
 for(const f of cases){
  const x=fixture();f(x);
  assert.throws(()=>presealRun21(x),/C2_RUN21_ORIGINAL_TRUTH_BLOCKED/);
 }
});
