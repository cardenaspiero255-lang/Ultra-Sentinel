'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
test('original first v6 admission preserves all 37 reserved blobs and precedes any functional execution',()=>{
 const base=path.resolve(__dirname,'../../docs/quality/evidence/block26-v6-admission');
 const receipt=JSON.parse(fs.readFileSync(path.join(base,'receipt.json')));
 for(const [file,sha] of Object.entries(receipt.files))
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(base,file))).digest('hex'),sha);
 const a=JSON.parse(fs.readFileSync(path.join(base,'admission.json')));
 const seal=JSON.parse(fs.readFileSync(path.join(base,'admission-seal.json')));
 const reservation=require('../../docs/quality/PHASE2-BLOCK26-V6-RESERVATION.json');
 assert.equal(receipt.runId,43972168768);assert.equal(receipt.headSha,'1d43277c068712d9e6bdc39f527f7bc7e21ab3a7');
 assert.equal(a.engineSha,reservation.frozenEngine.commitSha);assert.equal(seal.admissionSha256,receipt.files['admission.json']);
 assert.deepEqual(a.threshold,{minimumCallableCandidates:3,minimumCohorts:2});
 assert.equal(a.cohorts.length,6);assert.equal(a.originalFiles,37);
 for(const c of a.cohorts){
  const original=reservation.cohorts.find(x=>x.id===c.cohortId).source;
  assert.equal(c.sourceSha,original.commitSha);assert.equal(c.sourceTreeSha,original.treeSha);
  assert.deepEqual(c.originalBlobs,original.files.map(f=>f.blobSha));
  assert.ok(c.callables.every(m=>m.targetInvoked===false&&m.finiteDomain==='NOT_EVALUATED_BY_ABI'));
 }
 assert.equal(a.cohorts.filter(c=>c.compilationSucceeded).length,5);
 assert.equal(a.cohorts[1].abstentions[0].reason,'DEPENDENCY_UNRESOLVED');
 assert.equal(a.callableCandidates,8);assert.equal(a.candidateCohorts,2);assert.equal(a.discoveryTechnicallyAdmissible,true);
 for(const k of ['expectedFunctionalResultsRead','targetInitializersExecuted','targetMethodsInvoked','hunterExecuted','oracleExecuted','finiteDomainsEvaluated','block26Closed','block27Allowed'])assert.equal(a[k],false,k);
 assert.equal(seal.hunterExecuted,false);assert.equal(seal.oracleExecuted,false);
});
