'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),quality=path.join(root,'docs/quality');
const json=name=>JSON.parse(fs.readFileSync(path.join(quality,name)));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');

test('first prospective String cohort preserves frozen engine, original Git identities and oracle hash commitments',()=>{
 const freeze=json('PHASE2-BLOCK26-STRING-PROSPECTIVE-FREEZE.json');
 const reserved=json('PHASE2-BLOCK26-STRING-PROSPECTIVE-RESERVATION.json');
 const manifest=json('PHASE2-BLOCK26-STRING-PROSPECTIVE-COHORT.json');
 const receipt=json('PHASE2-BLOCK26-STRING-FIRST-RUN-RECEIPT.json');
 assert.equal(freeze.engine.commitSha,reserved.engine.commitSha);
 assert.equal(reserved.engine.commitSha,manifest.engine.commitSha);
 assert.equal(receipt.protocol.engineSha,manifest.engine.commitSha);
 assert.deepEqual(reserved.cohorts,manifest.cohorts);
 assert.deepEqual(manifest.cohorts.map(c=>c.source.repository),[
  'alidehkhodaei/data-structures-and-algorithms','esoxjem/Algorithms']);
 assert.deepEqual(manifest.cohorts.map(c=>c.source.files.length),[5,20]);
 assert.ok(manifest.cohorts.every(c=>c.source.files.every(f=>
  /^[a-f0-9]{40}$/.test(f.blobSha)&&f.path.endsWith('.kt')&&f.sizeBytes>=50&&f.sizeBytes<=12000)));
 assert.deepEqual(manifest.oracles.map(x=>x.cohortId),[1,2]);
 for(const o of manifest.oracles)assert.equal(
  sha(fs.readFileSync(path.join(root,o.path))),o.sha256);
 assert.equal(manifest.oraclesCommittedBeforeHunter,true);
 assert.equal(manifest.predictionsExecuted,false,'precommit immutable manifest is not rewritten after run');
 assert.equal(receipt.protocol.oraclesCommittedBeforeHunter,true);
 assert.ok(Date.parse(receipt.githubActions.predictionsArtifactCreatedAt)<
   Date.parse(receipt.githubActions.independentArtifactCreatedAt),'first prediction artifact predates independent oracle');
 assert.equal(receipt.sha256.manifest.length,64);
 assert.equal(receipt.outcome.methodsProbed,0);
 assert.equal(receipt.outcome.confirmedDistinctDefects,0);
 assert.equal(receipt.outcome.block26Closed,false);
 assert.equal(receipt.outcome.block27Allowed,false);
 assert.equal(receipt.outcome.globalPrecision,null);
 assert.equal(receipt.outcome.globalRecall,null);
 assert.equal(receipt.independentExcludedControl.autonomousDiscovery,false);
 assert.equal(receipt.independentExcludedControl.admittedByFrozenHunter,false);
});
