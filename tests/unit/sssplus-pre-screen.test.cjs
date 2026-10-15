'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {assessSssPlusPreScreen,POLICY}=
 require('../../packages/quality-gates/sssplus-pre-screen.cjs');
const rules=[
 'PRIVILEGED_UNTRUSTED_CHECKOUT','SPEECH_REENTRANT_RETRY',
 'POTENTIAL_HARDCODED_SECRET','UNSCOPED_COROUTINE',
 'POTENTIAL_PRIVATE_LOG','BLOCKING_ANDROID_CALL',
 'NON_CANCELLABLE_LOOP','FORCED_GC'
];
const paths=[
 'app/src/main/java/voice/Ultra.kt',
 'app/src/main/java/network/Optimizer.kt',
 '.github/workflows/android.yml',
 'app/src/main/java/security/Token.kt'
];
function sample(pr){
 const labels=Array.from({length:30},(_,i)=>({
  rule:rules[i%rules.length],path:paths[i%paths.length],
  line:i+1,positive:(Math.floor(i/rules.length)+pr)%2===0}));
 const baseline=labels.filter((x,i)=>x.positive&&i!==0||i===1)
  .map(({rule,path,line})=>({rule,path,line}));
 const candidate=labels.filter(x=>x.positive)
  .map(({rule,path,line})=>({rule,path,line}));
 return {repository:'cardenaspiero255-lang/gamehub-ultra',pr,
  headSha:'a'.repeat(40),baseSha:'b'.repeat(40),
  sourceCheckState:'SUCCESS',labels,baseline,candidate};
}
const campaign=()=>({schema:'ultra-sentinel-parity-campaign/v1',
 samples:[sample(132),sample(158),sample(161),sample(163)]});
test('perfect synthetic cohort passes fixed numerical targets WITHOUT certification',()=>{
 const s=assessSssPlusPreScreen(campaign());
 assert.equal(s.internalNumericalTargetsObserved,true);
 assert.equal(s.labelCounts.total,120);
 assert.equal(s.labelCounts.positive,60);
 assert.equal(s.labelCounts.negative,60);
 assert.equal(s.candidate.precision,1);
 assert.equal(s.candidate.recall,1);
 assert.ok(s.baseline.f1<s.candidate.f1);
 assert.equal(s.criticalFalseNegatives,0);
 assert.equal(s.verdict,'NUMERICAL_PRESCREEN_ONLY');
 assert.equal(s.gates.stratifiedQuality,true);
 assert.ok(s.stratified.strata.every(x=>x.represented));
 assert.equal(s.tripleSPlusCertified,false);
 assert.equal(s.independentLabelsVerified,false);
 assert.equal(s.liveSourceCiIndependentlyVerified,false);
 assert.equal(s.mergeAllowed,false);
 assert.equal(POLICY.minDistinctPrs,4);
});
test('a single missed critical finding blocks candidate despite 98 percent recall',()=>{
 const input=campaign();input.samples[0].candidate.shift();
 const s=assessSssPlusPreScreen(input);
 assert.ok(s.candidate.recall>0.95);
 assert.equal(s.gates.criticalRecall,false);
 assert.equal(s.tripleSPlusCertified,false);
 assert.ok(s.unmet.includes('criticalRecall'));
});
test('one regression versus earlier engine blocks even when aggregate precision remains high',()=>{
 const input=campaign();
 // Make one PR regress by adding a benign false positive while other 3 improve.
 const benign=input.samples[0].labels.filter(x=>!x.positive).slice(0,2);
 input.samples[0].candidate.push(...benign.map(x=>({
  rule:x.rule,path:x.path,line:x.line
 })));
 const s=assessSssPlusPreScreen(input);
 assert.equal(s.gates.nonRegression,false);
 assert.equal(s.internalNumericalTargetsObserved,false);
});
test('source check results provided by a caller cannot be interpreted as attestation',()=>{
 const input=campaign();
 input.samples[1].sourceCheckState='INCOMPLETE_SOURCE_CI';
 input.evidenceSigner='fake independent auditor';
 input.signedBy='self';
 const s=assessSssPlusPreScreen(input);
 assert.equal(s.gates.selfReportedSourceCiGreen,false);
 assert.equal(s.liveSourceCiIndependentlyVerified,false);
 assert.equal(s.independentLabelsVerified,false);
});
test('insufficient cohort, labels, diversity and repeated PRs block or reject',()=>{
 const single={...campaign(),samples:[sample(132)]};
 const r=assessSssPlusPreScreen(single);
 assert.ok(r.unmet.includes('cohortSize'));
 assert.ok(r.unmet.includes('labelledPopulation'));
 assert.equal(r.tripleSPlusCertified,false);
 const repeat=campaign();repeat.samples[1].pr=repeat.samples[0].pr;
 assert.throws(()=>assessSssPlusPreScreen(repeat),/DUPLICATE_CAMPAIGN_PR/);
});
test('unlabelled candidate findings, path traversal and duplicate truth fail closed',()=>{
 const base=campaign();
 for(const alter of [
  input=>input.samples[0].candidate.push({rule:rules[0],path:'src/unlabelled.kt',line:999}),
  input=>input.samples[0].labels[0].path='../secrets',
  input=>input.samples[0].labels.push(input.samples[0].labels[0])
 ]){
  const input=structuredClone(base);alter(input);
  assert.throws(()=>assessSssPlusPreScreen(input));
 }
});

