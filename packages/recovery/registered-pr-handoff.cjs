'use strict';
/*
 * This gate can prepare a PR for HUMAN protected review.
 * It does not call GitHub writes, approve its own PR or merge automatically.
 */
const SHA=/^[0-9a-f]{40}$/;
const REQUIRED=['build','quality','android-test-shards','device-validation',
 'coverage','quality-contracts','SonarCloud Code Analysis'];
const TARGET='app/src/main/java/com/cardenaspiero255/gamehubultra/domain/BatteryAwareGamingEngine.kt';
const TEST='app/src/test/java/com/cardenaspiero255/gamehubultra/domain/BatteryAwareGamingEngineTest.kt';
function blocked(){throw Error('REGISTERED_PR_HANDOFF_BLOCKED');}
function assessRegisteredRepairPr({plan,pr,changedFiles,checkRuns}={}){
 try{
  if(!plan||!pr||!Array.isArray(changedFiles)||!Array.isArray(checkRuns)||
   plan.targetRepo!=='cardenaspiero255-lang/gamehub-ultra'||
   plan.remoteWrites!==false||plan.mergeAllowed!==false||
   plan.maxChangedFiles!==1||plan.targetFile!==TARGET||
   !SHA.test(plan.baseSha||'')||!SHA.test(plan.candidateSha||'')||
   !SHA.test(plan.candidateBlob||'')||
   pr.state!=='open'||pr.draft!==false||pr.mergeable!==true||
   !Number.isSafeInteger(pr.number)||pr.number<1||
   pr.head?.repo?.full_name!==plan.targetRepo||
   pr.base?.repo?.full_name!==plan.targetRepo||
   pr.head?.sha!==plan.candidateSha||pr.base?.sha!==plan.baseSha||
   pr.base?.ref!=='main'||pr.changed_files!==2||
   changedFiles.length!==2||!Array.isArray(changedFiles)||
   changedFiles[0]?.filename!==TARGET||changedFiles[0]?.status!=='modified'||
   changedFiles[0]?.sha!==plan.candidateBlob||
   changedFiles[1]?.filename!==TEST||changedFiles[1]?.status!=='modified')blocked();
  for(const name of REQUIRED){
   const matches=checkRuns.filter(x=>x.name===name&&x.head_sha===plan.candidateSha);
   if(matches.length!==1||matches[0].status!=='completed'||
    matches[0].conclusion!=='success')blocked();
  }
  if(checkRuns.some(x=>x.head_sha===plan.candidateSha&&
      ['failure','cancelled','timed_out','action_required'].includes(x.conclusion)))blocked();
  return Object.freeze({
   status:'PR_REVIEW_READY_NO_AUTO_MERGE',prNumber:pr.number,
   repo:plan.targetRepo,baseSha:plan.baseSha,headSha:plan.candidateSha,
   changedFilesVerified:2,requiredChecksPassed:REQUIRED.length,
   humanReviewRequired:true,car29Required:true,
   remoteWrites:false,autoMergeAllowed:false,
   releaseAuthorized:false
  });
 }catch{blocked();}
}
module.exports={assessRegisteredRepairPr};
