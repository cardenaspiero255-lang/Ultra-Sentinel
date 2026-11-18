'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p)),
 json=p=>JSON.parse(read(p)),hash=b=>crypto.createHash('sha256').update(b).digest('hex'),
 blob=b=>crypto.createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
test('v8 metadata-only pool is immutable and excludes all 153 previous repositories and 555 blobs',()=>{
 const f=json('docs/quality/PHASE2-BLOCK26-V8-FREEZE.json'),
  seal=json('docs/quality/PHASE2-BLOCK26-V8-POOL-SEAL.json'),
  bytes=read(seal.poolPath),pool=JSON.parse(bytes),ex=json(f.exclusions.path);
 assert.equal(seal.schema,'ultra-sentinel-v8-abi-candidate-pool-seal/v1');
 assert.equal(seal.metadataOnlyRunId,44247260145);
 assert.equal(seal.poolSha256,'8ca0152333c074151ee939ccf4332fc991df59ee818da3f83db8af4f5c684f48');
 assert.equal(hash(bytes),seal.poolSha256);assert.equal(blob(bytes),seal.poolBlobSha);
 assert.equal(pool.schema,'ultra-sentinel-v8-prospective-metadata-candidates/v1');
 assert.equal(pool.query,f.selector.query);assert.deepEqual(pool.engine,f.engine);
 assert.deepEqual(pool.exclusions,f.exclusions);
 assert.equal(pool.candidates.length,11);
 assert.equal(pool.candidates.reduce((n,c)=>n+c.source.files.length,0),60);
 assert.equal(pool.candidates.at(-1).rank,154);
 const repos=new Set(ex.repositories.map(x=>x.toLowerCase())),blobs=new Set(ex.blobShas),
  currentRepos=new Set(),currentBlobs=new Set();
 for(const c of pool.candidates){
  assert.equal(pool.audit[c.rank-1].reason,'METADATA_CANDIDATE');
  assert.equal(pool.audit[c.rank-1].repository,c.source.repository);
  assert.ok(!repos.has(c.source.repository.toLowerCase()));
  assert.ok(!currentRepos.has(c.source.repository.toLowerCase()));
  currentRepos.add(c.source.repository.toLowerCase());
  for(const file of c.source.files){
   assert.ok(!blobs.has(file.blobSha));
   assert.ok(!currentBlobs.has(file.blobSha));
   currentBlobs.add(file.blobSha);
   assert.ok(!Object.hasOwn(file,'content'));
  }
 }
 for(const key of ['sourceBodiesRead','targetInvoked','oracleExecuted','hunterExecuted',
  'frozenCohortCommitted','block26Closed','block27Allowed'])assert.equal(pool[key],false);
 assert.equal(seal.createdBeforeAbiScout,true);
});
