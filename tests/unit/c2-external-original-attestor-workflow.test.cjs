'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const file=path.resolve(__dirname,'../../.github/workflows/c2-known-external-development-oracle.yml');
const script=path.resolve(__dirname,'../../scripts/c2-attest-tasks-original-development.cjs');
test('external Kotlin original executes in Bubblewrap with checked Git SHA and no token in worker',()=>{
 const wf=fs.readFileSync(file,'utf8');
 assert.match(wf,/repository: tasks\/tasks/);
 assert.match(wf,/ref: 3936c221aea180b795085d7402286373b5d3f6d2/);
 assert.match(wf,/persist-credentials: false/);
 assert.match(wf,/networkless|--unshare-all/);
 assert.match(wf,/apparmor_restrict_unprivileged_userns/);
 assert.match(wf,/env -i PATH=\/usr\/bin:\/bin HOME=\/tmp/);
 assert.match(wf,/original-external\/app\/src\/main\/java\/org\/tasks\/notifications\/Throttle.kt/);
 assert.match(wf,/independent-original-attestor:/);
 assert.match(wf,/needs: \[isolated-original-kotlin\]/);
 assert.match(wf,/c2-attest-tasks-original-development\.cjs/);
 assert.match(wf,/newGoldLabels==0/);
 assert.doesNotMatch(wf,/script:\s*\$\{\{/);
});
test('independent verifier does not import candidate detector or compare predictions',()=>{
 const source=fs.readFileSync(script,'utf8');
 assert.match(source,/attestTasksExternalDevelopmentWitness/);
 assert.doesNotMatch(source,/require\([^\n]*(?:ultra_sentinel_core|shadow-parity|c2-frozen-benchmark)/);
 assert.doesNotMatch(source,/newGoldLabels\s*:\s*[1-9]/);
});

test('original-source gate runs when any source oracle executable or verifier dependency changes',()=>{
 const wf=fs.readFileSync(file,'utf8');
 const pathsSection=wf.split('  push:')[0];
 for(const target of [
  'tests/oracles/c2-external-tasks-throttle/**',
  'scripts/c2-tasks-source-only-receipt.cjs',
  'packages/quality-gates/c2-tasks-source-only-observation.cjs',
  'tests/unit/c2-tasks-source-only-observation.test.cjs'
 ]) assert.ok(pathsSection.includes('- '+target), 'Missing PR trigger for '+target);
});
