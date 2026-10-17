'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {NEW_LOCK}=require('../../packages/quality-gates/c2-next-holdout.cjs');
const {LABEL,presealRun22}=require('../../packages/quality-gates/c2-run22-original-positive.cjs');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
function fixture(){
 const labels=Array.from({length:20},(_,i)=>{
  const lock=NEW_LOCK.cases[i%8];
  return {pr:lock.pr,headSha:lock.headSha,blobSha:'b'.repeat(40),
   path:'app/src/main/java/fixture/Case'+i+'.kt',line:i+1,
   rule:'TEST_ORIGINAL_'+i,positive:i<9,
   evidenceSha256:String(i+1).padStart(64,'0')};
 });
 const prior={schema:'ultra-sentinel-c2-run21-owner-source-truth-seal/v1',
  status:'SOURCE_BEHAVIOR_TRUTH_PARTIAL',
  repository:NEW_LOCK.repository,
  packetDigest:'f5f2f66b31e5dc768c18be68bef29cbd0f97c8161fda212ce2ae1e64eb664b34',
  ownerRunId:39075155081,sourceCIAuthenticated:true,benchmarkCertified:false,
  sourcePositiveLabels:9,verifiedScopedNegativeLabels:11,
  neededAdditionalLabelsAtLeast:100,benchmarkScoredLabels:0,
  precision:null,recall:null,f1:null,canMerge:false,blindHoldoutCertified:false,
  tripleSPlusCertified:false,candidatePredictionsRead:false,
  baselinePredictionsRead:false,verdict:'TRUTH_CORPUS_INCOMPLETE',
  previousTruthDigest:'a'.repeat(64),
  witnessDigest:'b'.repeat(64),labels
 };
 prior.presealDigest=sha(JSON.stringify({
  schema:'ultra-sentinel-c2-run21-two-scoped-negatives-preseal/v1',
  previous:prior.previousTruthDigest,labels}));
 const witness={
  schema:'ultra-sentinel-c2-run22-original-positive-witness/v1',
  pr:LABEL.pr,headSha:LABEL.headSha,blobSha:LABEL.blobSha,
  sourceSha256:'a'.repeat(64),oracleSha256:'b'.repeat(64),
  originalLogSha256:'c'.repeat(64),counterfactualLogSha256:'d'.repeat(64),
  normalControlPassed:true,originalDefectReproduced:true,
  correctedBehaviorPassed:true,originalCallerPinned:true,
  candidateRead:false,baselineRead:false
 };
 return {prior,witness};
}
test('new source-positive makes 21 total and 99 outstanding without fake metrics',()=>{
 const x=presealRun22(fixture());
 assert.equal(x.labels.length,21);
 assert.equal(x.sourcePositiveLabels,10);
 assert.equal(x.verifiedScopedNegativeLabels,11);
 assert.equal(x.neededAdditionalLabelsAtLeast,99);
 assert.equal(x.minimumAdditionalPositiveLabels,38);
 assert.equal(x.minimumAdditionalNegativeLabels,37);
 assert.equal(x.remainingDiversitySlots,24);
 assert.equal(x.status,'OWNER_CI_ATTESTATION_REQUIRED');
 assert.equal(x.precision,null);assert.equal(x.f1,null);
 assert.equal(x.benchmarkScoredLabels,0);
 assert.equal(x.blindHoldoutCertified,false);
 assert.equal(x.tripleSPlusCertified,false);
});
test('source forgery, duplicate identity, false original failure and model leakage fail closed',()=>{
 const attacks=[
  x=>x.prior.presealDigest='c'.repeat(64),
  x=>x.prior.ownerRunId=123,
  x=>x.prior.labels[0].rule=LABEL.rule,
  x=>x.prior.labels[0]={...x.prior.labels[0],...LABEL},
  x=>x.prior.labels[1].evidenceSha256=x.prior.labels[0].evidenceSha256,
  x=>x.prior.labels[0].positive=false,
  x=>x.prior.labels.push(x.prior.labels[0]),
  x=>x.prior.tripleSPlusCertified=true,
  x=>x.witness.originalDefectReproduced=false,
  x=>x.witness.correctedBehaviorPassed=false,
  x=>x.witness.candidateRead=true,
  x=>x.witness.baselineRead=true,
  x=>x.witness.sourceSha256='tampered'
 ];
 for(const a of attacks){const f=fixture();a(f);
  assert.throws(()=>presealRun22(f),/C2_RUN22_ORIGINAL_POSITIVE_BLOCKED/);
 }
});
