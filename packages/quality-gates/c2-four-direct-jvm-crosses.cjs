'use strict';
const {createHash}=require('node:crypto');
const fail=()=>{throw Error('C2_FOUR_REAL_CROSSES_BLOCKED');};
const specs=[
 ['ttl-thermal',['158:114','151:264'],['0d18a43a8e36ea3edacc2cad72071d96aa31626e','adb11032b9b7f62f865228dfa1c27258ca3fa0df']],
 ['query-confidence',['158:144','150:251'],['0b5b315b2c5bb54d8c6a2713f3c7d29085209f4f','37866fd3dbfcd19d9daaf29a5e1e426391c723d4']],
 ['json-confidence',['152:110','150:252'],['886c104effd553cd60f8222bfb05b8505fe7c4b8','37866fd3dbfcd19d9daaf29a5e1e426391c723d4']],
 ['refresh-battery',['152:207','155:12'],['549e3b1d619b83e59bc37b31b4860191c25528f1','8696360219231f3f1477d5ad21c93bca2197e281']]
];
const SH=/^[0-9a-f]{64}$/;
function adjudicateFourDirectCrosses(inputs){
 try{
  if(!Array.isArray(inputs)||inputs.length!==4)fail();
  const hashes=new Set(),summaries=[];
  for(let i=0;i<4;i++){
   const x=inputs[i],sp=specs[i];if(!x||x.schema!=='c2-two-real-sources-four-jvm-repair-states/v1'||
    x.suite!==sp[0]||JSON.stringify(x.identities)!==JSON.stringify(sp[1])||
    JSON.stringify(x.originalSourceGitBlobs)!==JSON.stringify(sp[2])||
    x.originalSourcesVerified!==true||x.originalSourcesUnmodified!==true||
    x.networkIsolatedJVM!==true||x.detectorPredictionsRead!==false||
    x.externalCandidateSourceRead!==false||x.newGoldLabels!==0||
    x.causalFamiliesCertified!==0||x.holdoutFrozen!==false||x.sssPlusCertified!==false||
    !Array.isArray(x.rows)||x.rows.length!==4)fail();
   for(let j=0;j<4;j++){
    const row=x.rows[j],mode=['00','01','10','11'][j];
    if(!row||row.mode!==mode||row.firstRepaired!==(mode[0]==='1')||
     row.secondRepaired!==(mode[1]==='1')||
     row.firstCorrect!==(mode[0]==='1')||row.secondCorrect!==(mode[1]==='1')||
     row.benignControlsPassed!==true||row.actualJointKotlinJvm!==true||
     !SH.test(row.javaArtifactSha256)||!SH.test(row.executionLogSha256)||
     hashes.has(row.javaArtifactSha256)||hashes.has(row.executionLogSha256))fail();
    hashes.add(row.javaArtifactSha256);hashes.add(row.executionLogSha256);
   }
   summaries.push({suite:sp[0],identities:sp[1],conclusion:'FOUR_JOINT_JVMS_LOCAL_REPAIR_EFFECTS_ORTHOGONAL_GLOBAL_CAUSE_UNCERTIFIED'});
  }
  const report={
   schema:'c2-four-direct-original-kotlin-causal-crosses/v1',
   status:'FOUR_TRUE_SHARED_JVM_REPAIR_PAIRS_NONINTERFERING_LOCAL_NO_CAUSAL_FAMILY_INDEPENDENCE',
   originalSourcePairExperiments:4,realJointKotlinJvmExecutions:16,
   scopedNoninterferencePairs:4,benignControlsFailed:0,
   totalOriginalSourcePairs:8,sourcePairResults:summaries,
   unresolvedGlobalCausalIndependence:true,causalFamiliesIndependentlyCertified:0,
   historicalCausalAssignmentsCertifiedClosed:0,externalGoldLabelsCreated:0,
   externalCandidateSourceRead:false,detectorPredictionsRead:false,
   holdoutFrozen:false,precision:null,recall:null,f1:null,sssPlusCertified:false,
   limit:'Combinations compile two frozen original Kotlin modules in one JVM. Some ABIs are test-only bridges; outcomes prove local noninterference on the tested control vectors, not end-to-end Android system interaction, mechanistic family independence, or external GOLD.',
   sourceTrialSha256s:inputs.map(x=>createHash('sha256').update(JSON.stringify(x)).digest('hex'))
  };
  return Object.freeze({...report,evidenceSha256:createHash('sha256').update(JSON.stringify(report)).digest('hex')});
 }catch(e){if(e.message==='C2_FOUR_REAL_CROSSES_BLOCKED')throw e;fail();}
}
module.exports={adjudicateFourDirectCrosses};
