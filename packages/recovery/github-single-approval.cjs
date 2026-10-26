'use strict';
/**
 * One explicit GitHub-authenticated approval for ONE immutable, owner-selected
 * SANDBOX operation. Never treat a plain chat message as GitHub identity.
 *
 * The caller is a trusted GitHub Actions operator which must fetch JWKS from
 * https://token.actions.githubusercontent.com/.well-known/jwks, not accept
 * issuer keys supplied by an issue body or untrusted PR. No remote writes.
 */
const {verifyGitHubOidcApproval}=require('./github-oidc-approval.cjs');
const REPO='cardenaspiero255-lang/Ultra-Sentinel',OWNER='cardenaspiero255-lang';
const SHA=/^[a-f0-9]{40}$/,DIGEST=/^[a-f0-9]{64}$/;
const NONCE=/^[a-zA-Z0-9_-]{20,96}$/;
const OP='SANDBOX_HUNTER_FIXER_JUDGE';
const MARKER='ULTRA_SENTINEL_OWNER_APPROVAL_V1';
function denied(){throw Error('SINGLE_APPROVAL_DENIED');}
function formatGitHubSingleApproval({operation,workflowSha,planDigest,nonce,expiresAt}={}){
 if(operation!==OP||typeof workflowSha!=='string'||!SHA.test(workflowSha)||
  typeof planDigest!=='string'||!DIGEST.test(planDigest)||
  typeof nonce!=='string'||!NONCE.test(nonce)||
  !Number.isSafeInteger(expiresAt)||expiresAt<1)denied();
 return [MARKER,operation,workflowSha,planDigest,nonce,String(expiresAt)].join('|');
}
function verifyGitHubSingleApproval({oidcJwt,jwks,oidcContext,event,approvedPlan,now=Date.now()}={}){
 if(!Number.isSafeInteger(now)||now<=0||!approvedPlan||
  !event||typeof event!=='object'||Array.isArray(event))denied();
 const canonical=formatGitHubSingleApproval(approvedPlan);
 const message=event.comment?.body;
 if(message!==canonical||
  event.action!=='created'||event.repository?.id!==1418338512||
  event.repository?.full_name!==REPO||
  event.sender?.id!==322222186||event.sender?.login!==OWNER||
  event.issue?.number!==50||event.issue?.pull_request!=null||
  event.comment?.user?.id!==322222186||event.comment?.user?.login!==OWNER||
  !Number.isSafeInteger(event.comment?.id)||event.comment.id<=0||
  typeof event.comment?.created_at!=='string'||
  event.comment?.updated_at!==event.comment?.created_at||
  !oidcContext||oidcContext.purpose!=='ONE_APPROVAL'||
  oidcContext.eventName!=='issue_comment'||
  oidcContext.approvedOwnerIssueComment!==true||
  approvedPlan.workflowSha!==oidcContext.sha)denied();
 const created=Date.parse(event.comment.created_at);
 if(!Number.isFinite(created)||created>now+60000||now-created>300000||
  approvedPlan.expiresAt<=now||
  approvedPlan.expiresAt-now>900000||
  approvedPlan.expiresAt<=created||
  approvedPlan.expiresAt-created>900000)denied();
 const approved=verifyGitHubOidcApproval({jwt:oidcJwt,jwks,context:oidcContext});
 if(approved.status!=='GITHUB_OIDC_OWNER_SANDBOX_APPROVED'||
  approved.eventName!=='issue_comment'||approved.sha!==approvedPlan.workflowSha||
  approved.authorizedForProductionRepair!==false||approved.remoteWrites!==false||
  approved.mergeAllowed!==false||approved.ownerId!==322222186)denied();
 return Object.freeze({
  status:'SINGLE_GITHUB_OWNER_APPROVAL_VERIFIED',
  operation:OP,repo:REPO,workflowSha:approvedPlan.workflowSha,
  planDigest:approvedPlan.planDigest,nonce:approvedPlan.nonce,
  expiresAt:approvedPlan.expiresAt,commentId:event.comment.id,
  runId:approved.runId,githubOwnerIdentityVerified:true,
  ed25519Required:false,productionWritesAllowed:false,
  mergeAllowed:false,remoteWrites:false,automaticDeploymentAllowed:false
 });
}
module.exports={formatGitHubSingleApproval,verifyGitHubSingleApproval,MARKER};
