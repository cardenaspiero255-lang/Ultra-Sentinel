'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const s=fs.readFileSync(path.resolve(__dirname,'../../.github/workflows/c2-next-pr153-source-truth-seal.yml'),'utf8');
test('truth seal binds exact prior frozen holdout, GitHub Kotlin proof, actor and SHA',()=>{
 for(const part of [
  "github.ref == 'refs/heads/main'",
  "github.actor_id == '322222186'",
  'github.event.comment.user.id == 322222186',
  'github.event.repository.id == 1418338512',
  'ULTRA_SENTINEL_C2_NEXT_PR153_TRUTH_SEAL_V1',
  '38856860621','12027755925',
  '408c05a424d5f07d9cbec5e6fe555de0cdcdec9f',
  '38889693623','12040619454',
  '71aa7937625daa9945bbaf0a495a4f9073c5faaa',
  'a3e3d28a8bf3d4b0a59541efd96f698002deea355ec35dd8e17e5662a9830cba',
  'c2-next-original-pr153-rollback-witness/v1',
  'seal-c2-next-source-truth.cjs'
 ])if(part==='c2-next-original-pr153-rollback-witness/v1'){
  // validated by the imported trust-seal module rather than shell text
  const mod=fs.readFileSync(path.resolve(__dirname,'../../packages/quality-gates/c2-next-one-positive-truth.cjs'),'utf8');
  assert.ok(mod.includes(part));
 }else assert.ok(s.includes(part),part);
});
test('seal cannot be described as measured 95%/no-false-positive-regression',()=>{
 assert.match(s,/env -i PATH=/);
 assert.match(s,/--experimental-permission/);
 assert.match(s,/sourcePositiveLabels == 1/);
 assert.match(s,/verifiedNegativeFindingLabels == 0/);
 assert.match(s,/benchmarkScoredLabels == 0/);
 assert.match(s,/includesPredictions == false/);
 assert.match(s,/precision == null and \.recall == null and \.f1 == null/);
 assert.match(s,/fpNonRegressionVerified == false/);
 assert.match(s,/tripleSPlusCertified == false/);
 assert.doesNotMatch(s,/contents:\s*write|pull_request_target:|auto.?merge|--share-net/);
});
