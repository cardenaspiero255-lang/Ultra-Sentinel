'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {assessSourceOnlyObservation}=require('../../packages/quality-gates/c2-tasks-source-only-observation.cjs');
function genuineFixture(){return {
 schema:'c2-tasks-throttle-external-jvm/v1',
 productionSourceExecuted:true,executorThreadIsNotCaller:true,
 callerReturnedBeforeWorkerCompletion:true,secondCallbackOnExecutorThread:true,
 defaultSleeperElapsedMillis:260,allTasksComplete:true,
 abiStubsForAndroidAndCoroutine:true,
 counterfactualSameOriginalProductionSource:true,counterfactualExecutedOnCaller:true,
 counterfactualCompletedSynchronously:true,independentOriginalTruth:false
};}
test('source-only oracle verifies original vs controlled inline behavior without scoring',()=>{
 const x=assessSourceOnlyObservation(genuineFixture());
 assert.equal(x.originalWorkerAsynchronous,true);
 assert.equal(x.controlledInlineSynchronous,true);
 assert.equal(x.status,'ORIGINAL_SOURCE_RUNTIME_DEVELOPMENT_CONTROL_ONLY');
 assert.equal(x.independentProspectiveTruthAttested,false);
 assert.equal(x.candidatePredictionsRead,false);
 assert.equal(x.newGoldLabels,0);
 assert.equal(x.precision,null);
 assert.equal(x.holdoutFrozen,false);
});
test('source-only oracle rejects missing, forged, skipped, or tampered original runtime behavior',()=>{
 for(const key of ['productionSourceExecuted','counterfactualSameOriginalProductionSource',
 'counterfactualExecutedOnCaller','counterfactualCompletedSynchronously',
 'executorThreadIsNotCaller','allTasksComplete','abiStubsForAndroidAndCoroutine']){
  const x=genuineFixture();x[key]=false;
  assert.throws(()=>assessSourceOnlyObservation(x),/C2_SOURCE_ONLY_ORACLE_BLOCKED/);
 }
 const x=genuineFixture();x.precision=1;
 assert.throws(()=>assessSourceOnlyObservation(x),/C2_SOURCE_ONLY_ORACLE_BLOCKED/);
 assert.throws(()=>assessSourceOnlyObservation({...genuineFixture(),defaultSleeperElapsedMillis:0}),/C2_SOURCE_ONLY_ORACLE_BLOCKED/);
});
test('source-only workflow never consumes Core or predictions, and runs from owner main',()=>{
 const code=fs.readFileSync(path.join(__dirname,'../../packages/quality-gates/c2-tasks-source-only-observation.cjs'),'utf8');
 const script=fs.readFileSync(path.join(__dirname,'../../scripts/c2-tasks-source-only-receipt.cjs'),'utf8');
 const workflow=fs.readFileSync(path.join(__dirname,'../../.github/workflows/c2-external-tasks-original-worker.yml'),'utf8');
 assert.doesNotMatch(code+script,/ultra_sentinel_core|\.\/\.\.\/core\/|\.analyze\(/);
 assert.match(workflow,/scripts\/c2-tasks-source-only-receipt\.cjs/);
 assert.doesNotMatch(workflow,/scripts\/c2-external-tasks-throttle\.cjs/);
 assert.doesNotMatch(workflow,/npm run check|github\.event_name == 'pull_request'/);
 assert.match(workflow,/github\.actor == 'cardenaspiero255-lang'/);
 assert.match(workflow,/github\.event_name == 'push'/);
 assert.match(workflow,/original-external\/app\/src\/main\/java\/org\/tasks\/notifications\/Throttle\.kt/);
});
