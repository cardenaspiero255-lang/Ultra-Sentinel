'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {planRegressionBisect}=require('../../packages/quality-gates/regression-investigator.cjs');
const SHAS=Array.from({length:9},(_,i)=>i.toString(16).padStart(40,'0'));
const base=()=>({repository:'cardenaspiero255-lang/gamehub-ultra',commits:SHAS,
 observations:[{sha:SHAS[0],result:'GOOD'},{sha:SHAS.at(-1),result:'BAD'}]});
test('proposes midpoint from exact good/bad boundaries without executing code',()=>{
 const r=planRegressionBisect(base());
 assert.equal(r.status,'TEST_REQUIRED');
 assert.equal(r.nextSha,SHAS[4]);
 assert.equal(r.executable,false);
 assert.equal(r.commitsVerifiedExternally,false);
 assert.equal(r.mergeAllowed,false);
});
test('narrows to one suspected commit but never certifies it',()=>{
 const x=base();x.observations.push({sha:SHAS[4],result:'GOOD'});
 assert.equal(planRegressionBisect(x).nextSha,SHAS[6]);
 x.observations.push({sha:SHAS[6],result:'BAD'});
 assert.equal(planRegressionBisect(x).nextSha,SHAS[5]);
 x.observations.push({sha:SHAS[5],result:'BAD'});
 const r=planRegressionBisect(x);
 assert.equal(r.status,'CANDIDATE_REQUIRES_REPRO');
 assert.equal(r.suspectedFirstBadSha,SHAS[5]);
 assert.equal(r.causalityVerified,false);
});
test('does not guess culprit from non-monotonic test results',()=>{
 const x=base();x.observations.push({sha:SHAS[3],result:'BAD'},{sha:SHAS[5],result:'GOOD'});
 const r=planRegressionBisect(x);
 assert.equal(r.status,'NON_MONOTONIC_INCONCLUSIVE');
 assert.equal(r.nextSha,null);
 assert.equal(r.suspectedFirstBadSha,null);
});
test('missing verified endpoints cannot begin a bisect',()=>{
 const x=base();x.observations.splice(0,1);
 const r=planRegressionBisect(x);
 assert.equal(r.status,'MISSING_BOUNDARY_OBSERVATIONS');
 assert.equal(r.nextSha,null);
});
test('rejects unknown commits, duplicates and unsupported outcomes',()=>{
 const variants=[
  x=>x.commits.push(x.commits[0]),
  x=>x.commits[3]='g'.repeat(40),
  x=>x.observations.push({sha:'f'.repeat(40),result:'BAD'}),
  x=>x.observations.push({...x.observations[0]}),
  x=>x.observations.push({sha:SHAS[1],result:'SKIPPED'}),
  x=>x.repository='attacker/repository',
  x=>x.observations[0].grantWrites=true
 ];
 for(const mutate of variants){const x=base();mutate(x);assert.throws(()=>planRegressionBisect(x));}
});
