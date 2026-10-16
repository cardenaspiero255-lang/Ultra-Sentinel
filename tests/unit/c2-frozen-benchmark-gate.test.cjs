'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {assessFrozenC2Benchmark}=require('../../packages/quality-gates/c2-frozen-benchmark-gate.cjs');
const {NEW_LOCK}=require('../../packages/quality-gates/c2-next-holdout.cjs');
const {PACKET_DIGEST}=require('../../packages/quality-gates/c2-next-one-positive-truth.cjs');
const rules=['PRIVILEGED_UNTRUSTED_CHECKOUT','POTENTIAL_HARDCODED_SECRET',
 'SPEECH_REENTRANT_RETRY','UNSCOPED_COROUTINE','POTENTIAL_PRIVATE_LOG',
 'BLOCKING_ANDROID_CALL','NON_CANCELLABLE_LOOP','FORCED_GC'];
function sample(pr,i){
 const labels=Array.from({length:16},(_,j)=>({
  pr,headSha:NEW_LOCK.cases[i].headSha,rule:rules[j%8],
  path:'app/src/main/java/holdout/file'+(j%4)+'.kt',line:100+pr*20+j,
  positive:(Math.floor(j/8)+i)%2===0,sourceBlobSha:'c'.repeat(40),
  evidenceSha256:String(i*16+j).padStart(64,'0')
 }));
 const findings=labels.filter(x=>x.positive).map(({rule,path,line})=>({rule,path,line}));
 const scope={changedFiles:NEW_LOCK.cases[i].changedFiles,
  analyzedFiles:NEW_LOCK.cases[i].changedFiles,omittedFiles:0,
  nonPositionalFindings:0,partial:false,source:'PINNED_GITHUB_COMPARE'};
 return {labels,scope,findings};
}
function campaign(){
 const cases=NEW_LOCK.cases.map((x,i)=>sample(x.pr,i));
 return {
  schema:'ultra-sentinel-c2-frozen-benchmark-input/v1',
  repository:NEW_LOCK.repository,packetDigest:PACKET_DIGEST,
  truth:{schema:'ultra-sentinel-c2-frozen-truth/v1',sealedDigest:'d'.repeat(64),
   sourceEngineSha:NEW_LOCK.engineSourceSha,
   labels:cases.flatMap(x=>x.labels),
   trainingExclusionDeclared:true,
   candidatePredictionsRead:false,baselinePredictionsRead:false},
  candidate:{sourceEngineSha:NEW_LOCK.engineSourceSha,kind:'CANDIDATE',
   samples:cases.map((x,i)=>({pr:NEW_LOCK.cases[i].pr,headSha:NEW_LOCK.cases[i].headSha,
    baseSha:NEW_LOCK.cases[i].baseSha,scope:x.scope,findings:x.findings}))},
  baseline:{sourceEngineSha:'e'.repeat(40),kind:'BASELINE',
   samples:cases.map((x,i)=>({pr:NEW_LOCK.cases[i].pr,headSha:NEW_LOCK.cases[i].headSha,
    baseSha:NEW_LOCK.cases[i].baseSha,scope:x.scope,findings:x.findings}))}
 };
}
test('honest 4-label corpus cannot produce numeric precision and stays NOT_CERTIFIED',()=>{
 const c=campaign();c.truth.labels=c.truth.labels.slice(0,4);
 // A strictly smaller truth population cannot cover all candidate alerts.
 const r=assessFrozenC2Benchmark(c);
 assert.equal(r.status,'BLOCKED_INSUFFICIENT_TRUTH');
 assert.equal(r.precision,null);assert.equal(r.recall,null);assert.equal(r.f1,null);
 assert.equal(r.tripleSPlusCertified,false);assert.equal(r.comparisonPerformed,false);
});
test('128 synthetic well-formed labels are numerical diagnostic only; never certified',()=>{
 const r=assessFrozenC2Benchmark(campaign());
 assert.equal(r.status,'NUMERICAL_DIAGNOSTIC_ONLY');
 assert.equal(r.labelCounts.total,128);
 assert.equal(r.labelCounts.positive,64);
 assert.equal(r.labelCounts.negative,64);
 assert.equal(r.candidate.precision,1);
 assert.equal(r.candidate.recall,1);
 assert.equal(r.baseline.precision,1);
 assert.equal(r.precision,1);assert.equal(r.f1,1);
 assert.equal(r.tripleSPlusCertified,false);
 assert.equal(r.realEvidenceAuthenticated,false);
 assert.equal(r.sourceCiAuthenticated,false);
 assert.equal(r.trainingSeparationAuthenticated,false);
 assert.equal(r.mergeAllowed,false);
});
test('any incomplete original SHA coverage, changed file count or orphan alerts block comparison',()=>{
 const mutations=[
  c=>c.candidate.samples.pop(),
  c=>c.baseline.samples[0].headSha='f'.repeat(40),
  c=>c.candidate.samples[0].scope.analyzedFiles-=1,
  c=>c.baseline.samples[3].scope.partial=true,
  c=>c.candidate.samples[2].scope.source='PR_FILES_MUTABLE',
  c=>c.candidate.samples[1].findings.push({rule:'UNSCOPED_COROUTINE',path:'other.kt',line:900}),
  c=>c.baseline.samples[1].findings.push({rule:'UNSCOPED_COROUTINE',path:'other.kt',line:900}),
  c=>c.baseline.sourceEngineSha=NEW_LOCK.engineSourceSha,
  c=>c.truth.labels[0].headSha='f'.repeat(40),
  c=>c.truth.labels[0].line=0,
  c=>c.truth.labels[0].evidenceSha256='not-a-hash',
  c=>c.truth.labels.push({...c.truth.labels[0]}),
  c=>c.truth.candidatePredictionsRead=true,
  c=>c.truth.trainingExclusionDeclared=false,
  c=>c.packetDigest='f'.repeat(64)
 ];
 for(const mutation of mutations){const c=campaign();mutation(c);
 const r=assessFrozenC2Benchmark(c);
 assert.equal(r.comparisonPerformed,false);
 assert.equal(r.precision,null);
 assert.equal(r.tripleSPlusCertified,false);}
});
test('insufficient critical positives, negatives or rules cannot pass numerical prescreen',()=>{
 const c=campaign();c.truth.labels=c.truth.labels.map(x=>({
  ...x,rule:rules[5],evidenceSha256:x.evidenceSha256
 }));
 c.candidate.samples.forEach(x=>x.findings.forEach(f=>f.rule=rules[5]));
 c.baseline.samples.forEach(x=>x.findings.forEach(f=>f.rule=rules[5]));
 const r=assessFrozenC2Benchmark(c);
 assert.notEqual(r.status,'NUMERICAL_DIAGNOSTIC_ONLY');
 assert.equal(r.precision,null);
});
