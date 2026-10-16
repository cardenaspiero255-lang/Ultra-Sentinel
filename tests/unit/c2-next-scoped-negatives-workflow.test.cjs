'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const w=fs.readFileSync(path.resolve(__dirname,'../../.github/workflows/c2-next-original-pr157-pr158-oracles.yml'),'utf8');
const c=fs.readFileSync(path.resolve(__dirname,'../../scripts/c2-next-negative-counterfactuals.sh'),'utf8');

test('original PR157/158 source oracle gates candidate-free counterfactuals and artifacts',()=>{
 for(const x of [
  'Original-source counterfactual negative-proof canaries',
  'bash scripts/c2-next-negative-counterfactuals.sh',
  'ultra-sentinel-c2-next-pr157-pr158-scoped-negative-controls',
  'github.event.comment.user.id == 322222186',
  'github.event.repository.id == 1418338512',
  '--unshare-all --new-session --clearenv',
  'candidateInspected == false','baselineCompared == false',
  'negativeFindingLabelsEstablished:0','precision:null','recall:null',
  'f1:null','tripleSPlusCertified:false'
 ])assert.ok(w.includes(x),x);
 assert.doesNotMatch(w,/contents:\s*write|pull_request_target:|auto.?merge/);
});

test('counterfactuals really alter original Kotlin at one precise source predicate each',()=>{
 for(const x of [
  'ULTRA_MUTATION_CANARY_TOOL_AUTH_BYPASS',
  'ULTRA_MUTATION_CANARY_UNBOUNDED_AUDIT',
  'C2_NEXT_157_FAILED_MUTATION_WITHOUT_APPROVAL_BLOCKED',
  'C2_NEXT_158_FAILED_BOUNDED_CAPACITY_EVICTS_OLDEST',
  'negativeFindingLabelsProvenUnderControlScope',
  'MUTATION_EXECUTES_WITHOUT_TOOL_AUTHORIZATION',
  'UNBOUNDED_AUDIT_TRAIL_RETENTION',
  'app/src/main/java/com/cardenaspiero255/gamehubultra/ai/UltraFrontierToolGateway.kt',
  'app/src/main/java/com/cardenaspiero255/gamehubultra/ai/UltraFrontierAuditTrail.kt',
  '--unshare-all --new-session --clearenv',
  '"negativeFindingLabelsEstablished":0','"candidateInspected":false',
  '"baselineCompared":false','"tripleSPlusCertified":false',
  'test "$status" -ne 0'
 ])assert.ok(c.includes(x),x);
 assert.doesNotMatch(c,/GITHUB_TOKEN|GH_TOKEN|http[s]?:\/\//);
});
