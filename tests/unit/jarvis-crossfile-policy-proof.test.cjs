'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {checkLinkedKotlinJVMMatrix}=
 require('../../packages/investigation/jarvis-crossfile-policy-proof.cjs');
const C='f2572a8abb0a1ef5b34d971ea8c4dc5acbecf868';
const paths=[
 'apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/OfflineVoiceQuestionGate.kt',
 'apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/LocalGgufPolicy.kt'
];
const SHA='a'.repeat(64);
function sample(){
 return {sourceCommit:C,sourceBlobs:{
  [paths[0]]:'6e7c1a644a6f4d6657f6884712f403edef825628',
  [paths[1]]:'54b4c2fe561bf151c6ca7c7daa6c1c7c561569fb'
 },scenarios:[
  {selectedFiles:[],compile:'PASS',oracle:'FAIL',marker:'UNSAFE_RESTART_PASSED_TO_GGUF',artifactSha256:SHA},
  {selectedFiles:[paths[0]],compile:'FAIL',oracle:'NOT_RUN',marker:'UNRESOLVED_NEW_POLICY_METHOD',artifactSha256:SHA},
  {selectedFiles:[paths[1]],compile:'PASS',oracle:'FAIL',marker:'UNSAFE_RESTART_PASSED_TO_GGUF',artifactSha256:SHA},
  {selectedFiles:paths,compile:'PASS',oracle:'PASS',marker:'CROSS_FILE_POLICY_ORACLE_PASS',artifactSha256:SHA}
 ]};
}
test('same original Kotlin files require both changes for this API-coupled repair',()=>{
 const x=checkLinkedKotlinJVMMatrix(sample());
 assert.equal(x.status,'JOINT_PATCH_API_DEPENDENCY_REPRODUCED');
 assert.equal(x.exactFourScenariosChecked,true);
 assert.equal(x.originalFunctionalOracleProvenByThisFunction,false);
 assert.equal(x.rootCauseGenerallyCertified,false);
 assert.equal(x.ownerAuthorizationGranted,false);
 assert.equal(x.remoteWrites,false);
});
test('fake missing swapped or optimistic outcomes are rejected without promotion',()=>{
 for(const mutate of [
  x=>x.scenarios.reverse(),
  x=>x.scenarios.pop(),
  x=>x.scenarios[0].oracle='PASS',
  x=>x.scenarios[1].compile='PASS',
  x=>x.scenarios[2].oracle='PASS',
  x=>x.scenarios[3].oracle='FAIL',
  x=>x.scenarios[3].artifactSha256='invalid',
  x=>x.sourceBlobs[paths[0]]='0'.repeat(40),
  x=>x.sourceCommit='0'.repeat(40)
 ]){const x=sample();mutate(x);
  const r=checkLinkedKotlinJVMMatrix(x);
  assert.equal(r.status,'BLOCKED_UNTRUSTED_JVM_MATRIX');
  assert.equal(r.remoteWrites,false);
 }
});
