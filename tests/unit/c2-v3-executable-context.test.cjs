'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {analyzeV3}=require('../../packages/core/ultra_sentinel_scope_v3.cjs');
function source(path,text,line){
 const lines=text.split('\n'),wanted=lines[line-1];
 const gitSha=crypto.createHash('sha1').update('blob '+Buffer.byteLength(text)+'\0'+text).digest('hex');
 return {filename:path,fullSource:text,sha:gitSha,status:'modified',additions:1,deletions:1,changes:2,
 patch:'@@ -'+line+',1 +'+line+',1 @@\n-old\n+'+wanted+'\n'};
}
const kt='app/src/test/java/com/example/GuardTest.kt';
const gradle='app/build.gradle.kts';
test('V3 ignores Kotlin annotations inside original multiline, nested and inline comments',()=>{
 const cases=[
  source(kt,'/*\n@Ignore\n*/\n@Test fun remainsEnabled() {}',2),
  source(kt,'/* outer /* nested\n@Disabled\n*/ still outer */\n@Test fun enabled() {}',2),
  source(kt,'// @Ignore\n@Test fun enabled() {}',1),
  source(kt,'val note = "@Disabled"\n@Test fun enabled() {}',1)
 ];
 const report=analyzeV3(cases.map((f,i)=>({...f,filename:f.filename.replace('GuardTest',i+'GuardTest')})));
 assert.equal(report.scope.originalBlobVerified,4);
 assert.equal(report.scope.analyzedAddedDiffs,4);
 assert.equal(report.findings.length,0);
 assert.equal(report.verdict,'NO_ADVISORY_SIGNAL');
 assert.equal(report.scope.semanticBehaviorVerified,0);
});
test('V3 ignores Gradle bypass text in comments, strings and nested blocks',()=>{
 const cases=[
  source(gradle,'/*\nignoreFailures = true\n*/',2),
  source(gradle,'val doc = "ignoreFailures = true"\nplugins {}',1),
  source(gradle,'// ignoreFailures = true\nplugins {}',1)
 ];
 for(const f of cases){
  const r=analyzeV3([f]);
  assert.equal(r.scope.originalBlobVerified,1);
  assert.equal(r.findings.length,0);
 }
});
test('V3 flags genuine source annotations and Gradle test bypasses, not confirmed defects',()=>{
 const positive=[
  source(kt,'@Ignore\nclass GuardTest',1),
  source(kt.replace('GuardTest','OtherTest'),'@Disabled("temporary")\nclass OtherTest',1),
  source(gradle,'tasks.withType<Test>().configureEach {\n  ignoreFailures = true\n}',2)
 ];
 const report=analyzeV3(positive);
 assert.equal(report.scope.originalBlobVerified,3);
 assert.deepEqual(report.findings.map(x=>x.rule),
  ['KOTLIN_DISABLED_TEST_REVIEW','KOTLIN_DISABLED_TEST_REVIEW','GRADLE_IGNORE_FAILURES_REVIEW']);
 assert.equal(report.verdict,'REVIEW_REQUIRED');
 assert.ok(report.findings.every(x=>x.status==='NEEDS_VERIFICATION'));
 assert.equal(report.sourceFindingsAreVerifiedDefects,false);
 assert.equal(report.scoredTruthLabels,0);
 assert.equal(report.certification,'NOT_CERTIFIED');
});
