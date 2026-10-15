'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {assessOperationalReadiness}=require('../../packages/certification/operational-gates.cjs');
const source={headSha:'a'.repeat(40),reviewerVerdict:'ADVISORY',changedFiles:9,
 sourceGate:'OBSERVED_NOT_CERTIFIED',checks:{success:3,failure:0,pending:0,skipped:0,cancelled:0}};
const owner={active:true,requiredCheck:true,approvalCount:0};
test('sole-owner configuration is valid and never requires a second GitHub approver',()=>{
 const r=assessOperationalReadiness({shadow:source,ultraRuleset:owner,gamehubRuleset:{verified:true}});
 assert.equal(r.gates.mainProtected,true);
 assert.equal(r.gates.sourceCi,true);
 assert.equal(r.classification,'NOT_CERTIFIED');
 assert.equal(r.releaseAllowed,false);
 assert.equal('independentReviewRequired' in r.gates,false);
 assert.ok(r.blocked.includes('independentAuditVerified'));
});
test('failing, pending, skipped, cancelled or zero-source checks always block CI readiness',()=>{
 for(const checks of [
 {...source.checks,failure:1},
 {...source.checks,pending:1},
 {...source.checks,skipped:1},
 {...source.checks,cancelled:1},
 {...source.checks,success:0},
 {failure:0}
 ]){
  const r=assessOperationalReadiness({shadow:{...source,checks},ultraRuleset:owner,gamehubRuleset:{verified:true}});
  assert.equal(r.gates.sourceCi,false);assert.ok(r.blocked.includes('sourceCi'));
 }
});
test('unverified SHA and forged CI status cannot produce integration or source readiness',()=>{
 const r=assessOperationalReadiness({shadow:{...source,headSha:'fake',sourceGate:'PASS'},
  ultraRuleset:owner,gamehubRuleset:{verified:true}});
 assert.equal(r.gates.integration,false);assert.equal(r.gates.sourceCi,false);
});
test('fabricated green source and approvals never mint independent audit, rollback or parity',()=>{
 const r=assessOperationalReadiness({shadow:{...source,certified:true},
 ultraRuleset:{...owner,approvalCount:999},gamehubRuleset:{verified:true}});
 assert.equal(r.classification,'NOT_CERTIFIED');assert.equal(r.automaticMergeAllowed,false);
 for(const key of ['supervisedWriterVerified','independentAuditVerified','rollbackDrillVerified','semanticParityVerified'])
  assert.equal(r.gates[key],false);
});
test('unknown or partial release data fails closed',()=>{
 const r=assessOperationalReadiness({});
 assert.equal(r.blocked.length,8);assert.equal(r.releaseAllowed,false);
});
