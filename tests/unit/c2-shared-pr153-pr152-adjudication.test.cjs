'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {adjudicateSharedRollbackIntervention}=require('../../packages/quality-gates/c2-shared-pr153-pr152-adjudication.cjs');
const H=n=>n.toString(16).padStart(64,'0');
function fixture(){
 return {
  schema:'c2-original-two-sources-one-jvm-factorial-input/v1',
  source:[
   {id:'153:71',head:'6508cc124076b9dea437ea1efc213d3ce55d7baf',
    blob:'d8708fd6245cea2e8dab4404ef5bfb7e682e1a6f',repairSha256:H(11)},
   {id:'152:41',head:'104b7dc33e4c0341cec3fca81e3c8fbe3625357f',
    blob:'ed936aa687b08cf8d964d54f9d88e68bb12344ec',repairSha256:H(12)}
  ],
  kotlinABIBridgeSha256:H(13),oracleSha256:H(14),
  originalSourceBytesVerified:true,sharedJVMCompiledBothOriginalModules:true,
  sandboxNetworkDisabled:true,sourceCandidateUnblinded:false,
  detectorPredictionsQueried:false,
  rows:['00','01','10','11'].map((mode,i)=>({
   mode,localReplayCorrect:mode[0]==='1',
   staleRejected:mode[1]==='1',
   coupledReplayCorrect:mode==='11',
   staleGuardBlockedReplay:mode==='10',
   normalControlsPassed:true,
   foreignPackageUnchanged:true,
   noDuplicateEvents:true,
   jarSha256:H(100+i),logSha256:H(200+i)
  })),
  externalGoldLabels:0,certifiedIndependentCausalFamilies:0,
  previousLabelsReclassified:0,truthSealed:false,holdoutFrozen:false
 };
}
test('RED: source-authenticated shared JVM interaction distinguishes local repairs from coupled replay',()=>{
 const x=adjudicateSharedRollbackIntervention(fixture());
 assert.equal(x.schema,'c2-shared-original-153-152-interaction/v1');
 assert.equal(x.originalKotlinSharedJvmExecutions,4);
 assert.equal(x.separateJVMResultReusedAsSharedEvidence,false);
 assert.equal(x.localRepairNoninterferenceDemonstrated,true);
 assert.equal(x.coupledReplayRequiresBothGuards,true);
 assert.equal(x.staleStoreBlocksOtherwiseFixedReplay,true);
 assert.equal(x.globalIndependentCausalFamiliesCertified,0);
 assert.equal(x.independentAssignmentCountClosed,0);
 assert.equal(x.externalGoldLabels,0);
 assert.equal(x.detectorPredictionsQueried,false);
 assert.equal(x.sssPlusCertified,false);
 assert.match(x.evidenceSha256,/^[0-9a-f]{64}$/);
});
test('RED: fail on fake additive-only matrix, missing interaction, fabricated negative or unstable evidence',()=>{
 const mutators=[
  x=>x.rows[2].coupledReplayCorrect=true,
  x=>x.rows[2].staleGuardBlockedReplay=false,
  x=>x.rows[3].coupledReplayCorrect=false,
  x=>x.rows[0].normalControlsPassed=false,
  x=>x.rows[1].foreignPackageUnchanged=false,
  x=>x.rows[2].noDuplicateEvents=false,
  x=>x.rows[3].jarSha256=x.rows[2].jarSha256,
  x=>x.source[1].blob='f'.repeat(40),
  x=>x.originalSourceBytesVerified=false,
  x=>x.sandboxNetworkDisabled=false,
  x=>x.sourceCandidateUnblinded=true,
  x=>x.detectorPredictionsQueried=true,
  x=>x.certifiedIndependentCausalFamilies=2,
  x=>x.externalGoldLabels=1,
  x=>x.truthSealed=true
 ];
 for(const mutate of mutators){
  const x=fixture();mutate(x);
  assert.throws(()=>adjudicateSharedRollbackIntervention(x),/C2_SHARED_ROLLBACK_BLOCKED/);
 }
});
