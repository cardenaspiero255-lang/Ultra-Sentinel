'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
test('C2 source replay isolates concurrency per exact PR HEAD while preserving capped execution',()=>{
 const workflow=fs.readFileSync(path.join(__dirname,'../../.github/workflows/c2-pr189-sixteen-original-pilot.yml'),'utf8');
 assert.match(workflow,/group: c2-pr189-sixteen-originals-\$\{\{ github\.event\.pull_request\.number \}\}-\$\{\{ github\.event\.pull_request\.head\.sha \}\}/);
 assert.match(workflow,/cancel-in-progress: false/);
 assert.match(workflow,/max-parallel: 3/);
 assert.match(workflow,/fail-fast: false/);
 assert.match(workflow,/if: always\(\) && needs\.roster\.result == 'success'/);
});
