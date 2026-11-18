'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const get=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
test('v11 independently sealed original runtime admission achieves effective 4-method / 2-repo diversity',()=>{
 const receipt=get('docs/quality/PHASE2-BLOCK26-V11-INVOCABILITY-RECEIPT.json'),
  cohort=get('docs/quality/PHASE2-BLOCK26-V11-COHORT.json'),
  freeze=get('docs/quality/PHASE2-BLOCK26-V11-FREEZE.json'),
  original=get('docs/quality/PHASE2-BLOCK26-V11-POOL.json');
 assert.equal(receipt.schema,'ultra-sentinel-v11-effective-invocability-admission/v1');
 assert.equal(receipt.eligible,true);
 assert.equal(receipt.probedMethods,4);
 assert.equal(receipt.independentProbedRepositories,2);
 assert.equal(receipt.successfulInvocations,192);
 assert.equal(receipt.resultsMadeWithoutOracleOrFunctionalLabel,true);
 assert.equal(receipt.allFullHunterPredictionsUploadedBeforeAdmission,true);
 assert.equal(receipt.oracleExecuted,false);
 assert.deepEqual(receipt.frozenThreshold,freeze.selector.threshold);
 assert.equal(receipt.originalKotlinFilesExposed,39);
 assert.equal(cohort.admission.runId,44317152922);
 assert.equal(cohort.admission.sha256,'df22a2dd30c94f1ddcfc4c78161eaf9eadcb22fbd4ca458cff26eb0a9937aa0c');
 assert.equal(cohort.admission.fullPredictionSealSha256,'0ccfa2c2cd51536f5a2bbecf624b6054fe05c0db06b4f5e04b598e480853737d');
 assert.equal(cohort.admission.targetResultsNotUsedToChoose,true);
 assert.equal(cohort.admission.oracleExecuted,false);
 assert.equal(cohort.admission.completedTriples,32);
 assert.equal(cohort.originalFilesSelected,13);
 assert.deepEqual(cohort.selectedCohorts.map(x=>[x.rank,x.source.repository,x.effectiveMethodsProbed]),[
  [276,'runetopic/cryptography',1],
  [280,'SebastianAigner/dhash-kotlin',3]
 ]);
 for(const c of cohort.selectedCohorts){
  const fromOriginal=original.candidates.find(x=>x.rank===c.rank);
  assert.ok(fromOriginal);
  assert.deepEqual(c.source,fromOriginal.source);
 }
 assert.equal(cohort.independentOracleCommitted,false);
 assert.equal(cohort.independentOracleExecuted,false);
 assert.equal(cohort.originalDefectsConfirmed,null);
 assert.equal(cohort.block26Closed,false);
 assert.equal(cohort.block27Allowed,false);
});
test('v11 postscout excludes 185 repositories and all 729 exposed original Kotlin blobs',()=>{
 const pool=get('docs/quality/PHASE2-BLOCK26-V11-POOL.json'),
  current=get('docs/quality/PHASE2-BLOCK26-V11-POSTSCOUT-EXCLUSIONS.json'),
  previous=get('docs/quality/PHASE2-BLOCK26-V11-EXCLUSIONS.json'),
  repos=new Set(current.repositories.map(x=>x.toLowerCase())),
  blobs=new Set(current.blobShas);
 assert.equal(current.repositories.length,185);
 assert.equal(current.blobShas.length,729);
 assert.equal(previous.repositories.length,176);
 assert.equal(previous.blobShas.length,690);
 for(const x of previous.repositories)assert.ok(repos.has(x.toLowerCase()));
 for(const x of previous.blobShas)assert.ok(blobs.has(x));
 for(const original of pool.candidates){
  assert.ok(repos.has(original.source.repository.toLowerCase()));
  for(const file of original.source.files)assert.ok(blobs.has(file.blobSha));
 }
});
