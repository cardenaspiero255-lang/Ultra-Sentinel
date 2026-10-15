'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {runMutationLab,syntheticPatch}=
 require('../../packages/quality-gates/mutation-lab.cjs');
test('real Core detects all eight synthetic malicious mutations and rejects corresponding benign variants',()=>{
 const r=runMutationLab();
 assert.equal(r.schema,'ultra-sentinel-mutation-lab/v1');
 assert.equal(r.total,8);
 assert.equal(r.passed,8);
 assert.equal(r.failed,0);
 assert.equal(r.verdict,'SYNTHETIC_MUTANTS_KILLED');
 assert.equal(new Set(r.cases.map(c=>c.id)).size,8);
 for(const c of r.cases){
  assert.equal(c.injectedDetected,true,c.id);
  assert.equal(c.benignUnflagged,true,c.id);
 }
 assert.equal(r.syntheticMutantsOnly,true);
 assert.equal(r.realWorldMutationScoreCertified,false);
 assert.equal(r.releaseCertified,false);
 assert.equal(r.autoMerge,false);
});
test('mutation harness refuses unbounded or malformed source lines',()=>{
 for(const lines of [[],null,['x'.repeat(201)],Array(26).fill('x'),[42],['x',{}]]){
  assert.throws(()=>syntheticPatch(lines),/INVALID_SYNTHETIC_MUTANT/);
 }
 assert.match(syntheticPatch(['GlobalScope.launch {}']),/^@@ -0,0 \+1,1 @@/);
});
test('mutation fixtures cannot impersonate external QA certification',()=>{
 const r=runMutationLab();
 assert.equal(r.cases.length,8);
 assert.notEqual(r.verdict,'TRIPLE_S_PLUS_CERTIFIED');
 assert.equal(r.realWorldMutationScoreCertified,false);
});
