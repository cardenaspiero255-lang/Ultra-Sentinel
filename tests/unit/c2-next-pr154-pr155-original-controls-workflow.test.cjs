'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const w=fs.readFileSync(path.resolve(__dirname,'../../.github/workflows/c2-next-original-pr154-pr155-oracles.yml'),'utf8');
const thermal=fs.readFileSync(path.resolve(__dirname,'../oracles/c2-next-pr154-thermal-controls.kt'),'utf8');
const battery=fs.readFileSync(path.resolve(__dirname,'../oracles/c2-next-pr155-battery-controls.kt'),'utf8');
const abi=fs.readFileSync(path.resolve(__dirname,'../oracles/c2-next-pr154-pr155-domain-abi.kt'),'utf8');
test('both originally frozen PRs use prior immutable SHA and owner-only gate',()=>{
 for(const frag of [
 '38856860621','12027755925','408c05a424d5f07d9cbec5e6fe555de0cdcdec9f',
 'f5f2f66b31e5dc768c18be68bef29cbd0f97c8161fda212ce2ae1e64eb664b34',
 '858c9ce5cb6a7916d63f2348432013e49d02ba79',
 'b2e15247536ecc00d4811021774ab2f34608ac3e',
 '2289f4e4cda55ddaa50f2016113ded82dc17203c',
 '8696360219231f3f1477d5ad21c93bca2197e281',
 'github.actor_id ==','github.event.comment.user.id == 322222186',
 'github.event.repository.id == 1418338512',
 'ULTRA_SENTINEL_C2_NEXT_THERMAL_BATTERY_CONTROLS_V1',
 'git hash-object','--unshare-all --new-session --clearenv',
 'candidateInspected == false','baselineCompared == false',
 'negativeFindingLabelsEstablished == 0','tripleSPlusCertified == false'
 ])assert.ok(w.includes(frag),frag);
 assert.doesNotMatch(w,/contents:\s*write|pull_request_target:|auto.?merge/);
});
test('both source files are compiled exactly, ABI does not replace actual engine',()=>{
 for(const f of ['ThermalPredictionAdvisor.kt','BatteryAwareGamingEngine.kt',
 'c2-next-pr154-thermal-controls.kt','c2-next-pr155-battery-controls.kt',
 'c2-next-pr154-pr155-domain-abi.kt'])assert.ok(w.includes(f),f);
 assert.doesNotMatch(abi,/class BatteryAwareGamingEngine|object ThermalPredictionAdvisor/);
});
test('thermal recovery / duplicate / confidence guard behavioral controls',()=>{
 for(const name of ['NO_WARNING_WHEN_NOT_ALLOWED','PREVENTIVE_RISK_NOTIFICATION_EMITTED',
 'DUPLICATE_PREVENTIVE_SUPPRESSED','RECOVERY_AFTER_WARNING_EMITTED',
 'CONFIDENCE_CLAMPED_HIGH','CONFIDENCE_CLAMPED_LOW'])
  assert.ok(thermal.includes(name),name);
});
test('battery charging, cutoff and rate controls use actual frozen Kotlin',()=>{
 for(const name of ['EMPTY_INPUT_NORMAL','CRITICAL_BATTERY_CONSERVE',
 'CHARGING_DISCARDS_PRIOR_DRAIN','MEASURED_HIGH_DRAIN_BALANCED',
 'LOW_DRAIN_NORMAL','SHORT_WINDOW_NOT_EXTRAPOLATED','POWER_SAVER_CONSERVE',
 'SORTED_TIMESTAMPS_EQUIVALENT','CHARGE_BOUNDARY_RESTARTS_DRAIN_WINDOW'])
  assert.ok(battery.includes(name),name);
});
