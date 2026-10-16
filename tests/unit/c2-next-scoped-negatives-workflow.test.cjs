'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const w=fs.readFileSync(path.resolve(__dirname,'../../.github/workflows/c2-next-original-pr157-pr158-oracles.yml'),'utf8');

test('frozen PR157 and PR158 each require one independent counterfactual rejection before negative-scoped reporting',()=>{
 for(const x of [
  'Original-source counterfactual negative-proof canaries',
  'ULTRA_MUTATION_CANARY_TOOL_AUTH_BYPASS',
  'ULTRA_MUTATION_CANARY_UNBOUNDED_AUDIT',
  'C2_NEXT_157_FAILED_MUTATION_WITHOUT_APPROVAL_BLOCKED',
  'C2_NEXT_158_FAILED_BOUNDED_CAPACITY_EVICTS_OLDEST',
  'negativeFindingLabelsProvenUnderControlScope',
  'MUTATION_EXECUTES_WITHOUT_TOOL_AUTHORIZATION',
  'UNBOUNDED_AUDIT_TRAIL_RETENTION',
  'app/src/main/java/com/cardenaspiero255/gamehubultra/ai/UltraFrontierToolGateway.kt',
  'app/src/main/java/com/cardenaspiero255/gamehubultra/ai/UltraFrontierAuditTrail.kt',
  'candidateInspected:false',
  'baselineCompared:false',
  'tripleSPlusCertified:false',
  '--unshare-all --new-session --clearenv'
 ])assert.ok(w.includes(x),x);
 assert.doesNotMatch(w,/contents:\s*write|pull_request_target:|auto.?merge/);
});
test('counterfactual labels retain bounded scope and never auto-award numeric precision or 95 percent',()=>{
 assert.ok(w.includes('negativeFindingLabelsEstablished:0'));
 assert.ok(w.includes('precision:null'));
 assert.ok(w.includes('recall:null'));
 assert.ok(w.includes('f1:null'));
 assert.ok(w.includes('fpNonRegressionVerified:false'));
});
