'use strict';
/* Public source is a DEVELOPMENT CONTROL, never blinded. Git checkout is
 * verified by the caller, and the original third-party source is not bundled.
 * A worker-thread result does not independently certify a false positive. */
const {createHash}=require('node:crypto');
const {analyze}=require('../core/ultra_sentinel_core.cjs');
const HEAD='3936c221aea180b795085d7402286373b5d3f6d2';
const BASE='5624816cac6ecab701969d24e6d3387ccd21a773';
const BLOB='0e472cfd73510ab11a396ee5eba9968d57172050';
const PATH='app/src/main/java/org/tasks/notifications/Throttle.kt';
const RULE='BLOCKING_ANDROID_CALL';
const BLOCKED=()=>{throw Error('C2_TASKS_EXTERNAL_BLOCKED');};
function gitBlob(text){
 const bytes=Buffer.from(text,'utf8');
 return createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
}
const KEYS=['schema','productionSourceExecuted','executorThreadIsNotCaller',
 'callerReturnedBeforeWorkerCompletion','secondCallbackOnExecutorThread',
 'defaultSleeperElapsedMillis','allTasksComplete','abiStubsForAndroidAndCoroutine',
 'independentOriginalTruth'];
function classifyWorkerObservation(x){
 if(!x||typeof x!=='object'||Array.isArray(x)||
    Object.keys(x).length!==KEYS.length||KEYS.some(k=>!Object.hasOwn(x,k))||
    x.schema!=='c2-tasks-throttle-external-jvm/v1'||
    x.productionSourceExecuted!==true||
    x.executorThreadIsNotCaller!==true||
    x.callerReturnedBeforeWorkerCompletion!==true||
    x.secondCallbackOnExecutorThread!==true||
    !Number.isSafeInteger(x.defaultSleeperElapsedMillis)||
    x.defaultSleeperElapsedMillis<100||x.defaultSleeperElapsedMillis>3000||
    x.allTasksComplete!==true||x.abiStubsForAndroidAndCoroutine!==true||
    x.independentOriginalTruth!==false)BLOCKED();
 return Object.freeze({
  benignExecutorBehaviorObserved:true,separateExecutorWorker:true,
  runtimeOriginalProductionSourceWithABIStubs:true,
  independentOriginalTruth:false,independentBenignOracle:false,
  scoredNegativeLabels:0,scoredFalsePositiveRate:null,
  newGoldLabels:0,precision:null,recall:null,f1:null,
  holdoutFrozen:false,sssPlusCertified:false
 });
}
function verifyPinnedTasksSource({source,patch,sourceGitBlob,externalGitHead,observation}={}){
 if(typeof source!=='string'||typeof patch!=='string'||
    source.length>50000||patch.length>50000||
    externalGitHead!==HEAD||sourceGitBlob!==BLOB||gitBlob(source)!==BLOB||
    !patch.startsWith('@@ ')||
    !patch.includes('+        private val sleeper: (Long) -> Unit = { Thread.sleep(it) }) {')||
    !patch.includes('+                runBlocking {')||
    !source.includes('private val executor: Executor = newSingleThreadExecutor()')||
    !source.includes('executor.execute {'))BLOCKED();
 const behavior=classifyWorkerObservation(observation);
 const result=analyze([{
  filename:PATH,status:'modified',sha:BLOB,
  additions:20,deletions:16,changes:36,patch,fullSource:source
 }],{sha:HEAD});
 if(result.coverage?.partial||result.omitted||
    !Array.isArray(result.findings))BLOCKED();
 const matches=result.findings.filter(f=>
  f.rule===RULE&&f.path===PATH&&
  Number.isSafeInteger(f.line)&&f.line>0);
 const sourceLines=source.split('\n');
 const candidateLines=[
  sourceLines.findIndex(s=>s.includes('Thread.sleep(it)'))+1,
  sourceLines.findIndex(s=>s.trim()==='runBlocking {')+1
 ];
 if(candidateLines.some(n=>n<1)||matches.some(m=>!candidateLines.includes(m.line)))BLOCKED();
 const uniqueMatches=new Set(matches.map(m=>m.line));
 if(matches.length!==uniqueMatches.size)BLOCKED();
 return Object.freeze({
  schema:'c2-tasks-org-original-git-source-worker-core-development/v1',
  status:'ORIGINAL_EXTERNAL_WORKER_BEHAVIOR_DEVELOPMENT_ONLY',
  upstreamRepository:'tasks/tasks',upstreamBaseSha:BASE,
  upstreamHeadSha:HEAD,originalSourcePath:PATH,originalSourceGitBlob:BLOB,
  ruleId:RULE,coreFullSourceAttested:true,
  corePartial:false,matchingRulePathLines:Object.freeze(matches.map(m=>m.line).sort((a,b)=>a-b)),
  coreExactMatchingFindings:matches.length,
  oracle:Object.freeze(behavior),
  sourceCodeBundled:false,realUpstreamFixCertified:false,
  provisionalFalsePositiveHypothesis:matches.length>0,
  falsePositiveIndependentlyCertified:false,
  scoredTrueNegatives:0,scoredFalsePositives:0,falsePositiveRate:null,
  newGoldLabels:0,precision:null,recall:null,f1:null,
  holdoutFrozen:false,sssPlusCertified:false
 });
}
module.exports={classifyWorkerObservation,verifyPinnedTasksSource,HEAD,BASE,BLOB,PATH,RULE};
