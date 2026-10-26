'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {assessRegisteredRepairPr}=require('../../packages/recovery/registered-pr-handoff.cjs');
const BASE='a'.repeat(40),CAND='b'.repeat(40),BLOB='c'.repeat(40);
const FILE='app/src/main/java/com/cardenaspiero255/gamehubultra/domain/BatteryAwareGamingEngine.kt';
const TEST='app/src/test/java/com/cardenaspiero255/gamehubultra/domain/BatteryAwareGamingEngineTest.kt';
const plan={id:'battery-regression',targetRepo:'cardenaspiero255-lang/gamehub-ultra',
 baseSha:BASE,candidateSha:CAND,candidateBlob:BLOB,targetFile:FILE,maxChangedFiles:1,
 remoteWrites:false,mergeAllowed:false};
const pr={number:245,state:'open',draft:false,mergeable:true,changed_files:2,
 head:{sha:CAND,repo:{full_name:plan.targetRepo}},
 base:{sha:BASE,ref:'main',repo:{full_name:plan.targetRepo}}};
const files=[{filename:FILE,status:'modified',sha:BLOB},{filename:TEST,status:'modified',sha:'d'.repeat(40)}];
const names=['build','quality','android-test-shards','device-validation','coverage',
 'quality-contracts','SonarCloud Code Analysis'];
const checks=names.map(name=>({name,head_sha:CAND,status:'completed',conclusion:'success'}));
function assess(change={}){
 return assessRegisteredRepairPr({plan,pr,changedFiles:files,checkRuns:checks,...change});
}
test('GitHub file ordering does not change the validated change set',()=>{
 assert.equal(assess({changedFiles:[...files].reverse()}).status,'PR_REVIEW_READY_NO_AUTO_MERGE');
});
test('additional pending, stale or indeterminate current-head checks block handoff',()=>{
 for(const extra of [
  {status:'queued',conclusion:null},
  {status:'in_progress',conclusion:null},
  {status:'completed',conclusion:'stale'},
  {status:'completed',conclusion:null},
  {status:'completed',conclusion:'unexpected'},
 ])assert.throws(()=>assess({checkRuns:[...checks,{name:'security',head_sha:CAND,...extra}]}),
  /REGISTERED_PR_HANDOFF_BLOCKED/);
});
test('test file must carry a valid Git blob identity',()=>{
 for(const sha of [undefined,'','not-a-sha'])assert.throws(
  ()=>assess({changedFiles:[files[0],{...files[1],sha}]}),/REGISTERED_PR_HANDOFF_BLOCKED/);
});
test('real branch PR with exact change set and required SHA checks is review-ready, NEVER auto-merge',()=>{
 const r=assess();
 assert.equal(r.status,'PR_REVIEW_READY_NO_AUTO_MERGE');
 assert.equal(r.prNumber,245);
 assert.equal(r.headSha,CAND);
 assert.equal(r.remoteWrites,false);
 assert.equal(r.autoMergeAllowed,false);
 assert.equal(r.humanReviewRequired,true);
});
test('wrong SHA, missing checks, skipped checks, forged test paths and extra files are blocked',()=>{
 for(const changed of [
  {pr:{...pr,head:{...pr.head,sha:'f'.repeat(40)}}},
  {pr:{...pr,base:{...pr.base,sha:'f'.repeat(40)}}},
  {pr:{...pr,mergeable:false}},
  {pr:{...pr,changed_files:3}},
  {changedFiles:[...files,{filename:'other.sh',status:'added'}]},
  {changedFiles:[{...files[0],sha:'e'.repeat(40)},files[1]]},
  {changedFiles:[files[0],{...files[1],filename:'app/src/main/java/Attack.kt'}]},
  {checkRuns:checks.slice(1)},
  {checkRuns:checks.map(x=>x.name==='build'?{...x,conclusion:'skipped'}:x)},
  {checkRuns:checks.map(x=>({...x,head_sha:'d'.repeat(40)}))},
 ])assert.throws(()=>assess(changed),/REGISTERED_PR_HANDOFF_BLOCKED/,
  JSON.stringify(changed).slice(0,150));
});
