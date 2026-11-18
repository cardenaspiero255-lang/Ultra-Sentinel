'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p));
const json=p=>JSON.parse(read(p));
const gitBlobSha=p=>{
 const bytes=read(p);
 return crypto.createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
};
const sortRepos=(a,b)=>{
 const x=a.toLowerCase(),y=b.toLowerCase();
 return x<y?-1:x>y?1:a<b?-1:a>b?1:0;
};

test('v7 corrected engine stays sealed and every original v6 Kotlin source is excluded',()=>{
 const f=json('docs/quality/PHASE2-BLOCK26-V7-FREEZE.json');
 const ex=json(f.exclusions.path);
 const old=json('docs/quality/PHASE2-BLOCK26-V6-EXCLUSIONS.json');
 const v6=json('docs/quality/PHASE2-BLOCK26-V6-RESERVATION.json');
 assert.equal(f.schema,'ultra-sentinel-block26-v7-prospective-freeze/v1');
 assert.equal(f.engine.sourceCommitSha,'689583c23277807345edb715d8c2d277a3d4bda7');
 assert.equal(f.engine.modules[0].path,'packages/family-hunter/v7/GenericJvmMetamorphicProbe.java');
 assert.equal(f.engine.modules[0].blobSha,'430b4e928527b20fe305d63f3efb85909f1dfa06');
 for(const m of f.engine.modules)assert.equal(gitBlobSha(m.path),m.blobSha,'frozen v7 module mutated: '+m.path);
 assert.equal(gitBlobSha(f.exclusions.path),f.exclusions.blobSha);
 assert.equal(f.exclusions.repositories,147);assert.equal(f.exclusions.originalBlobs,523);
 assert.deepEqual(ex.repositories,[...new Set([
  ...old.repositories,...v6.cohorts.map(c=>c.source.repository)
 ])].sort(sortRepos));
 assert.deepEqual(ex.blobShas,[...new Set([
  ...old.blobShas,...v6.cohorts.flatMap(c=>c.source.files.map(file=>file.blobSha))
 ])].sort());
 assert.equal(f.historical.v6ConfirmedDistinctDefects,0);
 assert.equal(f.historical.v6ScopedFalsePositiveHypotheses,2);
 assert.equal(f.historical.legacyEngineAndEvidenceImmutable,true);
 assert.equal(f.historical.all37V6OriginalBlobsExcluded,true);
 const previous=json('docs/quality/PHASE2-BLOCK26-V6-FREEZE.json');
 for(const module of previous.engine.modules)
  assert.equal(gitBlobSha(module.path),module.blobSha,'v6 freeze must not be modified');
 for(const key of ['newSourceMetadataQueried','newCohortReserved','newSourceBodiesRead',
  'newOracleCommitted','newPredictionsExecuted','newOracleExecuted','block26Closed','block27Allowed'])
  assert.equal(f[key],false,key);
 assert.equal(f.confirmedDistinctNewDefects,null);
 assert.equal(f.selection.noSourceBodiesUntilReservationCommitted,true);
 assert.equal(f.selection.independentOraclesCommittedBeforeHunter,true);
 assert.equal(f.selection.blindPredictionsSealedBeforeOracleResults,true);
 assert.equal(f.coverage.v7JVMLineAtLeast,.90);
 assert.equal(f.coverage.v7JVMBranchAtLeast,.90);
});
