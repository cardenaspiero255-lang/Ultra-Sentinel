'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {CASES,presealRun18}=require('../../packages/quality-gates/c2-run18-original-two-truths.cjs');
// Synthetic fixtures assert the fail-closed contract; owner GitHub Actions authenticates source.
const prior={schema:'ultra-sentinel-c2-run17-owner-source-truth-seal/v1',
 status:'SOURCE_BEHAVIOR_TRUTH_PARTIAL',repository:'cardenaspiero255-lang/gamehub-ultra',
 packetDigest:'f5f2f66b31e5dc768c18be68bef29cbd0f97c8161fda212ce2ae1e64eb664b34',
 presealDigest:'6bac3d64f843455c3f95728404ad53b25ece0748f1ed5c0e5439ae5a8cea97d4',
 ownerRunId:39070029033,sourceCIAuthenticated:true,benchmarkCertified:false,
 sourcePositiveLabels:8,verifiedScopedNegativeLabels:8,neededAdditionalLabelsAtLeast:104,
 benchmarkScoredLabels:0,precision:null,recall:null,f1:null,
 tripleSPlusCertified:false,fpNonRegressionVerified:false,
 candidatePredictionsRead:false,baselinePredictionsRead:false,
 canMerge:false,verdict:'TRUTH_CORPUS_INCOMPLETE',
 labels:Array.from({length:16},(_,i)=>({pr:150+i,headSha:'a'.repeat(40),
  blobSha:'b'.repeat(40),rule:'OLDER_SCOPED_'+i,
  path:'old/file'+i+'.kt',line:i+1,positive:i<8}))
};
const witnesses=CASES.map((c,i)=>({
 schema:'ultra-sentinel-c2-run18-original-witness/v1',
 pr:c.pr,headSha:c.headSha,blobSha:c.blobSha,
 sourceSha256:c.sourceSha256,oracleSha256:String(i+1).repeat(64),
 originalLogSha256:'a'.repeat(64),counterfactualLogSha256:'b'.repeat(64),
 normalControlPassed:true,behaviorWitnessed:true,sensitivityProven:true,
 originalCallsitePinned:true,candidateRead:false,baselineRead:false
}));
const run=(p=prior,w=witnesses)=>presealRun18({prior:structuredClone(p),witnesses:structuredClone(w)});
test('preseal proposes 18 identities, 9 positive and 9 negative, and no scores',()=>{
 const r=run();assert.equal(r.labels.length,18);
 assert.equal(r.labels[0].rule,'QUADRATIC_DISCRIMINANT_NONFINITE_DOUBLE_UNHANDLED');
 assert.equal(r.labels[1].rule,'SPOKEN_STOP_PRIORITY_OVER_EXPLICIT_WAKE_BARGE_IN');
 assert.equal(r.sourcePositiveLabels,9);assert.equal(r.verifiedScopedNegativeLabels,9);
 assert.equal(r.neededAdditionalLabelsAtLeast,102);
 for(const k of ['precision','recall','f1'])assert.equal(r[k],null);
 assert.equal(r.status,'OWNER_CI_ATTESTATION_REQUIRED');
 assert.equal(r.tripleSPlusCertified,false);assert.equal(r.canMerge,false);
});
test('reject prior run, blob proof or old-seal drift',()=>{
 for(const patch of [{presealDigest:'a'.repeat(64)},{ownerRunId:1},
 {sourceCIAuthenticated:false},{benchmarkCertified:true},{sourcePositiveLabels:9},
 {benchmarkScoredLabels:1},{precision:1},{candidatePredictionsRead:true}])
  assert.throws(()=>run({...prior,...patch}),/BLOCKED/);
});
test('reject duplicate original truth identities',()=>{
 const p=structuredClone(prior);p.labels[1]={...p.labels[0]};
 assert.throws(()=>run(p),/BLOCKED/);
 const q=structuredClone(prior);q.labels[1]={...q.labels[1],...CASES[1]};
 assert.throws(()=>run(q),/BLOCKED/);
});
test('reject spoofed SHA, source and swapped labels',()=>{
 for(const patch of [{headSha:'f'.repeat(40)},{blobSha:'0'.repeat(40)},
  {sourceSha256:'f'.repeat(64)},{pr:150}])
  assert.throws(()=>run(prior,[{...witnesses[0],...patch},witnesses[1]]),/BLOCKED/);
 assert.throws(()=>run(prior,[witnesses[1],witnesses[0]]),/BLOCKED/);
});
test('reject witness that skipped control, mutation or production callsites',()=>{
 for(const patch of [{normalControlPassed:false},{behaviorWitnessed:false},
 {sensitivityProven:false},{originalCallsitePinned:false},
 {candidateRead:true},{baselineRead:true}])
  assert.throws(()=>run(prior,[witnesses[0],{...witnesses[1],...patch}]),/BLOCKED/);
});
test('reject unverified witness fields and metrics',()=>{
 assert.throws(()=>run(prior,[{...witnesses[0],extra:true},witnesses[1]]),/BLOCKED/);
 assert.throws(()=>run(prior,[{...witnesses[0],originalLogSha256:'NAN'},witnesses[1]]),/BLOCKED/);
});
