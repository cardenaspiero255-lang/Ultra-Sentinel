'use strict';
/**
 * Read-only, evidence-inventory preflight for the owner-only edition.
 * No fixed label count; a reported receipt is NOT authenticated by this code.
 * Deliberately never grants merge, repair, deployment or release authority.
 */
const {types}=require('node:util');
const {snapshotRecord}=require('../investigation/plain-kotlin-payload.cjs');
const REPOSITORY='cardenaspiero255-lang/Ultra-Sentinel';
const SHA=/^[a-f0-9]{40}$/;
const DIGEST=/^[a-f0-9]{64}$/;
const REQUIRED_CONTROLS=Object.freeze([
 'REAL_DIFF_DETECTION','CAUSAL_ANALYSIS','MEMORY_REVOCATION',
 'RED_GREEN_REPAIR','OWNER_AUTHORIZATION','HOST_ROLLBACK_E2E',
 'GITHUB_SHA_CI_PROVENANCE','GAMEHUB_INTEGRATION','JARVIS_INTEGRATION',
 'SENTRY_INTEGRATION','MONITOR_ALERT_DELIVERY','SUPPLY_CHAIN_AUDIT',
 'INVENTORY_ACCEPTANCE'
]);
const INPUT_KEYS=['schema','repository','headSha','openBlockingFindings','proofs'];
const PROOF_KEYS=['control','headSha','runId','artifactSha256','result'];
function fail(reason){throw Error('PRIVATE_READINESS_'+reason);}
function record(value,keys,reason){
 try{return snapshotRecord(value,keys);}catch{fail(reason);}
}
function proofsSnapshot(value){
 if(types.isProxy(value)||!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype||
    value.length>REQUIRED_CONTROLS.length||Reflect.ownKeys(value).length!==value.length+1)
  fail('INVALID_INPUT');
 const proofs=[];
 for(let i=0;i<value.length;i++){
  const descriptor=Object.getOwnPropertyDescriptor(value,String(i));
  if(!descriptor||!Object.hasOwn(descriptor,'value'))fail('INVALID_PROOF');
  proofs.push(record(descriptor.value,PROOF_KEYS,'INVALID_PROOF'));
 }
 return proofs;
}
function assessPrivateEditionReadiness(input){
 const data=record(input,INPUT_KEYS,'INVALID_INPUT');
 if(data.schema!=='ultra-sentinel-private-edition-input/v1'||
  data.repository!==REPOSITORY||typeof data.headSha!=='string'||!SHA.test(data.headSha)||
  !Number.isSafeInteger(data.openBlockingFindings)||data.openBlockingFindings<0)
  fail('INVALID_INPUT');
 const proofs=proofsSnapshot(data.proofs);
 const seen=new Map();
 for(const proof of proofs){
  if(!REQUIRED_CONTROLS.includes(proof.control)||
    proof.headSha!==data.headSha||!Number.isSafeInteger(proof.runId)||proof.runId<=0||
    typeof proof.artifactSha256!=='string'||!DIGEST.test(proof.artifactSha256)||
    !['SUCCESS','FAILURE'].includes(proof.result))
   fail('INVALID_PROOF');
  if(seen.has(proof.control))fail('DUPLICATE_PROOF');
  seen.set(proof.control,proof.result);
 }
 const missingControls=REQUIRED_CONTROLS.filter(x=>!seen.has(x));
 const failedControls=REQUIRED_CONTROLS.filter(x=>seen.get(x)==='FAILURE');
 const reportedControlsComplete=missingControls.length===0&&failedControls.length===0&&
  data.openBlockingFindings===0;
 const verdict=data.openBlockingFindings>0?'BLOCKING_FINDINGS':
  failedControls.length?'FAILED_OPERATIONAL_EVIDENCE':
  missingControls.length?'MISSING_OPERATIONAL_EVIDENCE':'UNAUTHENTICATED_EVIDENCE';
 return Object.freeze({
  schema:'ultra-sentinel-private-edition-readiness/v1',
  repository:REPOSITORY,headSha:data.headSha,scope:'EXCLUSIVE_PRIVATE_EDITION',
  requiredControls:REQUIRED_CONTROLS,
  missingControls:Object.freeze(missingControls),failedControls:Object.freeze(failedControls),
  selfReportedBlockingFindings:data.openBlockingFindings,
  reportedControlsComplete,realWorldEvidenceAuthenticated:false,
  verdict,releaseAuthorized:false,mergeAllowed:false,autoRepairAllowed:false,
  deploymentAllowed:false,repositoryVisibilityChanged:false,
  limitation:'Submitted artifact hashes and run IDs have not been authenticated against GitHub, hosts or connected services. This inventory cannot certify or authorize release.'
 });
}
module.exports={assessPrivateEditionReadiness,REQUIRED_CONTROLS};
