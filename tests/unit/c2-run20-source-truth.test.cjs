'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {CASES,preseal}=require('../../packages/quality-gates/c2-run20-source-truth.cjs');
// Synthetic fixtures only: actual owner run and original test logs are independently authenticated by CI.
const prior={
 schema:'ultra-sentinel-c2-run18-owner-source-truth-seal/v1',
 status:'SOURCE_BEHAVIOR_TRUTH_PARTIAL',repository:'cardenaspiero255-lang/gamehub-ultra',
 packetDigest:'f5f2f66b31e5dc768c18be68bef29cbd0f97c816',
 presealDigest:'efb7da33efad947995f315621d42de2de9edace6d9d6b9e4d9e91cf4dd1aae12',
 ownerRunId:39071144969,sourceCIAuthenticated:true,benchmarkCertified:false,
 sourcePositiveLabels:9,verifiedScopedNegativeLabels:9,neededAdditionalLabelsAtLeast:102,
 benchmarkScoredLabels:0,precision:null,recall:null,f1:null,
 fpNonRegressionVerified:false,tripleSPlusCertified:false,
 candidatePredictionsRead:false,baselinePredictionsRead:false,canMerge:false,
 verdict:'TRUTH_CORPUS_INCOMPLETE',
 labels:Array.from({length:18},(_,i)=>({pr:150+i,headSha:'a'.repeat(40),
  blobSha:'b'.repeat(40),rule:'OLD_'+i,path:'old/test_'+i+'.kt',line:i+1,positive:i<9}))
};
const witnesses=CASES.map((c,i)=>({
 schema:'ultra-sentinel-c2-run20-original-witness/v1',
 pr:c.pr,headSha:c.headSha,blobSha:c.blobSha,sourceSha256:c.sourceSha256,
 oracleSha256:String(i+1).repeat(64),originalLogSha256:'a'.repeat(64),
 counterfactualLogSha256:'b'.repeat(64),
 normalControlPassed:true,behaviorWitnessed:true,sensitivityProven:true,
 productionCallsitePinned:true,candidatePredictionsRead:false,baselinePredictionsRead:false
}));
const review=(p=prior,w=witnesses)=>preseal({prior:structuredClone(p),witnesses:structuredClone(w)});
test('one genuine bounded positive and one negative, 20 source truths, zero detector scores',()=>{
 const r=review();assert.equal(r.labels.length,20);
 assert.equal(r.sourcePositiveLabels,10);assert.equal(r.verifiedScopedNegativeLabels,10);
 assert.equal(r.neededAdditionalLabelsAtLeast,100);
 assert.equal(r.labels[0].rootCauseGroup,'state_version_monotonicity');
 assert.equal(r.labels[1].rootCauseGroup,'session_ownership_guard');
 assert.equal(r.independentBlindHoldoutCertified,false);
 for(const k of ['precision','recall','f1'])assert.equal(r[k],null);
 assert.equal(r.tripleSPlusCertified,false);assert.equal(r.canMerge,false);
});
test('tampered last owner seal, counted metrics or polluted detector information rejects',()=>{
 for(const q of [{presealDigest:'0'.repeat(64)},{ownerRunId:0},
  {sourceCIAuthenticated:false},{sourcePositiveLabels:10},{precision:1},
  {benchmarkScoredLabels:1},{candidatePredictionsRead:true}])
  assert.throws(()=>review({...prior,...q}),/BLOCKED/);
});
test('duplicate historical identities and copied new identity blocked',()=>{
 const p=structuredClone(prior);p.labels[1]={...p.labels[0]};assert.throws(()=>review(p),/BLOCKED/);
 const q=structuredClone(prior);q.labels[1]={...q.labels[1],...CASES[0]};
 assert.throws(()=>review(q),/BLOCKED/);
});
test('wrong original file SHA, PR or source byte digest blocked',()=>{
 for(const patch of [{blobSha:'a'.repeat(40)},{headSha:'f'.repeat(40)},
  {pr:151},{sourceSha256:'1'.repeat(64)}])
  assert.throws(()=>review(prior,[{...witnesses[0],...patch},witnesses[1]]),/BLOCKED/);
});
test('mutant and corrected-copy proof must be sensitive, real, and prediction-blind',()=>{
 for(const patch of [{normalControlPassed:false},{behaviorWitnessed:false},
  {sensitivityProven:false},{productionCallsitePinned:false},
  {candidatePredictionsRead:true},{baselinePredictionsRead:true}])
  assert.throws(()=>review(prior,[witnesses[0],{...witnesses[1],...patch}]),/BLOCKED/);
});
test('reject non-hex log SHA and surplus witness properties',()=>{
 assert.throws(()=>review(prior,[{...witnesses[0],oracleSha256:'wrong'},witnesses[1]]),/BLOCKED/);
 assert.throws(()=>review(prior,[{...witnesses[0],extra:'fake'},witnesses[1]]),/BLOCKED/);
});
