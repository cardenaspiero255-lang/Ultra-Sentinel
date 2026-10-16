'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const w=fs.readFileSync(path.resolve(__dirname,'../../.github/workflows/c2-next-seven-source-truth-seal.yml'),'utf8');
const cli=fs.readFileSync(path.resolve(__dirname,'../../scripts/seal-c2-next-seven-original-truth.cjs'),'utf8');
test('owner-only immutable evidence receipts are distinct, signed by run identity and ZIP digests',()=>{
 for(const x of [
  '38969278857','12075338764','38969804193','12076406708',
  'a3c8895ff81b822fbe50b4c84911c4f0de60d077',
  '36ec2099051a1a18d22366991553e86f5844c670',
  '.github/workflows/c2-next-five-source-truth-seal.yml',
  '.github/workflows/c2-next-original-pr154-pr155-oracles.yml',
  '9e754dc490d5c7d1afe3e5b278a8762f0499ba5a20f1de548f57fa1c259a31af',
  '84b7e898c1fa1d2f1d5dfee6e8d0feb39de17f3067c2dea761a3a25c15d2a01c',
  'github.event.repository.id == 1418338512',
  'github.event.comment.user.id == 322222186',
  'ULTRA_SENTINEL_C2_NEXT_SEVEN_SOURCE_TRUTH_V1',
  '--experimental-permission','--allow-fs-read=',
  'sourcePositiveLabels == 3','verifiedScopedNegativeLabels == 4',
  'neededAdditionalLabelsAtLeast == 113','benchmarkScoredLabels == 0',
  'fpNonRegressionVerified == false','tripleSPlusCertified == false'
 ])assert.ok(w.includes(x),x);
 assert.doesNotMatch(w,/contents:\s*write|pull_request_target:|auto.?merge/);
});
test('offline verifier rejects symlinks, multi-linked files and malformed original truth',()=>{
 for(const x of ['lstatSync','isSymbolicLink','nlink!==1','JSON.parse',
  'C2_SEVEN_ORIGINAL_TRUTH_BLOCKED','process.exitCode=2'])assert.ok(cli.includes(x),x);
 assert.doesNotMatch(cli,/https?:\/\/|child_process|execSync|fetch\s*\(/);
});
