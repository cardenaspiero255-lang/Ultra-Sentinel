'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const yaml=fs.readFileSync(path.resolve(__dirname,'../../.github/workflows/c2-unseen-truth-v2.yml'),'utf8');
test('v2 requires owner-run authenticated original-source witnesses by SHA',()=>{
 for(const id of [
 '38840604111','12021635251','28945abf3c738d2fd7215f46decc8d4645c23e4c',
 '38841470698','12021616975','bc82cb6959dff3bfcd85952f005b9644860d0c5d',
 "github.actor_id == '322222186'",
 'github.event.comment.user.id == 322222186',
 'github.event.repository.id == 1418338512'
 ])assert.ok(yaml.includes(id),id);
});
test('sealing never runs an unpinned model or accepts inflated FP/recall claims',()=>{
 assert.match(yaml,/permissions:\n  contents: read\n  actions: read/);
 assert.match(yaml,/env -i PATH=/);
 assert.match(yaml,/--experimental-permission/);
 assert.match(yaml,/verifiedNegativeFindingLabels == 0/);
 assert.match(yaml,/includesPredictions == false/);
 assert.match(yaml,/precision == null and \.recall == null and \.f1 == null/);
 assert.match(yaml,/noFalsePositiveIncreaseCertified == false/);
 assert.match(yaml,/tripleSPlusCertified == false/);
 assert.doesNotMatch(yaml,/contents: write|--share-net|pull_request_target:|auto.?merge/);
});
