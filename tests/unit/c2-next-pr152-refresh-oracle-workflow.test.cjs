'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const file=(p)=>fs.readFileSync(path.resolve(__dirname,'../..',p),'utf8');

test('PR152 oracle uses immutable source and owner-only trusted-main execution',()=>{
  const w=file('.github/workflows/c2-next-pr152-refresh-oracle.yml');
  for(const s of [
    '38856860621','12027755925',
    'f5f2f66b31e5dc768c18be68bef29cbd0f97c8161fda212ce2ae1e64eb664b34',
    '104b7dc33e4c0341cec3fca81e3c8fbe3625357f',
    '549e3b1d619b83e59bc37b31b4860191c25528f1',
    'github.event.repository.id == 1418338512',
    "github.actor_id == '322222186'",
    'ULTRA_SENTINEL_C2_NEXT_PR152_REFRESH_ORACLE_V1',
    'git hash-object','--unshare-all --new-session --clearenv',
    'candidateInspected == false','baselineCompared == false',
    'negativeFindingLabelsEstablished == 0',
    'precision == null','tripleSPlusCertified == false'
  ])assert.ok(w.includes(s),s);
  assert.doesNotMatch(w,/contents:\s*write|pull_request_target:|auto.?merge/);
});

test('original AiProfileBuilder compiled, ABI stubs cannot replace its logic',()=>{
  const w=file('.github/workflows/c2-next-pr152-refresh-oracle.yml');
  const abi=file('tests/oracles/c2-next-pr152-domain-abi.kt');
  for(const s of ['AiProfileBuilder.kt','c2-next-pr152-domain-abi.kt',
    'c2-next-pr152-refresh-controls.kt','kotlinc','/jdk/bin/java'])
    assert.ok(w.includes(s),s);
  assert.doesNotMatch(abi,/object AiProfileBuilder|fun propose\(/);
});

test('independent behavioral oracle distinguishes faulty ranking from safety controls',()=>{
  const c=file('tests/oracles/c2-next-pr152-refresh-controls.kt');
  for(const s of [
    'UNSUPPORTED_PLURALITY_SUPPRESSES_SUPPORTED_STABLE_RATE',
    'SUPPORTED_PLURALITY_IS_SELECTED',
    'UNSUPPORTED_ONLY_NEVER_SELECTED',
    'INSUFFICIENT_SUPPORTED_EVIDENCE_NOT_SELECTED',
    'EXISTING_SUPPORTED_TARGET_PRESERVED'
  ])assert.ok(c.includes(s),s);
  for(const s of ['candidateInspected','baselineCompared',
    'negativeFindingLabelsEstablished','precision','recall','f1','tripleSPlusCertified'])
    assert.ok(c.includes(s),s);
});
