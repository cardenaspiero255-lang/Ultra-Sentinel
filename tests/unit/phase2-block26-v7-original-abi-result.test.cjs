'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const json=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
test('v7 original metadata-only and compile-only evaluation preserves the negative admission, never fake-discovery',()=>{
 const m=json('docs/quality/PHASE2-BLOCK26-V7-RESERVATION.json');
 const f=json('docs/quality/PHASE2-BLOCK26-V7-FREEZE.json');
 const r=json('docs/quality/PHASE2-BLOCK26-V7-ABI-RESULT.json');
 assert.equal(r.schema,'ultra-sentinel-v7-original-abi-result/v1');
 assert.equal(r.runId,44239501372);
 assert.equal(r.exactHeadSha,'a3e494e8e503537aecbe22822e9bf7f4ecad4a1d');
 assert.equal(r.originalReservationSha256,'11e53fe012cff24a594db6c47412495e5de43b587b598a93c6c7c6c86b56411c');
 assert.equal(r.frozenEngineSha,f.engine.sourceCommitSha);
 assert.equal(r.originalFiles,m.cohorts.reduce((n,c)=>n+c.source.files.length,0));
 assert.equal(r.selectedRepositories,m.cohorts.length);
 assert.equal(r.compilationSucceededCohorts,6);
 assert.equal(r.candidateRepository,m.cohorts.find(c=>c.id===r.candidateCohortId).source.repository);
 assert.equal(r.callableCandidates,5);
 assert.equal(r.candidateCohorts,1);
 assert.deepEqual(r.precommittedThreshold,{minimumCallableCandidates:3,minimumCandidateCohorts:2});
 assert.equal(r.technicallyAdmissibleForBlindDiscovery,false);
 assert.match(r.originalReportSha256,/^[a-f0-9]{64}$/);
 assert.match(r.originalArchive.sha256,/^[a-f0-9]{64}$/);
 assert.match(r.originalSealSha256,/^[a-f0-9]{64}$/);
 for(const k of ['targetMethodsInvoked','hunterExecuted','independentOracleExecuted','block26Closed',
  'block27Allowed','retrospectiveThresholdChangeAllowed','prospectiveSourceSubstitutionAllowed'])
   assert.equal(r[k],false,k);
 assert.equal(r.confirmedDistinctNewDefects,null);
 assert.equal(r.originalSourcesNowExposed,true);
});
