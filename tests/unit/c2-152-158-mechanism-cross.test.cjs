'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {adjudicateCrossWithKnownMechanisms}=require('../../packages/quality-gates/c2-152-158-mechanism-cross.cjs');
const H=n=>n.toString(16).padStart(64,'0');
function proof(suite,n,names){
 return {schema:'c2-pr186-orthogonal-original-kotlin/v1',suite,
  sources:names.map((name,i)=>({name,originalSha256:H(n+i*2),repairSha256:H(n+i*2+1)})),
  rows:['00','01','10','11'].map((mode,i)=>({mode,firstRepaired:mode[0]==='1',
   secondRepaired:mode[1]==='1',firstBehaviorCorrect:mode[0]==='1',
   secondBehaviorCorrect:mode[1]==='1',
   normalControlsPassed:true,originalKotlinExecuted:true,
   jarSha256:H(n+10+i),logSha256:H(n+20+i)})),
  candidatePredictionsRead:false,baselineRead:false,newLabels:0,
  certifiedIndependentCausesAdded:0,sssPlusCertified:false
 };
}
function fixture(){
 return {
  jsonQuery:proof('json-query',100,['json','query']),
  rollbackTtl:proof('rollback-ttl',200,['rollback','ttl']),
  replay:{schema:'c2-rollback-153-152-original-cross-verified/v1',
   status:'SIX_REAL_KOTLIN_JVMS_ROLLBACK_LOCAL_EFFECTS_SEPARABLE_CAUSAL_FAMILIES_UNPROVEN',
   sources:[{id:'153:71',head:'6508cc124076b9dea437ea1efc213d3ce55d7baf',blob:'d8708fd6245cea2e8dab4404ef5bfb7e682e1a6f'},
    {id:'152:41',head:'104b7dc33e4c0341cec3fca81e3c8fbe3625357f',blob:'ed936aa687b08cf8d964d54f9d88e68bb12344ec'},
    {id:'153:69',head:'6508cc124076b9dea437ea1efc213d3ce55d7baf',blob:'18911c26a9afaf051fda0e9ea14cdaccf943a47b'}],
   originalKotlinJvmExecutions:6,adaptiveRepairEffectVerified:true,storeRepairEffectVerified:true,
   negative153Line69Validated:true,familiesIndependentlyCertified:0,historicalCausesClosed:0,
   newGoldLabels:0,candidateSourceRead:false,detectorPredictionsRead:false,
   precision:null,recall:null,f1:null,sssPlusCertified:false,evidenceSha256:H(44),
   matrix:['00','01','10','11'].map(mode=>({mode,adaptiveCorrect:mode[0]==='1',storeCorrect:mode[1]==='1',
    independentJVMProcesses:true,sharedRuntimeCrossInteractionTested:false}))},
  campaign:{schema:'c2-original-kotlin-real-causal-campaign/v1',
   sourceRepository:'cardenaspiero255-lang/gamehub-ultra',
   originalKotlinJvmVariantExecutions:10,confirmedRepairLocalEffects:5,
   ordinaryBenignControlFailures:0,externalGoldLabelsCreated:0,
   sourceCaseIdentities:['150:251','150:252','151:264','154:100','155:12'],
   historicalRootCauseAssignmentsStillPending:21,
   nextcloudCandidateSourceReleased:false,detectorPredictionsRead:false,
   holdoutFrozen:false,sssPlusCertified:false,
   precision:null,recall:null,f1:null,receiptSha256:H(48)}
 };
}
test('RED: two actual shared-JVM cross repairs are orthogonal; separate-JVM and thematic links remain unknown',()=>{
 const r=adjudicateCrossWithKnownMechanisms(fixture());
 assert.equal(r.schema,'c2-152-158-cross-known-mechanisms/v1');
 assert.equal(r.originalJointJVMRuns,8);
 assert.equal(r.additionalOriginalKotlinJVMExecutions,16);
 assert.equal(r.directJointInterventionContrasts,2);
 assert.equal(r.separateJVMContrasts,1);
 assert.equal(r.untestedCrossRelations,4);
 assert.equal(r.causalFamiliesIndependentlyCertified,0);
 assert.equal(r.historicalAssignmentsCertifiedClosed,0);
 assert.equal(r.externalGoldLabelsCreated,0);
 assert.equal(r.sssPlusCertified,false);
 assert.equal(r.edges.find(x=>x.pair.join('|')==='152:41|158:114').status,'JOINT_JVM_ORTHOGONAL_LOCAL_EFFECTS');
 assert.equal(r.edges.find(x=>x.pair.join('|')==='158:114|151:264').status,'NO_DIRECT_CROSS_INTERVENTION');
 assert.match(r.evidenceSha256,/^[a-f0-9]{64}$/);
});
test('RED: reject fabricated orthogonality, missing benign canary, wrong cases, unblind or confidence inflation',()=>{
 const bad=[
  x=>x.rollbackTtl.rows[2].secondBehaviorCorrect=true,
  x=>x.jsonQuery.rows[0].normalControlsPassed=false,
  x=>x.rollbackTtl.sources[0].originalSha256=x.rollbackTtl.sources[0].repairSha256,
  x=>x.replay.matrix[0].storeCorrect=true,
  x=>x.replay.negative153Line69Validated=false,
  x=>x.replay.sources[1].blob='f'.repeat(40),
  x=>x.campaign.ordinaryBenignControlFailures=1,
  x=>x.campaign.sourceCaseIdentities[2]='X',
  x=>x.campaign.externalGoldLabelsCreated=1
 ];
 for(const change of bad){const data=fixture();change(data);
  assert.throws(()=>adjudicateCrossWithKnownMechanisms(data),/C2_152_158_CAUSAL_CROSS_BLOCKED/);
 }
});
