'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {readManifest,validateTreeEntries,verifyProtocol}=require('../../scripts/phase2-block25b-source-attest.cjs');
const scope='core/common/src/internal';
const manifest=require('../../docs/quality/PHASE2-BLOCK25B-DATETIME-METADATA-20261112.json');
const source=manifest.cohort.files.map(f=>({
 name:f.path.slice(scope.length+1),mode:'100644',type:'blob',sha:f.blobSha
}));
test('metadata-only cohort is sealed to frozen new v3 and a different original source repository',()=>{
 const m=readManifest();
 assert.equal(m.engine.commitSha,'49235f854c61c29d55a0307ce4a0348553b2ee1f');
 assert.equal(m.engine.treeSha,'411a9f24a07a57d21e918c022d1ec8442456537a');
 assert.equal(m.cohort.repository,'Kotlin/kotlinx-datetime');
 assert.equal(m.cohort.files.length,6);
 assert.equal(m.protocol.sourceBodyReadBeforeMetadataCommit,false);
 assert.equal(m.protocol.engineExecutedBeforeMetadataCommit,false);
 assert.equal(m.protocol.priorEightCoroutinesReused,false);
 assert.equal(m.protocol.priorSixIoReused,false);
 assert.equal(m.protocol.fullTruthEstablished,false);
 assert.equal(m.protocol.precision,null);
 assert.equal(verifyProtocol(m),true);
});
test('exact Git source filenames, byte sizes and full direct .kt tree are required',()=>{
 assert.equal(validateTreeEntries(source,manifest.cohort),6);
 for(const changed of [
  source.slice(1),source.concat(source[0]),
  source.map((x,i)=>i===0?{...x,sha:'a'.repeat(40)}:x),
  source.map((x,i)=>i===0?{...x,mode:'120000'}:x),
  source.map((x,i)=>i===0?{...x,name:'../BinaryDataReader.kt'}:x),
  source.map((x,i)=>i===0?{...x,name:'Other.kt'}:x),
  source.map((x,i)=>i===0?{...x,type:'tree'}:x)
 ])assert.throws(()=>validateTreeEntries(changed,manifest.cohort));
});
test('authentic original cohort cannot secretly contain old evaluation objects',()=>{
 for(const f of manifest.cohort.files){
  assert.ok(f.path.startsWith(scope+'/'));
  assert.match(f.blobSha,/^[0-9a-f]{40}$/);
  assert.ok(f.sizeBytes>=50&&f.sizeBytes<=12000);
 }
 const clone=structuredClone(manifest);clone.protocol.priorEightCoroutinesReused=true;
 assert.throws(()=>verifyProtocol(clone));
 const altered=structuredClone(manifest);altered.cohort.repository='Kotlin/kotlinx-io';
 assert.throws(()=>verifyProtocol(altered));
});
test('metadata CI never calls Hunter, oracle or Fixer before freezing this cohort',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const workflow=fs.readFileSync(path.join(__dirname,'../../.github/workflows/phase2-block25b-datetime-metadata.yml'),'utf8');
 assert.match(workflow,/ref: 49235f854c61c29d55a0307ce4a0348553b2ee1f/);
 assert.match(workflow,/ref: 77c95cc8125015f83ea8fd900404c295fba7276e/);
 assert.match(workflow,/--unshare-all|ORIGINAL_SOURCE_METADATA_ONLY_ORACLE_NOT_EXECUTED/);
 assert.doesNotMatch(workflow,/node\s+(?:packages\/family-hunter|tests\/fixtures\/.*\/run-hunter)/);
});
