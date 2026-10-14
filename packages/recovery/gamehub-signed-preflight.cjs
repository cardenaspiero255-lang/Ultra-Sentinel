'use strict';
/* Production-facing adapter: cryptographic owner consent + independently
 * attested security review feed the EXISTING GameHub preflight (#37).
 * NO executor, push, approvals, merge, or GitHub write scopes here.
 */
const crypto=require('node:crypto');
const {authenticateGitHubOwner}=require('./github-owner-identity.cjs');
const {PersistentNonceStore}=require('./owner-authorization.cjs');
const {preflightRepair,REPO}=require('../../adapters/gamehub/ultra_sentinel_repair_authorization.cjs');
const OWNER='cardenaspiero255-lang',OWNER_ID=322222186;
const SCOPE='repair:commit-to-pr-branch';
const OWNER_DOMAIN='Ultra-Sentinel:gamehub-owner-consent:v1\n';
const AUDIT_DOMAIN='Ultra-Sentinel:gamehub-audit-evidence:v1\n';
const SHA=/^[a-f0-9]{40}$/,DIGEST=/^[a-f0-9]{64}$/;
function validInteger(v){return Number.isSafeInteger(v)&&v>0;}
function fail(code){throw Error(code);}
function digestContext(ctx){
 if(!ctx||ctx.repository!==REPO||!validInteger(ctx.number)||!SHA.test(ctx.headSha||'')||
   !Array.isArray(ctx.files)||!ctx.files.length||ctx.files.length>50||
   !Array.isArray(ctx.requiredChecks)||!ctx.requiredChecks.length||
   ctx.requiredChecks.length>100||
   ctx.files.some(x=>typeof x!=='string')||
   ctx.requiredChecks.some(x=>typeof x!=='string'))fail('INVALID_PREFLIGHT_CONTEXT');
 return crypto.createHash('sha256').update(JSON.stringify({
  repository:ctx.repository,pr:ctx.number,headSha:ctx.headSha,
  files:[...ctx.files].sort(),requiredChecks:[...ctx.requiredChecks].sort()
 })).digest('hex');
}
function canonicalApproval(a){
 if(!a||a.schema!=='gamehub-owner-consent/v1'||a.repository!==REPO||
  !validInteger(a.prNumber)||!SHA.test(a.headSha||'')||
  a.actorLogin!==OWNER||a.actorId!==OWNER_ID||a.scope!==SCOPE||
  typeof a.nonce!=='string'||!/^[a-zA-Z0-9_-]{24,128}$/.test(a.nonce)||
  !validInteger(a.issuedAt)||!validInteger(a.expiresAt)||
  !DIGEST.test(a.contextDigest||''))fail('INVALID_OWNER_CONSENT');
 return JSON.stringify({schema:a.schema,repository:a.repository,prNumber:a.prNumber,
  headSha:a.headSha,actorLogin:a.actorLogin,actorId:a.actorId,
  scope:a.scope,nonce:a.nonce,issuedAt:a.issuedAt,
  expiresAt:a.expiresAt,contextDigest:a.contextDigest});
}
function canonicalAudit(a){
 if(!a||a.schema!=='gamehub-security-audit/v1'||a.repository!==REPO||
   !validInteger(a.prNumber)||!SHA.test(a.headSha||'')||
   !DIGEST.test(a.contextDigest||'')||
   a.verdict!=='CLEAR'||typeof a.auditor!=='string'||
   !/^[a-zA-Z0-9_-]{3,80}$/.test(a.auditor)||a.auditor===OWNER||
   !validInteger(a.issuedAt))fail('INVALID_AUDIT_EVIDENCE');
 return JSON.stringify({schema:a.schema,repository:a.repository,prNumber:a.prNumber,
  headSha:a.headSha,contextDigest:a.contextDigest,verdict:a.verdict,
  auditor:a.auditor,issuedAt:a.issuedAt});
}
function publicKey(value){
 const key=value instanceof crypto.KeyObject?value:crypto.createPublicKey(value);
 if(key.type!=='public'||key.asymmetricKeyType!=='ed25519')fail('UNTRUSTED_ATTESTATION_KEY');
 return key;
}
function verifies(key,domain,canonical,signature){
 if(typeof signature!=='string'||!/^[A-Za-z0-9+/]{86}==$/.test(signature))return false;
 return crypto.verify(null,Buffer.from(domain+canonical),key,Buffer.from(signature,'base64'));
}
async function signedGameHubPreflight(ctx,{
 token,ownerApproval,ownerSignature,ownerPublicKey,
 auditReceipt,auditSignature,auditPublicKey,nonceStorePath,
 fetchImpl=globalThis.fetch
}={}){
 const now=Date.now(); // NEVER accept an untrusted clock from PR input.
 const context={...ctx,now};
 return preflightRepair(context,async({repository,prNumber,sha,scope})=>{
  const digest=digestContext(context);
  const consent=canonicalApproval(ownerApproval);
  const audit=canonicalAudit(auditReceipt);
  if(repository!==REPO||prNumber!==context.number||sha!==context.headSha||scope!==SCOPE||
   ownerApproval.repository!==repository||ownerApproval.prNumber!==prNumber||
   ownerApproval.headSha!==sha||ownerApproval.contextDigest!==digest||
   auditReceipt.repository!==repository||auditReceipt.prNumber!==prNumber||
   auditReceipt.headSha!==sha||auditReceipt.contextDigest!==digest||
   ownerApproval.issuedAt>now||now-ownerApproval.issuedAt>900000||
   ownerApproval.expiresAt<=now||ownerApproval.expiresAt-now>900000||
   auditReceipt.issuedAt>now||now-auditReceipt.issuedAt>900000)
    fail('STALE_OR_DIFFERENT_APPROVAL');
  const ownerKey=publicKey(ownerPublicKey),auditorKey=publicKey(auditPublicKey);
  const ownDer=ownerKey.export({format:'der',type:'spki'});
  const auditDer=auditorKey.export({format:'der',type:'spki'});
  if(ownDer.equals(auditDer))fail('AUDIT_KEY_NOT_INDEPENDENT');
  if(!verifies(ownerKey,OWNER_DOMAIN,consent,ownerSignature)||
     !verifies(auditorKey,AUDIT_DOMAIN,audit,auditSignature))
    fail('UNVERIFIED_SIGNED_EVIDENCE');
  const actor=await authenticateGitHubOwner({token,expectedOwner:OWNER,
   expectedOwnerId:OWNER_ID,fetchImpl});
  if(actor.userId!==OWNER_ID)fail('OWNER_IDENTITY_MISMATCH');
  const store=new PersistentNonceStore(nonceStorePath);
  if(store.consume(ownerApproval.nonce)!==true)fail('NONCE_REPLAY');
  return Object.freeze({repository,prNumber,sha,scope,actor:OWNER,
   signedApprovalVerified:true,independentReviewVerified:true,
   nonceUnused:true,issuedAt:ownerApproval.issuedAt});
 });
}
module.exports={signedGameHubPreflight,digestContext,canonicalApproval,canonicalAudit};
