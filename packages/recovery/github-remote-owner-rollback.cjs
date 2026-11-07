'use strict';
/**
 * Separate GitHub OIDC owner authorization for ONE RESTORE commit on JARVIS
 * draft #105. No repair approval or sandbox approval can authorize rollback.
 * This verifier makes no GitHub write and never trusts a receipt as a grant.
 */
const crypto=require('node:crypto');
const {digestRollbackPlan}=require('./supervised-github-branch-rollback.cjs');
const OWNER='cardenaspiero255-lang',REPO=OWNER+'/Ultra-Sentinel';
const TARGET=OWNER+'/JARVIS';
const MARKER='ULTRA_SENTINEL_REMOTE_ROLLBACK_V1';
const OP='ROLLBACK_EXISTING_DRAFT_PR_BRANCH';
const AUDIENCE='urn:ultra-sentinel:one-owner-approval:jarvis-rollback-105';
const WORKFLOW=REPO+'/.github/workflows/owner-remote-jarvis-rollback.yml@refs/heads/main';
const COMMENTS='https://api.github.com/repos/'+REPO+'/issues/50/comments';
const SHA=/^[a-f0-9]{40}$/,DIGEST=/^[a-f0-9]{64}$/;
const NONCE=/^[A-Za-z0-9_-]{20,96}$/;
const PREFIX='apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/';
const PINS=Object.freeze([
 Object.freeze({path:PREFIX+'LocalGgufPolicy.kt',
  beforeBlobSha:'46e9dd8b4d0fe861935bfb5ee5160cd39f3b5a78',
  afterBlobSha:'b7659a9cf4cb5035047cb3c59540118ce61f7959'}),
 Object.freeze({path:PREFIX+'OfflineVoiceQuestionGate.kt',
  beforeBlobSha:'bdc3a6a576b3473454df232cd21e3a9a3c4e6465',
  afterBlobSha:'a12a768582fe731da2639ab1948a7e0cc1c714d7'})
]);
const BASE='747c14b5d97750a7b2736968e2d516f02448558d';
const ORIGINAL='a88a29ba4119d3f68b2268367f594a0ac1168f9e';
const ORIGINAL_TREE='b48da9292d1f26669eb30b483ee19e59944041e5';
const BRANCH='fix/ultra-sentinel-polite-voice-20261106';
function deny(){throw Error('REMOTE_GITHUB_ROLLBACK_DENIED');}
function createPinnedRollbackPlan({repairHeadSha,repairTreeSha}={}){
 if(!SHA.test(repairHeadSha||'')||!SHA.test(repairTreeSha||'')||
  repairHeadSha===ORIGINAL||repairTreeSha===ORIGINAL_TREE)deny();
 return Object.freeze({repository:TARGET,prNumber:105,branch:BRANCH,
  operation:OP,expectedMainSha:BASE,originalHeadSha:ORIGINAL,
  originalTreeSha:ORIGINAL_TREE,repairHeadSha,repairTreeSha,
  files:PINS.map(f=>({...f}))});
}
function formatRollbackApproval({workflowSha,planDigest,repairHeadSha,nonce,expiresAt,operation}={}){
 if(operation!==undefined&&operation!==OP||!SHA.test(workflowSha||'')||
  !DIGEST.test(planDigest||'')||!SHA.test(repairHeadSha||'')||
  repairHeadSha===ORIGINAL||!NONCE.test(nonce||'')||
  !Number.isSafeInteger(expiresAt)||expiresAt<1)deny();
 return [MARKER,OP,workflowSha,planDigest,repairHeadSha,
  nonce,String(expiresAt)].join('|');
}
function decode(piece){
 if(typeof piece!=='string'||piece.length>20000||!/^[A-Za-z0-9_-]+$/.test(piece))deny();
 try{
  const x=JSON.parse(Buffer.from(piece,'base64url').toString('utf8'));
  if(!x||typeof x!=='object'||Array.isArray(x))deny();
  return x;
 }catch{deny();}
}
function verifyIssuer(jwt,jwks,context,now){
 if(typeof jwt!=='string'||jwt.length>25000||!jwks||
  !Array.isArray(jwks.keys)||jwks.keys.length>100)deny();
 const segments=jwt.split('.');
 if(segments.length!==3||segments.some(x=>!x))deny();
 const header=decode(segments[0]),claim=decode(segments[1]);
 if(header.alg!=='RS256'||header.typ!=='JWT'||
  typeof header.kid!=='string'||!/^[\w.-]{1,128}$/.test(header.kid)||
  header.jku!==undefined||header.jwk!==undefined||header.x5u!==undefined)deny();
 const matches=jwks.keys.filter(x=>x&&x.kid===header.kid&&x.kty==='RSA'&&
  (!x.alg||x.alg==='RS256')&&(!x.use||x.use==='sig')&&
  typeof x.n==='string'&&typeof x.e==='string');
 if(matches.length!==1)deny();
 try{
  const key=crypto.createPublicKey({key:matches[0],format:'jwk'});
  if(!crypto.verify('RSA-SHA256',Buffer.from(segments[0]+'.'+segments[1]),
   {key,padding:crypto.constants.RSA_PKCS1_PADDING},
   Buffer.from(segments[2],'base64url')))deny();
 }catch{deny();}
 const nowS=Math.floor(now/1000);
 if(claim.iss!=='https://token.actions.githubusercontent.com'||
  claim.aud!==AUDIENCE||
  claim.sub!=='repo:cardenaspiero255-lang@322222186/Ultra-Sentinel@1418338512:ref:refs/heads/main'||
  claim.repository!==REPO||claim.repository_id!=='1418338512'||
  claim.actor!==OWNER||claim.actor_id!=='322222186'||
  claim.ref!=='refs/heads/main'||claim.sha!==context.sha||
  claim.event_name!=='issue_comment'||claim.run_id!==context.runId||
  String(claim.run_attempt)!=='1'||claim.workflow_ref!==WORKFLOW||
  claim.runner_environment!=='github-hosted'||
  typeof claim.jti!=='string'||claim.jti.length<6||
  !Number.isSafeInteger(claim.iat)||!Number.isSafeInteger(claim.nbf)||
  !Number.isSafeInteger(claim.exp)||claim.exp<=nowS||
  claim.iat>nowS+60||claim.nbf>nowS+60||claim.iat<nowS-900||
  claim.exp-claim.iat>900)deny();
}
function verifyRollbackOwnerApproval({jwt,jwks,context,event,plan,request,now=Date.now()}={}){
 if(!Number.isSafeInteger(now)||now<1||!context||
  context.workflowRef!==WORKFLOW||context.audience!==AUDIENCE||
  context.eventName!=='issue_comment'||context.runAttempt!=='1'||
  context.repoId!=='1418338512'||context.actorId!=='322222186'||
  !SHA.test(context.sha||'')||!/^[1-9]\d{0,16}$/.test(context.runId||'')||
  !request||request.workflowSha!==context.sha||!event)deny();
 const canonicalPlan=createPinnedRollbackPlan({
  repairHeadSha:plan?.repairHeadSha,repairTreeSha:plan?.repairTreeSha});
 if(JSON.stringify(plan)!==JSON.stringify(canonicalPlan)||
  request.planDigest!==digestRollbackPlan(canonicalPlan)||
  request.repairHeadSha!==plan.repairHeadSha)deny();
 const expected=formatRollbackApproval(request);
 const c=event.comment;
 if(event.action!=='created'||event.repository?.id!==1418338512||
  event.repository?.full_name!==REPO||
  event.sender?.id!==322222186||event.sender?.login!==OWNER||
  event.issue?.number!==50||event.issue?.pull_request!=null||
  !c||c.user?.id!==322222186||c.user?.login!==OWNER||
  !Number.isSafeInteger(c.id)||c.id<=0||c.body!==expected||
  typeof c.created_at!=='string'||c.created_at!==c.updated_at)deny();
 const created=Date.parse(c.created_at);
 if(!Number.isFinite(created)||created>now+60000||now-created>300000||
  request.expiresAt<=now||request.expiresAt-now>900000||
  request.expiresAt<=created||request.expiresAt-created>900000)deny();
 verifyIssuer(jwt,jwks,context,now);
 return Object.freeze({
  schema:'ultra-sentinel-remote-jarvis-rollback-owner/v1',
  status:'GITHUB_REMOTE_ROLLBACK_OWNER_VERIFIED',workflowSha:context.sha,
  runId:context.runId,commentId:c.id,
  nonce:request.nonce,expiresAt:request.expiresAt,
  planDigest:request.planDigest,targetRepo:TARGET,prNumber:105,
  branch:BRANCH,repairHeadSha:plan.repairHeadSha,
  originalHeadSha:ORIGINAL,ownerId:322222186,
  rollbackAuthorized:true,ed25519Required:false,
  remoteWrites:false,mergeAllowed:false,productionReleaseAuthorized:false
 });
}
function nonceOf(body){
 if(typeof body!=='string')return null;
 const parts=body.split('|');
 if(parts[0]===MARKER&&parts.length===7&&NONCE.test(parts[5]||''))return parts[5];
 if(['ULTRA_SENTINEL_REMOTE_APPROVAL_V1','ULTRA_SENTINEL_OWNER_APPROVAL_V1'].includes(parts[0])&&
  parts.length===6&&NONCE.test(parts[4]||''))return parts[4];
 return null;
}
async function verifyRollbackNonce({event,token,fetchImpl=fetch}={}){
 try{
  if(event?.action!=='created'||event.repository?.id!==1418338512||
   event.issue?.number!==50||event.issue?.pull_request!=null||
   event.sender?.id!==322222186||event.comment?.user?.id!==322222186||
   !Number.isSafeInteger(event.comment?.id)||event.comment.id<=0||
   typeof token!=='string'||token.length<16||
   typeof fetchImpl!=='function'||event.comment.body.split('|')[0]!==MARKER)deny();
  const nonce=nonceOf(event.comment.body);
  if(!nonce)deny();
  let found=false,count=0,complete=false;
  for(let page=1;page<=20;page++){
   const response=await fetchImpl(COMMENTS+'?per_page=100&page='+page,{
    method:'GET',redirect:'error',signal:AbortSignal.timeout(15000),
    headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
     'X-GitHub-Api-Version':'2022-11-28'}});
   if(!response?.ok)deny();
   const rows=await response.json();
   if(!Array.isArray(rows)||rows.length>100)deny();
   for(const c of rows){
    if(nonceOf(c?.body)!==nonce)continue;
    count++;
    if(c.id===event.comment.id){
     if(c.body!==event.comment.body||
      c.user?.id!==322222186||c.user?.login!==OWNER||
      c.created_at!==event.comment.created_at||
      c.updated_at!==event.comment.updated_at||
      c.updated_at!==c.created_at)deny();
     found=true;
    }
   }
   if(rows.length<100){complete=true;break;}
  }
  if(!complete||!found||count!==1)deny();
  return Object.freeze({status:'REMOTE_OWNER_ROLLBACK_NONCE_UNIQUE',
   commentId:event.comment.id,nonce,unique:true,remoteWrites:false});
 }catch{throw Error('REMOTE_GITHUB_ROLLBACK_NONCE_DENIED');}
}
module.exports={MARKER,AUDIENCE,WORKFLOW,createPinnedRollbackPlan,
 formatRollbackApproval,verifyRollbackOwnerApproval,verifyRollbackNonce};
