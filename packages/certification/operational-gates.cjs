'use strict';
/* Advisory release assessment only. The system lacks a trusted external
 * attestation signer; caller-supplied flags must never mint certification.
 * Being the sole repository owner does not waive external truth/QA evidence. */
const SHA=/^[a-f0-9]{40}$/;
function completeCi(checks){
 return checks&&typeof checks==='object'&&!Array.isArray(checks)&&
  Number.isSafeInteger(checks.success)&&checks.success>=1&&
  checks.failure===0&&checks.pending===0&&checks.skipped===0&&checks.cancelled===0;
}
function assessOperationalReadiness({shadow,ultraRuleset,gamehubRuleset}={}){
 const gates={
  integration:Boolean(SHA.test(shadow?.headSha||'')&&
   typeof shadow.reviewerVerdict==='string'&&shadow.reviewerVerdict.length>0&&
   Number.isSafeInteger(shadow.changedFiles)&&shadow.changedFiles>0),
  sourceCi:shadow?.sourceGate==='OBSERVED_NOT_CERTIFIED'&&completeCi(shadow?.checks),
  mainProtected:ultraRuleset?.active===true&&ultraRuleset?.requiredCheck===true,
  gamehubProtectionVerified:gamehubRuleset?.verified===true,
  supervisedWriterVerified:false,
  independentAuditVerified:false,
  rollbackDrillVerified:false,
  semanticParityVerified:false
 };
 const blocked=Object.entries(gates).filter(([,passed])=>!passed).map(([gate])=>gate);
 return Object.freeze({schema:'ultra-sentinel-certification/v1',
  classification:'NOT_CERTIFIED',releaseAllowed:false,automaticMergeAllowed:false,
  gates:Object.freeze(gates),blocked:Object.freeze(blocked)});
}
module.exports={assessOperationalReadiness};
