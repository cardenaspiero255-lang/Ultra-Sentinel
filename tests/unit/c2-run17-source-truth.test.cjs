'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {CASES,presealRun17}=require('../../packages/quality-gates/c2-run17-source-truth.cjs');
const prior={
 schema:'ultra-sentinel-c2-run16-two-negatives-owner-seal/v1',
 status:'SOURCE_BEHAVIOR_TRUTH_PARTIAL',repository:'cardenaspiero255-lang/gamehub-ultra',
 packetDigest:'f5f2f66b31e5dc768c18be68bef29cbd0f97c8161fda212ce2ae1e64eb664b34',
 presealDigest:'c588dd2ceaf0e95644c30d6f0ca8b07fe7a8a06fb77e92f46954a016cadd23c3',
 ownerRunId:39067708985,sourceCIAuthenticated:true,benchmarkCertified:false,
 sourcePositiveLabels:7,verifiedScopedNegativeLabels:7,neededAdditionalLabelsAtLeast:106,
 benchmarkScoredLabels:0,precision:null,recall:null,f1:null,tripleSPlusCertified:false,
 fpNonRegressionVerified:false,candidatePredictionsRead:false,baselinePredictionsRead:false,
 canMerge:false,verdict:'TRUTH_CORPUS_INCOMPLETE',
 labels:Array.from({length:14},(_,i)=>({pr:150+i,
  headSha:'a'.repeat(40),blobSha:'b'.repeat(40),
  rule:'ORIGINAL_CONTROL_'+i,path:'old/file'+i+'.kt',line:i+1,positive:i<7}))
};
const witnesses=CASES.map((c,i)=>({
 schema:'ultra-sentinel-c2-run17-witness/v1',pr:c.pr,headSha:c.headSha,
 blobSha:c.blobSha,sourceSha256:c.sourceSha256,
 oracleSha256:String(i+1).repeat(64),originalLogSha256:'a'.repeat(64),
 counterfactualLogSha256:'b'.repeat(64),
 originalControlPassed:true,behaviorObserved:true,mutationSensitive:true,
 callsitePinned:true,candidateRead:false,baselineRead:false
}));
const apply=(p=prior,w=witnesses)=>presealRun17({prior:structuredClone(p),witnesses:structuredClone(w)});
test('one genuine original-positive and one bounded negative; 16 total and null scores',()=>{
 const z=apply();
 assert.equal(z.labels.length,16);assert.equal(z.sourcePositiveLabels,8);
 assert.equal(z.verifiedScopedNegativeLabels,8);assert.equal(z.neededAdditionalLabelsAtLeast,104);
 assert.equal(z.status,'OWNER_CI_ATTESTATION_REQUIRED');assert.equal(z.precision,null);
 assert.equal(z.recall,null);assert.equal(z.f1,null);
 assert.equal(z.tripleSPlusCertified,false);assert.equal(z.canMerge,false);
 assert.equal(z.labels[0].rule,'NONFINITE_HIGH_DRAIN_POLICY_THRESHOLD');
 assert.equal(z.labels[1].rule,'LOCAL_QUERY_NEVER_TOUCHES_RESEARCH_GATEWAY');
});
test('reject owner seal drift and nonempty metrics',()=>{
 for(const patch of [{presealDigest:'0'.repeat(64)},{ownerRunId:1},
   {sourceCIAuthenticated:false},{sourcePositiveLabels:8},{precision:0.99},
   {benchmarkScoredLabels:1},{candidatePredictionsRead:true}]){
   assert.throws(()=>apply({...prior,...patch}),/BLOCKED/);
 }
});
test('reject wrong source blobs and labels order',()=>{
 for(const patch of [{blobSha:'a'.repeat(40)},{sourceSha256:'9'.repeat(64)},
   {headSha:'0'.repeat(40)},{pr:158}]){
   assert.throws(()=>apply(prior,[{...witnesses[0],...patch},witnesses[1]]),/BLOCKED/);
 }
 assert.throws(()=>apply(prior,[witnesses[1],witnesses[0]]),/BLOCKED/);
});
test('reject missing original, production boundary or counterfactual sensitivity',()=>{
 for(const patch of [{originalControlPassed:false},{behaviorObserved:false},
  {mutationSensitive:false},{callsitePinned:false},{candidateRead:true},{baselineRead:true}]){
  assert.throws(()=>apply(prior,[witnesses[0],{...witnesses[1],...patch}]),/BLOCKED/);
 }
});
test('reject duplicate prior identities and reused new label',()=>{
 const q=structuredClone(prior);q.labels[1]=structuredClone(q.labels[0]);
 assert.throws(()=>apply(q),/BLOCKED/);
 const z=structuredClone(prior);z.labels[3]={...z.labels[3],...CASES[0]};
 assert.throws(()=>apply(z),/BLOCKED/);
});
test('reject forged or missing evidence SHA and schema extensions',()=>{
 assert.throws(()=>apply(prior,[{...witnesses[0],oracleSha256:'bad'},witnesses[1]]),/BLOCKED/);
 assert.throws(()=>apply(prior,[{...witnesses[0],additional:true},witnesses[1]]),/BLOCKED/);
});
