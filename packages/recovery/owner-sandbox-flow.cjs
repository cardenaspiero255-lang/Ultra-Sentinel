'use strict';
/* Local-only orchestrator. The owner identity is fetched with a bearer token,
   but no token is ever handed to the sandbox git process. */
const crypto=require('node:crypto');
const {authenticateGitHubOwner}=require('./github-owner-identity.cjs');
const {stableAuthorization,verifyOwnerAuthorization,PersistentNonceStore}=require('./owner-authorization.cjs');
const {executeSandboxRepair}=require('./sandbox-executor.cjs');
const {rollbackSandbox}=require('./sandbox-rollback.cjs');
function digestPlan(plan,changes){
 return crypto.createHash('sha256').update(JSON.stringify({plan,changes})).digest('hex');
}
async function runOwnerAuthorizedSandboxRepair({token,expectedOwner,expectedOwnerId,
 authorization,authorizationSignature,trustedPublicKey,nonceStorePath,directory,plan,changes,expectedHeadSha,fetchImpl,
 verifyRepair,now=Date.now()}={}){
 if(typeof verifyRepair!=='function')throw Error('REPAIR_VERIFIER_REQUIRED');
 if(!authorization||!plan||!Array.isArray(changes)||
  authorization.repo!=='cardenaspiero255-lang/Ultra-Sentinel'||
  authorization.branch!==plan.branch||
  authorization.headSha!==expectedHeadSha||
  authorization.nonce!==plan.authorizationNonce||
  authorization.planDigest!==digestPlan(plan,changes))
  throw Error('AUTHORIZATION_SCOPE_MISMATCH');
 const actor=await authenticateGitHubOwner({token,expectedOwner,expectedOwnerId,fetchImpl});
 const check=verifyOwnerAuthorization({authorization,verifiedActor:actor,expectedOwner,expectedOwnerId,signature:authorizationSignature,
  trustedPublicKey,now});
 if(!check.authorized||check.canonical!==stableAuthorization(authorization))
  throw Error('OWNER_AUTHORIZATION_DENIED');
 const nonceStore=new PersistentNonceStore(nonceStorePath);
 const repair=executeSandboxRepair({directory,plan,changes,nonceStore,
  nonce:authorization.nonce,expectedHeadSha});
 try{
  if(await verifyRepair(repair)!==true)throw Error('REPAIR_VERIFICATION_FAILED');
  return Object.freeze({status:'SANDBOX_REPAIR_VERIFIED',repair,
   remoteWrites:false,mergeAllowed:false});
 }catch(error){
  const rollback=rollbackSandbox({directory,baselineHeadSha:expectedHeadSha,
   repairHeadSha:repair.headSha});
  return Object.freeze({status:'SANDBOX_REPAIR_ROLLED_BACK',reason:error.message,
   rollback,remoteWrites:false,mergeAllowed:false});
 }
}
module.exports={runOwnerAuthorizedSandboxRepair,digestPlan};
