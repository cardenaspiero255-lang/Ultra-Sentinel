'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {isSafeNovelKotlinPath}=
 require('../../packages/investigation/novel-kotlin-path-policy.cjs');
test('shared authority accepts main Kotlin roots used by intake, sandbox and structural Judge',()=>{
 for(const path of [
  'app/src/main/java/com/example/Main.kt',
  'app/src/main/kotlin/com/example/ui/Screen.kt',
  'feature/src/main/kotlin/Check.kt',
  'feature/src/main/java/com/example/safe/Check.kt',
  'apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/VoiceGate.kt',
  'apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/nested/VoiceGate.kt',
  'packages/kotlin-semantic/C2OptionalKotlinSemantic.kt'
 ])assert.equal(isSafeNovelKotlinPath(path),true,path);
});
test('shared authority rejects tests, traversal, non-Kotlin, unrelated roots and injected separators',()=>{
 for(const path of [
  'feature/src/test/kotlin/Check.kt',
  'feature/src/main/kotlin/../Escape.kt',
  'feature/src/main/kotlin/segment..name/Check.kt',
  'feature/src/main/kotlin//Bad.kt',
  'feature/src/main/kotlin/Bad.txt',
  'feature/src/main/kotlin/Bad.kt/',
  'feature/src/main/kotlin/Bad\\Name.kt',
  '/feature/src/main/kotlin/Check.kt',
  'src/main/kotlin/Other.kt',
  '.github/workflows/evil.kt',
  'packages/kotlin-semantic/Other.kt',
  'packages/kotlin-semantic/sub/C2OptionalKotlinSemantic.kt',
  'packages/kotlin-semantic/C2OptionalKotlinSemantic2.kt',
  'packages/recovery/Unsafe.kt',
  'feature/src/main/kotlin/'+'x'.repeat(301)+'.kt',
  null,12,{}
 ])assert.equal(isSafeNovelKotlinPath(path),false,String(path));
});

test('recognizes Kotlin multiplatform production source sets with bounded nested modules',()=>{
 for(const path of [
  'kotlinpoet/src/commonMain/kotlin/com/squareup/NameAllocator.kt',
  'kotlinpoet/src/jvmMain/kotlin/com/squareup/CodePoint.jvm.kt',
  'features/search/src/androidMain/kotlin/org/example/Feature.kt',
  'interop/kotlin-metadata/src/commonMain/kotlin/org/example/Metadata.kt',
  'a/b/c/d/src/jvmMain/kotlin/FourLevels.kt'
 ])assert.equal(isSafeNovelKotlinPath(path),true,path);
 for(const path of [
  'module/src/commonTest/kotlin/Leak.kt',
  'module/src/jvmTest/kotlin/Leak.kt',
  'module/src/test/kotlin/Leak.kt',
  'module/src/commonMain/java/Leak.kt',
  'module/src/iosTest/kotlin/Leak.kt',
  'module/src/commonMain/kotlin/../../Leak.kt',
  'module/src/commonMain/kotlin//Leak.kt',
  'module/src/commonMain/kotlin/Env\\Secrets.kt',
  'module/src/commonMain/kotlin/Name..kt',
  'module/src/commonMain/kotlin/Bad.java',
  'a/b/c/d/e/src/commonMain/kotlin/TooDeep.kt'
 ])assert.equal(isSafeNovelKotlinPath(path),false,path);
});
