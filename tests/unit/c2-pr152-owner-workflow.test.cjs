'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const text=fs.readFileSync(path.join(__dirname,'../../.github/workflows/c2-pr152-owner-source-truth.yml'),'utf8');
test('owner-only trusted main is the sole sealing entrypoint',()=>{
 assert.match(text,/github\.ref == 'refs\/heads\/main'/);
 assert.match(text,/github\.actor_id == '322222186'/);
 assert.match(text,/github\.event\.issue\.number == 50/);
 assert.doesNotMatch(text,/^\s+pull_request\s*:/m);
});
test('owner prior seal and source are immutable',()=>{
 assert.match(text,/38988567892/);assert.match(text,/12084415965/);
 assert.match(text,/8aea2d5ae2ee931dbd3dadf34ca5035d6dd9501ffdc260ae7dabf910b6cd5fcb/);
 assert.match(text,/886c104effd553cd60f8222bfb05b8505fe7c4b8/);
 assert.match(text,/git hash-object/);
});
test('Kotlin original is run only with required network sandbox and no GH_TOKEN',()=>{
 assert.match(text,/C2_OWNER_SANDBOX=1/);assert.match(text,/bubblewrap apparmor/);
 assert.match(text,/kernel\.apparmor_restrict_unprivileged_userns/);
 assert.match(text,/persist-credentials: false/);
});
test('the workflow never scores, merges or trains',()=>{
 assert.match(text,/neededAdditionalLabelsAtLeast == 109/);
 assert.match(text,/benchmarkScoredLabels == 0/);
 assert.match(text,/tripleSPlusCertified == false/);
 assert.match(text,/precision == null/);
 assert.doesNotMatch(text,/gh pr merge|git push|gradlew train/);
});
