'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {analyze}=require('../../packages/core/ultra_sentinel_core.cjs');
const {planCrossFileInterventions}=require('../../packages/family-hunter/cross-file-interventions.cjs');
const {planSupervisedCrossFileInvestigation}=require('../../packages/recovery/supervised-repair.cjs');
const A='a'.repeat(40),B='b'.repeat(40);
function core(sha,paths,source='GlobalScope.launch { work() }'){
 return analyze(paths.map(filename=>({filename,status:'added',changes:1,
  additions:1,deletions:0,patch:'@@ -0,0 +1 @@\n+'+source+'\n'})),{sha});
}
const first='app/src/main/java/voice/First.kt';
const second='app/src/main/java/voice/Second.kt';
const third='app/src/main/java/voice/Third.kt';

test('same real Core family expanded to two files produces bounded factorial intervention matrix',()=>{
 const report=planCrossFileInterventions(core(A,[first]),core(B,[first,second]));
 assert.equal(report.status,'EXPERIMENTS_REQUIRED');
 assert.equal(report.baseSha,A);assert.equal(report.headSha,B);
 assert.equal(report.causalityVerified,false);assert.equal(report.sourceAuthenticated,false);
 assert.equal(report.commitAllowed,false);assert.equal(report.mergeAllowed,false);
 assert.equal(report.candidates.length,1);
 const c=report.candidates[0];
 assert.equal(c.rule,'UNSCOPED_COROUTINE');
 assert.deepEqual(c.files,[first,second]);
 assert.deepEqual(c.newlyObservedFiles,[second]);
 assert.deepEqual(c.experiments.map(x=>x.selectedFiles),[
   [],[first],[second],[first,second]
 ]);
 assert.ok(Object.isFrozen(report)&&Object.isFrozen(c.experiments));
});

test('unchanged co-observed families do not masquerade as new causal evidence',()=>{
 const report=planCrossFileInterventions(core(A,[first,second]),core(B,[first,second]));
 assert.equal(report.status,'NO_CROSS_FILE_TRANSITIONS_OBSERVED');
 assert.deepEqual(report.candidates,[]);
});

test('partial analysis must block an attractive multi-file hypothesis',()=>{
 const before=core(A,[first]);
 const after=core(B,[first,second]);
 const tampered={...after,coverage:{...after.coverage,partial:true},verdict:'INCOMPLETE'};
 const report=planCrossFileInterventions(before,tampered);
 assert.equal(report.status,'INCOMPLETE_EVIDENCE');
 assert.deepEqual(report.candidates,[]);
 assert.equal(report.causalityVerified,false);
});

test('five-file factorial plan is exhaustive but never claims causal execution',()=>{
 const many=Array.from({length:5},(_,i)=>'app/src/main/java/voice/Part'+i+'.kt');
 const report=planCrossFileInterventions(core(A,[many[0]]),core(B,many));
 assert.equal(report.status,'EXPERIMENTS_REQUIRED');
 assert.equal(report.candidates.length,1);
 const candidate=report.candidates[0];
 assert.equal(candidate.experimentDesign,'EXHAUSTIVE_SUBSETS_UNVERIFIED');
 assert.equal(candidate.matrixExhaustive,true);
 assert.equal(candidate.experiments.length,32);
 assert.deepEqual(candidate.experiments[0].selectedFiles,[]);
 assert.deepEqual(candidate.experiments[31].selectedFiles,many);
 assert.ok(candidate.experiments.every(e=>!e.executed&&!e.independentOracleVerified));
 assert.equal(report.causalityVerified,false);
 assert.equal(report.mergeAllowed,false);
});

test('12-file exhaustive boundary and 13-file sparse screening disclose incompleteness',()=>{
 for(const size of [12,13]){
  const paths=Array.from({length:size},(_,i)=>'app/src/main/java/voice/File'+String(i).padStart(2,'0')+'.kt');
  const report=planCrossFileInterventions(core(A,[paths[0]]),core(B,paths));
  assert.equal(report.status,'EXPERIMENTS_REQUIRED');
  const c=report.candidates[0];
  assert.deepEqual(c.files,paths);
  assert.equal(c.matrixExhaustive,size===12);
  assert.equal(c.experimentDesign,size===12?'EXHAUSTIVE_SUBSETS_UNVERIFIED':'SINGLE_AND_LEAVE_ONE_OUT_SCREEN_ONLY');
  assert.equal(c.experiments.length,size===12?4096:2*size+2);
  assert.deepEqual(c.experiments[0].selectedFiles,[]);
  assert.deepEqual(c.experiments.at(-1).selectedFiles,paths);
  assert.ok(c.experiments.every(e=>e.executed===false&&e.independentOracleVerified===false));
  if(size===13){
   assert.deepEqual(c.experiments[1].selectedFiles,[paths[0]]);
   assert.deepEqual(c.experiments[1+size].selectedFiles,paths.slice(1));
   assert.deepEqual(c.experiments[2*size].selectedFiles,paths.slice(0,-1));
  }
  assert.equal(report.sourceAuthenticated,false);
  assert.equal(report.causalityVerified,false);
  assert.equal(report.commitAllowed,false);
 }
});

test('multi-file supervised planning can only suggest tests and never approves a commit',()=>{
 const before=core(A,[first]),after=core(B,[first,second]);
 const assessment=planSupervisedCrossFileInvestigation({
  beforeCore:before,afterCore:after,mode:'REPAIR_COMMITS_AUTHORIZED',
  authorization:{kind:'EXPLICIT_HUMAN_APPROVAL',sha:B}
 });
 assert.equal(assessment.status,'REPRODUCTION_AND_JUDGE_REQUIRED');
 assert.equal(assessment.commitAllowed,false);
 assert.equal(assessment.mergeAllowed,false);
 assert.equal(assessment.productionReleaseAllowed,false);
 assert.equal(assessment.ownerReviewRequired,true);
 assert.equal(assessment.externalOracleVerified,false);
 assert.equal(assessment.candidates[0].experiments.length,4);
 assert.ok(assessment.repairSteps.every(x=>x.autofix===false&&[first,second].includes(x.path)));
});

test('review-only mode provides experiments but never repair steps',()=>{
 const report=planSupervisedCrossFileInvestigation({
  beforeCore:core(A,[first]),afterCore:core(B,[first,second]),mode:'REVIEW_ONLY'
 });
 assert.equal(report.status,'REPRODUCTION_AND_JUDGE_REQUIRED');
 assert.deepEqual(report.repairSteps,[]);
 assert.equal(report.commitAllowed,false);
});

test('single-file findings and repeated SHA cannot be promoted to causal repair',()=>{
 assert.equal(planCrossFileInterventions(core(A,[first]),core(B,[third])).status,
  'EXPERIMENTS_REQUIRED');
 assert.throws(()=>planCrossFileInterventions(core(A,[first]),core(A,[first])),
  /SAME_SNAPSHOT_SHA/);
});
