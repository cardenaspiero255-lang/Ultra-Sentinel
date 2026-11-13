'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {readManifest,assertMetadata,validateTreeEntries,selectDeterministicDirectory}=require('../../scripts/phase2-block25d-fourth-cohort-attest.cjs');
const manifest=require('../../docs/quality/PHASE2-BLOCK25D-KTOR-METADATA-20261112.json');
const files=manifest.cohort.files.map(f=>({
 name:f.path.slice(manifest.cohort.scope.length+1),mode:'100644',type:'blob',sha:f.blobSha,size:f.sizeBytes
}));
test('freeze v4 exact commit and tree before 7 unrelated Ktor original Kotlin blobs',()=>{
 const x=readManifest();
 assert.equal(x.engine.commitSha,'84c824ce6bfe3d260296108e955bbbc4624e6b7e');
 assert.equal(x.engine.treeSha,'db929ca1233215e47de164201ff69d9b4cb1808e');
 assert.equal(x.cohort.repository,'ktorio/ktor');
 assert.equal(x.cohort.files.length,7);
 assert.equal(x.protocol.sourceBodiesReadAtPreregistration,false);
 assert.equal(x.protocol.engineRunAtPreregistration,false);
 assert.equal(x.protocol.oracleAnswersKnownAtPreregistration,false);
 assert.equal(x.protocol.previousKotlinCoroutinesEightReused,false);
 assert.equal(x.protocol.previousKotlinIoSixReused,false);
 assert.equal(x.protocol.previousKotlinDatetimeSixReused,false);
 assert.equal(assertMetadata(x),true);
});
test('exact full direct tree and object sizes are compulsory',()=>{
 assert.equal(validateTreeEntries(files,manifest.cohort),7);
 for(const change of [
  files.slice(1),files.concat(files[0]),
  files.map((x,i)=>i===0?{...x,sha:'a'.repeat(40)}:x),
  files.map((x,i)=>i===0?{...x,mode:'120000'}:x),
  files.map((x,i)=>i===0?{...x,type:'tree'}:x),
  files.map((x,i)=>i===0?{...x,name:'Other.kt'}:x),
  files.map((x,i)=>i===0?{...x,size:x.size+1}:x),
  files.map((x,i)=>i===0?{...x,name:'../escape.kt'}:x)
 ])assert.throws(()=>validateTreeEntries(change,manifest.cohort));
});
test('metadata-only selection reproducibly chooses lexicographic first eligible production source folder',()=>{
 const pathA='ktor-client/ktor-client-apache5/jvm/src/io/ktor/client/engine/apache5';
 const pathB='ktor-client/ktor-client-zzz/jvm/src/io/ktor/client/engine/zzz';
 const entries=files.map(f=>({...f,path:pathA+'/'+f.name})).concat(files.map(f=>({...f,path:pathB+'/'+f.name})));
 assert.equal(selectDeterministicDirectory(entries),pathA);
 assert.equal(selectDeterministicDirectory(entries.slice(0,4)),null);
});
test('no later mutation, result peek or historical holdout reuse can pass preregistration',()=>{
 const attempts=[
  x=>x.protocol.engineRunAtPreregistration=true,
  x=>x.protocol.oracleAnswersKnownAtPreregistration=true,
  x=>x.protocol.previousKotlinDatetimeSixReused=true,
  x=>x.protocol.precision=1,
  x=>x.cohort.repository='Kotlin/kotlinx-io',
  x=>x.engine.treeSha='a'.repeat(40),
  x=>x.cohort.files.pop()
 ];
 for(const patch of attempts){const changed=structuredClone(manifest);patch(changed);assert.throws(()=>assertMetadata(changed));}
});
test('metadata authentication workflow never runs Hunter, oracle JVM or repair',()=>{
 const workflow=fs.readFileSync(path.join(__dirname,'../../.github/workflows/phase2-block25d-fourth-ktor-metadata.yml'),'utf8');
 assert.match(workflow,/ref: 84c824ce6bfe3d260296108e955bbbc4624e6b7e/);
 assert.match(workflow,/ref: 599e1340c718e501bf5fba080b0ade00b49a893f/);
 assert.match(workflow,/FOURTH_KTOR_GIT_COHORT_METADATA_AUTHENTICATED_ONLY/);
 assert.doesNotMatch(workflow,/phase2-blind-cancellation-v4-worker\.cjs/);
 assert.doesNotMatch(workflow,/java\s+-jar/);
});
