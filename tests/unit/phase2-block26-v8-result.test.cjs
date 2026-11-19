'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p)),
 json=p=>JSON.parse(read(p));
test('v8 authenticates 3 ABI-admitted methods in 2 independent originals before any Hunter or functional oracle',()=>{
 const freeze=json('docs/quality/PHASE2-BLOCK26-V8-FREEZE.json'),
  pool=json('docs/quality/PHASE2-BLOCK26-V8-POOL.json'),
  seal=json('docs/quality/PHASE2-BLOCK26-V8-POOL-SEAL.json'),
  receipt=json('docs/quality/PHASE2-BLOCK26-V8-ABI-RECEIPT.json'),
  final=json('docs/quality/PHASE2-BLOCK26-V8-COHORT.json');
 assert.equal(crypto.createHash('sha256').update(read(seal.poolPath)).digest('hex'),seal.poolSha256);
 assert.equal(receipt.schema,'ultra-sentinel-v8-cohort-admission-receipt/v1');
 assert.equal(final.schema,'ultra-sentinel-block26-v8-structural-admitted-cohort/v1');
 assert.equal(receipt.engineSha,freeze.engine.sourceCommitSha);
 assert.equal(final.frozenHunter.moduleBlobSha,'430b4e928527b20fe305d63f3efb85909f1dfa06');
 assert.equal(final.metadataPool.sha256,receipt.poolSha256);
 assert.equal(final.abiEvidence.reportSha256,'e8ab2bdc9b3d1070fe94aedc46b04f4baca54ca984e3d2c3bdb0f1d399214c69');
 assert.equal(final.abiEvidence.runId,44248441714);
 assert.equal(final.abiEvidence.originalArtifactId,14402263627);
 assert.deepEqual(final.precommittedThreshold,{minimumNumericMethods:3,minimumCandidateCohorts:2});
 assert.equal(receipt.structural.eligible,true);
 assert.equal(receipt.structural.numericMethods,3);
 assert.equal(receipt.structural.candidateCohorts,2);
 assert.deepEqual(final.selectedCohorts.map(x=>[x.rank,x.source.repository,x.abiCandidateMethods]),[
  [68,'elevenetc/utils-kotlin-math',2],
  [76,'kory33/bigmath',1]
 ]);
 assert.deepEqual(final.selectedCohorts.map(x=>x.source),
  receipt.structural.selected.map(x=>x.source));
 for(const item of final.selectedCohorts){
  const pinned=pool.candidates.find(x=>x.rank===item.rank);
  assert.ok(pinned,'selected source must originate from the sealed metadata pool');
  assert.deepEqual(item.source,pinned.source);
 }
 assert.equal(final.originalFilesSelected,13);
 assert.equal(final.abiEvidence.originalFilesInspected,60);
 assert.equal(final.abiEvidence.originalCohortsInspected,11);
 assert.ok(final.abiEvidence.coverageLinesPercent>=90);
 assert.ok(final.abiEvidence.coverageBranchesPercent>=90);
 for(const key of ['sourceContentsUsedForSelection','targetMethodsExecuted','methodBodiesInspectedBySelector',
  'originalFunctionalOracleCommitted','hunterPredictionsSealed','oracleExecuted','block26Closed','block27Allowed'])
  assert.equal(final[key],false,key);
 assert.equal(final.confirmedDistinctNewDefects,null);
});
test('all 11 original ABI-scout repos and 60 Kotlin blobs are excluded from any future unknown-source evaluation',()=>{
 const before=json('docs/quality/PHASE2-BLOCK26-V8-EXCLUSIONS.json'),
  after=json('docs/quality/PHASE2-BLOCK26-V8-POSTSCOUT-EXCLUSIONS.json'),
  pool=json('docs/quality/PHASE2-BLOCK26-V8-POOL.json');
 assert.equal(before.repositories.length,153);
 assert.equal(before.blobShas.length,555);
 assert.equal(after.repositories.length,164);
 assert.equal(after.blobShas.length,615);
 const repos=new Set(after.repositories.map(x=>x.toLowerCase())),
  blobs=new Set(after.blobShas);
 for(const id of before.repositories)assert.ok(repos.has(id.toLowerCase()));
 for(const sha of before.blobShas)assert.ok(blobs.has(sha));
 for(const c of pool.candidates){
  assert.ok(repos.has(c.source.repository.toLowerCase()));
  for(const file of c.source.files)assert.ok(blobs.has(file.blobSha));
 }
 assert.equal(pool.candidates.reduce((z,c)=>z+c.source.files.length,0),60);
});
