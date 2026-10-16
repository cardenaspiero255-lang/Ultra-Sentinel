'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const work=fs.readFileSync(path.resolve(__dirname,'../../.github/workflows/c2-next-original-pr157-pr158-oracles.yml'),'utf8');
const tool=fs.readFileSync(path.resolve(__dirname,'../oracles/c2-next-pr157-tool-gateway-controls.kt'),'utf8');
const audit=fs.readFileSync(path.resolve(__dirname,'../oracles/c2-next-pr158-audit-trail-controls.kt'),'utf8');
test('owner-only source-attested next cohort is frozen before technical oracles',()=>{
 for(const s of [
 "github.ref == 'refs/heads/main'",
 "github.actor_id == '322222186'",
 "github.event.comment.user.id == 322222186",
 "github.event.repository.id == 1418338512",
 'ULTRA_SENTINEL_C2_NEXT_ORIGINAL_CONTROLS_V1',
 '38856860621','12027755925',
 '408c05a424d5f07d9cbec5e6fe555de0cdcdec9f',
 'f5f2f66b31e5dc768c18be68bef29cbd0f97c8161fda212ce2ae1e64eb664b34',
 'cb184c56d28342e46923d149c0e7f27141ce1a24',
 'a4361860bc51d5473766b6fb82f10bdca2b154ce',
 '9d8572afedc634ac07dae58a0da326ea62bdc1da',
 'd1af5d8c6574c325fdacadec54748cb730c3aacd',
 'git hash-object',
 'kotlinc',
 '--unshare-all --new-session --clearenv',
 'candidateInspected == false',
 'baselineCompared == false',
 'negativeFindingLabelsEstablished == 0',
 'precision == null','tripleSPlusCertified == false'
 ])assert.ok(work.includes(s),s);
 assert.doesNotMatch(work,/contents:\s*write|pull_request_target:|auto.?merge/);
});
test('real original code is compiled with ABI-only fake external dependencies',()=>{
 for(const f of ['UltraFrontierToolGateway.kt','UltraFrontierAuditTrail.kt',
 'c2-next-pr157-tool-abi.kt','c2-next-pr158-lane-abi.kt',
 'c2-next-pr157-tool-gateway-controls.kt','c2-next-pr158-audit-trail-controls.kt']){
  assert.ok(work.includes(f),f);
 }
 const abi=fs.readFileSync(path.resolve(__dirname,'../oracles/c2-next-pr157-tool-abi.kt'),'utf8');
 const aabi=fs.readFileSync(path.resolve(__dirname,'../oracles/c2-next-pr158-lane-abi.kt'),'utf8');
 assert.doesNotMatch(abi,/class UltraFrontierToolGateway/);
 assert.doesNotMatch(aabi,/class UltraFrontierAuditTrail/);
});
test('PR157 verifies deny-by-default both mutation levels and wrong-tool confirmation',()=>{
 for(const word of ['READ_ONLY_WITHOUT_APPROVAL_ACCEPTED',
 'MUTATION_WITHOUT_APPROVAL_BLOCKED',
 'MUTATION_WRONG_TOOL_BLOCKED',
 'MUTATION_CONFIRMED_EXECUTES',
 'MIXED_WITHOUT_APPROVAL_BLOCKED',
 'MIXED_CONFIRMED_EXECUTES',
 'TOOL_BOUND_CONFIRMATION_NON_TRANSFERABLE'])
  assert.ok(tool.includes(word),word);
});
test('PR158 actually tests bounded capacity, structured normalization and clear',()=>{
 for(const word of ['BOUNDED_CAPACITY_EVICTS_OLDEST',
 'EMPTY_CORRELATION_IGNORED',
 'CORRELATION_TRUNCATION_VERIFIED',
 'REASON_TRUNCATION_VERIFIED',
 'INVALID_ATTEMPT_IGNORED',
 'CLEAR_REMOVES_RECORDS'])
  assert.ok(audit.includes(word),word);
});
