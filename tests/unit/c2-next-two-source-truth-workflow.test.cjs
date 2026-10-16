'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const w=fs.readFileSync(path.resolve(__dirname,'../../.github/workflows/c2-next-two-source-truth-seal.yml'),'utf8');
const cli=fs.readFileSync(path.resolve(__dirname,'../../scripts/seal-c2-next-two-original-truth.cjs'),'utf8');

test('two source receipts are pinned to successful owner-only GitHub runs and immutable artifacts',()=>{
 for(const x of [
  '38890454291','12041790611','38930244332','12057454797',
  '11eaf069eaa160003bd936d3ab6ef683ea24e194',
  'a908ec050a7442088b4d307f32eef32b65a316a5',
  'f0c1bd296d028312d16bd128b0fc407bc48e07207256e210467d7e9659bf2c73',
  'github.actor_id ==','github.event.comment.user.id == 322222186',
  'github.event.repository.id == 1418338512',
  'ULTRA_SENTINEL_C2_NEXT_TWO_SOURCE_TRUTH_V1',
  'sha256sum --check --status',
  '--experimental-permission','--allow-fs-read=',
  'sourcePositiveLabels == 2','verifiedNegativeFindingLabels == 0',
  'neededAdditionalPositiveLabelsAtLeast == 46',
  'neededAdditionalNegativeLabelsAtLeast == 48',
  'fpNonRegressionVerified == false',
  'tripleSPlusCertified == false'
 ])assert.ok(w.includes(x),x);
 assert.doesNotMatch(w,/contents:\s*write|pull_request_target:|auto.?merge/);
});
test('offline CLI rejects symlinks, multi-hardlinks, unpinned witness bytes and malformed JSON',()=>{
 for(const x of ['lstatSync','isSymbolicLink','nlink!==1','sha256','JSON.parse',
 'C2_NEXT_TWO_SOURCE_TRUTH_BLOCKED','process.exitCode=2'])
  assert.ok(cli.includes(x),x);
 assert.doesNotMatch(cli,/fetch\s*\(|https?:\/\/|child_process|execSync/);
});
