'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const yml=fs.readFileSync(path.join(__dirname,'../../.github/workflows/c2-run17-original-source-truth.yml'),'utf8');
const sh=fs.readFileSync(path.join(__dirname,'../../scripts/c2-run17-owner-original-oracles.sh'),'utf8');
test('trusted main and explicit owner only; no PR injection',()=>{
 assert.match(yml,/github\.ref == 'refs\/heads\/main'/);
 assert.match(yml,/github\.actor_id == '322222186'/);
 assert.match(yml,/github\.event\.issue\.number == 50/);
 assert.match(yml,/ULTRA_SENTINEL_C2_RUN17_BATTERY_AND_LOCAL_V1/);
 assert.doesNotMatch(yml,/^\s+pull_request\s*:/m);
});
test('original fourteen-label owner run and archive digest pinned',()=>{
 for(const token of ['39067708985','12113662602',
  '1a41eba8de90abacade6d0f561aeb4cd2b65411b59ae9d080f7eff9c4ec26988',
  'c588dd2ceaf0e95644c30d6f0ca8b07fe7a8a06fb77e92f46954a016cadd23c3'])
  assert.ok(yml.includes(token),token);
});
test('pin exact original Git blobs and production callsites',()=>{
 for(const token of ['8696360219231f3f1477d5ad21c93bca2197e281',
 'e1423d747bdeeb556c4633febcfc9455e1f3cef6',
 '3f5d99509f28ed1ff8ea4ad95e3f532977505662',
 '5775edb4bf0fe814fe279a38d0ab1a18b1173db1',
 'BatteryAwareGamingEngine().assess(orderedSamples)',
 'UltraQueryExecutionCoordinator('])
  assert.ok(yml.includes(token),token);
});
test('sandbox required for every original and mutated Kotlin run',()=>{
 assert.match(yml,/C2_OWNER_SANDBOX=1/);
 assert.match(yml,/bubblewrap apparmor/);
 assert.match(yml,/persist-credentials: false/);
 assert.match(sh,/--unshare-all --new-session/);
 assert.match(sh,/env -i PATH=\/usr\/bin:\/bin HOME=\/tmp bwrap/);
});
test('original control and mutation signatures mandatory',()=>{
 for(const token of ['C2_BATTERY_VALID_THRESHOLD_CONTROL_PASS',
   'C2_BATTERY_INFINITE_THRESHOLD_UNRESTRICTED',
   'C2_BATTERY_FINITE_THRESHOLD_REQUIRED_PASS',
   'C2_LOCAL_NO_REMOTE_GATEWAY_PASS',
   'C2_REQUIRED_BOUNDARY_PASS',
   'C2_LOCAL_MUST_NOT_CALL_REMOTE_RESEARCH'])
   assert.ok(sh.includes(token),token);
});
test('CI only seals partial truth; no detector scores or auto merge',()=>{
 for(const token of ['neededAdditionalLabelsAtLeast == 104',
   'sourcePositiveLabels == 8','verifiedScopedNegativeLabels == 8',
   'benchmarkScoredLabels == 0','tripleSPlusCertified == false',
   'precision == null','recall == null','f1 == null'])
   assert.ok(yml.includes(token),token);
 assert.doesNotMatch(yml,/gh pr merge|git push|gradlew train/);
});
