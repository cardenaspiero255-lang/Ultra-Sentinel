'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {presealRun23,CASES}=require('../../packages/quality-gates/c2-run23-original-stores.cjs');
const {NEW_LOCK}=require('../../packages/quality-gates/c2-next-holdout.cjs');
const {auditRun23Chain}=require('../../packages/quality-gates/c2-run23-chain-audit.cjs');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const h64=n=>n.toString(16).padStart(64,'0');
const h40=n=>n.toString(16).padStart(40,'0');
function data(){
 const labels=Array.from({length:21},(_,i)=>({
  pr:NEW_LOCK.cases[i%8].pr,headSha:NEW_LOCK.cases[i%8].headSha,
  blobSha:h40(50+i),path:'app/src/main/java/fixture/Src'+i+'.kt',
  rule:'HISTORICAL_RULE_'+i,line:i+5,positive:i<10,
  evidenceSha256:h64(100+i),rootCauseGroup:'original_cause_'+i
 }));
 const prior={schema:'ultra-sentinel-c2-run22-owner-source-truth-seal/v1',
  status:'SOURCE_BEHAVIOR_TRUTH_PARTIAL',repository:NEW_LOCK.repository,
  packetDigest:'f5f2f66b31e5dc768c18be68bef29cbd0f97c8161fda212ce2ae1e64eb664b34',
  ownerRunId:39076132177,sourceCIAuthenticated:true,benchmarkCertified:false,
  sourcePositiveLabels:10,verifiedScopedNegativeLabels:11,
  neededAdditionalLabelsAtLeast:99,benchmarkScoredLabels:0,
  precision:null,recall:null,f1:null,fpNonRegressionVerified:false,
  blindHoldoutCertified:false,tripleSPlusCertified:false,canMerge:false,
  candidatePredictionsRead:false,baselinePredictionsRead:false,
  verdict:'TRUTH_CORPUS_INCOMPLETE',previousTruthDigest:'a'.repeat(64),
  witnessDigest:'b'.repeat(64),labels};
 prior.presealDigest=hash(JSON.stringify({
  schema:'ultra-sentinel-c2-run22-one-original-positive-preseal/v1',
  previous:prior.previousTruthDigest,labels}));
 const witnesses=CASES.map((c,i)=>({
  schema:'ultra-sentinel-c2-run20-original-witness/v1',
  pr:c.pr,headSha:c.headSha,blobSha:c.blobSha,sourceSha256:c.sourceSha256,
  oracleSha256:h64(200+i),originalLogSha256:h64(210+i),
  counterfactualLogSha256:h64(220+i),
  normalControlPassed:true,behaviorWitnessed:true,sensitivityProven:true,
  productionCallsitePinned:true,candidatePredictionsRead:false,baselinePredictionsRead:false
 }));
 const pre=presealRun23({prior,witnesses});
 const receipt={...pre,schema:'ultra-sentinel-c2-run23-owner-source-truth-seal/v1',
  status:'SOURCE_BEHAVIOR_TRUTH_PARTIAL',ownerRunId:39077240648,
  witnessDigest:hash(JSON.stringify(witnesses)),
  sourceCIAuthenticated:true,benchmarkCertified:false,verdict:'TRUTH_CORPUS_INCOMPLETE'};
 const groups=new Map();
 for(const label of receipt.labels){
  const key=label.pr+'#'+label.headSha;
  if(!groups.has(key))groups.set(key,{pr:label.pr,headSha:label.headSha,treeSha:h40(900+label.pr),truncated:false,blobs:[]});
  groups.get(key).blobs.push({path:label.path,sha:label.blobSha});
 }
 return {prior,witnesses,receipt,sourceTrees:[...groups.values()]};
}
test('owner Run23 exact chain: verifies 23 identities and counts with actual source tree refs',()=>{
 const a=auditRun23Chain(data());
 assert.equal(a.count,23);assert.equal(a.positives,11);assert.equal(a.negatives,12);
 assert.equal(a.sourceBlobsVerified,23);
 assert.equal(a.duplicateIdentities.length,0);
 assert.equal(a.duplicateCausalGroups.length,0);
 assert.equal(a.missingCausalGroups.length,0);
 assert.equal(a.sourceRun23Attested,true);
 assert.equal(a.historicalEvidenceAuthenticated,false); // earlier 21 individual witnesses not inspected
 assert.equal(a.newLabels,0);assert.equal(a.holdoutFrozen,false);
 assert.equal(a.precision,null);assert.equal(a.tripleSPlusCertified,false);
 assert.equal(a.entries.length,23);
 assert.ok(a.entries.every(x=>x.causalFingerprint?.length===64 && x.evidenceSha256?.length===64));
});
test('tampered owner receipt, original witness, or missing SHA-tree entry fails closed',()=>{
 const attack=[
  x=>x.receipt.presealDigest='f'.repeat(64),
  x=>x.receipt.labels[0].line+=1,
  x=>x.prior.ownerRunId=1,
  x=>x.witnesses[0].normalControlPassed=false,
  x=>x.sourceTrees[0].blobs[0].sha='0'.repeat(40),
  x=>x.sourceTrees[0].truncated=true,
  x=>x.receipt.ownerRunId=123,
  x=>x.receipt.candidatePredictionsRead=true,
 ];
 for(const mutate of attack){
  const x=data();mutate(x);
  assert.throws(()=>auditRun23Chain(x),/C2_RUN23_CHAIN_AUDIT_BLOCKED/);
 }
});
test('missing root cause metadata remains unresolved without fabricating fingerprints',()=>{
 const x=data();
 delete x.prior.labels[1].rootCauseGroup;
 const pre=presealRun23({prior:x.prior,witnesses:x.witnesses});
 x.receipt={...x.receipt,labels:pre.labels,presealDigest:pre.presealDigest};
 const r=auditRun23Chain(x);
 assert.equal(r.status,'CAUSAL_REVIEW_REQUIRED');
 assert.equal(r.missingCausalGroups.length,1);
 assert.equal(r.entries.filter(e=>e.causalFingerprint===null).length,1);
 assert.equal(r.independenceVerified,false);
});
test('two distinct original identities with same cause are not independent labels',()=>{
 const x=data();
 x.prior.labels[1].rootCauseGroup=x.prior.labels[0].rootCauseGroup;
 const pre=presealRun23({prior:x.prior,witnesses:x.witnesses});
 x.receipt={...x.receipt,labels:pre.labels,presealDigest:pre.presealDigest};
 const r=auditRun23Chain(x);
 assert.equal(r.status,'CAUSAL_REVIEW_REQUIRED');
 assert.equal(r.duplicateCausalGroups.length,1);
 assert.equal(r.independenceVerified,false);
});
test('duplicate original line identity is blocked, not counted twice',()=>{
 const x=data();
 x.prior.labels[1]={...x.prior.labels[0],evidenceSha256:x.prior.labels[1].evidenceSha256};
 assert.throws(()=>auditRun23Chain(x),/C2_RUN23_CHAIN_AUDIT_BLOCKED/);
});
