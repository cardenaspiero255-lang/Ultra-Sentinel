'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {compareFamilySnapshots}=require('../../packages/family-hunter/family-delta.cjs');
const f=(id,path,line,rule='UNSCOPED_COROUTINE')=>({id,rule,occurrences:1,distinctFiles:1,
 locations:[{path,line,severity:'HIGH'}],status:'HYPOTHESIS_REQUIRES_TESTS'});
const x='a'.repeat(24),y='b'.repeat(24),base='a'.repeat(40),head='b'.repeat(40);
const r=(sha,families,status='REVIEW_REQUIRED')=>({engine:'Ultra Sentinel Family Hunter',sha,status,families,
 autoCommitAllowed:false,autoMergeAllowed:false});
test('moves between files never create a verified fix',()=>{
 const report=compareFamilySnapshots(r(base,[f(x,'src/A.kt',2)]),r(head,[f(x,'src/B.kt',20)]));
 assert.equal(report.changes[0].state,'RELOCATED_OR_REPEATED_HYPOTHESIS');
 assert.equal(report.verifiedResolved,0);assert.equal(report.autoMergeAllowed,false);
});
test('same rule with changed fingerprint is a candidate semantic variant, not proof',()=>{
 const report=compareFamilySnapshots(r(base,[f(x,'src/A.kt',2)]),r(head,[f(y,'src/B.kt',20)]));
 assert.deepEqual(report.changes.map(x=>x.state),['NOT_OBSERVED_REQUIRES_VERIFICATION','SAME_RULE_VARIANT_CANDIDATE']);
});
test('disappearing finding never attests root cause fixed',()=>{
 const report=compareFamilySnapshots(r(base,[f(x,'src/A.kt',2)]),r(head,[],'NO_CRITICAL_PATTERN'));
 assert.equal(report.changes[0].state,'NOT_OBSERVED_REQUIRES_VERIFICATION');
 assert.equal(report.verifiedResolved,0);
});
test('partial Core snapshots fail closed',()=>{
 const report=compareFamilySnapshots(r(base,[f(x,'src/A.kt',2)],'INCOMPLETE'),r(head,[],'NO_CRITICAL_PATTERN'));
 assert.equal(report.status,'INCOMPLETE_EVIDENCE');assert.deepEqual(report.changes,[]);
});
test('forged lineage, duplicates, paths, repeated SHA are rejected',()=>{
 const v=r(base,[f(x,'src/A.kt',2)]);
 for(const corrupted of [{...v,autoMergeAllowed:true},r(base,[f(x,'../evil',1)]),r(base,[f(x,'src/A.kt',2),f(x,'src/B.kt',3)])])
  assert.throws(()=>compareFamilySnapshots(corrupted,r(head,[])),/INVALID_FAMILY_SNAPSHOT/);
 assert.throws(()=>compareFamilySnapshots(v,r(base,[])),/SAME_SNAPSHOT_SHA/);
});
