'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const repo=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(repo,p),'utf8');
const targets=[
 'packages/family-hunter/phase2-numeric-risk-hunter.cjs',
 'tests/unit/phase2-numeric-risk-hunter.test.cjs',
 'packages/quality-gates/phase2-causal-factorial.cjs',
 'tests/unit/phase2-causal-factorial.test.cjs',
 'packages/recovery/phase2-generic-jvm-judge.cjs',
 'packages/recovery/phase2-executed-jvm-triplet.cjs',
 'tests/unit/phase2-executed-jvm-triplet.test.cjs',
 'tests/unit/phase2-generic-jvm-judge.test.cjs',
 'packages/memory/phase2-signed-revocation-filter.cjs',
 'tests/unit/phase2-signed-revocation-filter.test.cjs',
 'packages/memory/ultra_sentinel_memory_quarantine.cjs',
 'tests/unit/memory-signed-quarantine-integration.test.cjs',
 'tests/unit/memory-witness-quarantine-integration.test.cjs',
 'tests/unit/phase2-cross-oracle-trigger.test.cjs'
];
function changes(w){
 const scope=w.split('  pull_request:\n')[1]?.split('  workflow_dispatch:')[0];
 assert.ok(scope,'pull_request path filter must be visible');
 return [...scope.matchAll(/^      - ([^\n]+)$/gm)].map(m=>m[1]);
}
test('every Phase 2 logic change triggers both original pinned JVM experiments',()=>{
 for(const p of ['.github/workflows/phase2-jarvis-note-oracle.yml',
  '.github/workflows/phase2-blind-elapsed-original-oracle.yml']){
  const s=read(p),list=changes(s);
  for(const required of targets)assert.equal(list.filter(v=>v===required).length,1,p+': '+required);
 }
});
test('coverage workflow enforces 90% branches and lines without privileged PR code',()=>{
 const s=read('.github/workflows/phase2-control-plane-coverage.yml');
 assert.ok(s.includes('node --test --experimental-test-coverage'));
 assert.ok(s.includes('--test-coverage-lines=90'));
 assert.ok(s.includes('--test-coverage-branches=90'));
 for(const module of targets.filter(p=>p.startsWith('packages/')))
  assert.ok(s.includes('--test-coverage-include='+module),module);
 assert.ok(s.includes('permissions:\n  contents: read'));
 assert.ok(!s.includes('pull_request_target'));
});
