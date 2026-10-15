'use strict';
/**
 * Bounded, synthetic mutation lab for the real Core rules.
 * Does not mutate a repo checkout, run changed code, or attest live accuracy.
 */
const {analyze}=require('../core/ultra_sentinel_core.cjs');
const SHA='a'.repeat(40);
const ANDROID='app/src/main/java/qa/Engine.kt';
const WORKFLOW='.github/workflows/qa.yml';
const CASES=Object.freeze([
 Object.freeze({id:'kotlin-global-scope',rule:'UNSCOPED_COROUTINE',path:ANDROID,
  unsafe:['GlobalScope.launch { update() }'],
  benign:['lifecycleScope.launch { update() }']}),
 Object.freeze({id:'android-blocking-call',rule:'BLOCKING_ANDROID_CALL',path:ANDROID,
  unsafe:['Thread.sleep(500)'],benign:['delay(500)']}),
 Object.freeze({id:'forced-gc',rule:'FORCED_GC',path:ANDROID,
  unsafe:['System.gc()'],benign:['collector.collect()']}),
 Object.freeze({id:'noncancellable-loop',rule:'NON_CANCELLABLE_LOOP',path:ANDROID,
  unsafe:['while (true) {','  tick()','}'],
  benign:['while (true) {','  if (!isActive) break','  tick()','}']}),
 Object.freeze({id:'speech-recursive-callback',rule:'SPEECH_REENTRANT_RETRY',path:ANDROID,
  unsafe:['fun onError(code: Int) {','  recognizer.startListening(intent)','}'],
  benign:['fun onError(code: Int) {','  postDelayed { recognizer.startListening(intent) }','}']}),
 Object.freeze({id:'private-android-log',rule:'POTENTIAL_PRIVATE_LOG',path:ANDROID,
  unsafe:['Log.d("Ultra", authToken)'],benign:['Log.d("Ultra", "ready")']}),
 Object.freeze({id:'literal-github-token',rule:'POTENTIAL_HARDCODED_SECRET',path:ANDROID,
  unsafe:['GITHUB_TOKEN = "synthetic-test-not-a-real-token"'],
  benign:['GITHUB_TOKEN = System.getenv("GITHUB_TOKEN")']}),
 Object.freeze({id:'privileged-untrusted-checkout',rule:'PRIVILEGED_UNTRUSTED_CHECKOUT',path:WORKFLOW,
  unsafe:['pull_request_target:', '  ref: $'+'{{ github.event.pull_request.head.sha }}'],
  benign:['pull_request:', '  ref: $'+'{{ github.sha }}']})
]);
function syntheticPatch(lines){
 if(!Array.isArray(lines)||lines.length<1||lines.length>25||
  lines.some(x=>typeof x!=='string'||x.length>200))
  throw Error('INVALID_SYNTHETIC_MUTANT');
 return '@@ -0,0 +1,'+lines.length+' @@\n'+
  lines.map(line=>'+'+line).join('\n')+'\n';
}
function inspectCase(example,lines){
 const patch=syntheticPatch(lines);
 const report=analyze([{filename:example.path,status:'added',
  patch,changes:lines.length,additions:lines.length,deletions:0}],
  {sha:SHA});
 if(report.coverage.partial||report.verdict==='INCOMPLETE')
  throw Error('MUTATION_ANALYSIS_INCOMPLETE');
 return Object.freeze({ruleObserved:report.findings.some(
  f=>f.rule===example.rule&&f.path===example.path),report});
}
function runMutationLab(){
 const cases=CASES.map(sample=>{
  const injected=inspectCase(sample,sample.unsafe);
  const benign=inspectCase(sample,sample.benign);
  return Object.freeze({id:sample.id,rule:sample.rule,
   injectedDetected:injected.ruleObserved,
   benignUnflagged:!benign.ruleObserved,
   passes:injected.ruleObserved&&!benign.ruleObserved});
 });
 const passed=cases.filter(c=>c.passes).length;
 return Object.freeze({schema:'ultra-sentinel-mutation-lab/v1',
  total:cases.length,passed,failed:cases.length-passed,
  syntheticMutantsOnly:true,realWorldMutationScoreCertified:false,
  releaseCertified:false,autoMerge:false,
  cases:Object.freeze(cases),
  verdict:passed===cases.length?'SYNTHETIC_MUTANTS_KILLED':'SYNTHETIC_MUTANTS_SURVIVED'});
}
module.exports={runMutationLab,syntheticPatch};
