'use strict';
/* Read-only interpretation of GitHub /branches/main metadata.
 * It does not prove review approvals, ruleset contents or attestation. */
const SHA=/^[a-f0-9]{40}$/;
const REQUIRED=Object.freeze(['build','coverage',
 'Ultra Sentinel Core — own reviewer','read-only-review']);
function inspectGameHubBranchMetadata(branch){
 if(!branch||typeof branch!=='object'||branch.name!=='main'||
  !SHA.test(branch.commit?.sha||'')||typeof branch.protected!=='boolean')
  throw Error('INVALID_BRANCH_EVIDENCE');
 const settings=branch.protection;
 const checks=settings?.required_status_checks;
 const contexts=checks?.contexts;
 const trustworthyArray=Array.isArray(contexts)&&contexts.length<=80&&
  contexts.every(x=>typeof x==='string'&&x.length>0);
 const protectedStatus=branch.protected&&settings?.enabled===true;
 const requiredStatusEnforced=protectedStatus&&
  checks?.enforcement_level==='everyone'&&trustworthyArray;
 const found=requiredStatusEnforced&&REQUIRED.every(x=>contexts.includes(x));
 return Object.freeze({repo:'cardenaspiero255-lang/gamehub-ultra',
  branch:'main',headSha:branch.commit.sha,
  protectedFlag:branch.protected,classicBranchProtectionObserved:protectedStatus,
  requiredChecksPresent:Boolean(found),requiredChecks:REQUIRED.slice(),
  independentApprovalVerified:false,fullProtectionPolicyVerified:false,
  certificationGranted:false});
}
module.exports={inspectGameHubBranchMetadata};
