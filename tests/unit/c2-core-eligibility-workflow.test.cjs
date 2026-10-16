'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const f=p=>fs.readFileSync(path.resolve(__dirname,'../..',p),'utf8');
test('owner preflight proves original source artifact and exact frozen Core policy without any predictions',()=>{
 const w=f('.github/workflows/c2-frozen-core-eligibility.yml');
 for(const a of ['ULTRA_SENTINEL_C2_FROZEN_ELIGIBILITY_AUDIT_V1','38974165470',
  '12077973482','fcc878c3af06d053e3e2b3e9ef3cc0f646e1a0edee4871a95333f16cd9e476a7',
  '7bf0122fa298dc0bfb5da5ca7e8d89e1dcbf39e0',
  'db29f94be1e0afb791a241d26f449695df0eafd0',
  'github.event.repository.id == 1418338512','github.event.comment.user.id == 322222186',
  'coreProductionEligibleUpperBound == 153','coreExcludedFileEntries == 88',
  'fullCoreAnalysis241Proven == false','benchmarkScoredLabels == 0',
  'tripleSPlusCertified == false','audit-c2-frozen-core-eligibility.cjs'])
  assert.ok(w.includes(a),a);
 assert.doesNotMatch(w,/contents:\s*write|pull_request_target:|auto.?merge|candidate-predictions|docker run/);
});
test('offline audit refuses symlinks or foreign/huge evidence, never contacts GitHub',()=>{
 const cli=f('scripts/audit-c2-frozen-core-eligibility.cjs');
 for(const a of ['lstatSync','isSymbolicLink','nlink!==1','auditCoreEligibility',
 'process.exitCode=2'])assert.ok(cli.includes(a),a);
 assert.doesNotMatch(cli,/https?:\/\/|GITHUB_TOKEN|child_process/);
});
