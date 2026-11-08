'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {assessOriginalVoiceIntent,COMMIT,GATE,POLICY}=
 require('../../packages/investigation/jarvis-polite-operational-original-proof.cjs');
function evidence(){return {sourceCommit:COMMIT,gateBlob:GATE,policyBlob:POLICY,
 oracleSha256:'a'.repeat(64),jarSha256:'b'.repeat(64),
 policy:{code:1,output:'Exception in thread "main" java.lang.IllegalStateException: READ_ONLY_POLICY_POLITE_RESTART_ACCEPTED\n at Main.main(Main.kt:1)\n'},
 gate:{code:1,output:'Exception in thread "main" java.lang.IllegalStateException: VOICE_GATE_OPERATIONAL_REQUEST_ACCEPTED\n at Main.main(Main.kt:2)\n'},
 integration:{code:1,output:'Exception in thread "main" java.lang.IllegalStateException: VOICE_GATE_OPERATIONAL_REQUEST_ACCEPTED\n at Main.main(Main.kt:3)\n'},
 controls:{code:0,output:'ORIGINAL_CONTROLS_PASS\n'}};}
test('accepts only both exact RED markers plus successful controls and grants no authority',()=>{
 const r=assessOriginalVoiceIntent(evidence());
 assert.equal(r.status,'ORIGINAL_VOICE_INTENT_RED_OBSERVED');
 assert.equal(r.originalPolicyRed,true);assert.equal(r.originalGateRed,true);
 assert.equal(r.originalIntegrationRed,true);
 assert.equal(r.originalBenignControlsPassed,true);
 for(const key of ['sourceAndRunnerAuthenticatedByThisFunction','candidateGreen',
  'automaticDiscoveryProven','androidDeviceObserved','deviceActionProven',
  'remoteWrites','mergeAllowed','productionReleaseCertified'])assert.equal(r[key],false);
});
test('rejects infrastructure failures, absent or malformed markers and failed controls',()=>{
 const mutations=[
  x=>{x.policy.code=0;},x=>{x.policy.code=124;},x=>{x.gate.code=137;},
  x=>{x.policy.output='READ_ONLY_POLICY_POLITE_RESTART_ACCEPTED';},
  x=>{x.gate.output='Exception in thread "main" java.lang.IllegalStateException: OTHER';},
  x=>{delete x.integration;},x=>{x.integration.code=0;},
  x=>{x.integration.code=124;},
  x=>{x.integration.output='Exception in thread "main" java.lang.IllegalStateException: OTHER';},
  x=>{x.controls.code=1;},x=>{x.controls.output='ORIGINAL_CONTROLS_PASS\nEXTRA';},
  x=>{x.controls.output='';},x=>{x.gate.output='x'.repeat(65537);}
 ];
 for(const mutate of mutations){const x=evidence();mutate(x);assert.throws(()=>assessOriginalVoiceIntent(x),/EVIDENCE_INVALID/);}
});
test('rejects wrong pinned identity and invalid artifact digests',()=>{
 for(const key of ['sourceCommit','gateBlob','policyBlob','oracleSha256','jarSha256']){
  const x=evidence();x[key]='bad';assert.throws(()=>assessOriginalVoiceIntent(x),/EVIDENCE_INVALID/);
 }
});
