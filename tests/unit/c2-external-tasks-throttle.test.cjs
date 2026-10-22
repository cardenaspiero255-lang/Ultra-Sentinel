'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {classifyWorkerObservation,verifyPinnedTasksSource}=require('../../packages/quality-gates/c2-external-tasks-throttle.cjs');
const runtime=()=>({schema:'c2-tasks-throttle-external-jvm/v1',
 productionSourceExecuted:true,executorThreadIsNotCaller:true,
 callerReturnedBeforeWorkerCompletion:true,
 secondCallbackOnExecutorThread:true,defaultSleeperElapsedMillis:250,
 allTasksComplete:true,abiStubsForAndroidAndCoroutine:true,
 independentOriginalTruth:false});
test('RED: real original-thread control is a development-only rule-specific benign candidate, never a scored TN or FP',()=>{
 const r=classifyWorkerObservation(runtime());
 assert.equal(r.benignExecutorBehaviorObserved,true);
 assert.equal(r.separateExecutorWorker,true);
 assert.equal(r.scoredNegativeLabels,0);
 assert.equal(r.scoredFalsePositiveRate,null);
 assert.equal(r.newGoldLabels,0);
 assert.equal(r.holdoutFrozen,false);
});
test('RED: reject forged worker assertions and fake labels',()=>{
 for(const mutation of [
  x=>{x.productionSourceExecuted=false},
  x=>{x.executorThreadIsNotCaller=false},
  x=>{x.callerReturnedBeforeWorkerCompletion=false},
  x=>{x.secondCallbackOnExecutorThread=false},
  x=>{x.defaultSleeperElapsedMillis=0},
  x=>{x.allTasksComplete=false},
  x=>{x.independentOriginalTruth=true},
  x=>{x.falsePositiveRate=0},
 ]){const x=runtime();mutation(x);assert.throws(()=>classifyWorkerObservation(x),/C2_TASKS_EXTERNAL_BLOCKED/);}
});
test('RED: genuine upstream source and diff must be pinned, no fabricated HEAD or reusable patch',()=>{
 assert.throws(()=>verifyPinnedTasksSource({
  source:'fun run() { Thread.sleep(1) }',patch:'@@ -0,0 +1,1 @@\n+fun run() { Thread.sleep(1) }\n',
  sourceGitBlob:'f'.repeat(40),externalGitHead:'3936c221aea180b795085d7402286373b5d3f6d2',
  observation:runtime()
 }),/C2_TASKS_EXTERNAL_BLOCKED/);
});
