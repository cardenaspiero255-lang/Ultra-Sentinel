'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {attestReplacementLineage}=require('../../packages/quality-gates/c2-pr153-replacement-lineage.cjs');
const H=n=>n.toString(16).padStart(64,'0');
function fixture(){
 return {
  oldRun:{id:38889693623,head_sha:'71aa7937625daa9945bbaf0a495a4f9073c5faaa',
   path:'.github/workflows/c2-next-pr153-pending-rollback-oracle.yml',
   conclusion:'success',event:'issue_comment',actor:{id:322222186},repository:{id:1418338512}},
  oldArtifacts:{total_count:0,artifacts:[]},
  newRun:{id:39952600537,head_sha:'f1e65032d65e84907b8f2d52fcaa7b1610d4ba0b',
   path:'.github/workflows/c2-rollback-cross-owner.yml',conclusion:'success',
   status:'completed',event:'pull_request',actor:{id:322222186},repository:{id:1418338512}},
  newArtifacts:{artifacts:[{id:12501326370,name:'c2-rollback-original-six-jvm-not-certified',
   digest:'sha256:0cc4fdcb3c672ddfe6f6aeba35fd63cff5a909f79b1105aa9d7c34cb1532c910',
   expired:false,workflow_run:{id:39952600537,repository_id:1418338512}}]},
  replay:{schema:'c2-rollback-153-152-original-cross-verified/v1',
   status:'SIX_REAL_KOTLIN_JVMS_ROLLBACK_LOCAL_EFFECTS_SEPARABLE_CAUSAL_FAMILIES_UNPROVEN',
   sources:[
    {id:'153:71',head:'6508cc124076b9dea437ea1efc213d3ce55d7baf',
     blob:'d8708fd6245cea2e8dab4404ef5bfb7e682e1a6f'},
    {id:'152:41',head:'104b7dc33e4c0341cec3fca81e3c8fbe3625357f',
     blob:'ed936aa687b08cf8d964d54f9d88e68bb12344ec'},
    {id:'153:69',head:'6508cc124076b9dea437ea1efc213d3ce55d7baf',
     blob:'18911c26a9afaf051fda0e9ea14cdaccf943a47b'}
   ],originalKotlinJvmExecutions:6,adaptiveRepairEffectVerified:true,
   negative153Line69Validated:true,familiesIndependentlyCertified:0,historicalCausesClosed:0,
   newGoldLabels:0,candidateSourceRead:false,detectorPredictionsRead:false,
   holdoutFrozen:false,precision:null,recall:null,f1:null,sssPlusCertified:false,evidenceSha256:H(29)}
 };
}
test('RED: authentic lost original run and newly reproduced distinct owner source witness without rewriting original',()=>{
 const result=attestReplacementLineage(fixture());
 assert.equal(result.schema,'c2-pr153-original-loss-and-new-jvm-lineage/v1');
 assert.equal(result.originalArtifactCurrentlyAvailable,false);
 assert.equal(result.originalReceiptRecoveredFromOriginalArtifact,false);
 assert.equal(result.historicalOriginalArtifactId,12040619454);
 assert.equal(result.historicalOriginalRunStillAuthenticated,true);
 assert.equal(result.freshOriginalSourceJVMReproduced,true);
 assert.equal(result.oldArchiveDigestRecomputed,false);
 assert.equal(result.newReceiptDistinctFromOriginal,true);
 assert.equal(result.previousArchivedRunArtifactsReauthenticated,14);
 assert.equal(result.originalMissingRunArtifacts,1);
 assert.equal(result.causalFamiliesCertified,0);
 assert.equal(result.externalGoldLabelsCreated,0);
 assert.equal(result.sssPlusCertified,false);
 assert.match(result.lineageSha256,/^[0-9a-f]{64}$/);
});
test('RED: reject fabricated loss, wrong archive identity, no new JVM or forged causal clearance',()=>{
 const changes=[
  x=>{x.oldArtifacts.artifacts.push({id:12040619454});x.oldArtifacts.total_count=1},
  x=>{x.oldRun.head_sha='0'.repeat(40)},
  x=>{x.newRun.head_sha='0'.repeat(40)},
  x=>{x.newRun.conclusion='failure'},
  x=>{x.newArtifacts.artifacts[0].digest='sha256:'+H(32)},
  x=>{x.replay.sources[0].blob='0'.repeat(40)},
  x=>{x.replay.originalKotlinJvmExecutions=0},
  x=>{x.replay.familiesIndependentlyCertified=1},
  x=>{x.replay.newGoldLabels=1},
  x=>{x.replay.negative153Line69Validated=false}
 ];
 for(const mutate of changes){const v=fixture();mutate(v);
  assert.throws(()=>attestReplacementLineage(v),/C2_PR153_LINEAGE_BLOCKED/);
 }
});
