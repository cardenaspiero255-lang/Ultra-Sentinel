'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {readManifest,verifyPinnedMetadata,validateSelectedKotlinEntries}=require('../../scripts/phase2-block26b-v5-preregister.cjs');
const {isSafeHunterKotlinPath,isSafeNovelKotlinPath}=require('../../packages/investigation/novel-kotlin-path-policy.cjs');
const entries=m=>m.cohort.files.map(f=>({
 path:f.path,mode:'100644',type:'blob',sha:f.blobSha,size:f.sizeBytes
}));

test('a fresh 13-original cohort was selected by metadata after freezing Hunter root support',()=>{
 const m=readManifest();
 assert.equal(m.engine.commitSha,'22a4dfee8e87b62b14501a81a94ca902d8fbca7b');
 assert.equal(m.engine.treeSha,'df5831983bbd610cf3bd7841aadac054e465e8fa');
 assert.equal(m.cohort.repository,'nazmulidris/algorithms-in-kotlin');
 assert.equal(m.cohort.files.length,13);
 assert.equal(m.protocol.sourceBodiesReadBeforeReservation,false);
 assert.equal(m.protocol.hunterExecutedBeforeReservation,false);
 assert.equal(m.protocol.oracleExecutedBeforeReservation,false);
 assert.equal(m.protocol.oracleMustBePrecommittedBeforePredictions,true);
 assert.equal(m.limitations.block26Closed,false);
 assert.equal(m.limitations.block27Allowed,false);
 assert.equal(verifyPinnedMetadata(m),true);
 for(const file of m.cohort.files){
  assert.equal(isSafeHunterKotlinPath(file.path),true,file.path);
  assert.equal(isSafeNovelKotlinPath(file.path),false,file.path);
 }
});

test('full Git tree selection is exact, ordered and cannot omit unlisted Kotlin or altered blobs',()=>{
 const m=readManifest(),all=entries(m);
 assert.equal(validateSelectedKotlinEntries(all,m),13);
 const extras=[
  all.slice(1),
  [...all,all[0]],
  all.map((x,i)=>i===0?{...x,sha:'f'.repeat(40)}:x),
  all.map((x,i)=>i===0?{...x,mode:'120000'}:x),
  all.map((x,i)=>i===0?{...x,size:x.size+1}:x),
  all.map((x,i)=>i===0?{...x,path:'src/main/kotlin/../../escape.kt'}:x),
  all.map((x,i)=>i===0?{...x,path:'src/main/kotlin/generated/Unsafe.kt'}:x),
  [...all,{...all[0],path:'src/main/kotlin/Unlisted.kt'}],
  [...all].reverse()
 ];
 for(const candidate of extras)assert.throws(()=>validateSelectedKotlinEntries(candidate,m));
 assert.equal(validateSelectedKotlinEntries([...all,{path:'README.md',mode:'100644',type:'blob',sha:'a'.repeat(40),size:100}],m),13);
});

test('metadata changes cannot forge a frozen engine, source SHA, scoring or blind protocol',()=>{
 const m=readManifest();
 for(const change of [
  x=>x.engine.commitSha='f'.repeat(40),
  x=>x.cohort.commitSha='f'.repeat(40),
  x=>x.cohort.files[0].blobSha='f'.repeat(40),
  x=>x.protocol.sourceBodiesReadBeforeReservation=true,
  x=>x.protocol.hunterExecutedBeforeReservation=true,
  x=>x.limitations.block26Closed=true,
  x=>x.engine.retuningAllowed=true,
  x=>x.extra='unrecognized'
 ]){const c=structuredClone(m);change(c);assert.throws(()=>verifyPinnedMetadata(c));}
});
