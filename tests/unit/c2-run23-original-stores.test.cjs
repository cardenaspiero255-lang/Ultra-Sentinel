'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {presealRun23,CASES}=require('../../packages/quality-gates/c2-run23-original-stores.cjs');
const {NEW_LOCK}=require('../../packages/quality-gates/c2-next-holdout.cjs');
const digest=s=>crypto.createHash('sha256').update(s).digest('hex');
function fixture(){
 const labels=Array.from({length:21},(_,i)=>{
  const c=NEW_LOCK.cases[i%8];
  return {
   pr:c.pr,headSha:c.headSha,blobSha:'a'.repeat(40),
   path:'app/src/main/java/fixture/Existing'+i+'.kt',
   rule:'EXISTING_RULE_'+i,line:i+1,positive:i<10,
   evidenceSha256:String(i+1).padStart(64,'0')
  };
 });
 const prior={
  schema:'ultra-sentinel-c2-run22-owner-source-truth-seal/v1',
  status:'SOURCE_BEHAVIOR_TRUTH_PARTIAL',
  repository:NEW_LOCK.repository,
  packetDigest:'f5f2f66b31e5dc768c18be68bef29cbd0f97c8161fda212ce2ae1e64eb664b34',
  ownerRunId:39076132177,sourceCIAuthenticated:true,benchmarkCertified:false,
  sourcePositiveLabels:10,verifiedScopedNegativeLabels:11,
  neededAdditionalLabelsAtLeast:99,benchmarkScoredLabels:0,
  precision:null,recall:null,f1:null,fpNonRegressionVerified:false,
  blindHoldoutCertified:false,tripleSPlusCertified:false,canMerge:false,
  candidatePredictionsRead:false,baselinePredictionsRead:false,
  verdict:'TRUTH_CORPUS_INCOMPLETE',previousTruthDigest:'a'.repeat(64),
  witnessDigest:'b'.repeat(64),labels
 };
 prior.presealDigest=digest(JSON.stringify({
  schema:'ultra-sentinel-c2-run22-one-original-positive-preseal/v1',
  previous:prior.previousTruthDigest,labels
 }));
 const witnesses=CASES.map((c,i)=>({
  schema:'ultra-sentinel-c2-run20-original-witness/v1',
  pr:c.pr,headSha:c.headSha,blobSha:c.blobSha,
  sourceSha256:c.sourceSha256,oracleSha256:String(i+31).padStart(64,'0'),
  originalLogSha256:String(i+41).padStart(64,'0'),
  counterfactualLogSha256:String(i+51).padStart(64,'0'),
  normalControlPassed:true,behaviorWitnessed:true,sensitivityProven:true,
  productionCallsitePinned:true,candidatePredictionsRead:false,
  baselinePredictionsRead:false
 }));
 return {prior,witnesses};
}
test('Run23 can add 1 verified-original positive and 1 negative, never benchmark scores',()=>{
 const r=presealRun23(fixture());
 assert.equal(r.labels.length,23);
 assert.equal(r.sourcePositiveLabels,11);
 assert.equal(r.verifiedScopedNegativeLabels,12);
 assert.equal(r.neededAdditionalLabelsAtLeast,97);
 assert.equal(r.minimumAdditionalPositiveLabels,37);
 assert.equal(r.minimumAdditionalNegativeLabels,36);
 assert.equal(r.remainingDiversitySlots,24);
 assert.equal(r.status,'OWNER_CI_ATTESTATION_REQUIRED');
 assert.equal(r.precision,null);
 assert.equal(r.recall,null);
 assert.equal(r.f1,null);
 assert.equal(r.benchmarkScoredLabels,0);
 assert.equal(r.tripleSPlusCertified,false);
 assert.equal(r.blindHoldoutCertified,false);
 assert.equal(r.canMerge,false);
});
test('Run23 source receipts reject forged origin, duplicates and inspected predictions',()=>{
 const attacks=[
  x=>x.prior.ownerRunId=1,
  x=>x.prior.presealDigest='0'.repeat(64),
  x=>x.prior.sourcePositiveLabels=11,
  x=>x.prior.labels[0].positive=false,
  x=>x.prior.labels[0].pr=900,
  x=>x.prior.labels[0].rootCauseGroup=CASES[0].rootCauseGroup,
  x=>x.prior.labels[0].evidenceSha256=x.prior.labels[1].evidenceSha256,
  x=>x.prior.labels.push(x.prior.labels[0]),
  x=>x.prior.tripleSPlusCertified=true,
  x=>x.witnesses[0].sourceSha256='f'.repeat(64),
  x=>x.witnesses[0].behaviorWitnessed=false,
  x=>x.witnesses[1].sensitivityProven=false,
  x=>x.witnesses[0].candidatePredictionsRead=true,
  x=>x.witnesses[1].baselinePredictionsRead=true,
  x=>x.witnesses[1].extra='unexpected'
 ];
 for(const mutate of attacks){
  const x=fixture();mutate(x);
  assert.throws(()=>presealRun23(x),/C2_RUN23_UNAUTHENTIC_ORIGINAL_TRUTH/);
 }
});
