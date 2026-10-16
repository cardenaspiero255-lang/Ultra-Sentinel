'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {capturePinnedTargetDiffs,TARGETS}=require('../../packages/quality-gates/c2-unseen-targeted-diff.cjs');
const {LOCK}=require('../../packages/quality-gates/c2-unseen-holdout.cjs');
function row(pr){
 const p=TARGETS.find(x=>x.pr===pr),locked=LOCK.cases.find(x=>x.pr===pr);
 const f={filename:p.path,status:pr===206?'added':'modified',
  sha:p.blobSha,additions:1,deletions:0,changes:1,
  patch:'@@ -0,0 +1 @@\n+val fakeForStub = 1\n'};
 const files=[f,...Array.from({length:locked.changedFiles-1},(_,i)=>({
  filename:'tests/untouched-'+pr+'-'+i+'.kt',status:'modified',sha:'a'.repeat(40),
  additions:1,deletions:0,changes:1,patch:'@@ -0,0 +1 @@\n+1\n'
 }))];
 return {comparison:{status:'ahead',
  base_commit:{sha:locked.baseSha},merge_base_commit:{sha:locked.baseSha},
  commits:[{sha:locked.headSha}],files},
  source:{type:'file',path:p.path,sha:p.blobSha,encoding:'base64',
   size:100,content:'ZHVtbXk='}};
}
const decoder=()=> 'val fakeForStub = 1\n';
function analyze(files,{sha}){
 assert.equal(files.length,1);assert.match(sha,/^[a-f0-9]{40}$/);
 return {sha,coverage:{returned:1,analyzed:1,partial:false},omitted:0,
  verdict:'NO_CRITICAL_PATTERN',findings:[
   {rule:'UNSCOPED_COROUTINE',path:files[0].filename,line:7,
    evidence:'[UNTRUSTED RAW CONTENT]',status:'NEEDS_VERIFICATION'},
   {rule:'REGRESSION_TEST_COVERAGE',path:files[0].filename,line:0}
  ]};
}
function inputs(){
 return {comparisons:{205:row(205).comparison,206:row(206).comparison,208:row(208).comparison},
  contents:{205:row(205).source,206:row(206).source,208:row(208).source}};
}
test('captures three SHA-matched compare-to-HEAD target files without labels or source text',()=>{
 const r=capturePinnedTargetDiffs(inputs(),{decode:decoder,analyze});
 assert.equal(r.schema,'ultra-sentinel-c2-unseen-core-capture/v1');
 assert.equal(r.sourceKind,'FROZEN_TARGET_FILE_DIFF');
 assert.equal(r.wholePrCoverage,false);
 assert.equal(r.samples.length,3);
 assert.deepEqual(r.samples.map(x=>x.pr),[205,206,208]);
 assert.ok(r.samples.every(x=>x.source==='VERIFIED_PINNED_GITHUB_COMPARE_TARGET'));
 assert.deepEqual(r.samples.map(x=>x.nonPositionalFindings),[1,1,1]);
 assert.deepEqual(r.samples.map(x=>x.findings[0].rule),Array(3).fill('UNSCOPED_COROUTINE'));
 assert.equal(r.labelsRead,false);assert.equal(r.baselineRead,false);
 assert.equal(r.globalPrecision,null);assert.equal(r.globalRecall,null);
 assert.equal(r.fpNonRegressionVerified,false);assert.equal(r.tripleSPlusCertified,false);
 assert.doesNotMatch(JSON.stringify(r),/fakeForStub|UNTRUSTED RAW CONTENT|ZHVtbXk=/);
});
test('frozen file identities are exactly originals, including PR208 immutable compare blob',()=>{
 assert.deepEqual(TARGETS.map(x=>x.pr),[205,206,208]);
 assert.equal(TARGETS[2].blobSha,'9298fe614e1ddbad27e2253c02e9415122cfa263');
 assert.notEqual(TARGETS[2].blobSha,'fe8049736692d5babdaede4fe0b1cd82241db3ca');
 assert.ok(TARGETS.every(t=>LOCK.cases.some(c=>c.pr===t.pr)));
});
test('spoofed bases, changed count, target SHA or unsafe injected files block score',()=>{
 const mutations=[
 x=>x.comparisons[205].status='behind',
 x=>x.comparisons[205].base_commit.sha='a'.repeat(40),
 x=>x.comparisons[206].merge_base_commit.sha='b'.repeat(40),
 x=>x.comparisons[208].commits=[],
 x=>x.comparisons[205].files.pop(),
 x=>x.comparisons[206].files[0].sha='f'.repeat(40),
 x=>x.comparisons[208].files[0].patch=null,
 x=>x.comparisons[208].files.push(x.comparisons[208].files[0]),
 x=>x.contents[205].sha='f'.repeat(40),
 x=>x.contents[205].path='../secret',
 x=>x.contents[206].encoding='raw'
 ];
 for(const mutate of mutations){const x=inputs();mutate(x);
  assert.throws(()=>capturePinnedTargetDiffs(x,{decode:decoder,analyze}),/C2_TARGET_SOURCE_UNVERIFIED/);}
});
test('partial Core or ambiguous prediction cannot be converted into a result',()=>{
 for(const bad of [
  v=>v.coverage.partial=true,
  v=>v.coverage.returned=6,
  v=>v.omitted=1,
  v=>v.verdict='INCOMPLETE',
  v=>v.findings[0].line=-1,
  v=>v.findings[0].path='../secret',
  v=>v.findings[0].rule='lowercase',
  v=>v.findings[0].positive=true,
  v=>v.findings.push({...v.findings[0]})
 ]){
  assert.throws(()=>capturePinnedTargetDiffs(inputs(),{
   decode:decoder,analyze:(files,opts)=>{const x=analyze(files,opts);bad(x);return x;}
  }),/C2_TARGET_SOURCE_UNVERIFIED/);
 }
});