function remapLabels(input,predicate,mapper){
 for(const sample of input.samples){
  for(const label of sample.labels){
   if(!predicate(label))continue;
   const before=label.rule,next=mapper(label);
   for(const finding of [...sample.baseline,...sample.candidate]){
    if(finding.rule===before&&finding.path===label.path&&finding.line===label.line)
     finding.rule=next;
   }
   label.rule=next;
  }
 }
}
test('empty critical-positive population cannot pass even with zero missed critical findings',()=>{
 const input=campaign();
 const replacements={
  PRIVILEGED_UNTRUSTED_CHECKOUT:'UNCLASSIFIED_CHECKOUT',
  POTENTIAL_HARDCODED_SECRET:'UNCLASSIFIED_SECRET',
  POTENTIAL_PRIVATE_LOG:'UNCLASSIFIED_LOG'
 };
 remapLabels(input,x=>x.positive&&Object.hasOwn(replacements,x.rule),x=>replacements[x.rule]);
 const s=assessSssPlusPreScreen(input);
 assert.equal(s.criticalFalseNegatives,0);
 assert.equal(s.candidate.f1,1);
 assert.equal(s.gates.criticalPopulation,false);
 assert.equal(s.internalNumericalTargetsObserved,false);
});
test('one critical-positive rule does not represent diverse critical families',()=>{
 const input=campaign();
 remapLabels(input,x=>x.positive&&['POTENTIAL_HARDCODED_SECRET','POTENTIAL_PRIVATE_LOG'].includes(x.rule),
  ()=>'PRIVILEGED_UNTRUSTED_CHECKOUT');
 const s=assessSssPlusPreScreen(input);
 assert.ok(s.labelCounts.criticalPositive>=12);
 assert.equal(s.labelCounts.criticalPositiveRules,1);
 assert.equal(s.gates.criticalPopulation,false);
});
test('missing critical-negative controls block vacuous zero false positive success',()=>{
 const input=campaign();
 remapLabels(input,x=>!x.positive&&['SPEECH_REENTRANT_RETRY','UNSCOPED_COROUTINE'].includes(x.rule),
  x=>x.rule==='SPEECH_REENTRANT_RETRY'?'UNCLASSIFIED_RETRY':'UNCLASSIFIED_SCOPE');
 const s=assessSssPlusPreScreen(input);
 assert.equal(s.labelCounts.criticalNegative,0);
 assert.equal(s.gates.criticalPopulation,false);
});
