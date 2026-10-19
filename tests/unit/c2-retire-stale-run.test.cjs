'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('one-shot retirement archives failed original logs before cancelling only the pinned obsolete run', () => {
  const workflow=fs.readFileSync(path.join(__dirname,'../../.github/workflows/c2-kotlin-62-retire-stale-run.yml'),'utf8');
  assert.match(workflow,/branches:\s*\[main\]/);
  assert.match(workflow,/paths:\s*\n\s*- '\.github\/workflows\/c2-kotlin-62-retire-stale-run\.yml'/);
  assert.match(workflow,/github\.repository_id == 1418338512/);
  assert.match(workflow,/39205355612/);
  assert.match(workflow,/533d0e0350bf3f75fcc4cc9426cef6039bf6baf1/);
  assert.match(workflow,/\barchive:/);
  assert.match(workflow,/name: c2-retired-39205355612-evidence/);
  assert.match(workflow,/\bretire:\s*\n\s*needs: archive/);
  assert.match(workflow,/result == 'success'/);
  assert.match(workflow,/gh api --allow-escape-sequences/);
  assert.match(workflow,/\/cancel/);
  assert.doesNotMatch(workflow,/cancel-in-progress:\s*true/);
  assert.doesNotMatch(workflow,/pull_request:/);
});
