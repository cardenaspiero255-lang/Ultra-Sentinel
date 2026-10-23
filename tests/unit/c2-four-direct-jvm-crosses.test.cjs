'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {adjudicateFourDirectCrosses}=require('../../packages/quality-gates/c2-four-direct-jvm-crosses.cjs');
const H=n=>n.toString(16).padStart(64,'0');
const specs=[['ttl-thermal','158:114','151:264'],['query-confidence','158:144','150:251'],['json-confidence','152:110','150:252'],['refresh-battery','152:207','155:12']];
function trial(i,[suite,first,second]){
 return {schema:'c2-two-real-sources-four-jvm-repair-states/v1',
  suite,identities:[first,second],
  originalSourceGitBlobs:suite==='ttl-thermal'?['0d18a43a8e36ea3edacc2cad72071d96aa31626e','adb11032b9b7f62f865228dfa1c27258ca3fa0df']:
  suite==='query-confidence'?['0b5b315b2c5bb54d8c6a2713f3c7d29085209f4f','37866fd3dbfcd19d9daaf29a5e1e426391c723d4']:
  suite==='json-confidence'?['886c104effd553cd60f8222bfb05b8505fe7c4b8','37866fd3dbfcd19d9daaf29a5e1e426391c723d4']:
  ['549e3b1d619b83e59bc37b31b4860191c25528f1','8696360219231f3f1477d5ad21c93bca2197e281'],
  originalSourcesVerified:true,originalSourcesUnmodified:true,networkIsolatedJVM:true,
  rows:['00','01','10','11'].map((mode,j)=>({
   mode,firstRepaired:mode[0]==='1',secondRepaired:mode[1]==='1',
   firstCorrect:mode[0]==='1',secondCorrect:mode[1]==='1',
   benignControlsPassed:true,actualJointKotlinJvm:true,
   javaArtifactSha256:H(1000+i*100+j),executionLogSha256:H(2000+i*100+j)
  })),
  detectorPredictionsRead:false,externalCandidateSourceRead:false,
  newGoldLabels:0,causalFamiliesCertified:0,holdoutFrozen:false,sssPlusCertified:false};
}
function fixture(){return specs.map((s,i)=>trial(i,s))}
test('RED: four genuine paired original-source 2x2 JVM experiments identify scoped repair noninterference',()=>{
 const r=adjudicateFourDirectCrosses(fixture());
 assert.equal(r.schema,'c2-four-direct-original-kotlin-causal-crosses/v1');
 assert.equal(r.originalSourcePairExperiments,4);
 assert.equal(r.realJointKotlinJvmExecutions,16);
 assert.equal(r.scopedNoninterferencePairs,4);
 assert.equal(r.unresolvedGlobalCausalIndependence,true);
 assert.equal(r.externalGoldLabelsCreated,0);
 assert.equal(r.precision,null);assert.equal(r.recall,null);assert.equal(r.sssPlusCertified,false);
 assert.match(r.evidenceSha256,/^[a-f0-9]{64}$/);
});
test('RED: reject fake JVM, skipped control, wrong mode, head/blob drift, re-used logs and false certification',()=>{
 const modifications=[
  x=>x[0].rows[0].firstCorrect=true,
  x=>x[1].rows[2].secondCorrect=true,
  x=>x[2].rows[0].benignControlsPassed=false,
  x=>x[3].rows[1].actualJointKotlinJvm=false,
  x=>x[0].rows[0].javaArtifactSha256=x[0].rows[1].javaArtifactSha256,
  x=>x[2].originalSourceGitBlobs[0]='f'.repeat(40),
  x=>x[0].originalSourcesVerified=false,
  x=>x[1].networkIsolatedJVM=false,
  x=>x[2].detectorPredictionsRead=true,
  x=>x[3].newGoldLabels=1,
  x=>x[0].causalFamiliesCertified=1
 ];
 for(const modify of modifications){const x=fixture();modify(x);
  assert.throws(()=>adjudicateFourDirectCrosses(x),/C2_FOUR_REAL_CROSSES_BLOCKED/);
 }
});
