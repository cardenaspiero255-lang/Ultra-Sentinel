'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p));
const json=p=>JSON.parse(read(p));
const gitBlobSha=p=>{
 const bytes=read(p);
 return crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+bytes.length),Buffer.from([0])])).update(bytes).digest('hex');
};

test('v6 successor freeze authenticates unchanged executable modules and excludes every previously revealed original',()=>{
 const f=json('docs/quality/PHASE2-BLOCK26-V6-FREEZE.json');
 const ex=json(f.exclusions.path),v5=json('docs/quality/PHASE2-BLOCK26-V5-COHORT.json');
 assert.equal(f.schema,'ultra-sentinel-block26-v6-prospective-freeze/v1');
 assert.equal(f.engine.repository,'cardenaspiero255-lang/Ultra-Sentinel');
 assert.equal(f.engine.commitSha,'0aba994cd371651d605985b659c4b32e5c3f2b15');
 assert.equal(f.engine.treeSha,'3798689c8c3994dafd1977fb0972d0e607859841');
 assert.deepEqual(f.engine.modules.map(m=>m.path),v5.engine.modules.map(m=>m.path));
 for(const module of f.engine.modules){
  assert.match(module.blobSha,/^[0-9a-f]{40}$/);
  assert.equal(gitBlobSha(module.path),module.blobSha,'frozen executable source changed: '+module.path);
 }
 assert.equal(f.engine.modules[0].blobSha,'6304ae42c3494a20fc721202304e2c20a492f186');
 assert.equal(gitBlobSha(f.exclusions.path),f.exclusions.blobSha);
 assert.equal(ex.repositories.length,f.exclusions.repositoryCount);
 assert.equal(ex.blobShas.length,f.exclusions.blobCount);
 assert.equal(ex.repositories.length,141);assert.equal(ex.blobShas.length,486);
 assert.equal(new Set(ex.repositories.map(x=>x.toLowerCase())).size,ex.repositories.length);
 assert.equal(new Set(ex.blobShas).size,ex.blobShas.length);
 const repos=new Set(ex.repositories.map(x=>x.toLowerCase())),blobs=new Set(ex.blobShas);
 for(const c of v5.cohorts){
  assert.ok(repos.has(c.source.repository.toLowerCase()),'v5 exposed repository not excluded');
  for(const original of c.source.files)
   assert.ok(blobs.has(original.blobSha),'v5 exposed source blob not excluded');
 }
 assert.equal(f.historicalV5.confirmedDistinctDefects,0);
 assert.equal(f.selection.sourceContentsUsedForSelection,false);
 assert.equal(f.selection.numberOfCohorts,6);
 assert.equal(f.evaluation.noveltyRule.includes('second distinct original Kotlin defect'),true);
 for(const key of ['sourceMetadataSearched','sourceBodiesRead','predictionsExecuted','oracleExecuted',
  'engineRetuned','block26Closed','block27Allowed'])assert.equal(f[key],false,key);
});
