'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const wf=fs.readFileSync(path.resolve(__dirname,'../../.github/workflows/c2-158-prospective-rule-family-ranking.yml'),'utf8');

test('owner manual dispatch works despite skipped introductory push job, but NEVER skips offline success gate',()=>{
 assert.match(wf,/owner-only-158-metadata-ranking:/);
 assert.match(wf,/always\(\)/);
 assert.match(wf,/needs\.offline-admission-and-tests\.result\s*==\s*'success'/);
 assert.match(wf,/needs\.first-owner-introduction\.outputs\.introduced\s*==\s*'true'/);
 assert.match(wf,/github\.actor_id\s*==\s*'322222186'/);
 assert.match(wf,/github\.ref\s*==\s*'refs\/heads\/main'/);
});
test('no action ever publishes a PR diff or reads candidate/baseline, rank report not a certification',()=>{
 assert.match(wf,/jq -se 'add \| map\(\{filename,status,sha,additions,deletions,changes\}\)'/);
 assert.match(wf,/sourcePreviouslyExposed==11/);
 assert.match(wf,/newGoldLabels==0/);
 assert.match(wf,/candidatePredictionsRead==false/);
 assert.match(wf,/originalOracleExecuted==false/);
 assert.doesNotMatch(wf,/contents:\s*write|pull-requests:\s*write/);
});
