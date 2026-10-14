'use strict';
/* A non-executable, strictly bounded repair staging plan. NO GitHub writer. */
const {validateWire}=require('../contracts/validate-wire.cjs');
const REPO='cardenaspiero255-lang/gamehub-ultra';
const SHA=/^[a-f0-9]{40}$/;
const SAFE=/^(?:app\/src\/main\/|supabase\/functions\/)[A-Za-z0-9_./-]+$/;
function stageRepairDraft({authorization,prNumber,expectedHeadSha,changes,now=Date.now()}={}){
 const blocked=(reason)=>Object.freeze({status:reason,executionGranted:false,
  commitAllowed:false,mergeAllowed:false,changes:[]});
 if(!validateWire('repair-authorization',authorization).ok)
  return blocked('INVALID_AUTHORIZATION_SCHEMA');
 if(authorization.repository!==REPO||authorization.prNumber!==prNumber||
  authorization.headSha!==expectedHeadSha||!SHA.test(expectedHeadSha||''))
  return blocked('WRONG_TARGET_OR_SHA');
 const expires=Date.parse(authorization.expiresAt);
 if(!Number.isFinite(now)||!Number.isSafeInteger(now)||!Number.isFinite(expires)||
  expires<=now||expires-now>900000)return blocked('EXPIRED_OR_UNBOUNDED_APPROVAL');
 if(!Array.isArray(changes)||changes.length===0||
  changes.length>authorization.budget.maxFilesChanged||changes.length>30)
  return blocked('PATCH_BUDGET_EXCEEDED');
 const seen=new Set();let total=0;
 for(const entry of changes){
  if(!entry||typeof entry!=='object'||Array.isArray(entry)||
    typeof entry.path!=='string'||!SAFE.test(entry.path)||
    entry.path.includes('..')||entry.path.includes('\\')||
    !authorization.scope.includes(entry.path)||seen.has(entry.path)||
    !SHA.test(entry.beforeBlobSha||'')||!SHA.test(entry.afterBlobSha||'')||
    entry.beforeBlobSha===entry.afterBlobSha||
    !Number.isSafeInteger(entry.patchBytes)||entry.patchBytes<1)
    return blocked('UNTRUSTED_PATCH_TARGET');
  seen.add(entry.path);total+=entry.patchBytes;
  if(total>authorization.budget.maxPatchBytes)return blocked('PATCH_BUDGET_EXCEEDED');
 }
 return Object.freeze({status:'REVIEW_READY_NO_EXECUTOR',
  repo:REPO,prNumber,expectedHeadSha,patchBytes:total,
  authorizationNonce:authorization.nonce,
  changes:Object.freeze(changes.map(x=>Object.freeze({path:x.path,
   beforeBlobSha:x.beforeBlobSha,afterBlobSha:x.afterBlobSha,patchBytes:x.patchBytes}))),
  executionGranted:false,commitAllowed:false,mergeAllowed:false,
  requirements:Object.freeze(['Independent actor authentication',
   'One-time nonce persistence','Compare-and-swap PR head',
   'Isolated branch and human review','All required CI green',
   'Verified rollback procedure'])});
}
module.exports={stageRepairDraft};
