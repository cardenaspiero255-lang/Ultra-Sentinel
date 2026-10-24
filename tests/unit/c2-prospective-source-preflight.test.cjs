'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const roster=require('../../docs/quality/C2-BULK-PROSPECTIVE-PR-METADATA-20261024.json');
const wp=require('../../docs/quality/C2-WORDPRESS23432-METADATA-PRESEAL-20261024.json');
const ha=require('../../docs/quality/C2-HOMEASSISTANT7662-METADATA-PRESEAL-20261024.json');
const batch=require('../../docs/quality/C2-HOMEASSISTANT-FOUR-METADATA-PRESEAL-20261024.json');
const {preflightSelections}=require('../../packages/quality-gates/c2-prospective-source-preflight.cjs');
const clone=x=>JSON.parse(JSON.stringify(x));

test('registers authentic precommitted one-PR identities while explicitly withholding truth and predictions',()=>{
 for(const x of [wp,ha]){
  const result=preflightSelections(roster,x);
  assert.equal(result.precommittedCandidates,1);
  assert.equal(result.newGoldLabels,0);
  assert.equal(result.truthSealed,false);
  assert.equal(result.detectorPredictionsRead,false);
  assert.equal(result.sourceOracleAuthenticated,false);
  assert.equal(result.ruleCompatibilityAuthenticated,false);
  assert.equal(result.causalIndependenceCertified,false);
  assert.equal(result.status,'C2_SOURCE_ORACLE_NOT_ADMITTED');
 }
});
test('four frozen PR identities cannot be converted into GOLD by batch size',()=>{
 const x=preflightSelections(roster,batch);
 assert.equal(x.precommittedCandidates,4);
 assert.equal(x.newGoldLabels,0);
 assert.equal(x.truthSealed,false);
 assert.equal(x.holdoutFrozen,false);
 assert.equal(x.tripleSPlusCertified,false);
});
test('tampered SHA, unknown PR, duplicate, source or prediction unblinding fail closed',()=>{
 for(const invalid of [
  (()=>{const x=clone(ha);x.candidate.headSha='a'.repeat(40);return x;})(),
  (()=>{const x=clone(ha);x.candidate.pr=888888;return x;})(),
  (()=>{const x=clone(ha);x.sourceInspected=true;return x;})(),
  (()=>{const x=clone(ha);x.detectorPredictionsRead=true;return x;})(),
  (()=>{const x=clone(ha);x.newGoldLabels=1;return x;})(),
  (()=>{const x=clone(ha);x.ruleId='UNSCOPED_COROUTINE';return x;})(),
  (()=>{const x=clone(batch);x.candidates[1]=x.candidates[0];return x;})(),
  (()=>{const x=clone(batch);x.candidates[0].headSha='f'.repeat(40);return x;})()
 ]) assert.throws(()=>preflightSelections(roster,invalid),/C2_PRETRUTH_BLOCKED/);
});
