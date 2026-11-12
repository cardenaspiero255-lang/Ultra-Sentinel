'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {isSafeNovelKotlinPath,isSafeHunterKotlinPath}=require('../../packages/investigation/novel-kotlin-path-policy.cjs');

test('phase 2.4 v2 accepts legacy Kotlin production common/jvm/android source trees',()=>{
 for(const value of [
  'legacy-core/common/src/api/Stream.kt',
  'legacy-core/common/src/Flow.kt',
  'modules/bridge/jvm/src/internal/JvmBridge.kt',
  'legacy-platform/android/src/api/Adapter.kt',
  'legacy-core/common/src/org/example/util/StringCodec.kt',
  'kotlinx-coroutines-core/common/src/flow/FlowCollector.kt'
 ])assert.equal(isSafeHunterKotlinPath(value),true,value);
});

test('phase 2.4 rejects test, generated, build and non-production legacy paths',()=>{
 for(const value of [
  'legacy-core/common/test/FlowTest.kt',
  'legacy-core/common/src/test/Leak.kt',
  'legacy-core/common/src/tests/Leak.kt',
  'legacy-core/common/src/testData/Leak.kt',
  'legacy-core/common/src/generated/Unsafe.kt',
  'legacy-core/common/src/build/classes/Unsafe.kt',
  'legacy-core/common/src/fixtures/Fixture.kt',
  'legacy-core/common/src/.github/Unsafe.kt',
  'legacy-core/common/src/../Unsafe.kt',
  'legacy-core/common/src/pkg/../../Unsafe.kt',
  'legacy-core/common/src/pkg//Unsafe.kt',
  'legacy-core/common/src/pkg/Env\\Secrets.kt',
  'legacy-core/common/src/pkg/Unsafe.java',
  'legacy-core/common/src/pkg/Almost.kt.txt',
  '/legacy-core/common/src/Unsafe.kt',
  'legacy-core/common/src/pkg/Name..kt',
  'legacy-core/iosTest/src/Api.kt',
  'legacy-core/commonTest/src/Api.kt',
  'legacy-core/test/src/Api.kt',
  'legacy-core/common/src/'+('x'.repeat(301))+'.kt',
  'a/b/c/d/e/common/src/TooDeep.kt'
 ])assert.equal(isSafeHunterKotlinPath(value),false,value);
});

test('phase 2.4 preserves legacy policy exclusions and explicit approved roots',()=>{
 for(const value of [
  'feature/src/main/kotlin/com/example/Gate.kt',
  'feature/src/commonMain/kotlin/internal/Mode.kt',
  'feature/src/jvmMain/kotlin/internal/Mode.kt',
  'apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/VoiceGate.kt'
 ])assert.equal(isSafeHunterKotlinPath(value),true,value);
 for(const value of [
  '.github/workflows/evil.kt','module/src/test/kotlin/Leak.kt','module/common/generated/Unsafe.kt',
  'module/common/src/secret.json','packages/recovery/Unsafe.kt'
 ])assert.equal(isSafeHunterKotlinPath(value),false,value);
});

test('advisory Hunter routes do not expand repair/Judge path authority',()=>{
 for(const value of ['legacy-core/common/src/api/Stream.kt','legacy-core/common/src/Flow.kt','modules/bridge/jvm/src/internal/JvmBridge.kt']){
  assert.equal(isSafeNovelKotlinPath(value),false,value);
  assert.equal(isSafeHunterKotlinPath(value),true,value);
 }
});

test('all three source scanners and source-only inventory preparers use advisory policy, not repair authority',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const root=path.resolve(__dirname,'../..');
 for(const p of [
  'packages/family-hunter/phase2-numeric-risk-hunter.cjs',
  'packages/family-hunter/phase2-codec-integrity-hunter.cjs',
  'packages/family-hunter/phase2-identity-delimiter-hunter.cjs',
  'tests/fixtures/gamehub-blind-numeric/prepare-inventory.cjs',
  'tests/fixtures/gamehub-codec/prepare-blind-inventory.cjs'
 ]){
  const source=fs.readFileSync(path.join(root,p),'utf8');
  assert.match(source,/isSafeHunterKotlinPath/,p);
  assert.doesNotMatch(source,/\bisSafeNovelKotlinPath\b/,p);
 }
 const recovery=fs.readFileSync(path.join(root,'packages/recovery/repair-judge.cjs'),'utf8');
 assert.match(recovery,/isSafeNovelKotlinPath/);
 assert.doesNotMatch(recovery,/isSafeHunterKotlinPath/);
});
