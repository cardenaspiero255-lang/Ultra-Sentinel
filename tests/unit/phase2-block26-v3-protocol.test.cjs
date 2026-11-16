'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
test('new v3 source reservation predates oracle and commits every source identity',()=>{
 const reservation=read('docs/quality/PHASE2-BLOCK26-V3-RESERVATION.json');
 const manifest=read('docs/quality/PHASE2-BLOCK26-V3-COHORT.json');
 assert.equal(reservation.schema,'ultra-sentinel-block26-v3-metadata-freeze/v1');
 assert.equal(reservation.sourceRead,false);
 assert.equal(reservation.predictionsExecuted,false);
 assert.equal(reservation.oracleExecuted,false);
 assert.equal(reservation.engineRetuned,false);
 assert.equal(manifest.engine.commitSha,reservation.engine.commitSha);
 assert.equal(manifest.engine.treeSha,reservation.engine.treeSha);
 assert.equal(manifest.engine.commitSha,'31222b3bedb1d48253e9cd4e676250b5841a384f');
 assert.equal(manifest.freezeSha,'2cfdb7e5c071e089e69ffa22288dc8d244851f50');
 assert.equal(manifest.cohorts.length,1);
 const original=manifest.cohorts[0].source;
 assert.equal(original.repository,'esoxjem/Algorithms');
 assert.equal(original.commitSha,reservation.selection.sourceCommitSha);
 assert.equal(original.treeSha,reservation.selection.sourceTreeSha);
 assert.equal(original.files.length,20);
 const compact=a=>a.map(f=>JSON.stringify([f.path,f.blobSha,f.sizeBytes])).sort();
 assert.deepEqual(compact(original.files),compact(reservation.selection.files));
 assert.equal(new Set(original.files.map(f=>f.blobSha)).size,20);
 for(const f of original.files){
  assert.ok(f.path.startsWith('src/main/kotlin/')); assert.ok(f.path.endsWith('.kt'));
  assert.match(f.blobSha,/^[a-f0-9]{40}$/);
 }
 assert.equal(manifest.predictionsExecuted,false);
 assert.equal(manifest.oraclesCommittedBeforeHunter,true);
 assert.equal(manifest.oracleExcludedFromHunterMounts,true);
 assert.equal(manifest.block27Allowed,false);
});
test('v3 oracle bytes are SHA256 bound independently of stored metadata',()=>{
 const manifest=read('docs/quality/PHASE2-BLOCK26-V3-COHORT.json');
 const oracle=manifest.oracles[0];
 assert.equal(manifest.oracles.length,1);
 assert.equal(oracle.cohortId,1);
 assert.equal(oracle.path,'tests/fixtures/phase2-block26-v3/oracle-1.kt');
 const source=fs.readFileSync(path.join(root,oracle.path));
 const digest=crypto.createHash('sha256').update(source).digest('hex');
 assert.equal(digest,oracle.sha256);
 assert.ok(source.toString('utf8').startsWith('// Source-only precommitted independent oracle'));
 assert.match(source.toString('utf8'),/package oracle/);
});
