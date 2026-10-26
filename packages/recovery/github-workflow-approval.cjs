'use strict';
/**
 * GitHub-native approval for ONE READ-ONLY sandbox drill.
 * Deliberately NOT an alternative to Ed25519 owner-signed repair authorization.
 * The GitHub API run record and runner context must independently agree.
 */
const REPO='cardenaspiero255-lang/Ultra-Sentinel';
const REPO_ID=1418338512,OWNER_ID=322222186,OWNER='cardenaspiero255-lang';
const WORKFLOW='.github/workflows/owner-one-click-sandbox.yml';
const SHA=/^[a-f0-9]{40}$/;
function denied(){throw Error('APPROVAL_DENIED');}
function validateOwnerWorkflowApproval({run,repository,repositoryId,actorId,ref,
 sha,eventName,runId,runAttempt,workflowRef,now=Date.now()}={}){
 if(!run||typeof run!=='object'||Array.isArray(run)||
  !Number.isSafeInteger(now)||now<=0||
  repository!==REPO||repositoryId!==String(REPO_ID)||
  actorId!==String(OWNER_ID)||ref!=='refs/heads/main'||
  !SHA.test(sha||'')||eventName!=='workflow_dispatch'||
  !/^[1-9]\d{0,16}$/.test(runId||'')||runAttempt!=='1'||
  (workflowRef!==undefined&&workflowRef!==REPO+'/'+WORKFLOW+'@refs/heads/main')||
  run.id!==Number(runId)||run.run_attempt!==1||
  run.event!=='workflow_dispatch'||run.path!==WORKFLOW||
  run.head_branch!=='main'||run.head_sha!==sha||
  run.repository?.id!==REPO_ID||run.repository?.full_name!==REPO||
  run.actor?.id!==OWNER_ID||run.actor?.login!==OWNER||
  run.status!=='in_progress'||run.conclusion!==null||
  typeof run.created_at!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/.test(run.created_at))
  denied();
 const created=Date.parse(run.created_at);
 if(!Number.isFinite(created)||created>now+60000||now-created>900000)denied();
 return Object.freeze({
  schema:'ultra-sentinel-github-owner-sandbox-approval/v1',
  status:'OWNER_GITHUB_SANDBOX_ONLY',
  authorizedForSandboxDrill:true,authorizedForProductionRepair:false,
  signatureSubstituted:false,remoteWritesAllowed:false,
  mergeAllowed:false,deploymentAllowed:false,
  operation:'READ_ONLY_ISOLATION_AND_ROLLBACK_FIXTURE',
  repo:REPO,ownerLogin:OWNER,ownerId:OWNER_ID,
  sha,runId:Number(runId),runAttempt:1,
  createdAt:run.created_at,expiresAt:new Date(created+900000).toISOString()
 });
}
module.exports={validateOwnerWorkflowApproval};
