'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.resolve(__dirname,'../..',p),'utf8');
test('PR151 independent witness compiles immutable original source with no detector prediction access',()=>{
 const w=read('.github/workflows/c2-next-pr151-nonfinite-headroom.yml');
 for(const token of [
  '38856860621','12027755925','f5f2f66b31e5dc768c18be68bef29cbd0f97c8161fda212ce2ae1e64eb664b34',
  '9ad983576c16c6c34d59283979d83c69ede50dce','c594cb5383591d5040b1e88930fc76a5e5c9c6fa',
  'adb11032b9b7f62f865228dfa1c27258ca3fa0df','github.event.repository.id == 1418338512',
  "github.actor_id == '322222186'",'ULTRA_SENTINEL_C2_NEXT_PR151_NONFINITE_ORACLE_V1',
  'git hash-object','--unshare-all --new-session --clearenv',
  'tests/oracles/c2-next-pr151-domain-abi.kt',
  'tests/oracles/c2-next-pr151-nonfinite-headroom.kt',
  'candidateInspected == false','baselineCompared == false',
  'negativeFindingLabelsEstablished == 0',
  'precision == null','tripleSPlusCertified == false'
 ])assert.ok(w.includes(token),token);
 assert.doesNotMatch(w,/contents:\s*write|pull_request_target:|auto.?merge/);
});
test('original source behavior test must distinguish non-finite values and proper controls',()=>{
 const c=read('tests/oracles/c2-next-pr151-nonfinite-headroom.kt');
 for(const token of [
   'NONFINITE_THERMAL_HEADROOM_ACCEPTED',
   'FLOAT_POSITIVE_INFINITY_ALERTED',
   'NAN_THERMAL_HEADROOM_REJECTED',
   'NORMAL_FINITE_HIGH_THERMAL_ALERTED',
   'MISSING_THERMAL_REJECTED',
   'RECURRING_INFINITE_HEADROOM_FALSE_THERMAL',
   'candidateInspected','baselineCompared','positiveFindingLabelsSealed'
 ])assert.ok(c.includes(token),token);
 const abi=read('tests/oracles/c2-next-pr151-domain-abi.kt');
 assert.doesNotMatch(abi,/object AiSessionCoach|fun midSession\s*\(/);
});
