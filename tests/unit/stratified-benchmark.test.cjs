'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {evaluateStratifiedBenchmark}=require('../../packages/quality-gates/stratified-benchmark.cjs');
const rules=['UNSCOPED_COROUTINE','SPEECH_REENTRANT_RETRY','PRIVILEGED_UNTRUSTED_CHECKOUT','POTENTIAL_HARDCODED_SECRET','POTENTIAL_PRIVATE_LOG','BLOCKING_ANDROID_CALL','FORCED_GC','NON_CANCELLABLE_LOOP'];
function campaign(){return {schema:'ultra-sentinel-parity-campaign/v1',samples:[132,158,161,163].map(pr=>{
 const labels=rules.flatMap((rule,i)=>Array.from({length:4},(_,j)=>({rule,path:'app/src/main/'+i+'.kt',line:pr+j,positive:j%2===0})));
 return {repository:'cardenaspiero255-lang/gamehub-ultra',pr,headSha:'a'.repeat(40),baseSha:'b'.repeat(40),sourceCheckState:'SUCCESS',
  labels,baseline:labels.filter(x=>x.positive).map(({rule,path,line})=>({rule,path,line})),
  candidate:labels.filter(x=>x.positive).map(({rule,path,line})=>({rule,path,line}))};
 })};}
test('balanced rule cohort is numerical-only and never independently certified',()=>{
 const r=evaluateStratifiedBenchmark(campaign());assert.equal(r.internalStrataPassed,true);
 assert.equal(r.ruleCount,8);assert.equal(r.tripleSPlusCertified,false);
 assert.ok(r.strata.every(x=>x.support.positive===8&&x.support.negative===8));
});
test('one critical miss blocks rule health while aggregate recall exceeds 95 percent',()=>{
 const c=campaign();c.samples[0].candidate.shift();
 const r=evaluateStratifiedBenchmark(c);assert.equal(r.internalStrataPassed,false);
 assert.equal(r.strata.find(x=>x.rule==='UNSCOPED_COROUTINE').passes,false);
});
test('one false positive in noncritical family blocks score despite good global score',()=>{
 const c=campaign();c.samples[0].candidate.push({...c.samples[0].labels.find(x=>x.rule==='FORCED_GC'&&!x.positive),positive:undefined});
 const r=evaluateStratifiedBenchmark(c);
 assert.equal(r.strata.find(x=>x.rule==='FORCED_GC').passes,false);
});
test('missing negative controls for one family blocks even perfect recall',()=>{
 const c=campaign();for(const s of c.samples){s.labels=s.labels.filter(x=>x.rule!=='BLOCKING_ANDROID_CALL'||x.positive);}
 const r=evaluateStratifiedBenchmark(c);
 assert.equal(r.strata.find(x=>x.rule==='BLOCKING_ANDROID_CALL').represented,false);
});
test('blocked source CI fails even if all numbers pass',()=>{
 const c=campaign();c.samples[2].sourceCheckState='BLOCKED_SOURCE_CI';
 const r=evaluateStratifiedBenchmark(c);assert.equal(r.verdict,'BLOCKED_SOURCE_CI');
 assert.equal(r.sourceCiIndependentlyVerified,false);
});
