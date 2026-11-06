'use strict';
// Validate narrowly scoped evidence supplied by an isolated CI runner. This
// function does not authenticate provenance or execute the Kotlin sources.
const COMMIT='747c14b5d97750a7b2736968e2d516f02448558d';
const GATE='bdc3a6a576b3473454df232cd21e3a9a3c4e6465';
const POLICY='46e9dd8b4d0fe861935bfb5ee5160cd39f3b5a78';
const DIGEST=/^[a-f0-9]{64}$/;
function reject(){throw Error('POLITE_ORIGINAL_EVIDENCE_INVALID');}
function assessOriginalVoiceIntent({sourceCommit,gateBlob,policyBlob,oracleSha256,jarSha256,
 policy,gate,controls}={}){
 if(sourceCommit!==COMMIT||gateBlob!==GATE||policyBlob!==POLICY||
  !DIGEST.test(oracleSha256||'')||!DIGEST.test(jarSha256||''))reject();
 const valid=(x)=>x&&Number.isSafeInteger(x.code)&&typeof x.output==='string'&&
  Buffer.byteLength(x.output,'utf8')<=65536;
 if(!valid(policy)||!valid(gate)||!valid(controls))reject();
 const expected=(x,marker)=>x.code===1&&x.output.split(/\r?\n/).some(line=>
  line==='Exception in thread "main" java.lang.IllegalStateException: '+marker);
 if(!expected(policy,'READ_ONLY_POLICY_POLITE_RESTART_ACCEPTED')||
  !expected(gate,'VOICE_GATE_OPERATIONAL_REQUEST_ACCEPTED')||
  controls.code!==0||controls.output.trim()!=='ORIGINAL_CONTROLS_PASS')reject();
 return Object.freeze({schema:'ultra-sentinel-jarvis-polite-original-observation/v1',
  status:'ORIGINAL_VOICE_INTENT_RED_OBSERVED',sourceRepo:'cardenaspiero255-lang/JARVIS',
  sourceCommit,gateBlob,policyBlob,oracleSha256,jarSha256,
  originalPolicyRed:true,originalGateRed:true,originalBenignControlsPassed:true,
  sourceAndRunnerAuthenticatedByThisFunction:false,candidateGreen:false,
  automaticDiscoveryProven:false,androidDeviceObserved:false,deviceActionProven:false,
  remoteWrites:false,mergeAllowed:false,productionReleaseCertified:false});
}
module.exports={assessOriginalVoiceIntent,COMMIT,GATE,POLICY};
