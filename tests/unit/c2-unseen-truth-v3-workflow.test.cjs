'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const s=fs.readFileSync(path.resolve(__dirname,'../../.github/workflows/c2-unseen-truth-v3.yml'),'utf8');
test('source truth extension is bound to exact already successful GitHub runs',()=>{
 for(const x of [
 '38841966994','12021274341','97d9eac888379f6d2d93c01b505567ae0ff44ad7',
 '38842384635','12021074190','7e0f7a3f311991fcd0d00e10a19fe2bcdabedb89',
 'c2-unseen-truth-v2.json','c2-kotlin-source-witness.json',
 "github.actor_id == '322222186'",
 'github.event.comment.user.id == 322222186'])
  assert.ok(s.includes(x),x);
});
test('v3 output cannot certify a benchmark, FP parity or unrestricted writes',()=>{
 assert.match(s,/env -i PATH=/);
 assert.match(s,/--experimental-permission/);
 assert.match(s,/verifiedPositiveBehavior == 3/);
 assert.match(s,/verifiedNegativeFindingLabels == 0/);
 assert.match(s,/includesPredictions == false/);
 assert.match(s,/precision == null and \.recall == null and \.f1 == null/);
 assert.match(s,/noFalsePositiveIncreaseCertified == false/);
 assert.match(s,/tripleSPlusCertified == false/);
 assert.match(s,/name: ultra-sentinel-c2-unseen-truth-v3-partial/);
 assert.doesNotMatch(s,/contents:\s*write|--share-net|pull_request_target:|auto.?merge/);
});
