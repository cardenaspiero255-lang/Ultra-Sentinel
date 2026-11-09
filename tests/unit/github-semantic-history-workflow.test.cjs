'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('the historical semantic verifier has a read-only live CI proof and pinned source',()=>{
 const file=path.resolve(__dirname,'../../.github/workflows/phase2-github-semantic-history.yml');
 assert.ok(fs.existsSync(file),'live verifier workflow must exist');
 const workflow=fs.readFileSync(file,'utf8');
 assert.match(workflow,/contents:\s*read/);assert.match(workflow,/actions:\s*read/);
 assert.doesNotMatch(workflow,/pull_request_target|id-token:\s*write|contents:\s*write|persist-credentials:\s*true/);
 assert.match(workflow,/e4ca122422f1cb591d407db3fb21fb00fd78b022/);
 assert.match(workflow,/tests\/integration\/github-semantic-history-live\.test\.cjs/);
 assert.match(workflow,/scripts\/verify-github-semantic-history\.cjs/);
 assert.match(workflow,/phase2-github-historical-semantic-proof/);
 for(const source of ['packages/investigation/github-semantic-history-verifier.cjs',
  'tests/fixtures/phase2-github-semantic-main.zip','tests/unit/github-semantic-history-verifier.test.cjs',
  'tests/integration/github-semantic-history-live.test.cjs'])assert.ok(workflow.includes(source));
});
