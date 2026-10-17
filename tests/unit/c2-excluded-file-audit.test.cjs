'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {NEW_LOCK}=require('../../packages/quality-gates/c2-next-holdout.cjs');
const {auditExcludedSourceScope,classifyExcluded}=require('../../packages/quality-gates/c2-excluded-file-audit.cjs');
function fixture(){
 return NEW_LOCK.cases.map((c,i)=>{
  const files=Array.from({length:c.changedFiles},(_,j)=>{
   const filename=j===0?'app/src/test/java/Pr'+c.pr+'CheckTest.kt':
     (i===0&&j===1?'app/build.gradle.kts':'app/src/main/java/domain/Pr'+c.pr+'Module'+j+'.kt');
   return {filename,status:'modified',sha:crypto.createHash('sha1').update(i+'-'+j).digest('hex'),
    additions:1,deletions:1,changes:2,patch:'@@ -1 +1 @@\n-before\n+after\n'};
  });
  return {status:'ahead',base_commit:{sha:c.baseSha},
   merge_base_commit:{sha:c.baseSha},commits:[{sha:c.headSha}],files};
 });
}
test('source diff review must separate truth and Core eligibility, no counterfeit metrics',()=>{
 const s=auditExcludedSourceScope(fixture());
 assert.equal(s.changedFileEntries,241);
 assert.equal(s.coreEligibleUpperBound,232);
 assert.equal(s.excludedEntriesInspected,9);
 assert.equal(s.excludedUnitTests,8);
 assert.equal(s.excludedGradleFiles,1);
 assert.equal(s.excludedInstrumentedTests,0);
 assert.equal(s.coreEngineModified,false);
 assert.equal(s.candidateInspected,false);
 assert.equal(s.baselineCompared,false);
 assert.equal(s.truthLabelsAdded,0);
 assert.equal(s.precision,null);
 assert.equal(s.tripleSPlusCertified,false);
 assert.equal(s.receipts.length,9);
 assert.equal(s.status,'EXCLUDED_PATCHES_INSPECTED_NOT_SEMANTICALLY_CLEARED');
 assert.equal(s.auditDigest, auditExcludedSourceScope(fixture()).auditDigest);
});
test('fail closed on truncated patch, changed path/SHA or unexpected exclusion',()=>{
 const edits=[
  x=>x[0].files[0].patch='@@ -1 +1 @@\n-before',
  x=>x[0].files[0].patch='@@ -1 +1 @@\n-before\n+after\n+extra\n',
  x=>x[0].files[0].filename='../secret',
  x=>x[0].files[0].sha='bad',
  x=>x[0].files[0].status='renamed',
  x=>x[0].files.pop(),
  x=>x[0].files[0].changes=5,
  x=>x[1].merge_base_commit.sha='f'.repeat(40)
 ];
 for(const edit of edits){const x=fixture();edit(x);
  assert.throws(()=>auditExcludedSourceScope(x),/C2_EXCLUDED_SCOPE_BLOCKED/);}
});
test('unknown excluded formats are not silently marked reviewed',()=>{
 assert.equal(classifyExcluded('app/src/test/java/a/MyTest.kt'),'UNIT_TEST');
 assert.equal(classifyExcluded('app/src/androidTest/java/a/MyTest.kt'),'INSTRUMENTED_TEST');
 assert.equal(classifyExcluded('app/build.gradle.kts'),'BUILD_GRADLE');
 assert.equal(classifyExcluded('some/unrecognized.data'),null);
});
