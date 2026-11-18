'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {validateFreeze}=require('../../scripts/phase2-kotlin-api-v11-metadata.cjs');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p)),
 json=p=>JSON.parse(read(p)),blob=b=>crypto.createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
test('v11 freezes unchanged original Hunter and every selection/probing source module BEFORE new original metadata',()=>{
 const f=validateFreeze();
 assert.equal(f.schema,'ultra-sentinel-block26-v11-prospective-invocability-freeze/v1');
 assert.equal(f.engine.moduleBlobSha,'430b4e928527b20fe305d63f3efb85909f1dfa06');
 assert.equal(f.engine.mutable,false);
 assert.equal(f.selector.query,'algorithm language:Kotlin fork:false archived:false stars:2..50');
 assert.equal(f.selector.maxExaminedMetadataRepositories,300);
 assert.equal(f.selector.maxEligibleSourceCandidates,12);
 assert.deepEqual(f.selector.threshold,{
  minimumProbedMethods:3,minimumIndependentRepositories:2,
  minimumCompletedTriplesPerRepository:1,minimumSuccessfulInvocationsPerRepository:6});
 for(const m of [f.engine,f.gate,f.exclusions,...f.reusedModules])
  assert.equal(blob(read(m.modulePath||m.path)),m.moduleBlobSha||m.blobSha);
 assert.ok(f.reusedModules.some(m=>m.path==='scripts/phase2-kotlin-api-v11-scout.cjs'));
 assert.ok(f.reusedModules.some(m=>m.path==='scripts/phase2-kotlin-api-v11-metadata.cjs'));
 for(const key of ['newSourceMetadataQueried','newSourceBodiesRead','frozenHunterExecuted',
  'newPredictionsSealed','oracleExecuted','block26Closed','block27Allowed'])
  assert.equal(f.current[key],false,key);
});
test('v11 176/690 baseline excludes all historic v9 and v8 originals, including untested v9 sources',()=>{
 const f=validateFreeze(),ex=json(f.exclusions.path),previous=json('docs/quality/PHASE2-BLOCK26-V9-POSTSCOUT-EXCLUSIONS.json');
 assert.deepEqual(ex,previous);
 assert.equal(ex.repositories.length,176);
 assert.equal(ex.blobShas.length,690);
 const oldRepos=new Set(ex.repositories.map(x=>x.toLowerCase())),oldBlobs=new Set(ex.blobShas);
 for(const c of json('docs/quality/PHASE2-BLOCK26-V9-POOL.json').candidates){
  assert.ok(oldRepos.has(c.source.repository.toLowerCase()));
  for(const x of c.source.files)assert.ok(oldBlobs.has(x.blobSha));
 }
 assert.equal(f.historical.v9Outcome,'INCOMPLETE_ORIGINAL_PROVENANCE');
 assert.equal(f.historical.v10Outcome,'EMPTY_METADATA_POOL_NO_SOURCE_READ');
 assert.equal(f.selector.noRetuneOrSubstitutionAfterResults,true);
});
