'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const repo=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(repo,p),'utf8');
const targets=[
 'packages/family-hunter/phase2-codec-integrity-hunter.cjs',
 'packages/recovery/phase2-codec-integrity-candidate.cjs',
 'tests/unit/phase2-codec-integrity-hunter.test.cjs',
 'tests/unit/phase2-codec-integrity-candidate.test.cjs',
 'tests/unit/phase2-codec-blind-integration.test.cjs',
 'packages/family-hunter/phase2-numeric-risk-hunter.cjs',
 'packages/family-hunter/blind-numeric-worker.cjs',
 'tests/unit/phase2-blind-numeric-worker.test.cjs',
 'tests/unit/phase2-blind-numeric-git-inventory.test.cjs',
 'tests/unit/phase2-blind-numeric-receipt.test.cjs',
 'tests/unit/phase2-blind-numeric-isolation.test.cjs',
 'packages/family-hunter/phase2-numeric-semantic-evidence.cjs',
 'packages/family-hunter/phase2-numeric-sealed-semantic-link.cjs',
 'tests/unit/phase2-numeric-sealed-semantic-link.test.cjs',
 'tests/unit/phase2-numeric-sealed-link-cli.test.cjs',
 'tests/fixtures/gamehub-three-source/verify-numeric-link.cjs',
 'packages/kotlin-semantic/C2NumericSemanticClaims.kt',
 'tests/unit/phase2-numeric-semantic-evidence.test.cjs',
 'tests/fixtures/gamehub-three-source/verify-numeric-semantic.cjs',
 'tests/fixtures/gamehub-three-source/reproduce.sh',
 'tests/unit/phase2-numeric-risk-hunter.test.cjs',
 'tests/unit/phase2-numeric-original-bridge.test.cjs',
 'tests/fixtures/gamehub-three-source/scan-numeric.cjs',
 'packages/quality-gates/phase2-causal-factorial.cjs',
 'tests/unit/phase2-causal-factorial.test.cjs',
 'packages/recovery/phase2-generic-jvm-judge.cjs',
 'packages/recovery/phase2-executed-jvm-triplet.cjs',
 'tests/unit/phase2-executed-jvm-triplet.test.cjs',
 'tests/unit/phase2-generic-jvm-judge.test.cjs',
 'packages/memory/phase2-signed-revocation-filter.cjs',
 'tests/unit/phase2-signed-revocation-filter.test.cjs',
 'packages/memory/memory-local-revocation-journal.cjs',
 'tests/unit/memory-local-revocation-journal.test.cjs',
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
test('shared Hunter input boundaries trigger each dependent phase 2 workflow',()=>{
 const deps=['packages/investigation/plain-kotlin-payload.cjs',
  'packages/investigation/novel-kotlin-path-policy.cjs'];
 for(const workflow of ['phase2-jarvis-note-oracle.yml','phase2-blind-elapsed-original-oracle.yml',
  'phase2-control-plane-coverage.yml','phase2-three-source-gamehub.yml']){
  const paths=changes(read('.github/workflows/'+workflow));
  for(const dep of deps)assert.equal(paths.filter(path=>path===dep).length,1,workflow+': '+dep);
 }
});
test('coverage workflow enforces 90% branches and lines without privileged PR code',()=>{
 const s=read('.github/workflows/phase2-control-plane-coverage.yml');
 assert.ok(s.includes('node --test --experimental-test-coverage'));
 assert.ok(s.includes('--test-coverage-lines=90'));
 assert.ok(s.includes('--test-coverage-branches=90'));
 for(const module of targets.filter(p=>p.startsWith('packages/') && p.endsWith('.cjs')))
  assert.ok(s.includes('--test-coverage-include='+module),module);
 assert.ok(read('tests/fixtures/gamehub-three-source/reproduce.sh').includes('C2NumericSemanticClaims.kt'));
 assert.ok(read('tests/fixtures/gamehub-three-source/reproduce.sh').includes('verify-numeric-link.cjs'));
 assert.ok(read('.github/workflows/phase2-three-source-gamehub.yml').includes('SEALED_NUMERIC_COMPILER_LINE_RULE_LINKED_ADVISORY_NOT_ORACLE'));
 for(const p of ['tests/fixtures/gamehub-blind-numeric/prepare-inventory.cjs',
                 'tests/fixtures/gamehub-blind-numeric/verify-sealed.cjs'])
   assert.ok(s.includes('--test-coverage-include='+p),p);
 assert.ok(read('.github/workflows/phase2-three-source-gamehub.yml').includes('SENTINEL_REQUIRE_BLIND_BWRAP=1 node --test tests/unit/phase2-blind-numeric-isolation.test.cjs'));

 assert.ok(s.includes('permissions:\n  contents: read'));
 assert.ok(!s.includes('pull_request_target'));
});

test('both blinded GameHub findings are sealed before either original oracle runs',()=>{
 const yaml=read('.github/workflows/phase2-three-source-gamehub.yml');
 assert.doesNotMatch(yaml,/^(?:<{7}|={7}|>{7})/m,'workflow has unresolved merge conflicts');
 const names=[
  'Run blind codec Hunter in a separate no-network namespace',
  'Run numeric Hunter before exposing the JVM oracle',
  'Execute original codec JVM after sealed blind source discovery',
  'Execute pinned three-source JVMs, controls, Judge and rollback'
 ];
 const positions=names.map(name=>{
  const i=yaml.indexOf(name);assert.notEqual(i,-1,name);return i;
 });
 assert.ok(Math.max(...positions.slice(0,2))<Math.min(...positions.slice(2)),
  'both discoveries must be sealed before any original oracle is run');
 for(const [report,seal] of [
  ['codec-blind-output/discovery.json','codec-blind.sha256'],
  ['numeric-hunter-output/discovery.json','numeric-discovery.sha256']
 ]){
  const sealAt=yaml.indexOf(' > "$RUNNER_TEMP/'+seal+'"');
  assert.ok(sealAt>yaml.indexOf(report)&&sealAt<Math.min(...positions.slice(2)),seal);
  const checks=['sha256sum --check "$RUNNER_TEMP/'+seal+'"',
                'sha256sum --status --check "$RUNNER_TEMP/'+seal+'"'];
  assert.ok(checks.some(check=>yaml.includes(check)),seal+' is checked after execution');
 }
});
