'use strict';
/*
 * Contractually combine GitHub-issuer-signed OIDC WORKLOAD identity with the
 * existing OWNER Ed25519-signed plan + authenticated GitHub /user identity.
 * A workflow token alone NEVER confers owner repair privileges.
 *
 * The caller must be a TRUSTED operator: ownerRequest is not a web/PR payload
 * and must not expose the fetchImpl override outside controlled unit tests.
 * All repair operations remain no-remote, disposable sandbox only.
 */
const {verifyGitHubOidcApproval}=require('./github-oidc-approval.cjs');
const {runOwnerAuthorizedSandboxRepair}=require('./owner-sandbox-flow.cjs');
const JWKS_URL='https://token.actions.githubusercontent.com/.well-known/jwks';
function deny(){throw Error('DUAL_GATE_POLICY_DENIED');}
async function runOwnerOidcAndEd25519SandboxRepair({
 oidcJwt,oidcContext,fetchOidcJwks=globalThis.fetch,ownerRequest
}={}){
 if(!ownerRequest||typeof ownerRequest!=='object'||Array.isArray(ownerRequest)||
  ownerRequest.requireHunterEvidence===false||
  ownerRequest.requireRedGreenJudge===false||
  typeof ownerRequest.expectedHeadSha!=='string'||
  !/^[a-f0-9]{40}$/.test(ownerRequest.expectedHeadSha)||
  !ownerRequest.authorization||!ownerRequest.plan||
  typeof ownerRequest.authorizationSignature!=='string'||
  !ownerRequest.trustedPublicKey||typeof fetchOidcJwks!=='function'||
  !oidcContext||typeof oidcContext!=='object'||Array.isArray(oidcContext))
  deny();
 // Issuer keys are fetched solely from a literal pinned HTTPS endpoint;
 // never trust jwks URI, jku, x5u or jwk from an incoming JWT.
 let jwks;
 try{
  const response=await fetchOidcJwks(JWKS_URL,{
   method:'GET',redirect:'error',signal:AbortSignal.timeout(15000),
   headers:{Accept:'application/json'}
  });
  if(!response||response.ok!==true)deny();
  jwks=await response.json();
 }catch{throw Error('OIDC_TRUST_ANCHOR_UNAVAILABLE');}
 const approval=verifyGitHubOidcApproval({jwt:oidcJwt,jwks,context:oidcContext});
 if(approval.status!=='GITHUB_OIDC_OWNER_SANDBOX_APPROVED'||
  approval.cryptographicallyVerified!==true||
  approval.authorizedForProductionRepair!==false||
  approval.ed25519OwnerSignatureVerified!==false||
  approval.remoteWrites!==false||approval.mergeAllowed!==false||
  approval.ownerId!==322222186)deny();

 // This is a second factor, not a replacement: original executor must still
 // check /user via authenticated owner's own token, Ed25519 public trust key,
 // signed plan digest, nonce, Hunter source and Red→Fixer→Green→Judge.
 const result=await runOwnerAuthorizedSandboxRepair({
  ...ownerRequest,
  expectedOwner:'cardenaspiero255-lang',expectedOwnerId:322222186,
  requireHunterEvidence:true,requireRedGreenJudge:true
 });
 if(!result||result.remoteWrites!==false||result.mergeAllowed!==false)deny();
 if(result.status==='SANDBOX_REPAIR_VERIFIED'&&result.redGreenJudgeVerified===true)
  return Object.freeze({
   status:'DUAL_AUTH_SANDBOX_REPAIR_VERIFIED',
   githubOidcCryptographicProof:true,
   ownerEd25519GatePassed:true,runId:approval.runId,
   workflowSha:approval.sha,
   repairHeadSha:result.repair.headSha,
   productionReleaseCertified:false,remoteWrites:false,mergeAllowed:false
  });
 if(result.status==='SANDBOX_REPAIR_ROLLED_BACK'&&
    result.rollback?.status==='ROLLBACK_VERIFIED')
  return Object.freeze({
   status:'DUAL_AUTH_SANDBOX_ROLLBACK_VERIFIED',
   githubOidcCryptographicProof:true,ownerEd25519GatePassed:true,
   runId:approval.runId,workflowSha:approval.sha,
   rollback:result.rollback,reason:result.reason,
   productionReleaseCertified:false,remoteWrites:false,mergeAllowed:false
  });
 deny();
}
module.exports={runOwnerOidcAndEd25519SandboxRepair};
