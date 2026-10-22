'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {adjudicateFour}=require('../../packages/quality-gates/c2-pr186-four-cross-adjudication.cjs');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const suites=['json-query','rollback-ttl'];
function trial(suite){
 const names=suite==='json-query'?['json','query']:['rollback','ttl'];
 return {schema:'c2-pr186-orthogonal-original-kotlin/v1',suite,
  sources:names.map((name,i)=>({name,originalSha256:sha(suite+name+'original'),repairSha256:sha(suite+name+'repair')})),
  rows:['00','01','10','11'].map((mode,i)=>({
   mode,firstRepaired:mode[0]==='1',secondRepaired:mode[1]==='1',
   firstBehaviorCorrect:mode[0]==='1',secondBehaviorCorrect:mode[1]==='1',
   normalControlsPassed:true,originalKotlinExecuted:true,
   jarSha256:sha(suite+mode+'jar'),logSha256:sha(suite+mode+'log')})),
  candidatePredictionsRead:false,baselineRead:false,newLabels:0,
  certifiedIndependentCausesAdded:0,sssPlusCertified:false};
}
function cases(){
 return [trial(suites[0]),trial(suites[1])];
}
test('RED: 8 real combined Kotlin cells, four target behaviors, no cause certification',()=>{
 const input=cases(),before=JSON.stringify(input),out=adjudicateFour(structuredClone(input));
 assert.equal(JSON.stringify(input),before);
 assert.equal(out.originalKotlinJointRuns,8);
 assert.deepEqual(out.behaviorIdentities,['152:110','152:41','158:114','158:144']);
 assert.equal(out.orthogonalSourceBehaviors,4);
 assert.equal(out.sourceLabels,23);
 assert.equal(out.newLabels,0);
 assert.equal(out.independentlyDistinctCausalFamiliesCertified,0);
 assert.equal(out.causesCertifiedAsIndependent,false);
 assert.equal(out.sssPlusCertified,false);
 assert.equal(out.blindHoldout,false);
 assert.equal(out.precision,null);
 assert.equal(out.recall,null);
 assert.equal(out.f1,null);
});
test('RED: reject missing, duplicated, swapped, forged, not-run factorial observations',()=>{
 const attacks=[
  a=>a.pop(),
  a=>a.push(structuredClone(a[0])),
  a=>a[0].suite='rollback-ttl',
  a=>a[0].rows.pop(),
  a=>a[0].rows[0].mode='01',
  a=>a[0].rows[0].firstBehaviorCorrect=true,
  a=>a[0].rows[1].secondBehaviorCorrect=false,
  a=>a[1].rows[2].firstRepaired=false,
  a=>a[1].rows[2].originalKotlinExecuted=false,
  a=>a[1].rows[3].normalControlsPassed=false,
  a=>a[0].rows[1].logSha256=a[0].rows[0].logSha256,
  a=>a[0].rows[2].jarSha256='bad',
  a=>a[0].sources[0].originalSha256='0',
  a=>a[1].sources[1].name='json',
  a=>a[0].candidatePredictionsRead=true,
  a=>a[0].newLabels=1,
  a=>a[1].sssPlusCertified=true
 ];
 for(const f of attacks){const a=cases();f(a);
  assert.throws(()=>adjudicateFour(a),/C2_PR186_CROSS_BLOCKED/);}
});
