#!/usr/bin/env node
'use strict';
/**
 * GitHub-hosted owner-only rollback of pinned JARVIS #105 repair commit.
 * This entrypoint cannot sign, merge, force-update or write protected main.
 * Live independent OIDC/comment check is performed INSIDE the rollback engine.
 */
const path=require('node:path'),fs=require('node:fs');
const {WORKFLOW}=require('../packages/recovery/github-remote-owner-rollback.cjs');
const {main:verifyLiveRollback}=
 require('./verify-remote-jarvis-rollback-workflow.cjs');
const {runSupervisedGitHubBranchRollback}=
 require('../packages/recovery/supervised-github-branch-rollback.cjs');
function deny(){throw Error('OWNER_GITHUB_REMOTE_ROLLBACK_BLOCKED');}
function environment(env=process.env){
 if(env.GITHUB_ACTIONS!=='true'||env.GITHUB_WORKFLOW_REF!==WORKFLOW||
  env.GITHUB_EVENT_NAME!=='issue_comment'||env.GITHUB_ACTOR_ID!=='322222186'||
  env.GITHUB_REPOSITORY!=='cardenaspiero255-lang/Ultra-Sentinel'||
  env.GITHUB_REF!=='refs/heads/main'||env.GITHUB_RUN_ATTEMPT!=='1'||
  !path.isAbsolute(env.RUNNER_TEMP||'')||
  typeof env.ULTRA_OWNER_COMMENT_READ_TOKEN!=='string'||
  env.ULTRA_OWNER_COMMENT_READ_TOKEN.length<16||
  typeof env.ULTRA_SENTINEL_JARVIS_OWNER_TOKEN!=='string'||
  env.ULTRA_SENTINEL_JARVIS_OWNER_TOKEN.length<16||
  !['true','false',undefined].includes(env.ULTRA_SENTINEL_REMOTE_ROLLBACK_APPLY))deny();
 const apply=env.ULTRA_SENTINEL_REMOTE_ROLLBACK_APPLY==='true';
 if(apply&&env.ULTRA_SENTINEL_REMOTE_ROLLBACK_APPLY_CONFIRMED!=='true')deny();
 return apply;
}
async function main({env=process.env,fetchImpl=fetch}={}){
 try{
  const apply=environment(env);
  const authorization=await verifyLiveRollback({env,fetchImpl,writeReceipt:false});
  if(authorization.status!=='GITHUB_REMOTE_ROLLBACK_OWNER_VERIFIED'||
   authorization.authenticatedLiveSource!==true||
   authorization.nonceReplayBlocked!==true||
   authorization.rollbackAuthorized!==true||
   authorization.remoteWrites!==false||
   authorization.mergeAllowed!==false)deny();
  // For the real GitHub Actions invocation env is the actual process.env.
  // Other env injections can only be used for read-only tests.
  if(apply&&env!==process.env)deny();
  const result=await runSupervisedGitHubBranchRollback({
   plan:authorization.rollbackPlan,
   githubOwnerRollbackApproval:true,token:env.ULTRA_SENTINEL_JARVIS_OWNER_TOKEN,
   nonceStorePath:path.join(env.RUNNER_TEMP,'owner-github-rollback-nonces'),
   fetchImpl,apply
  });
  if(apply){
   if(result.status!=='OWNER_APPROVED_REMOTE_ROLLBACK_VERIFIED'||
    result.remoteWrites!==true||result.ownerNonceConsumed!==true||
    result.mergeAllowed!==false)deny();
   fs.writeFileSync(path.join(env.RUNNER_TEMP,'owner-github-rollback-result.json'),
    JSON.stringify({status:result.status,commitSha:result.commitSha,
     restoredTreeSha:result.restoredTreeSha,repairHeadSha:result.repairHeadSha,
     planDigest:result.planDigest,remoteWrites:true,mergeAllowed:false})+'\n',
    {flag:'wx',mode:0o600});
   process.stdout.write('OWNER_GITHUB_REMOTE_ROLLBACK_TREE_RESTORED\n');
  }else{
   if(result.status!=='OWNER_SIGNED_REMOTE_ROLLBACK_READY'||
    result.remoteWrites!==false||result.ownerNonceConsumed!==false)deny();
   process.stdout.write('OWNER_GITHUB_REMOTE_ROLLBACK_PREFLIGHT_NO_WRITE\n');
  }
  return result;
 }catch{deny();}
}
if(require.main===module)main().catch(()=>{
 process.stderr.write('OWNER_GITHUB_REMOTE_ROLLBACK_BLOCKED\n');
 process.exitCode=1;
});
module.exports={main,environment};
