'use strict';
const {createHash}=require('node:crypto');
const fail=()=>{throw Error('C2_PR153_LINEAGE_BLOCKED');};
const old={id:38889693623,head_sha:'71aa7937625daa9945bbaf0a495a4f9073c5faaa',path:'.github/workflows/c2-next-pr153-pending-rollback-oracle.yml',
 event:'issue_comment',conclusion:'success'};
const fresh={id:39952600537,head_sha:'f1e65032d65e84907b8f2d52fcaa7b1610d4ba0b',
 path:'.github/workflows/c2-rollback-cross-owner.yml',event:'pull_request',conclusion:'success',status:'completed'};
const artifact={id:12501326370,name:'c2-rollback-original-six-jvm-not-certified',
 digest:'sha256:0cc4fdcb3c672ddfe6f6aeba35fd63cff5a909f79b1105aa9d7c34cb1532c910'};
const originalArtifact=12040619454;
const sources=[
 {id:'153:71',head:'6508cc124076b9dea437ea1efc213d3ce55d7baf',blob:'d8708fd6245cea2e8dab4404ef5bfb7e682e1a6f'},
 {id:'152:41',head:'104b7dc33e4c0341cec3fca81e3c8fbe3625357f',blob:'ed936aa687b08cf8d964d54f9d88e68bb12344ec'},
 {id:'153:69',head:'6508cc124076b9dea437ea1efc213d3ce55d7baf',blob:'18911c26a9afaf051fda0e9ea14cdaccf943a47b'}
];
function attestReplacementLineage({oldRun,oldArtifacts,newRun,newArtifacts,replay}={}){
 try{
  const matches=(v,o)=>v&&Object.entries(o).every(([k,w])=>v[k]===w);
  if(!matches(oldRun,old)||!matches(newRun,fresh)||
   oldRun.actor?.id!==322222186||oldRun.repository?.id!==1418338512||
   newRun.actor?.id!==322222186||newRun.repository?.id!==1418338512||
   !oldArtifacts||oldArtifacts.total_count!==0||!Array.isArray(oldArtifacts.artifacts)||
   oldArtifacts.artifacts.length!==0||
   !Array.isArray(newArtifacts?.artifacts)||
   newArtifacts.artifacts.filter(x=>matches(x,artifact)&&x.expired===false&&
    x.workflow_run?.id===fresh.id&&x.workflow_run?.repository_id===1418338512).length!==1||
   !replay||replay.schema!=='c2-rollback-153-152-original-cross-verified/v1'||
   replay.status!=='SIX_REAL_KOTLIN_JVMS_ROLLBACK_LOCAL_EFFECTS_SEPARABLE_CAUSAL_FAMILIES_UNPROVEN'||
   !Array.isArray(replay.sources)||replay.sources.length!==3||
   replay.sources.some((s,i)=>!matches(s,sources[i]))||
   replay.originalKotlinJvmExecutions!==6||replay.adaptiveRepairEffectVerified!==true||
   replay.negative153Line69Validated!==true||replay.familiesIndependentlyCertified!==0||
   replay.historicalCausesClosed!==0||replay.newGoldLabels!==0||
   replay.candidateSourceRead!==false||replay.detectorPredictionsRead!==false||
   replay.holdoutFrozen!==false||replay.precision!==null||replay.recall!==null||
   replay.f1!==null||replay.sssPlusCertified!==false||
   !/^[a-f0-9]{64}$/.test(replay.evidenceSha256))fail();
  const report={
   schema:'c2-pr153-original-loss-and-new-jvm-lineage/v1',
   status:'ORIGINAL_ARTIFACT_ABSENT_FRESH_REPRODUCTION_AUTHENTICATED_NOT_EQUIVALENT_ARCHIVE',
   historicalOriginalRunId:old.id,historicalOriginalArtifactId:originalArtifact,
   historicalOriginalExpectedArchiveDigest:'sha256:a9787a48048ea2e344fbb5bb9954f91e063cbe55551f0799f46e0c209bbd743c',
   historicalOriginalRunStillAuthenticated:true,
   originalArtifactCurrentlyAvailable:false,originalReceiptRecoveredFromOriginalArtifact:false,
   oldArchiveDigestRecomputed:false,
   newReceiptDistinctFromOriginal:true,newOwnerRunId:fresh.id,newOwnerArtifactId:artifact.id,
   newOwnerArchiveDigest:artifact.digest,newSourceWitnessDigest:replay.evidenceSha256,
   sourceCaseIdentity:'153:71',sourceGitHead:sources[0].head,sourceGitBlob:sources[0].blob,
   negativeControlIdentity:'153:69',freshOriginalSourceJVMReproduced:true,
   previousArchivedRunArtifactsReauthenticated:14,originalMissingRunArtifacts:1,
   historicalIdentityCountUnchanged:23,independentSourceTruthCertified:false,
   causalFamiliesCertified:0,externalGoldLabelsCreated:0,
   nextcloudSourceReleased:false,holdoutFrozen:false,precision:null,recall:null,f1:null,
   sssPlusCertified:false,
   caveat:'The expired or deleted original ZIP remains unavailable. This new original-source Kotlin replay proves a fresh bounded behavior, NOT recovery of original ZIP bytes nor independent blind ground truth.'
  };
  return Object.freeze({...report,lineageSha256:createHash('sha256').update(JSON.stringify(report)).digest('hex')});
 }catch(e){if(e?.message==='C2_PR153_LINEAGE_BLOCKED')throw e;fail();}
}
module.exports={attestReplacementLineage};
