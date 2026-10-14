'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {inspectGameHubBranchMetadata}=require('../../packages/certification/gamehub-branch-evidence.cjs');
const sha='a'.repeat(40);
const ctx=['build','coverage','Ultra Sentinel Core — own reviewer','read-only-review'];
const valid=()=>({name:'main',commit:{sha},protected:true,protection:{
 enabled:true,required_status_checks:{enforcement_level:'everyone',contexts:ctx.slice()}}});
test('observed GameHub branch checks do not substitute human review attestation',()=>{
 const r=inspectGameHubBranchMetadata(valid());
 assert.equal(r.protectedFlag,true);
 assert.equal(r.classicBranchProtectionObserved,true);
 assert.equal(r.requiredChecksPresent,true);
 assert.equal(r.independentApprovalVerified,false);
 assert.equal(r.fullProtectionPolicyVerified,false);
 assert.equal(r.certificationGranted,false);
});
test('missing one required check and off enforcement fail closed',()=>{
 const missing=valid();missing.protection.required_status_checks.contexts.pop();
 assert.equal(inspectGameHubBranchMetadata(missing).requiredChecksPresent,false);
 const off=valid();off.protection.required_status_checks.enforcement_level='off';
 assert.equal(inspectGameHubBranchMetadata(off).requiredChecksPresent,false);
 const unprotected=valid();unprotected.protected=false;
 assert.equal(inspectGameHubBranchMetadata(unprotected).classicBranchProtectionObserved,false);
});
test('spoofed branch name and invalid SHA are rejected',()=>{
 assert.throws(()=>inspectGameHubBranchMetadata({...valid(),name:'development'}),/INVALID_BRANCH_EVIDENCE/);
 assert.throws(()=>inspectGameHubBranchMetadata({...valid(),commit:{sha:'invalid'}}),/INVALID_BRANCH_EVIDENCE/);
});
