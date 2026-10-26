'use strict';
/**
 * Verify GitHub issuer's RS256 OIDC ID token against independently fetched
 * GitHub JWKS. Workload identity, NOT the owner's personal Ed25519 signature.
 * Grants ONLY a predetermined isolated test, never remote/production repair.
 */
const crypto=require('node:crypto');
const OWNER='cardenaspiero255-lang',REPO=OWNER+'/Ultra-Sentinel';
const FLOW=REPO+'/.github/workflows/gamehub-pr151-owner-e2e.yml@refs/heads/main';
const AUD='urn:ultra-sentinel:gamehub-pr151:sandbox';
const SINGLE_AUD='urn:ultra-sentinel:one-owner-approval:sandbox';
const SINGLE_FLOW=REPO+'/.github/workflows/owner-single-approval.yml@refs/heads/main';
function denied(){throw Error('OIDC_APPROVAL_DENIED');}
function decode(part){
 if(typeof part!=='string'||part.length>20000||!/^[A-Za-z0-9_-]+$/.test(part))denied();
 try{return JSON.parse(Buffer.from(part,'base64url').toString('utf8'));}
 catch{denied();}
}
function verifyGitHubOidcApproval({jwt,jwks,context}={}){
 if(typeof jwt!=='string'||jwt.length>25000||!context||!jwks||
  !Array.isArray(jwks.keys)||jwks.keys.length>100)denied();
 const parts=jwt.split('.');
 if(parts.length!==3||parts.some(x=>!x))denied();
 const header=decode(parts[0]),claim=decode(parts[1]);
 if(!header||typeof header!=='object'||Array.isArray(header)||
  header.alg!=='RS256'||header.typ!=='JWT'||
  typeof header.kid!=='string'||header.kid.length>128||
  !/^[\w.-]+$/.test(header.kid)||header.jku!==undefined||
  header.jwk!==undefined||header.x5u!==undefined||
  !claim||typeof claim!=='object'||Array.isArray(claim))denied();
 const matches=jwks.keys.filter(k=>k&&k.kid===header.kid&&
  k.kty==='RSA'&&(!k.alg||k.alg==='RS256')&&(!k.use||k.use==='sig')&&
  typeof k.n==='string'&&typeof k.e==='string');
 if(matches.length!==1)denied();
 try{
  const key=crypto.createPublicKey({key:matches[0],format:'jwk'});
  const valid=crypto.verify('RSA-SHA256',Buffer.from(parts[0]+'.'+parts[1]),
   {key,padding:crypto.constants.RSA_PKCS1_PADDING},
   Buffer.from(parts[2],'base64url'));
  if(!valid)denied();
 }catch{denied();}
 const single=context.purpose==='ONE_APPROVAL';
 const expectedAudience=single?SINGLE_AUD:AUD;
 const expectedWorkflow=single?SINGLE_FLOW:FLOW;
 const now=context.now??Math.floor(Date.now()/1000);
 if(!Number.isSafeInteger(now)||typeof context.sha!=='string'||
  !/^[0-9a-f]{40}$/.test(context.sha)||
  !/^[1-9]\d{0,16}$/.test(context.runId||'')||
  context.actorId!=='322222186'||context.repoId!=='1418338512'||
  context.audience!==expectedAudience||
  claim.iss!=='https://token.actions.githubusercontent.com'||
  claim.aud!==expectedAudience||
  claim.sub!=='repo:'+ 'cardenaspiero255-lang@322222186/Ultra-Sentinel@1418338512' +':ref:refs/heads/main'||
  claim.repository!==REPO||claim.repository_id!=='1418338512'||
  claim.actor!==OWNER||claim.actor_id!=='322222186'||
  claim.ref!=='refs/heads/main'||claim.sha!==context.sha||
  !(single?
     claim.event_name==='issue_comment'&&context.eventName==='issue_comment'&&context.approvedOwnerIssueComment===true:
     claim.event_name==='workflow_dispatch'&&(context.eventName===undefined||context.eventName==='workflow_dispatch') ||
     claim.event_name==='issue_comment'&&context.eventName==='issue_comment'&&context.approvedOwnerIssueComment===true)||
  claim.run_id!==context.runId||String(claim.run_attempt)!=='1'||
  claim.workflow_ref!==expectedWorkflow||claim.runner_environment!=='github-hosted'||
  typeof claim.jti!=='string'||claim.jti.length<6||
  !Number.isSafeInteger(claim.iat)||!Number.isSafeInteger(claim.nbf)||
  !Number.isSafeInteger(claim.exp)||claim.exp<=now||
  claim.iat>now+60||claim.nbf>now+60||
  claim.iat<now-900||claim.exp-claim.iat>900)denied();
 return Object.freeze({
  schema:'ultra-sentinel-github-oidc-owner-approval/v1',
  status:'GITHUB_OIDC_OWNER_SANDBOX_APPROVED',
  sha:claim.sha,runId:claim.run_id,ownerId:322222186,
  cryptographicallyVerified:true,
  authorizedForSandboxDrill:true,authorizedForProductionRepair:false,
  ed25519OwnerSignatureVerified:false,remoteWrites:false,mergeAllowed:false,
  runAttempt:1,eventName:claim.event_name,audience:expectedAudience
 });
}
module.exports={verifyGitHubOidcApproval,AUDIENCE:AUD};
