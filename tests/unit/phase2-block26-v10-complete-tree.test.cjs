'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {verifyFullOriginalTree}=require('../../scripts/phase2-kotlin-api-v10-metadata.cjs');
const blob=(path,mode='100644')=>({path,mode,type:'blob',sha:'a'.repeat(40),size:300});
test('v10 prospectively rejects any tracked Kotlin path ignored by the previous metadata-only filter',()=>{
 const body={truncated:false,tree:[
  blob('src/main/kotlin/math/Math.kt'),blob('src/main/kotlin/math/Hidden.kt','100755')]};
 assert.throws(()=>verifyFullOriginalTree(body),/V10_NONCANONICAL_ORIGINAL_KOTLIN_TREE/);
});
test('v10 rejects symbolic-linked or unsafe Kotlin originals before reserving sources',()=>{
 for(const entry of [
  {...blob('src/main/kotlin/Link.kt'),mode:'120000'},
  blob('src/main/kotlin/func name.kt'),
  blob('src/main/kotlin/../Untrusted.kt'),
  {...blob('src/main/kotlin/Unsafe.kt'),type:'commit',mode:'160000'}
 ]){
  assert.throws(()=>verifyFullOriginalTree({truncated:false,tree:[entry]}),
    /V10_NONCANONICAL_ORIGINAL_KOTLIN_TREE/);
 }
});
test('v10 accepts complete canonical Kotlin Git tree metadata without inspecting source contents',()=>{
 assert.deepEqual(verifyFullOriginalTree({truncated:false,tree:[
  blob('src/main/kotlin/Safe.kt'),blob('src/main/kotlin/math/Calc.kt'),
  {path:'README.md',type:'blob',mode:'100644',sha:'f'.repeat(40),size:100}
 ]}).tree.length,3);
});
