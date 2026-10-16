'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.resolve(__dirname,'../..',p),'utf8');
test('original PR154/155 owner-only workflow executes counterfactual canaries after normal controls',()=>{
 const w=read('.github/workflows/c2-next-original-pr154-pr155-oracles.yml');
 for(const s of ['Original-source counterfactual thermal and battery negative canaries',
  'bash scripts/c2-next-thermal-battery-counterfactuals.sh',
  'ultra-sentinel-c2-next-pr154-pr155-scoped-negatives',
  'github.event.repository.id == 1418338512',
  'github.event.comment.user.id == 322222186',
  'negativeFindingLabelsEstablished:0','precision:null','f1:null',
  'tripleSPlusCertified:false'
 ])assert.ok(w.includes(s),s);
 assert.doesNotMatch(w,/contents:\s*write|pull_request_target:|auto.?merge/);
});
test('counterfactuals mutate exactly the source guard, fail in the expected Kotlin assertion',()=>{
 const s=read('scripts/c2-next-thermal-battery-counterfactuals.sh');
 for(const v of [
  'b2e15247536ecc00d4811021774ab2f34608ac3e',
  '8696360219231f3f1477d5ad21c93bca2197e281',
  'THERMAL_WARNING_WITHOUT_PREVENTIVE_PERMISSION',
  'BATTERY_DRAIN_CROSSES_CHARGING_BOUNDARY',
  'C2_NEXT_154_CONTROL_FAILED_NO_WARNING_WHEN_NOT_ALLOWED',
  'C2_NEXT_155_CONTROL_FAILED_CHARGING_DISCARDS_PRIOR_DRAIN',
  'counterfactualFailedAtTarget','originalControlPassed',
  'negativeFindingLabelsEstablished','candidateInspected',
  'baselineCompared','tripleSPlusCertified',
  '--unshare-all --new-session --clearenv'
 ])assert.ok(s.includes(v),v);
 assert.doesNotMatch(s,/GH_TOKEN|GITHUB_TOKEN|http[s]?:\/\/|auto.?merge/);
});
