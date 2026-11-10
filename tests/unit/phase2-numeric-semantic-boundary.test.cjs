'use strict';
// Phase 2 guard: lexical numeric findings must never be promoted to semantic
// proof, functional verification, or permission to write.
const test = require('node:test');
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const {scanKotlinNumericRisks} = require('../../packages/family-hunter/phase2-numeric-risk-hunter.cjs');
const commit = 'a'.repeat(40);
function blob(source) {
  const bytes = Buffer.from(source, 'utf8');
  return createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
}
function scan(source) {
  return scanKotlinNumericRisks({expectedCommitSha:commit, files:[{
    path:'module/src/main/kotlin/example/Arithmetic.kt',
    source, expectedBlobSha:blob(source)
  }]});
}
test('numeric hypothesis remains advisory even when it matches source', () => {
  const out = scan('package example\nval n = ((x.toLong() * 100L) / y).toInt().coerceIn(0, 100)\n');
  assert.equal(out.findings.length, 1);
  assert.equal(out.sourceByteIntegrityVerified, true);
  for (const flag of [
    'sourceRepositoryAuthenticated','originalFunctionalOracleVerified',
    'causalityVerified','generalizationVerified','remoteWrites','mergeAllowed'
  ]) assert.equal(out[flag], false, flag);
});
test('absence of lexical findings never certifies semantic safety', () => {
  const out = scan('package example\nval n = x + y\n');
  assert.equal(out.findings.length, 0);
  assert.equal(out.status, 'NO_NUMERIC_HYPOTHESES_NOT_CERTIFIED');
  assert.equal(out.generalizationVerified, false);
  assert.equal(out.mergeAllowed, false);
});
test('a locally consistent hash does not authenticate repository membership', () => {
  const out = scan('package example\nval n = (x * 500).toLong()\n');
  assert.equal(out.sourceByteIntegrityVerified, true);
  assert.equal(out.sourceRepositoryAuthenticated, false);
});
