'use strict';
const {validateWire}=require('../contracts/validate-wire.cjs');
const ALLOWED=new Set(['cardenaspiero255-lang/gamehub-ultra','cardenaspiero255-lang/JARVIS','cardenaspiero255-lang/Ultra-Sentinel']);
const SHA=/^[0-9a-f]{40}$/;
function prepareReviewEnvelope({targetRepo,headSha,verdict='INCOMPLETE',findingCount=0}={}){
 if(!ALLOWED.has(targetRepo)||!SHA.test(headSha||'')||!Number.isSafeInteger(findingCount)||findingCount<0||findingCount>10000)throw Error('INVALID_TARGET');
 // No CI attestation authority exists yet. Never emit CLEAR or VERIFIED.
 if(!['ADVISORY','BLOCKED','INCOMPLETE'].includes(verdict))throw Error('UNVERIFIED_VERDICT');
 const payload={schemaVersion:1,targetRepo,headSha,verdict,evidenceState:'UNVERIFIED',findingCount};
 const check=validateWire('review-result',payload);
 if(!check.ok)throw Error('INVALID_WIRE_CONTRACT');
 return Object.freeze(payload);
}
function verifyBoundEnvelope(payload,{targetRepo,headSha}={}){
 if(!ALLOWED.has(targetRepo)||!SHA.test(headSha||'')||!payload||typeof payload!=='object')return false;
 const check=validateWire('review-result',payload);
 return check.ok&&payload.targetRepo===targetRepo&&payload.headSha===headSha&&
  payload.verdict!=='CLEAR'&&payload.evidenceState!=='VERIFIED';
}
module.exports={prepareReviewEnvelope,verifyBoundEnvelope};
