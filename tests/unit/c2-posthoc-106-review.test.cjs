'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
test('C2 original 106 source artifact review is owner-scoped, immutable and zero-certification',()=>{
 const y=fs.readFileSync('.github/workflows/c2-kotlin-106-posthoc-four-gate.yml','utf8');
 for(const part of [
  'ULTRA_SENTINEL_C2_REVIEW_106_V1',
  'github.event.repository.id == 1418338512',
  'github.event.issue.number == 50',
  'github.event.comment.user.id == 322222186',
  'github.event.sender.id == 322222186',
  'github.ref == \'refs/heads/main\'',
  'run-id: 39168947905',
  'pattern: c2-kotlin-batch-*',
  'merge-multiple: false',
  '--mode full',
  '.receiptsSeen == 106',
  '.newLabels == 0',
  '.tripleSPlusCertified == false',
  '.blindHoldout == false',
  'c2-kotlin-106-original-four-gate-review'
 ])assert.ok(y.includes(part),part);
 assert.doesNotMatch(y,/contents: write|actions: write|pull-requests: write|pull_request_target|git push/);
 assert.match(y,/\.head_sha == "78acbcf4a91be55c2b38237ca2be8890440f317c"/);
});
