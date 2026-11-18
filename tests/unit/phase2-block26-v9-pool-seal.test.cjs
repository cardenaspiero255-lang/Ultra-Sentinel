'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {validatePool}=require('../../scripts/phase2-kotlin-api-v9-scout.cjs');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p)),
 json=p=>JSON.parse(read(p)),hash=b=>crypto.createHash('sha256').update(b).digest('hex'),
 blob=b=>crypto.createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
test('v9 immutable metadata source pool was committed before executing original source',()=>{
 const {f,pool,seal}=validatePool();
 const raw=read('docs/quality/PHASE2-BLOCK26-V9-POOL.json');
 assert.equal(pool.schema,'ultra-sentinel-v9-original-metadata-only-pool/v1');
 assert.equal(seal.schema,'ultra-sentinel-v9-prospective-metadata-seal/v1');
 assert.equal(seal.metadataBeforeScoutRunId,44312166294);
 assert.equal(seal.poolSha256,'fc9660c797de570a3596fb7c80d0cca96f72523bb7317fde5c62b194035faa07');
 assert.equal(hash(raw),seal.poolSha256);
 assert.equal(blob(raw),seal.poolBlobSha);
 assert.equal(pool.candidates.length,12);
 assert.equal(pool.candidates.reduce((n,c)=>n+c.source.files.length,0),75);
 assert.equal(pool.audit.at(-1).rank,221);
 assert.deepEqual(pool.exclusions,f.exclusions);
 assert.equal(pool.sourceContentsRead,false);
 assert.equal(pool.hunterExecuted,false);
 assert.equal(pool.oracleExecuted,false);
 assert.equal(pool.fullPredictionReportsRead,false);
 assert.equal(seal.noRerankAfterCommit,true);
});
test('v9 original identities never overlap the 164 exposed repos or 615 Kotlin blobs',()=>{
 const {f,pool}=validatePool();
 const old=json(f.exclusions.path),
  repos=new Set(old.repositories.map(x=>x.toLowerCase())),
  blobs=new Set(old.blobShas),newRepos=new Set(),newBlobs=new Set();
 assert.equal(old.repositories.length,164);
 assert.equal(old.blobShas.length,615);
 for(const candidate of pool.candidates){
  const r=candidate.source;
  assert.ok(!repos.has(r.repository.toLowerCase()),r.repository);
  assert.ok(!newRepos.has(r.repository.toLowerCase()));
  newRepos.add(r.repository.toLowerCase());
  assert.equal(pool.audit[candidate.rank-1].reason,'METADATA_CANDIDATE');
  assert.equal(pool.audit[candidate.rank-1].repository,r.repository);
  for(const file of r.files){
   assert.ok(!blobs.has(file.blobSha));
   assert.ok(!newBlobs.has(file.blobSha));
   newBlobs.add(file.blobSha);
   assert.equal(Object.hasOwn(file,'content'),false);
  }
 }
 assert.equal(newBlobs.size,75);
});
