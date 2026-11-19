'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p));
const json=p=>JSON.parse(read(p));
test('v7 prospective reservation seals six previously unexposed metadata-only Kotlin cohorts',()=>{
 const file='docs/quality/PHASE2-BLOCK26-V7-RESERVATION.json';
 const r=json(file),freeze=json('docs/quality/PHASE2-BLOCK26-V7-FREEZE.json');
 const ex=json(freeze.exclusions.path),knownRepos=new Set(ex.repositories.map(s=>s.toLowerCase())),
  knownBlobs=new Set(ex.blobShas);
 assert.equal(crypto.createHash('sha256').update(read(file)).digest('hex'),
  '11e53fe012cff24a594db6c47412495e5de43b587b598a93c6c7c6c86b56411c');
 assert.equal(r.schema,'ultra-sentinel-block26-v7-metadata-reservation/v1');
 assert.deepEqual(r.engine,freeze.engine);
 assert.deepEqual(r.previousExclusions,freeze.exclusions);
 assert.equal(r.poolCount,300);assert.equal(r.audit.length,111);
 assert.equal(r.rankedRepositories.length,300);assert.equal(r.cohorts.length,6);
 assert.deepEqual(r.cohorts.map(c=>[c.rank,c.source.repository,c.source.files.length]),[
  [42,'niiad/hashkt',2],[67,'guttedgarden/Kuznechik',2],
  [73,'v-pan/rltest',10],[77,'amindadgar/knapSack-Problem',9],
  [98,'umangjpatel/KotlinDSA',8],[111,'Judas/Glickotlin',1]]);
 assert.equal(r.cohorts.reduce((n,c)=>n+c.source.files.length,0),32);
 const used=new Set();
 for(const c of r.cohorts){
  assert.equal(c.id,r.cohorts.indexOf(c)+1);
  assert.equal(r.audit[c.rank-1].reason,'SELECTED');
  assert.equal(r.audit[c.rank-1].repository,c.source.repository);
  assert.ok(!knownRepos.has(c.source.repository.toLowerCase()));
  assert.match(c.source.commitSha,/^[0-9a-f]{40}$/);
  assert.match(c.source.treeSha,/^[0-9a-f]{40}$/);
  assert.ok(c.source.files.length>0&&c.source.files.length<=12);
  assert.ok(c.source.totalBytes<=196608);
  assert.equal(c.source.totalBytes,c.source.files.reduce((n,x)=>n+x.sizeBytes,0));
  for(const f of c.source.files){
   assert.match(f.path,/^src\/main\/(?:[^/]+\/)*[^/]+\.kt$/);
   assert.match(f.blobSha,/^[0-9a-f]{40}$/);
   assert.ok(!knownBlobs.has(f.blobSha));
   assert.ok(!used.has(f.blobSha));
   used.add(f.blobSha);
   assert.ok(!Object.prototype.hasOwnProperty.call(f,'content'));
  }
 }
 for(const key of ['sourceContentsRead','predictionsExecuted','oracleExecuted','originalSourcesNowExposed',
  'block26Closed','block27Allowed'])assert.equal(r[key],false);
});
