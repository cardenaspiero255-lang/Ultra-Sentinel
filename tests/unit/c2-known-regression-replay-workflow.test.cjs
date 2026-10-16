'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const y=fs.readFileSync(path.resolve(__dirname,'../../.github/workflows/c2-known-regression-replay.yml'),'utf8');
test('owner-only replay is tied to authenticated original HEAD SHA and frozen truth',()=>{
 for(const fragment of [
  "github.ref == 'refs/heads/main'",'github.event.repository.id == 1418338512',
  "github.actor_id == '322222186'",'github.event.comment.user.id == 322222186',
  'ULTRA_SENTINEL_C2_KNOWN_REPLAY_V1',
  '38842931678','12021956554','dce263a427b05c2fcb4fa2c52509ed6a82964772fe9c4f0bd526230c77809a59',
  'f0461cd51e00d2d7b2bc4225aeefee400e2e9fa4',
  '6ce74fb027c0d6e3fe6cfe48d3b0b5fc1ba2497a',
  '9298fe614e1ddbad27e2253c02e9415122cfa263',
  'compare/$base...$head'
 ])assert.ok(y.includes(fragment),fragment);
});
test('cannot masquerade as original blind holdout or certify global FP/recall',()=>{
 assert.match(y,/trainingOnly == true and \.freshHoldout == false/);
 assert.match(y,/knownRegressionMatches\.detected == 3/);
 assert.match(y,/legacyFrozenBaselineMatches == 0/);
 assert.match(y,/falsePositivesVerified == null/);
 assert.match(y,/precision == null and \.recall == null and \.f1 == null/);
 assert.match(y,/fpNonRegressionVerified == false/);
 assert.match(y,/tripleSPlusCertified == false/);
 assert.match(y,/env -i PATH=/);
 assert.match(y,/--experimental-permission/);
 assert.doesNotMatch(y,/contents: write|pull_request_target:|--share-net|auto.?merge/);
});
