'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {validateFreeze}=require('../../scripts/phase2-kotlin-api-v10-metadata.cjs');
const ROOT=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(ROOT,p));
const json=p=>JSON.parse(read(p));
const blob=b=>crypto.createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
test('v10 precommits unchanged frozen Hunter and all source-reading modules BEFORE any new Kotlin selection',()=>{
 const f=validateFreeze();
 assert.equal(f.schema,'ultra-sentinel-block26-v10-prospective-invocability-freeze/v1');
 assert.equal(f.engine.sourceCommitSha,'689583c23277807345edb715d8c2d277a3d4bda7');
 assert.equal(f.engine.moduleBlobSha,'430b4e928527b20fe305d63f3efb85909f1dfa06');
 assert.equal(f.engine.mutable,false);
 for(const m of [f.engine,f.gate,f.exclusions,...f.reusedModules]){
  assert.equal(blob(read(m.modulePath||m.path)),m.moduleBlobSha||m.blobSha);
 }
 assert.equal(f.reusedModules.length,8);
 assert.ok(f.reusedModules.some(m=>m.path==='scripts/phase2-kotlin-api-v10-metadata.cjs'));
 assert.ok(f.reusedModules.some(m=>m.path==='scripts/phase2-kotlin-api-v10-scout.cjs'));
 assert.equal(f.selector.maxEligibleSourceCandidates,12);
 assert.equal(f.selector.maxExaminedMetadataRepositories,250);
 assert.deepEqual(f.selector.threshold,{
  minimumProbedMethods:3,minimumIndependentRepositories:2,
  minimumCompletedTriplesPerRepository:1,minimumSuccessfulInvocationsPerRepository:6
 });
 for(const p of ['candidateSourceOnlyGitMetadata','immutableCandidatePoolBeforeCompilation',
  'allCandidateOutputsSealedBeforeSelection','selectorSeesOnlyAuthenticatedCounters',
  'allInspectedOriginalsExposedEvenIfRejected','noRetuneOrSubstitutionAfterResults',
  'oracleInputsOrExpectedTruthForbidden','exactFrozenHunterRequired',
  'realNetworklessBubblewrapAppArmorCgroupRequired'])
  assert.equal(f.selector[p],true,p);
 for(const key of ['newSourceMetadataQueried','newSourceBodiesRead',
  'frozenHunterExecuted','newPredictionsSealed','oracleExecuted',
  'block26Closed','block27Allowed'])assert.equal(f.current[key],false,key);
 assert.equal(f.current.confirmedNewDefects,null);
});
test('v10 176/690 excludes entire v9 abandoned metadata pool and every earlier original',()=>{
 const f=validateFreeze(),original=json('docs/quality/PHASE2-BLOCK26-V9-POSTSCOUT-EXCLUSIONS.json'),
  next=json('docs/quality/PHASE2-BLOCK26-V10-EXCLUSIONS.json'),
  v8pool=json('docs/quality/PHASE2-BLOCK26-V9-POOL.json');
 assert.equal(next.repositories.length,176);
 assert.equal(next.blobShas.length,690);
 assert.equal(new Set(next.repositories.map(x=>x.toLowerCase())).size,176);
 assert.equal(new Set(next.blobShas).size,690);
 assert.deepEqual(next,original);
 assert.equal(f.exclusions.blobSha,blob(read(f.exclusions.path)));
 const repos=new Set(next.repositories.map(x=>x.toLowerCase())),
  blobs=new Set(next.blobShas);
 for(const c of v8pool.candidates){
  assert.ok(repos.has(c.source.repository.toLowerCase()));
  for(const x of c.source.files)assert.ok(blobs.has(x.blobSha));
 }
});

test('v10 freezes mode-safe original Kotlin selection before querying new repositories',()=>{
 const f=validateFreeze();
 assert.equal(f.selector.query,'math language:Kotlin fork:false archived:false stars:2..20');
 assert.equal(f.historical.v9Result,'INCOMPLETE_PROVENANCE_REFUSAL');
 assert.equal(f.historical.originalBlobsReserved,75);
 assert.equal(f.historical.v9AllOriginalsExcludedFromV10,true);
});
