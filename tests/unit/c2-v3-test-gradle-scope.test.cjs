'use strict';
const test=require('node:test'), assert=require('node:assert/strict'),crypto=require('node:crypto');
const {analyzeV3,scopeKind}=require('../../packages/core/ultra_sentinel_scope_v3.cjs');
const code='package test\nimport org.junit.Test\nimport org.junit.Assert.assertTrue\nclass SecurityTest { @Test fun asserts() { assertTrue(true) } }\n';
const sha=x=>crypto.createHash('sha1').update('blob '+Buffer.byteLength(x)+'\0').update(x).digest('hex');
function item(path,src){
 const line=src.split('\n')[1];
 const patch='@@ -2,1 +2,1 @@\n-old\n+'+line+'\n';
 return {filename:path,status:'modified',sha:sha(src),fullSource:src,additions:1,deletions:1,changes:2,patch};
}

test('v3 discovers Kotlin unit and instrumentation tests and Gradle without touching frozen core',()=>{
 assert.equal(scopeKind('app/src/test/java/a/AuthTest.kt'),'KOTLIN_UNIT_TEST');
 assert.equal(scopeKind('app/src/androidTest/java/a/AuthTest.kt'),'KOTLIN_INSTRUMENTED_TEST');
 assert.equal(scopeKind('app/build.gradle.kts'),'GRADLE_KTS');
 assert.equal(scopeKind('app/src/main/java/a/B.kt'),null);
 const list=[
 item('app/src/test/java/a/AuthTest.kt',code),
 item('app/src/androidTest/java/a/UITest.kt',code),
 item('app/build.gradle.kts','plugins { kotlin("android") }\ntasks.withType<Test> { ignoreFailures = true }\n')
 ];
 const r=analyzeV3(list);
 assert.equal(r.engine,'Ultra Sentinel Core V3 scope preview');
 assert.equal(r.scope.frozenCoreImmutable,true);
 assert.equal(r.scope.provided,3);
 assert.equal(r.scope.originalBlobVerified,3);
 assert.equal(r.scope.analyzedAddedDiffs,3);
 assert.equal(r.scope.semanticBehaviorVerified,0);
 assert.equal(r.scope.omitted,0);
 assert.equal(r.scope.fullCoverageCertified,false);
 assert.equal(r.sourceFindingsAreVerifiedDefects,false);
 assert.equal(r.legacyBenchmarksComparable,false);
 assert.equal(r.verdict,'REVIEW_REQUIRED');
 assert.ok(r.findings.some(f=>f.rule==='GRADLE_IGNORE_FAILURES_REVIEW'));
 assert.ok(r.findings.every(f=>f.status==='NEEDS_VERIFICATION'));
});
test('opaque, corrupt, missing or forged source fails closed, NEVER fake a clean result',()=>{
 const good=item('app/src/test/java/a/AuthTest.kt',code);
 for(const mutate of [
  x=>delete x.fullSource,x=>x.fullSource='different',x=>x.sha='x'.repeat(40),
  x=>x.patch='@@ -2,1 +2,1 @@\n-old',x=>x.patch='',
  x=>x.filename='../secrets',x=>x.changes=3
 ]){
  const x={...good};mutate(x);const r=analyzeV3([x]);
  assert.equal(r.verdict,'INCOMPLETE');
  assert.equal(r.scope.omitted,1);
  assert.equal(r.scope.originalBlobVerified,0);
  assert.equal(r.scope.semanticBehaviorVerified,0);
  assert.equal(r.scope.fullCoverageCertified,false);
 }
});
test('test skip and Gradle coverage bypass are signals, not proven defects',()=>{
 const data=[
 item('app/src/test/java/a/IgnoredTest.kt','import org.junit.Ignore\n@Ignore\nclass IgnoredTest {}'),
 item('app/build.gradle.kts','plugins { }\ntasks.withType<Test> { ignoreFailures = true }\n')
 ];
 const r=analyzeV3(data);
 assert.ok(r.findings.some(f=>f.rule==='KOTLIN_DISABLED_TEST_REVIEW'));
 assert.ok(r.findings.some(f=>f.rule==='GRADLE_IGNORE_FAILURES_REVIEW'));
 assert.equal(r.scoredTruthLabels,0);
 assert.equal(r.frozenCandidateShaModified,false);
});
