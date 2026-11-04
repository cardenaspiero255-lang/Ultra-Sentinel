'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const filename=path.join(__dirname,'../../.github/workflows/c2-historical-23-ledger.yml');
const workflow=fs.readFileSync(filename,'utf8');

test('historical 23-label provenance campaign is manually invoked, not a mandatory post-merge main gate',()=>{
 assert.match(workflow,/^on:\n  workflow_dispatch:\s*\n/m);
 assert.doesNotMatch(workflow,/^  push:\s*$/m);
 assert.match(workflow,/github\.event_name == 'workflow_dispatch'/);
 assert.match(workflow,/github\.ref == 'refs\/heads\/main'/);
 assert.match(workflow,/github\.actor == 'cardenaspiero255-lang'/);
});

test('manual historical provenance stays strictly fail-closed for missing pinned artifacts',()=>{
 assert.match(workflow,/permissions:\n  contents: read\n  actions: read/m);
 assert.match(workflow,/set -euo pipefail/);
 assert.match(workflow,/HISTORICAL_ORIGINAL_ARTIFACT_UNAVAILABLE/);
 assert.match(workflow,/HISTORICAL_DERIVED_ARTIFACT_UNAVAILABLE/);
 assert.match(workflow,/\.expired==false/);
 assert.match(workflow,/\.digest==\$digest/);
 assert.match(workflow,/\.workflow_run\.repository_id==1418338512/);
 assert.doesNotMatch(workflow,/continue-on-error:\s*true|if-no-files-found:\s*ignore/);
 assert.match(workflow,/f8e12475887a960c233efde0aac67e75e21fe272/);
 assert.match(workflow,/e1c242ecbc08d2f4fbedeed7a33eb987f630f19f/);
});
