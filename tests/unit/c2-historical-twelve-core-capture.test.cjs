'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {assessOriginalSource,aggregateTwelve}=require('../../packages/quality-gates/c2-historical-twelve-core-capture.cjs');
const path='app/src/main/java/com/cardenaspiero255/gamehubultra/domain/Example.kt';
const source='package example\nclass A {\n  fun safe() = 1\n}\n';
const sha1=s=>{const b=Buffer.from(s);return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');};
const SHA='a'.repeat(40);
function setup(){
 const lines=source.trimEnd().split('\n');
 const file={filename:path,status:'added',sha:sha1(source),additions:4,deletions:0,changes:4,
  patch:'@@ -0,0 +1,4 @@\n'+lines.map(x=>'+'+x).join('\n')};
 return {label:{pr:150,headSha:SHA,blobSha:sha1(source),path,line:3,positive:false,rule:'HISTORICAL_NEGATIVE_RULE'},
  source,pr:{number:150,headSha:SHA,changedFiles:2},files:[file,{
   filename:'app/src/test/java/com/cardenaspiero255/gamehubultra/ExampleTest.kt',
   status:'added',sha:'b'.repeat(40)
  }]};
}
test('RED: real Core evaluation yields diagnostic only, not a detector TN/FP or GOLD',()=>{
 const result=assessOriginalSource(setup());
 assert.equal(result.originalBlobVerified,true);
 assert.equal(result.changeStatus,'ORIGINAL_DIFF_LINE_ADDED');
 assert.equal(result.coreExecuted,true);
 assert.equal(result.target.line,3);
 assert.equal(result.exactRulePathLineMatches,0);
 assert.equal(result.scoredNegative,false);
 assert.equal(result.falsePositive,null);
 assert.equal(result.noTestsAlert,false);
 assert.equal(result.certified,false);
});
test('RED: source unchanged in original PR must remain unscorable',()=>{
 const v=setup();v.files=v.files.slice(1);v.pr.changedFiles=1;
 const r=assessOriginalSource(v);
 assert.equal(r.changeStatus,'ORIGINAL_PR_FILE_UNCHANGED');
 assert.equal(r.coreExecuted,false);
 assert.equal(r.scoredNegative,false);
 assert.equal(r.falsePositive,null);
});
test('RED: line outside the changed hunk is not an observed PR-introduced negative',()=>{
 const v=setup();v.label.line=1;
 v.files[0].patch='@@ -3,0 +3 @@\n+  fun safe() = 1';
 v.files[0].status='modified';v.files[0].additions=1;v.files[0].changes=1;
 const r=assessOriginalSource(v);
 assert.equal(r.changeStatus,'ORIGINAL_SOURCE_LINE_NOT_ADDED');
 assert.equal(r.scoredNegative,false);
});
test('RED: source, PR and prediction injections fail closed',()=>{
 const edits=[
  x=>{x.source=x.source.replace('safe','evil')},
  x=>{x.label.blobSha='0'.repeat(40)},
  x=>{x.pr.headSha='b'.repeat(40)},
  x=>{x.pr.changedFiles=3},
  x=>{x.files[0].sha='b'.repeat(40)},
  x=>{x.files[0].patch='@@ -0,0 +1,4 @@\n+fake'},
  x=>{x.predictions=[]},
  x=>{x.label.path='../../etc/passwd'},
  x=>{x.files.push({...x.files[0]})}
 ];
 for(const e of edits){const v=setup();e(v);assert.throws(()=>assessOriginalSource(v),/C2_HISTORICAL_CORE_CAPTURE_BLOCKED/);}
});
test('RED: aggregate exactly twelve development records, no independent causes or metrics',()=>{
 const row=assessOriginalSource(setup());
 const report=aggregateTwelve(Array.from({length:12},(_,i)=>({...row,
   target:{...row.target,pr:150+i,line:i+1,rule:'RULE_'+i},
   labelPolarity:i<6
 })));
 assert.equal(report.count,12);
 assert.equal(report.positives,6);assert.equal(report.negatives,6);
 assert.equal(report.scoredNegatives,0);
 assert.equal(report.precision,null);assert.equal(report.recall,null);
 assert.equal(report.f1,null);assert.equal(report.measuredFalsePositiveRate,null);
 assert.equal(report.blindHoldoutFrozen,false);assert.equal(report.sssPlusCertified,false);
});
