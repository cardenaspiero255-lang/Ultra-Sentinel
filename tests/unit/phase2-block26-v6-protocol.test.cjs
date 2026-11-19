'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
test('v6 independent original contracts cover all eight admitted callables before predictions',()=>{
 const r=require('../../docs/quality/PHASE2-BLOCK26-V6-RESERVATION.json');
 const m=require('../../docs/quality/PHASE2-BLOCK26-V6-COHORT.json');
 const a=require('../../docs/quality/evidence/block26-v6-admission/admission.json');
 assert.deepEqual(m.engine,r.frozenEngine);assert.deepEqual(m.cohorts,r.cohorts);
 assert.equal(m.admission.admissionSha256,'a872230937e2214e243441c32a23be1f198e12abd30bb9025276300d301ec9bf');
 assert.deepEqual(m.oracles.map(o=>o.cohortId),[3,4]);
 assert.equal(m.oracles.reduce((n,o)=>n+o.numericMethodsCovered,0),8);
 for(const c of a.cohorts.filter(c=>c.callables.some(m=>m.reason==='ADMISSIBLE_ABI_CANDIDATE')))
  assert.ok(m.oracles.some(o=>o.cohortId===c.cohortId));
 for(const o of m.oracles){
  const source=fs.readFileSync(path.join(root,o.path));
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'),o.sha256);
  assert.match(source.toString(),/package oracle/);
  assert.ok(!source.toString().includes('GenericJvmMetamorphicProbe'));
 }
 for(const key of ['oracleExcludedFromHunterMounts','oraclesCommittedBeforeHunter','sourceBodiesReadForIndependentOracleOnly'])assert.equal(m[key],true,key);
 for(const key of ['predictionsExecuted','oracleExecuted','engineRetuned','sourceSelectionChanged','wholeCohortTruth','block26Closed','block27Allowed'])assert.equal(m[key],false,key);
});
