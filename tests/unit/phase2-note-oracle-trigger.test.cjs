'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

test('counterfactual classifier-only changes trigger the original Kotlin JVM oracle',()=>{
 const workflow=fs.readFileSync(path.join(__dirname,'../../.github/workflows/phase2-jarvis-note-oracle.yml'),'utf8');
 const scope=workflow.split('  pull_request:\n')[1]?.split('  workflow_dispatch:')[0];
 assert.ok(scope,'pull_request paths scope must exist');
 const entries=[...scope.matchAll(/^      - ([^\n]+)$/gm)].map(m=>m[1].trim());
 for(const needed of [
  'packages/recovery/original-note-flow-counterfactual.cjs',
  'tests/unit/original-note-flow-counterfactual.test.cjs',
  '.github/workflows/phase2-jarvis-note-oracle.yml'
 ]) assert.equal(entries.filter(x=>x===needed).length,1,needed+' must be an exact trigger');
});
