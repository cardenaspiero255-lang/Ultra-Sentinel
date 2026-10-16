'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const w=fs.readFileSync(path.resolve(__dirname,'../../.github/workflows/c2-next-pr153-pending-rollback-oracle.yml'),'utf8');
const kotlin=fs.readFileSync(path.resolve(__dirname,'../oracles/c2-next-pr153-pending-rollback.kt'),'utf8');
const domain=fs.readFileSync(path.resolve(__dirname,'../oracles/c2-next-pr153-domain-abi.kt'),'utf8');
test('owner-only original Kotlin PR153 is frozen to immutable Git blob before execution',()=>{
 for(const q of [
  '38856860621','12027755925',
  'f5f2f66b31e5dc768c18be68bef29cbd0f97c8161fda212ce2ae1e64eb664b34',
  '6508cc124076b9dea437ea1efc213d3ce55d7baf',
  'd8708fd6245cea2e8dab4404ef5bfb7e682e1a6f',
  'app/src/main/java/com/cardenaspiero255/gamehubultra/PerGameAdaptiveRuntime.kt',
  'github.event.repository.id == 1418338512',
  "github.actor_id == '322222186'",
  'github.event.comment.user.id == 322222186',
  'ULTRA_SENTINEL_C2_NEXT_PR153_PENDING_ROLLBACK_V1',
  'git hash-object', 'kotlinc', '--unshare-all --new-session --clearenv',
  'candidateInspected == false', 'baselineCompared == false',
  'negativeFindingLabelsEstablished == 0',
  'precision == null','tripleSPlusCertified == false'
 ])assert.ok(w.includes(q),q);
 assert.doesNotMatch(w,/contents:\s*write|pull_request_target:|auto.?merge/);
});
test('original state machine is compiled without replacing it with a fake',()=>{
 for(const q of [
 'PerGameAdaptiveRuntime.kt',
 'c2-next-pr153-domain-abi.kt',
 'c2-next-pr153-data-abi.kt',
 'c2-next-pr153-coroutines-abi.kt',
 'c2-next-pr153-pending-rollback.kt'
 ])assert.ok(w.includes(q),q);
 assert.doesNotMatch(domain,/suspend fun processCompletedAdaptiveSession|fun completePendingAdaptiveDecision/);
});
test('positive control follows actual crash/replay sequence, plus safety controls',()=>{
 for(const phrase of [
  'NORMAL_SUCCESS_ATOMIC_PROFILE_STATE',
  'PERSIST_FAILURE_BEFORE_MUTATION_RETRY_SAFE',
  'CLEAR_FAILURE_AFTER_HANDLED_LEAVES_PROFILE_STATE_DIVERGENCE',
  'RECOVERY_DOES_NOT_REPERSIST_TARGET_PROFILE',
  'REPLAY_ONCE_WITHOUT_PENDING_IDEMPOTENT',
  'return result',
  'clearFailureOnce',
  'profile==initialProfile'
 ])assert.ok(kotlin.includes(phrase),phrase);
});
