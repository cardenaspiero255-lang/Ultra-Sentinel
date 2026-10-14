'use strict';
/* Advisory release assessment only. The system lacks a trusted external
 * attestation signer; caller-supplied flags must never mint certification. */
function assessOperationalReadiness({shadow,ultraRuleset,gamehubRuleset}={}){
 const gates={
  integration:Boolean(shadow?.headSha&&shadow?.reviewerVerdict&&shadow?.changedFiles),
  sourceCi:shadow?.sourceGate==='OBSERVED_NOT_CERTIFIED'&&shadow?.checks?.failure===0,
  mainProtected:ultraRuleset?.active===true&&ultraRuleset?.requiredCheck===true,
  independentReviewRequired:ultraRuleset?.approvalCount>=1,
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
