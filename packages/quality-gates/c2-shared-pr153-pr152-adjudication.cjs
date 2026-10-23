'use strict';
const {createHash}=require('node:crypto');
const fail=()=>{throw Error('C2_SHARED_ROLLBACK_BLOCKED');};
const HEX64=/^[0-9a-f]{64}$/;
const ORIGINALS=[
 {id:'153:71',head:'6508cc124076b9dea437ea1efc213d3ce55d7baf',blob:'d8708fd6245cea2e8dab4404ef5bfb7e682e1a6f'},
 {id:'152:41',head:'104b7dc33e4c0341cec3fca81e3c8fbe3625357f',blob:'ed936aa687b08cf8d964d54f9d88e68bb12344ec'}
];
function adjudicateSharedRollbackIntervention(input){
 try{
  if(!input||input.schema!=='c2-original-two-sources-one-jvm-factorial-input/v1'||
   !Array.isArray(input.source)||input.source.length!==2||
   input.source.some((x,i)=>Object.entries(ORIGINALS[i]).some(([k,v])=>x?.[k]!==v)||!HEX64.test(x.repairSha256))||
   input.source[0].repairSha256===input.source[1].repairSha256||
   !HEX64.test(input.kotlinABIBridgeSha256)||!HEX64.test(input.oracleSha256)||
   input.kotlinABIBridgeSha256===input.oracleSha256||
   input.originalSourceBytesVerified!==true||
   input.sharedJVMCompiledBothOriginalModules!==true||
   input.sandboxNetworkDisabled!==true||input.sourceCandidateUnblinded!==false||
   input.detectorPredictionsQueried!==false||
   input.externalGoldLabels!==0||input.certifiedIndependentCausalFamilies!==0||
   input.previousLabelsReclassified!==0||input.truthSealed!==false||
   input.holdoutFrozen!==false||!Array.isArray(input.rows)||input.rows.length!==4)fail();
  const hashes=new Set(),matrix=[];
  for(let i=0;i<4;i++){
   const mode=['00','01','10','11'][i],r=input.rows[i];
   if(!r||r.mode!==mode||r.localReplayCorrect!==(mode[0]==='1')||
    r.staleRejected!==(mode[1]==='1')||
    r.coupledReplayCorrect!==(mode==='11')||
    r.staleGuardBlockedReplay!==(mode==='10')||
    r.normalControlsPassed!==true||r.foreignPackageUnchanged!==true||
    r.noDuplicateEvents!==true||!HEX64.test(r.jarSha256)||!HEX64.test(r.logSha256)||
    hashes.has(r.jarSha256)||hashes.has(r.logSha256))fail();
   hashes.add(r.jarSha256);hashes.add(r.logSha256);
   matrix.push(Object.freeze({
    mode:r.mode,adaptiveRepair:mode[0]==='1',staleStoreGuardRepair:mode[1]==='1',
    localAdaptiveReplayCorrect:r.localReplayCorrect,staleWriteRejected:r.staleRejected,
    coupledReplayCorrect:r.coupledReplayCorrect,
    staleVersionBlockedRepairedReplay:r.staleGuardBlockedReplay,
    genuineSharedOriginalSourceJVM:true
   }));
  }
  const result={
   schema:'c2-shared-original-153-152-interaction/v1',
   status:'SHARED_JVM_STALE_VERSION_BLOCKS_FIXED_REPLAY_IN_10_BOTH_REPAIRS_REQUIRED_IN_11',
   originalRepo:'cardenaspiero255-lang/gamehub-ultra',
   originalSourceIdentities:ORIGINALS,
   originalSourceShaAuthenticatedAtRuntime:true,
   originalKotlinSharedJvmExecutions:4,
   genuineSingleProcessModuleBoundary:true,
   separateJVMResultReusedAsSharedEvidence:false,
   sharedTestOnlyABIBridge:true,productionAndroidIntegrationCertified:false,
   localRepairNoninterferenceDemonstrated:true,
   coupledReplayRequiresBothGuards:true,
   staleStoreBlocksOtherwiseFixedReplay:true,
   originalMatrix:matrix,
   negativeBenignControlsPassed:true,
   globalIndependentCausalFamiliesCertified:0,
   independentAssignmentCountClosed:0,
   historicalLabelsChanged:0,externalGoldLabels:0,
   detectorPredictionsQueried:false,candidateSourceInspected:false,
   trainingCausalExclusionCertified:false,truthSealed:false,
   holdoutFrozen:false,precision:null,recall:null,f1:null,sssPlusCertified:false,
   limitation:'The original upstream Kotlin modules execute in one JVM on an explicitly modeled shared application callback and shared version store. An original stale-version write blocks the repaired adaptive replay, so local repair orthogonality does not prove causal independence. The adapter is test-only; no production Android call graph or full user-device behavior is certified.'
  };
  return Object.freeze({...result,evidenceSha256:createHash('sha256').update(JSON.stringify({input,result})).digest('hex')});
 }catch(e){if(e?.message==='C2_SHARED_ROLLBACK_BLOCKED')throw e;fail();}
}
module.exports={adjudicateSharedRollbackIntervention};
