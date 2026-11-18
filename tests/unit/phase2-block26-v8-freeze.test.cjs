'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p)),
 json=p=>JSON.parse(read(p)),blob=p=>{
  const content=read(p);
  return crypto.createHash('sha1').update(Buffer.from('blob '+content.length+'\0')).update(content).digest('hex');
 };
test('v8 freezes Hunter v7 unchanged and precommits independent ABI thresholds before new Kotlin selection',()=>{
 const freeze=json('docs/quality/PHASE2-BLOCK26-V8-FREEZE.json');
 assert.equal(freeze.schema,'ultra-sentinel-block26-v8-prospective-structural-freeze/v1');
 assert.equal(freeze.engine.sourceCommitSha,'689583c23277807345edb715d8c2d277a3d4bda7');
 assert.equal(freeze.engine.moduleBlobSha,'430b4e928527b20fe305d63f3efb85909f1dfa06');
 assert.equal(blob(freeze.engine.modulePath),freeze.engine.moduleBlobSha);
 assert.equal(freeze.engine.mutable,false);
 assert.equal(blob(freeze.gate.path),freeze.gate.blobSha);
 assert.equal(blob(freeze.exclusions.path),freeze.exclusions.blobSha);
 const v7=json('docs/quality/PHASE2-BLOCK26-V7-EXCLUSIONS.json');
 const v7reservation=json('docs/quality/PHASE2-BLOCK26-V7-RESERVATION.json');
 const v8=json(freeze.exclusions.path);
 assert.equal(freeze.exclusions.repositories,153);assert.equal(freeze.exclusions.blobs,555);
 assert.equal(v8.repositories.length,153);assert.equal(v8.blobShas.length,555);
 const repos=new Set(v8.repositories.map(x=>x.toLowerCase())),blobs=new Set(v8.blobShas);
 for(const name of v7.repositories)assert.ok(repos.has(name.toLowerCase()));
 for(const sha of v7.blobShas)assert.ok(blobs.has(sha));
 for(const c of v7reservation.cohorts){
  assert.ok(repos.has(c.source.repository.toLowerCase()));
  for(const f of c.source.files)assert.ok(blobs.has(f.blobSha));
 }
 assert.equal(freeze.selector.maxEligibleSourceCandidates,18);
 assert.deepEqual(freeze.selector.threshold,{minimumNumericMethods:3,minimumCandidateCohorts:2});
 assert.equal(freeze.selector.noResamplingAfterABIOutcome,true);
 assert.equal(freeze.selector.noOriginalMethodInvocations,true);
 assert.equal(freeze.historical.v7AbiCandidateCohorts,1);
 for(const key of ['sourceMetadataSearched','sourceBodiesRead','abiScoutExecuted','finalCohortCommitted',
  'hunterExecuted','oracleExecuted','block26Closed','block27Allowed'])
  assert.equal(freeze.current[key],false,key);
 assert.equal(freeze.current.confirmedNewDefects,null);
});
