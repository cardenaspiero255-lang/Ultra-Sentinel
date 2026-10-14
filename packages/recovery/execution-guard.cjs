'use strict';
/* Capability separation: no GitHub writer, no authorization by user-provided flags. */
const SHA=/^[a-f0-9]{40}$/;
function evaluateExecution({plan,liveHeadSha,approval}={}){
 const deny=(reason)=>Object.freeze({allowed:false,reason,commitAllowed:false,mergeAllowed:false});
 if(!plan||plan.status!=='REVIEW_READY_NO_EXECUTOR'||plan.commitAllowed!==false||plan.mergeAllowed!==false)
  return deny('INVALID_PLAN');
 if(!SHA.test(liveHeadSha||'')||plan.expectedHeadSha!==liveHeadSha)return deny('STALE_HEAD');
 if(!approval||approval.type!=='HUMAN_APPROVED'||approval.planDigest===undefined)
  return deny('NO_INDEPENDENT_AUTHORIZATION_CHANNEL');
 return deny('EXECUTOR_NOT_INSTALLED');
}
module.exports={evaluateExecution};
