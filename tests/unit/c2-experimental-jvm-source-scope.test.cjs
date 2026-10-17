'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {analyze,generalKotlinProduction}=
 require('../../packages/core/ultra_sentinel_core.cjs');
const OPT_IN={sourceScope:'KOTLIN_JVM_V3_EXPERIMENTAL'};
function changed(path,body='val verified = true',fullSource=body){
 return {filename:path,status:'modified',
  additions:1,deletions:1,changes:2,
  patch:'@@ -1 +1 @@\n-val verified = false\n+'+body+'\n',
  fullSource};
}
test('third-party Kotlin JVM production accepts ordinary module source paths only when explicitly opted in',()=>{
 for(const p of [
  'src/main/kotlin/org/example/Provider.kt',
  'ktlint-rule-engine/src/main/kotlin/com/pinterest/Parser.kt',
  'detekt-core/src/main/java/io/detekt/SafeKotlin.kt',
  'modules/util/core/src/main/kotlin/org/project/Service.kt'
 ])assert.equal(generalKotlinProduction(p),true,p);
 for(const p of [
  'src/test/kotlin/org/Provider.kt',
  'module/src/test/kotlin/org/Provider.kt',
  'module/src/androidTest/kotlin/org/Provider.kt',
  'module/src/main/kotlin/org/ProviderTest.kt',
  'module/src/main/kotlin/org/ProviderSpec.kt',
  'module/src/main/kotlin/../../../secrets.kt',
  'module/src/main/kotlin/org//Provider.kt',
  '../src/main/kotlin/org/Provider.kt',
  'module/build.gradle.kts',
  'module/src/main/java/org/Provider.java',
  '/tmp/module/src/main/kotlin/org/Provider.kt',
  'module/src/main/kotlin/abc/Test.txt'
 ])assert.equal(generalKotlinProduction(p),false,p);
});
test('old Core ignores external paths exactly as before, even if source and patch are valid',()=>{
 const f=changed('ktlint-rule-engine/src/main/kotlin/io/Parser.kt');
 const baseline=analyze([f],{sha:'a'.repeat(40)});
 const withIgnoredScope=analyze([f],{sha:'a'.repeat(40),sourceScope:'KOTLIN_V3'});
 assert.deepEqual(withIgnoredScope,baseline);
 assert.equal(baseline.coverage.analyzed,0);
 assert.equal(baseline.mode,'independent-rule-and-structure-reasoner');
});
test('explicit JVM V3 mode scans attested Kotlin source, while returning no fictitious findings',()=>{
 const f=changed('ktlint-rule-engine/src/main/kotlin/io/Parser.kt');
 const result=analyze([f],{...OPT_IN,sha:'a'.repeat(40)});
 assert.equal(result.mode,'experimental-kotlin-jvm-v3-source-scope');
 assert.equal(result.coverage.analyzed,1);
 assert.equal(result.coverage.partial,false);
 assert.equal(result.verdict,'NO_CRITICAL_PATTERN');
 assert.deepEqual(result.findings,[]);
 assert.ok(result.note.includes('no es un modelo fundacional'));
});
test('JVM opt-in refuses to claim clean coverage with mismatched original source',()=>{
 const f=changed('ktlint-rule-engine/src/main/kotlin/io/Parser.kt',
   'val verified = true','val verified = false');
 const result=analyze([f],OPT_IN);
 assert.equal(result.coverage.analyzed,1);
 assert.equal(result.coverage.partial,true);
 assert.equal(result.verdict,'INCOMPLETE');
 assert.deepEqual(result.findings,[]);
});
test('JVM opt-in never scans test or gradle paths as Kotlin production',()=>{
 const list=[
  changed('src/test/kotlin/io/Factory.kt'),
  changed('module/src/main/kotlin/io/FactoryTest.kt'),
  changed('module/build.gradle.kts'),
  changed('module/src/main/kotlin/../test/Factory.kt')
 ];
 const r=analyze(list,OPT_IN);
 assert.equal(r.coverage.analyzed,0);
 assert.equal(r.findings.length,0);
});
test('default GameHub results are unchanged when introducing external scope',()=>{
 const f=changed('app/src/main/java/com/example/AndroidAction.kt','val verified = true');
 const a=analyze([f],{sha:'a'.repeat(40)});
 assert.equal(a.coverage.analyzed,1);
 assert.equal(a.mode,'independent-rule-and-structure-reasoner');
 assert.equal(a.coverage.partial,false);
});
