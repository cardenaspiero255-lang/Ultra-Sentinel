'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const file=f=>fs.readFileSync(path.resolve(__dirname,'../..',f),'utf8');
test('nine-truth owner workflow authenticates both artifact digests and exact SHA without predictions',()=>{
 const w=file('.github/workflows/c2-next-nine-source-truth-seal.yml');
 for(const needle of [
  'ULTRA_SENTINEL_C2_NEXT_NINE_SOURCE_TRUTH_V1',
  'github.event.repository.id == 1418338512',
  'github.event.comment.user.id == 322222186',
  '38970396948','12076436893',
  '666f9356c8e83f196a0d6a1006dbf1de9ccbb50345832812c0128e590794f077',
  '38982855937','12082061520',
  '7ef1372b5c4fa9080585315eae58364ebc9e8f013580db85214e266a4ac0bf47',
  '05b959a8fe650a0a00e0d20f57d73cceea05c008',
  '5947a5de1bf4f8e5b275015a5393b29f815f94e0',
  'seal-c2-next-nine-original-truth.cjs',
  'verifiedScopedNegativeLabels == 5','sourcePositiveLabels == 4',
  'neededAdditionalLabelsAtLeast == 111','benchmarkScoredLabels == 0',
  'includesPredictions == false','includesBaseline == false',
  'tripleSPlusCertified == false'
 ])assert.ok(w.includes(needle),needle);
 assert.doesNotMatch(w,/contents:\s*write|pull_request_target|auto.?merge/);
});
test('nine-label truth CLI forbids symlinks, foreign input and unsupported network accesses',()=>{
 const s=file('scripts/seal-c2-next-nine-original-truth.cjs');
 assert.match(s,/lstatSync/);assert.match(s,/isSymbolicLink/);
 assert.match(s,/nlink!==1/);assert.match(s,/path\.isAbsolute/);
 assert.match(s,/sealNineSourceTruth/);assert.match(s,/process\.exitCode=2/);
 assert.doesNotMatch(s,/https?:\/\/|GITHUB_TOKEN|child_process/);
});
