'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const s=fs.readFileSync(path.resolve(__dirname,'../../.github/workflows/c2-unseen-holdout-freeze.yml'),'utf8');
test('only trusted main and account owner can authorize the holdout freeze',()=>{
 for(const snippet of ["github.ref == 'refs/heads/main'",
  'github.event.repository.id == 1418338512',
  "github.actor_id == '322222186'",
  'github.event.comment.user.id == 322222186',
  'github.event.issue.number == 50',
  "github.event.comment.body == 'ULTRA_SENTINEL_C2_HOLDOUT_FREEZE_V1'"])
  assert.ok(s.includes(snippet),snippet);
 assert.match(s,/permissions:\n\s+contents: read/);
 assert.doesNotMatch(s,/contents:\s*write|pull-requests:\s*write/);
});
test('fetches only four known SHA metadata envelopes; scorer receives no tokens',()=>{
 assert.match(s,/for pr in 172 205 206 208; do/);
 assert.match(s,/gh api "/);
 assert.match(s,/--experimental-permission/);
 assert.match(s,/env -i PATH=/);
 assert.match(s,/includesTruthLabels == false/);
 assert.match(s,/canCertify == false/);
 assert.doesNotMatch(s,/gh pr checkout|git checkout.*head|gh run download|curl .*\.diff|--share-net/);
});
