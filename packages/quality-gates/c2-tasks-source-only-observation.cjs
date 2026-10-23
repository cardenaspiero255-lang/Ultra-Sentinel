'use strict';
// Standalone source-only runtime witness: NEVER import the candidate Core.
// Third-party source authenticity and process isolation are verified by the
// trusted owner workflow, not by self-reported JSON booleans.
const FIELDS=['schema','productionSourceExecuted','executorThreadIsNotCaller',
 'callerReturnedBeforeWorkerCompletion','secondCallbackOnExecutorThread',
 'defaultSleeperElapsedMillis','allTasksComplete','abiStubsForAndroidAndCoroutine',
 'counterfactualSameOriginalProductionSource','counterfactualExecutedOnCaller',
 'counterfactualCompletedSynchronously','independentOriginalTruth'];
const blocked=()=>{throw Error('C2_SOURCE_ONLY_ORACLE_BLOCKED');};
function assessSourceOnlyObservation(x){
 if(!x||typeof x!=='object'||Array.isArray(x)||
  Object.keys(x).length!==FIELDS.length||FIELDS.some(k=>!Object.hasOwn(x,k))||
  x.schema!=='c2-tasks-throttle-external-jvm/v1'||
  x.productionSourceExecuted!==true||x.executorThreadIsNotCaller!==true||
  x.callerReturnedBeforeWorkerCompletion!==true||
  x.secondCallbackOnExecutorThread!==true||
  !Number.isSafeInteger(x.defaultSleeperElapsedMillis)||
  x.defaultSleeperElapsedMillis<100||x.defaultSleeperElapsedMillis>3000||
  x.allTasksComplete!==true||x.abiStubsForAndroidAndCoroutine!==true||
  x.counterfactualSameOriginalProductionSource!==true||
  x.counterfactualExecutedOnCaller!==true||
  x.counterfactualCompletedSynchronously!==true||
  x.independentOriginalTruth!==false)blocked();
 return Object.freeze({
  schema:'c2-source-only-executable-original-vs-control/v1',
  status:'ORIGINAL_SOURCE_RUNTIME_DEVELOPMENT_CONTROL_ONLY',
  originalWorkerAsynchronous:true,
  controlledInlineSynchronous:true,
  sameProductionSourceBothCases:true,
  isolationProvenByThisModule:false,
  originalSourceProvenByThisModule:false,
  independentProspectiveTruthAttested:false,
  independentCausalAdjudication:false,
  candidatePredictionsRead:false,baselinePredictionsRead:false,
  genuineDefectsVerified:0,scoredPositiveLabels:0,scoredNegativeLabels:0,
  newGoldLabels:0,truthSealed:false,holdoutFrozen:false,
  precision:null,recall:null,f1:null,falsePositiveRate:null,
  sssPlusCertified:false
 });
}
module.exports={assessSourceOnlyObservation};
