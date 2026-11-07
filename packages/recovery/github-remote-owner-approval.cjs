'use strict';
/**
 * Owner-approved remote JARVIS PR #105 INTENT, authenticated by a GitHub
 * issue_comment and issuer-signed OIDC workload identity. Unlike the old
 * sandbox command this marker is scoped to one exact remote repair.
 *
 * The outcome is a bounded authorization observation, NOT a capability to
 * write. A separate audited executor must recheck it before publication.
 * No claim from issue text, JWT header-provided URL or PR file is trusted.
 */
const crypto=require('node:crypto');
const OWNER='cardenaspiero255-lang',REPO=OWNER+'/Ultra-Sentinel';
const MARKER='ULTRA_SENTINEL_REMOTE_APPROVAL_V1';
const OP='COMMIT_TO_EXISTING_DRAFT_PR_BRANCH';
const TARGET_PLAN_DIGEST='a36b79303c6f75b28564cd30fc4616053ed45f845ee3f92058dd1fcc31112aa4';
const REMOTE_AUDIENCE='urn:ultra-sentinel:one-owner-approval:jarvis-remote-105';
const REMOTE_WORKFLOW=REPO+'/.github/workflows/owner-remote-jarvis-approval.yml@refs/heads/main';
const SHA=/^[a-f0-9]{40}$/,NONCE=/^[a-zA-Z0-9_-]{20,96}$/;
const COMMENTS='https://api.github.com/repos/'+REPO+'/issues/50/comments';
function denied(){throw Error('REMOTE_GITHUB_APPROVAL_DENIED');}
function formatRemoteOwnerApproval({operation,workflowSha,planDigest,nonce,expiresAt,prNumber}={}){
 if(operation!==undefined&&operation!==OP||
    prNumber!==undefined&&prNumber!==105||
    !SHA.test(workflowSha||'')||planDigest!==TARGET_PLAN_DIGEST||
    !NONCE.test(nonce||'')||!Number.isSafeInteger(expiresAt)||expiresAt<1)denied();
 return [MARKER,OP,workflowSha,TARGET_PLAN_DIGEST,nonce,String(expiresAt)].join('|');
}
function decode(segment){
 if(typeof segment!=='string'||segment.length>18000||!/^[A-Za-z0-9_-]+$/.test(segment))denied();
 try{
  const value=JSON.parse(Buffer.from(segment,'base64url').toString('utf8'));
  if(!value||typeof value!=='object'||Array.isArray(value))denied();
  return value;
 }catch{denied();}
}
function verifyIssuer({jwt,jwks,context,now}){
 if(typeof jwt!=='string'||jwt.length>25000||
  !jwks||!Array.isArray(jwks.keys)||jwks.keys.length>100||!context)denied();
 const parts=jwt.split('.');
 if(parts.length!==3||parts.some(x=>!x))denied();
 const header=decode(parts[0]),claim=decode(parts[1]);
 if(header.alg!=='RS256'||header.typ!=='JWT'||
  typeof header.kid!=='string'||!/^[\w.-]{1,128}$/.test(header.kid)||
  header.jku!==undefined||header.jwk!==undefined||header.x5u!==undefined)denied();
 const keys=jwks.keys.filter(k=>k&&k.kid===header.kid&&
  k.kty==='RSA'&&(!k.alg||k.alg==='RS256')&&
  (!k.use||k.use==='sig')&&typeof k.n==='string'&&typeof k.e==='string');
 if(keys.length!==1)denied();
 try{
  const key=crypto.createPublicKey({key:keys[0],format:'jwk'});
  if(!crypto.verify('RSA-SHA256',Buffer.from(parts[0]+'.'+parts[1]),
   {key,padding:crypto.constants.RSA_PKCS1_PADDING},
   Buffer.from(parts[2],'base64url')))denied();
 }catch{denied();}
 const nowSec=Math.floor(now/1000);
 if(claim.iss!=='https://token.actions.githubusercontent.com'||
  claim.aud!==REMOTE_AUDIENCE||
  claim.sub!=='repo:cardenaspiero255-lang@322222186/Ultra-Sentinel@1418338512:ref:refs/heads/main'||
  claim.repository!==REPO||claim.repository_id!=='1418338512'||
  claim.actor!==OWNER||claim.actor_id!=='322222186'||
  claim.ref!=='refs/heads/main'||claim.sha!==context.sha||
  claim.workflow_ref!==REMOTE_WORKFLOW||
  claim.event_name!=='issue_comment'||
  claim.run_id!==context.runId||String(claim.run_attempt)!=='1'||
  claim.runner_environment!=='github-hosted'||
  typeof claim.jti!=='string'||claim.jti.length<6||
  !Number.isSafeInteger(claim.iat)||!Number.isSafeInteger(claim.nbf)||
  !Number.isSafeInteger(claim.exp)||claim.exp<=nowSec||
  claim.iat>nowSec+60||claim.nbf>nowSec+60||
  claim.iat<nowSec-900||claim.exp-claim.iat>900)denied();
}
function verifyRemoteOwnerApproval({jwt,jwks,context,event,request,now=Date.now()}={}){
 if(!Number.isSafeInteger(now)||now<1||!event||typeof event!=='object'||
  Array.isArray(event)||!context||!request||
  !SHA.test(context.sha||'')||context.runAttempt!=='1'||
  context.workflowRef!==REMOTE_WORKFLOW||
  context.eventName!=='issue_comment'||
  context.repoId!=='1418338512'||context.actorId!=='322222186'||
  context.audience!==REMOTE_AUDIENCE||
  !/^[1-9]\d{0,16}$/.test(context.runId||'')||
  request.workflowSha!==context.sha)denied();
 const expected=formatRemoteOwnerApproval(request);
 const c=event.comment;
 if(event.action!=='created'||event.repository?.id!==1418338512||
  event.repository?.full_name!==REPO||
  event.sender?.id!==322222186||event.sender?.login!==OWNER||
  event.issue?.number!==50||event.issue?.pull_request!=null||
  !c||c.user?.id!==322222186||c.user?.login!==OWNER||
  !Number.isSafeInteger(c.id)||c.id<=0||c.body!==expected||
  typeof c.created_at!=='string'||c.created_at!==c.updated_at)denied();
 const created=Date.parse(c.created_at);
 if(!Number.isFinite(created)||created>now+60000||now-created>300000||
  request.expiresAt<=now||request.expiresAt-now>900000||
  request.expiresAt<=created||request.expiresAt-created>900000)denied();
 verifyIssuer({jwt,jwks,context,now});
 return Object.freeze({
  schema:'ultra-sentinel-remote-jarvis-owner-approval/v1',
  status:'REMOTE_OWNER_GITHUB_APPROVAL_VERIFIED',
  workflowSha:context.sha,runId:context.runId,commentId:c.id,
  nonce:request.nonce,expiresAt:request.expiresAt,
  planDigest:TARGET_PLAN_DIGEST,targetRepo:OWNER+'/JARVIS',prNumber:105,
  branch:'fix/ultra-sentinel-polite-voice-20261106',
  ownerId:322222186,githubOIDCVerified:true,
  remoteCommitEligibilityVerified:true,ed25519Required:false,
  remoteWrites:false,mergeAllowed:false,rollbackAuthorized:false,
  productionReleaseAuthorized:false
 });
}
function extractNonce(body){
 if(typeof body!=='string')return null;
 const a=body.split('|');
 if(a.length===7&&a[0]==='ULTRA_SENTINEL_REMOTE_ROLLBACK_V1'&&
  NONCE.test(a[5]||''))return a[5];
 if(a.length!==6||![MARKER,'ULTRA_SENTINEL_OWNER_APPROVAL_V1'].includes(a[0])||
  !NONCE.test(a[4]||''))return null;
 return a[4];
}
async function verifyUniqueRemoteOwnerComment({event,token,fetchImpl=fetch}={}){
 try{
  if(!event||event.action!=='created'||event.repository?.id!==1418338512||
   event.issue?.number!==50||event.issue?.pull_request!=null||
   event.sender?.id!==322222186||event.comment?.user?.id!==322222186||
   !Number.isSafeInteger(event.comment?.id)||event.comment.id<1||
   typeof token!=='string'||token.length<16||
   typeof fetchImpl!=='function')throw Error('BAD_EVENT');
  const n=extractNonce(event.comment.body);
  if(!n||event.comment.body.split('|')[0]!==MARKER)throw Error('BAD_NONCE');
  let found=false,count=0,complete=false;
  for(let page=1;page<=20;page++){
   const response=await fetchImpl(COMMENTS+'?per_page=100&page='+page,{
    method:'GET',redirect:'error',signal:AbortSignal.timeout(15000),
    headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
      'X-GitHub-Api-Version':'2022-11-28'}});
   if(!response?.ok)throw Error('COMMENT_FETCH_FAILED');
   const rows=await response.json();
   if(!Array.isArray(rows)||rows.length>100)throw Error('BAD_COMMENTS');
   for(const row of rows){
    if(extractNonce(row?.body)!==n)continue;
    count++;
    if(row.id===event.comment.id){
     if(row.body!==event.comment.body||
      row.user?.id!==322222186||row.user?.login!==OWNER||
      row.created_at!==event.comment.created_at||
      row.updated_at!==event.comment.updated_at||
      row.updated_at!==row.created_at)throw Error('EDITED_COMMENT');
     found=true;
    }
   }
   if(rows.length<100){complete=true;break;}
  }
  if(!complete||!found||count!==1)throw Error('NONCE_DUPLICATE_OR_MISSING');
  return Object.freeze({status:'REMOTE_OWNER_COMMENT_NONCE_UNIQUE',
   commentId:event.comment.id,nonce:n,unique:true,remoteWrites:false});
 }catch{throw Error('REMOTE_OWNER_NONCE_REPLAY_DENIED');}
}
module.exports={MARKER,TARGET_PLAN_DIGEST,REMOTE_AUDIENCE,REMOTE_WORKFLOW,
 formatRemoteOwnerApproval,verifyRemoteOwnerApproval,verifyUniqueRemoteOwnerComment};
