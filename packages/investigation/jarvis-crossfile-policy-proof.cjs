'use strict';
/**
 * Bounded reconciliation of an independently executed original-JVM 2x2
 * repair experiment. Caller-supplied rows are never authenticated proof.
 * The trusted workflow must fetch pinned original source and execute oracle.
 */
const COMMIT='f2572a8abb0a1ef5b34d971ea8c4dc5acbecf868';
const ROOT='apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/';
const GATE=ROOT+'OfflineVoiceQuestionGate.kt';
const POLICY=ROOT+'LocalGgufPolicy.kt';
const BLOBS=Object.freeze({
 [GATE]:'6e7c1a644a6f4d6657f6884712f403edef825628',
 [POLICY]:'54b4c2fe561bf151c6ca7c7daa6c1c7c561569fb'
});
const DIGEST=/^[a-f0-9]{64}$/;
function outcome(status){
 return Object.freeze({
  schema:'ultra-sentinel-jarvis-crossfile-jvm-matrix/v1',status,
  sourceCommit:COMMIT,
  exactFourScenariosChecked:status==='JOINT_PATCH_API_DEPENDENCY_REPRODUCED',
  originalFunctionalOracleProvenByThisFunction:false,
  rootCauseGenerallyCertified:false,
  ownerAuthorizationGranted:false,sourceAuthenticatedByThisFunction:false,
  remoteWrites:false,mergeAllowed:false,productionReleaseAllowed:false,
  limitation:'One API-coupled two-file repair strategy under an original-source JVM oracle. This does not prove there is no one-file alternative or authorize changing JARVIS.'
 });
}
function checkLinkedKotlinJVMMatrix({sourceCommit,sourceBlobs,scenarios}={}){
 const bad=()=>outcome('BLOCKED_UNTRUSTED_JVM_MATRIX');
 if(sourceCommit!==COMMIT||!sourceBlobs||typeof sourceBlobs!=='object'||
  Array.isArray(sourceBlobs)||Object.getPrototypeOf(sourceBlobs)!==Object.prototype||
  Object.keys(sourceBlobs).sort().join(',')!==Object.keys(BLOBS).sort().join(',')||
  Object.keys(BLOBS).some(path=>sourceBlobs[path]!==BLOBS[path])||
  !Array.isArray(scenarios)||scenarios.length!==4)return bad();
 const expected=[
  {selected:[],compile:'PASS',oracle:'FAIL',marker:'UNSAFE_RESTART_PASSED_TO_GGUF'},
  {selected:[GATE],compile:'FAIL',oracle:'NOT_RUN',marker:'UNRESOLVED_NEW_POLICY_METHOD'},
  {selected:[POLICY],compile:'PASS',oracle:'FAIL',marker:'UNSAFE_RESTART_PASSED_TO_GGUF'},
  {selected:[GATE,POLICY],compile:'PASS',oracle:'PASS',marker:'CROSS_FILE_POLICY_ORACLE_PASS'}
 ];
 for(let i=0;i<expected.length;i++){
  const row=scenarios[i],wanted=expected[i];
  if(!row||typeof row!=='object'||Array.isArray(row)||
    Object.getPrototypeOf(row)!==Object.prototype||
    Object.keys(row).sort().join(',')!=='artifactSha256,compile,marker,oracle,selectedFiles'||
    !Array.isArray(row.selectedFiles)||
    row.selectedFiles.length!==wanted.selected.length||
    row.selectedFiles.some((x,n)=>x!==wanted.selected[n])||
    row.compile!==wanted.compile||row.oracle!==wanted.oracle||
    row.marker!==wanted.marker||!DIGEST.test(row.artifactSha256||''))return bad();
 }
 return outcome('JOINT_PATCH_API_DEPENDENCY_REPRODUCED');
}
module.exports={checkLinkedKotlinJVMMatrix,GATE,POLICY,BLOBS,COMMIT};
