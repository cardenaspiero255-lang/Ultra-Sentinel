'use strict';
const {createHash}=require('node:crypto');
const {adjudicateFour}=require('./c2-pr186-four-cross-adjudication.cjs');
const die=()=>{throw Error('C2_152_158_CAUSAL_CROSS_BLOCKED');};
const H64=/^[a-f0-9]{64}$/;
const eq=(x,y)=>x&&Object.entries(y).every(([k,v])=>x[k]===v);
const expectedSources=[
 {id:'153:71',head:'6508cc124076b9dea437ea1efc213d3ce55d7baf',blob:'d8708fd6245cea2e8dab4404ef5bfb7e682e1a6f'},
 {id:'152:41',head:'104b7dc33e4c0341cec3fca81e3c8fbe3625357f',blob:'ed936aa687b08cf8d964d54f9d88e68bb12344ec'},
 {id:'153:69',head:'6508cc124076b9dea437ea1efc213d3ce55d7baf',blob:'18911c26a9afaf051fda0e9ea14cdaccf943a47b'}
];
function adjudicateCrossWithKnownMechanisms({jsonQuery,rollbackTtl,replay,campaign}={}){
 try{
  const original=adjudicateFour([jsonQuery,rollbackTtl]);
  if(original.originalKotlinJointRuns!==8||
   !replay||replay.schema!=='c2-rollback-153-152-original-cross-verified/v1'||
   replay.status!=='SIX_REAL_KOTLIN_JVMS_ROLLBACK_LOCAL_EFFECTS_SEPARABLE_CAUSAL_FAMILIES_UNPROVEN'||
   !Array.isArray(replay.sources)||replay.sources.length!==3||
   replay.sources.some((x,i)=>!eq(x,expectedSources[i]))||
   replay.originalKotlinJvmExecutions!==6||
   replay.adaptiveRepairEffectVerified!==true||replay.storeRepairEffectVerified!==true||
   replay.negative153Line69Validated!==true||replay.familiesIndependentlyCertified!==0||
   replay.historicalCausesClosed!==0||replay.newGoldLabels!==0||
   replay.candidateSourceRead!==false||replay.detectorPredictionsRead!==false||
   replay.precision!==null||replay.recall!==null||replay.f1!==null||
   replay.sssPlusCertified!==false||!H64.test(replay.evidenceSha256)||
   !Array.isArray(replay.matrix)||replay.matrix.length!==4)die();
  for(let i=0;i<4;i++){
   const mode=['00','01','10','11'][i],m=replay.matrix[i];
   if(!m||m.mode!==mode||m.adaptiveCorrect!==(mode[0]==='1')||
    m.storeCorrect!==(mode[1]==='1')||
    m.independentJVMProcesses!==true||
    m.sharedRuntimeCrossInteractionTested!==false)die();
  }
  if(!campaign||campaign.schema!=='c2-original-kotlin-real-causal-campaign/v1'||
   campaign.sourceRepository!=='cardenaspiero255-lang/gamehub-ultra'||
   campaign.originalKotlinJvmVariantExecutions!==10||
   campaign.confirmedRepairLocalEffects!==5||
   campaign.ordinaryBenignControlFailures!==0||
   campaign.externalGoldLabelsCreated!==0||
   campaign.historicalRootCauseAssignmentsStillPending!==21||
   campaign.nextcloudCandidateSourceReleased!==false||
   campaign.detectorPredictionsRead!==false||
   campaign.holdoutFrozen!==false||campaign.sssPlusCertified!==false||
   campaign.precision!==null||campaign.recall!==null||campaign.f1!==null||
   !H64.test(campaign.receiptSha256)||
   JSON.stringify(campaign.sourceCaseIdentities)!==JSON.stringify(['150:251','150:252','151:264','154:100','155:12']))die();
  const edges=[
   {pair:['152:110','158:144'],status:'JOINT_JVM_ORTHOGONAL_LOCAL_EFFECTS',
    intervention:'2x2 independently repair JSON sourceIds parser and current-query qualifier; ordinary controls survive all cells',
    source:'c2-pr186-json-query'},
   {pair:['152:41','158:114'],status:'JOINT_JVM_ORTHOGONAL_LOCAL_EFFECTS',
    intervention:'2x2 independently repair stale rollback version and stale world-state age; ordinary controls survive all cells',
    source:'c2-pr186-rollback-ttl'},
   {pair:['152:41','153:71'],status:'SEPARATE_JVM_LOCAL_CONTRAST_ONLY',
    intervention:'stale-version guard and replay persistence individually repaired; no shared JVM interoperation was run',
    source:'c2-rollback-owner-209'},
   {pair:['158:114','151:264'],status:'NO_DIRECT_CROSS_INTERVENTION',
    intervention:'observation age and nonfinite headroom are different source predicates but interaction is untested',
    source:'hypothesis-only'},
   {pair:['158:144','150:251'],status:'NO_DIRECT_CROSS_INTERVENTION',
    intervention:'freshness requirement and recommendation confidence share research context but transfer is untested',
    source:'hypothesis-only'},
   {pair:['152:110','150:252'],status:'NO_DIRECT_CROSS_INTERVENTION',
    intervention:'JSON extraction and opposing-source confidence under an end-to-end response are untested',
    source:'hypothesis-only'},
   {pair:['152:207','155:12'],status:'NO_DIRECT_CROSS_INTERVENTION',
    intervention:'supported refresh selection and nonfinite battery policy have no jointly executed intervention',
    source:'hypothesis-only'}
  ];
  const report={
   schema:'c2-152-158-cross-known-mechanisms/v1',
   status:'TWO_DIRECT_ORTHOGONAL_SOURCE_PAIRS_ONE_SEPARATE_PAIR_FOUR_UNTESTED_NOT_CERTIFIED',
   historicalSourceRepo:'cardenaspiero255-lang/gamehub-ultra',
   originalJointJVMRuns:8,additionalOriginalKotlinJVMExecutions:16,
   currentWorkflowNewJVMExecutions:0,
   directJointInterventionContrasts:2,separateJVMContrasts:1,untestedCrossRelations:4,
   originalFourCases:['152:110','152:41','158:114','158:144'],
   originalOlderExperimentDigest:original.jsonQueryExperimentSha256,
   originalOlderRollbackTtlExperimentDigest:original.rollbackTtlExperimentSha256,
   originalFreshRollbackDigest:replay.evidenceSha256,
   originalFreshTenJVMReceiptDigest:campaign.receiptSha256,
   edges,
   interactionIndependenceCertified:false,causalFamiliesIndependentlyCertified:0,
   historicalAssignmentsCertifiedClosed:0,externalGoldLabelsCreated:0,
   nextcloudSourceReleased:false,detectorPredictionsRead:false,
   blindHoldoutFrozen:false,precision:null,recall:null,f1:null,sssPlusCertified:false,
   caveat:'Shared-JVM repair orthogonality for two specific module pairs does not establish global causal-family independence. #152:207, thermal vs numeric, query vs confidence, JSON vs confidence remain untested cross relations. Historical source replays are developer data, not GOLD or blind holdout.'
  };
  return Object.freeze({...report,evidenceSha256:createHash('sha256').update(JSON.stringify(report)).digest('hex')});
 }catch(e){if(e?.message==='C2_152_158_CAUSAL_CROSS_BLOCKED')throw e;die();}
}
module.exports={adjudicateCrossWithKnownMechanisms};
