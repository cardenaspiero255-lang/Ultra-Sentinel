'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const workflow=fs.readFileSync(path.resolve(__dirname,'../../.github/workflows/c2-unseen-pr205-unit-values.yml'),'utf8');
const harness=fs.readFileSync(path.resolve(__dirname,'../oracles/c2-unseen-pr205-unit-values.kt'),'utf8');
const stub=fs.readFileSync(path.resolve(__dirname,'../oracles/c2-unseen-pr205-frontier-abi.kt'),'utf8');
test('freeze run precedes untouched PR205 evidence, and Git blob identity is pinned',()=>{
 for(const mark of [
 '38838525845','12019324481',
 '6946e730d030f4772eff3ea9e704d7731f99c721',
 '205|1ecf73e789b91354ce9d8b7289d9492930ae5950|f0461cd51e00d2d7b2bc4225aeefee400e2e9fa4',
 'git hash-object','UltraFrontierV2.kt','ULTRA_SENTINEL_C2_UNSEEN_PR205_UNIT_VALUES_V1'
 ])assert.ok(workflow.includes(mark),mark);
});
test('original Kotlin and ABI-only stubs, not a reimplementation of Graph',()=>{
 assert.match(workflow,/kotlinc[\s\S]*\$src\/205\/UltraFrontierV2\.kt/);
 assert.match(workflow,/tests\/oracles\/c2-unseen-pr205-frontier-abi\.kt/);
 assert.doesNotMatch(stub,/class UltraFrontierV2ClaimProvenanceGraph/);
 assert.match(harness,/UltraFrontierV2ClaimProvenanceGraph\(\)/);
 assert.match(harness,/8 GB/);
 assert.match(harness,/8 Gb/);
});
test('controls prove specificity: numeric disagreement, ordinary prose and distinct claim keys',()=>{
 for(const check of [
 'NUMERIC_CONTRADICTION_RECOGNIZED','PROSE_CASE_INSENSITIVE',
 'DISTINCT_MEASUREMENT_CLAIM_IDS','UNIT_CASE_COLLISION_REPRODUCED'
 ])assert.ok(harness.includes(check),check);
 assert.match(workflow,/numericConflictControlPassed == true/);
 assert.match(workflow,/distinctUnitClaimIdControlPassed == true/);
});
test('workflow only permits owner run without tokens in isolated JVM; does not certify',()=>{
 for(const mark of [
 "github.ref == 'refs/heads/main'",
 'github.event.repository.id == 1418338512',
 'github.event.comment.user.id == 322222186',
 '--unshare-all --new-session --clearenv',
 '--ro-bind "$build" /workspace',
 'negativeFindingLabelsEstablished == 0',
 'globalPrecision == null',
 'candidateInspected == false',
 'baselineCompared == false',
 'tripleSPlusCertified == false'
 ])assert.ok(workflow.includes(mark),mark);
 assert.doesNotMatch(workflow,/--share-net|contents:\s*write|pull_request_target:|gh pr checkout/);
});
