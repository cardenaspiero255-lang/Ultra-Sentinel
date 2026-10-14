'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {assessOperationalReadiness}=require('../../packages/certification/operational-gates.cjs');
test('real GameHub source CI failure blocks Triple SSS',()=>{
 const r=assessOperationalReadiness({shadow:{headSha:'a'.repeat(40),reviewerVerdict:'ADVISORY',
 changedFiles:9,sourceGate:'BLOCKED_SOURCE_CI',checks:{failure:1}},
 ultraRuleset:{active:true,requiredCheck:true,approvalCount:0},gamehubRuleset:{verified:false}});
 assert.equal(r.classification,'NOT_CERTIFIED');assert.equal(r.releaseAllowed,false);
 assert.ok(r.blocked.includes('sourceCi'));
 assert.ok(r.blocked.includes('independentReviewRequired'));
 assert.ok(r.blocked.includes('gamehubProtectionVerified'));
});
test('fabricated all-green caller data cannot mint external audit, rollback or approval',()=>{
 const r=assessOperationalReadiness({shadow:{headSha:'a'.repeat(40),reviewerVerdict:'ADVISORY',
 changedFiles:1,sourceGate:'OBSERVED_NOT_CERTIFIED',checks:{failure:0},certified:true},
 ultraRuleset:{active:true,requiredCheck:true,approvalCount:99},
 gamehubRuleset:{verified:true}});
 assert.equal(r.classification,'NOT_CERTIFIED');
 assert.equal(r.automaticMergeAllowed,false);
 for(const gate of ['supervisedWriterVerified','independentAuditVerified','rollbackDrillVerified','semanticParityVerified'])
  assert.equal(r.gates[gate],false);
});
test('unknown or partial release data fails closed',()=>{
 const r=assessOperationalReadiness({});
 assert.equal(r.blocked.length,9);
 assert.equal(r.releaseAllowed,false);
});
