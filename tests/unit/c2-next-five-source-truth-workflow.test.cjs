'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const w=fs.readFileSync(path.resolve(__dirname,'../../.github/workflows/c2-next-five-source-truth-seal.yml'),'utf8');
const cli=fs.readFileSync(path.resolve(__dirname,'../../scripts/seal-c2-next-five-original-truth.cjs'),'utf8');
test('immutable source-seal provenance requires exact owner, runs, workflow hashes and archive digest',()=>{
 for(const v of [
 '38947142683','12065927799','38968765586','12075688473',
 'cf59dd917ef05187500db9785c2e2ef339e5978c',
 '2d2132806c37148655ece20ef209fcaeceb9f002',
 '7f3b231da9b665c3b19067efbbf686618cb854fe7f377904a9b8b1d59f5a7738',
 '43c3e02ff1965341e04cb616e625252d2ad42319244b04c5ca8238307caa8138',
 'github.event.repository.id == 1418338512','github.event.comment.user.id == 322222186',
 'ULTRA_SENTINEL_C2_NEXT_FIVE_SOURCE_TRUTH_V1','--experimental-permission','--allow-fs-read=',
 'sourcePositiveLabels == 3','verifiedNegativeFindingLabels == 2',
 'neededAdditionalLabelsAtLeast == 115','benchmarkScoredLabels == 0',
 'fpNonRegressionVerified == false','tripleSPlusCertified == false'
 ])assert.ok(w.includes(v),v);
 assert.doesNotMatch(w,/contents:\s*write|pull_request_target:|auto.?merge/);
});
test('CLI rejects untrusted inputs and cannot certify an unscored partial corpus',()=>{
 for(const v of ['lstatSync','isSymbolicLink','nlink!==1','JSON.parse','process.exitCode=2'])
  assert.ok(cli.includes(v),v);
 assert.doesNotMatch(cli,/https?:\/\/|child_process|execSync|fetch\s*\(/);
});
