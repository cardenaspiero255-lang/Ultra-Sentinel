'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const y=fs.readFileSync(path.resolve(__dirname,'../../.github/workflows/c2-unseen-pr208-mic-state.yml'),'utf8');
const harness=fs.readFileSync(path.resolve(__dirname,'../oracles/c2-unseen-pr208-mic-state.kt'),'utf8');
const stubs=['c2-unseen-pr208-android-manifest.kt','c2-unseen-pr208-android-content.kt',
 'c2-unseen-pr208-android-package-manager.kt','c2-unseen-pr208-android-speech.kt',
 'c2-unseen-pr208-androidx.kt','c2-unseen-pr208-service-abi.kt'];
test('PR208 source frozen and never overwritten by a mock controller',()=>{
 assert.match(y,/208\|df2bd33416d652480e51994784e511fbcb7ede12\|9298fe614e1ddbad27e2253c02e9415122cfa263/);
 assert.match(y,/git hash-object/);
 assert.match(y,/kotlinc[\s\S]*"\$src\/208\/ContinuousVoiceController.kt"/);
 for(const p of stubs){
  const content=fs.readFileSync(path.resolve(__dirname,'../oracles/'+p),'utf8');
  assert.doesNotMatch(content,/class ContinuousVoiceController/);
  assert.ok(y.includes(p));
 }
});
test('adversarial revoked-permission state differs from positive and negative controls',()=>{
 for(const x of ['NEW_REQUEST_WITHOUT_PERMISSION_STAYS_OFF',
  'RESUME_PERMISSION_REVOKED_DISALLOWS_ACTIVE',
  'SYSTEM_RESTRICTED_DISALLOWS_ACTIVE',
  'SERVICE_SECURITY_EXCEPTION_DISALLOWS_ACTIVE',
  'MANUAL_DISABLE_ALWAYS_CLEARS',
  'PERMISSION_REVOKED_PERSISTS_ENABLED_REPRODUCED'])
  assert.ok(harness.includes(x),x);
 assert.match(y,/staleEnabledAfterDenied == true/);
 assert.match(y,/freshPermissionControlPassed == true/);
 assert.match(y,/securityExceptionControlPassed == true/);
});
test('owner-only, Bubblewrap, no live microphone, no detector scoring',()=>{
 for(const x of [
 '38838525845','12019324481',
 "github.actor_id == '322222186'",
 'github.event.comment.user.id == 322222186',
 'github.event.repository.id == 1418338512',
 '--unshare-all --new-session --clearenv',
 'physicalMicObserved == false',
 'candidateInspected == false',
 'baselineCompared == false',
 'negativeFindingLabelsEstablished == 0',
 'precision == null',
 'tripleSPlusCertified == false'])
  assert.ok(y.includes(x),x);
 assert.doesNotMatch(y,/contents:\s*write|--share-net|pull_request_target:|gh pr checkout/);
});
