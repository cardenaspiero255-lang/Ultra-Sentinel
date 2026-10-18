'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
test('C2 106-task replay campaign fail-closed roster and receipts',()=>{
  const result=spawnSync('python3',['-m','unittest','discover','-s','tests/unit','-p','test_c2_bulk_kotlin_campaign.py'],{
    encoding:'utf8',timeout:90_000,maxBuffer:1048576
  });
  assert.equal(result.status,0,String(result.error||'')+'\n'+result.stdout+'\n'+result.stderr);
  assert.match(result.stderr,/Ran 11 tests/);
  assert.match(result.stderr,/OK/);
});

test('owner issue #50 can trigger only isolated two-task smoke on main',()=>{
  const fs=require('node:fs');
  const workflow=fs.readFileSync('.github/workflows/c2-kotlin-106-campaign.yml','utf8');
  assert.match(workflow,/issue_comment:\s*\n\s*types: \[created\]/);
  assert.match(workflow,/github\.event\.issue\.number == 50/);
  assert.match(workflow,/github\.event\.issue\.pull_request == null/);
  assert.match(workflow,/github\.event\.comment\.user\.id == 322222186/);
  assert.match(workflow,/github\.event\.sender\.id == 322222186/);
  assert.match(workflow,/ULTRA_SENTINEL_C2_KOTLIN_106_SMOKE_V1/);
  assert.match(workflow,/github\.ref == 'refs\/heads\/main'/);
  assert.equal((workflow.match(/MODE: \$\{\{ github\.event_name == 'workflow_dispatch' && inputs\.mode \|\| \(github\.event\.comment\.body == 'ULTRA_SENTINEL_C2_KOTLIN_106_FULL_V1' && 'full' \|\| 'smoke'\) \}\}/g)||[]).length,3);
});

test('owner-only exact full campaign comment selects all 106 tasks, rejects other comments',()=>{
 const fs=require('node:fs');
 const workflow=fs.readFileSync('.github/workflows/c2-kotlin-106-campaign.yml','utf8');
 assert.match(workflow,/github\.event\.comment\.body == 'ULTRA_SENTINEL_C2_KOTLIN_106_FULL_V1'/);
 assert.match(workflow,/github\.event\.comment\.user\.id == 322222186/);
 assert.match(workflow,/github\.event\.sender\.id == 322222186/);
 assert.match(workflow,/github\.event\.issue\.number == 50/);
 assert.match(workflow,/github\.ref == 'refs\/heads\/main'/);
 assert.match(workflow,/github\.event\.repository\.id == 1418338512/);
 assert.match(workflow,/max-parallel: 3/);
 assert.equal((workflow.match(/MODE: \$\{\{ github\.event_name == 'workflow_dispatch' && inputs\.mode \|\| \(github\.event\.comment\.body == 'ULTRA_SENTINEL_C2_KOTLIN_106_FULL_V1' && 'full' \|\| 'smoke'\) \}\}/g)||[]).length,3);
});

test('C2 campaign aggregate performs fail-closed per-candidate four-gate review',()=>{
  const fs=require('node:fs');
  const workflow=fs.readFileSync('.github/workflows/c2-kotlin-106-campaign.yml','utf8');
  assert.match(workflow,/node sentinel\/scripts\/c2-review-kotlin-candidates\.cjs/);
  assert.match(workflow,/--receipts "\$RUNNER_TEMP\/c2-received"/);
  assert.match(workflow,/--mode "\$MODE"/);
  assert.match(workflow,/\.admitted == 0 and \.newLabels == 0/);
  assert.match(workflow,/\.historicalFingerprintsCompared == 0/);
  assert.match(workflow,/name: c2-kotlin-four-gate-review/);
});
