'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const w=fs.readFileSync(path.resolve(__dirname,'../../.github/workflows/c2-next-four-scoped-truth-seal.yml'),'utf8');
const cli=fs.readFileSync(path.resolve(__dirname,'../../scripts/seal-c2-four-scoped-truth.cjs'),'utf8');
test('two evidence receipts require exact immutable owner main SHA and artifact SHA256 digest',()=>{
 for(const p of [
  '38931168454','12058802148','38946358219','12066196917',
  'ce187a77141f1d3f1f3f33419ca68813efd52139',
  '0b9ca41e3bff1219effa799a98bedde38172f579',
  '2557e84eb9922a2a32f98e0ff710324ea626c64df2a9e5dc5e0fba49a96e6d05',
  '9bda473d6d80e833f4e46e6893e943f551ff299d59cf3e25de0e9a05d2ef3e6a',
  'github.event.repository.id == 1418338512',
  'github.event.comment.user.id == 322222186',
  'ULTRA_SENTINEL_C2_FOUR_SCOPED_SOURCE_TRUTH_V1',
  '--experimental-permission','--allow-fs-read=',
  'benchmarkScoredLabels == 0',
  'tripleSPlusCertified == false',
  'neededAdditionalLabelsAtLeast == 116'
 ])assert.ok(w.includes(p),p);
 assert.doesNotMatch(w,/contents:\s*write|pull_request_target:|auto.?merge/);
});
test('offline validator fails closed for forged source, path or malformed witness',()=>{
 for(const p of ['isSymbolicLink','nlink!==1','JSON.parse',
   'C2_FOUR_SOURCE_TRUTH_BLOCKED','process.exitCode=2'])
  assert.ok(cli.includes(p),p);
 assert.doesNotMatch(cli,/https?:\/\/|child_process|execSync|fetch\(/);
});
