'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {planC2BulkIntake, reviewC2BulkReceipts} =
  require('../../packages/quality-gates/c2-bulk-evidence-intake.cjs');
const locked = require('../../docs/quality/C2-FOUR-EXTERNAL-PROSPECTIVE-PR-METADATA-20261022.json');
const expanded = require('../../docs/quality/C2-BULK-PROSPECTIVE-PR-METADATA-20261024.json');
const H = 'a'.repeat(40), D = 'a'.repeat(64);
const clone = x => JSON.parse(JSON.stringify(x));
function candidate(i) {
  return {
    repository: 'example'+i+'/safe-android',
    pr: i+1,
    baseSha: String(i+100).padStart(40,'0'),
    headSha: String(i+1000).padStart(40,'0'),
    createdAt:'2026-10-22T18:32:28Z',
    source:'PROSPECTIVE_GITHUB',
    disclosure:'METADATA_ONLY'
  };
}
function manifest(rows) {
  return {schema:'c2-bulk-source-candidate-manifest/v1',
    cutoff:locked.cutoff,candidates:rows};
}
function receipt(row, overrides={}) {
  return {
    schema:'c2-bulk-original-oracle-receipt/v1',
    repository:row.repository,pr:row.pr,headSha:row.headSha,
    sourceBlobSha:H,rule:'UNSCOPED_COROUTINE',path:'app/src/main/java/Example.kt',
    line:42,positive:true,originalJUnitSha256:D,
    fixedJUnitSha256:'b'.repeat(64),benignJUnitSha256:'c'.repeat(64),
    witnessSha256:'d'.repeat(64),causalFingerprintSha256:'e'.repeat(64),
    state:'ORIGINAL_SOURCE_TRANSITION_REPORTED',
    detectorPredictionsRead:false,baselinePredictionsRead:false,
    ...overrides
  };
}
test('plans the four existing untouched PRs without opening their source or minting labels',()=>{
 const x = planC2BulkIntake(manifest(clone(locked.candidates)),{shards:16});
 assert.equal(x.sourceCandidates,4);
 assert.equal(x.previousSealedTruth,9);
 assert.equal(x.additionalTruthNeeded,111);
 assert.equal(x.newGoldLabels,0);
 assert.equal(x.sourceInspected,false);
 assert.equal(x.candidatePredictionsRead,false);
 assert.equal(x.holdoutFrozen,false);
 assert.equal(x.tripleSPlusCertified,false);
 assert.equal(x.shards.length,4);
 assert.deepEqual(x.shards.flatMap(s=>s.candidates).map(s=>s.repository).sort(),
   locked.candidates.map(s=>s.repository).sort());
});
test('scales one campaign to 240 uninspected identities with deterministic balanced sharding',()=>{
 const pool = manifest(Array.from({length:240},(_,i)=>candidate(i)));
 const a=planC2BulkIntake(pool,{shards:16});
 const b=planC2BulkIntake(pool,{shards:16});
 assert.deepEqual(a,b);
 assert.equal(a.sourceCandidates,240);
 assert.equal(a.shards.length,16);
 assert.ok(Math.max(...a.shards.map(x=>x.candidates.length))<=16);
 assert.equal(a.newGoldLabels,0);
 assert.equal(a.additionalTruthNeeded,111);
});
test('rejects duplicate original PR identity and duplicate historical HEAD',()=>{
 const x=clone(locked.candidates);
 assert.throws(()=>planC2BulkIntake(manifest([x[0],x[0]])),/C2_BULK_INTAKE_BLOCKED/);
 const collision=clone(x);collision[1].headSha=collision[0].headSha;
 assert.throws(()=>planC2BulkIntake(manifest(collision)),/C2_BULK_INTAKE_BLOCKED/);
});
test('refuses modifications to four sealed prospective metadata rows',()=>{
 const x=clone(locked.candidates);x[0].headSha=H;
 assert.throws(()=>planC2BulkIntake(manifest(x)),/C2_BULK_INTAKE_BLOCKED/);
});
test('rejects known training repository, stale PR, unsafe source, and hidden predictions',()=>{
 for(const broken of [
  {...candidate(11),repository:'cardenaspiero255-lang/gamehub-ultra'},
  {...candidate(12),createdAt:'2026-10-19T19:30:54Z'},
  {...candidate(13),source:'GUESSED_BY_DETECTOR'},
  {...candidate(14),diff:'source is intentionally hidden'},
  {...candidate(15),rule:'UNSCOPED_COROUTINE'},
  {...candidate(16),headSha:'xyz'},
 ]) assert.throws(()=>planC2BulkIntake(manifest([broken])),/C2_BULK_INTAKE_BLOCKED/);
});
test('rejects manifest schema widening, excessive candidates, and non-finite shard values',()=>{
 assert.throws(()=>planC2BulkIntake({...manifest([candidate(20)]),candidateFindings:[]}),
   /C2_BULK_INTAKE_BLOCKED/);
 assert.throws(()=>planC2BulkIntake(manifest(Array.from({length:513},(_,i)=>candidate(i)))),
   /C2_BULK_INTAKE_BLOCKED/);
 assert.throws(()=>planC2BulkIntake(manifest([candidate(30)]),{shards:Infinity}),
   /C2_BULK_INTAKE_BLOCKED/);
});
test('reported original/fix/benign witnesses are quarantined, NOT admitted as GOLD',()=>{
 const x=planC2BulkIntake(manifest([candidate(42)]));
 const report=reviewC2BulkReceipts(x,[receipt(candidate(42))]);
 assert.equal(report.receiptsReviewed,1);
 assert.equal(report.claimsAwaitingOwnerAuthentication,1);
 assert.equal(report.newGoldLabels,0);
 assert.equal(report.totalGoldLabels,9);
 assert.equal(report.remaining,111);
 assert.equal(report.precision,null);
 assert.equal(report.recall,null);
 assert.equal(report.f1,null);
 assert.equal(report.tripleSPlusCertified,false);
 assert.equal(report.sourceOracleAuthenticated,false);
});
test('missing witnesses remain inconclusive and never increase label counter',()=>{
 const x=planC2BulkIntake(manifest([candidate(2),candidate(3)]));
 const report=reviewC2BulkReceipts(x,[]);
 assert.equal(report.missing,2);
 assert.equal(report.newGoldLabels,0);
 assert.equal(report.remaining,111);
});
test('fails closed on duplicate receipts, source drift, and forged certification flags',()=>{
 const row=candidate(27),x=planC2BulkIntake(manifest([row]));
 for(const bad of [
   [receipt(row),receipt(row)],
   [receipt(row,{headSha:H})],
   [receipt(row,{sourceOracleAuthenticated:true})],
   [receipt(row,{newGoldLabels:111})],
   [receipt(row,{detectorPredictionsRead:true})],
   [receipt(row,{originalJUnitSha256:'x'})],
   [receipt(row,{sourceBlobSha:row.headSha})],
 ]) assert.throws(()=>reviewC2BulkReceipts(x,bad),/C2_BULK_INTAKE_BLOCKED/);
});
test('repeated causal witness cannot masquerade as two independent labels',()=>{
 const rows=[candidate(50),candidate(51)];
 const x=planC2BulkIntake(manifest(rows));
 assert.throws(()=>reviewC2BulkReceipts(x,[receipt(rows[0]),receipt(rows[1])]),
  /C2_BULK_INTAKE_BLOCKED/);
});

test('169 real source-free prospective PR metadata are prepared together, not counted as truths',()=>{
 const x=planC2BulkIntake(expanded);
 assert.equal(x.sourceCandidates,169);
 assert.equal(x.shards.length,16);
 assert.equal(x.shards.reduce((n,s)=>n+s.candidates.length,0),169);
 assert.equal(x.additionalTruthNeeded,111);
 assert.equal(x.sourceInspected,false);
 assert.equal(x.newGoldLabels,0);
 assert.equal(x.holdoutFrozen,false);
});
