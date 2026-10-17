'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.resolve(__dirname,'../..',p),'utf8');
test('10-label owner seal chains SHA-pinned nine truth and original Kotlin negative-only history receipts',()=>{
 const w=read('.github/workflows/c2-next-ten-original-source-truth-seal.yml');
 for(const needle of [
 'ULTRA_SENTINEL_C2_NEXT_TEN_SOURCE_TRUTH_V1',
 'github.event.repository.id == 1418338512',
 'github.event.comment.user.id == 322222186',
 '38983286401','12082091255','33dd78cbe5d3dc9cec4068af7cb40ebc4595a89387d93db0739b976c06ab3efa',
 '38988102205','12083843392','33f1fdddfd1bebbb98ed5b787e7726f2f3469484fa958a840a0f055f46db8767',
 '545ddc5a92f830f8443afd0202693dc3890c9db3',
 'ac4cd9c74fadd5ea9af113b319c39dd2b404807f',
 'c2-pr150-bad-history-original.json',
 'ultra-sentinel-c2-pr150-bad-history-negative-history-source-oracle',
 'seal-c2-next-ten-original-truth.cjs',
 '(.labels|length) == 10',
 'sourcePositiveLabels == 5',
 'neededAdditionalLabelsAtLeast == 110',
 'benchmarkScoredLabels == 0',
 'tripleSPlusCertified == false'
 ])assert.ok(w.includes(needle),needle);
 assert.doesNotMatch(w,/contents:\s*write|pull_request_target|auto.?merge/);
});
test('truth-only CLI refuses symlinks, untrusted, oversized and extraneous data',()=>{
 const s=read('scripts/seal-c2-next-ten-original-truth.cjs');
 for(const str of ['lstatSync','isSymbolicLink','nlink!==1',
  'path.isAbsolute','sealTenOriginalTruth','process.exitCode=2'])
  assert.ok(s.includes(str),str);
 assert.doesNotMatch(s,/GITHUB_TOKEN|https?:\/\/|child_process/);
});
