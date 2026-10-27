'use strict';
// Read-only functional Judge. A successful git blob check/rollback does NOT
// prove that a behavior-preserving repair was made. Validate independent
// Kotlin JVM outcomes before any handoff. No process invocation or remote I/O.
const crypto=require('node:crypto');
const SHA=/^[a-f0-9]{40}$/;
const M='app/src/main/java/com/cardenaspiero255/gamehubultra/ai/UltraMathEngine.kt';
const B='app/src/main/java/com/cardenaspiero255/gamehubultra/domain/BatteryAwareGamingEngine.kt';
const PINS=Object.freeze({
 math:Object.freeze({
  path:M,commit:'858c9ce5cb6a7916d63f2348432013e49d02ba79',
  blob:'063787d48784fd9b579e2c9a4d5ad4bbd7ab9d7a',
  sha256:'f9fbdbd7aabd2dffbadc4b04b31280779bd7359624c081b9e64d532d8c40f65a'
 }),
 battery:Object.freeze({
  path:B,commit:'2289f4e4cda55ddaa50f2016113ded82dc17203c',
  blob:'8696360219231f3f1477d5ad21c93bca2197e281',
  sha256:'cd1c9d6a1a6dfb15a67650a3b38aea3611e855b066e4f6217dd7101d6285a67b'
 })
});
const MODES=Object.freeze(['00','10','01','11']);
function digest(bytes,algorithm){
 return crypto.createHash(algorithm).update(bytes).digest('hex');
}
function verifyPinnedKotlinSourceBytes({mathOriginal,batteryOriginal}={}){
 for(const [name,contents] of [['math',mathOriginal],['battery',batteryOriginal]]){
  if(typeof contents!=='string'||contents.length<100||
   Buffer.byteLength(contents)>60000)throw Error('PINNED_KOTLIN_SOURCE_INVALID');
  const bytes=Buffer.from(contents,'utf8'),pin=PINS[name];
  if(digest(bytes,'sha256')!==pin.sha256||
   digest(Buffer.concat([Buffer.from('blob '+bytes.length+'\0'),bytes]),'sha1')!==pin.blob)
   throw Error('PINNED_KOTLIN_SOURCE_INVALID');
 }
 return Object.freeze({sourceBytesPinned:true,githubRemoteSourceAuthenticated:false,
  sourceRefs:Object.freeze([PINS.math.commit,PINS.battery.commit]),
  remoteWrites:false});
}
function vector(mode){
 return 'C2_PR185_VECTOR mode='+mode+' math='+(mode[0]==='1')+
  ' battery='+(mode[1]==='1');
}
function verdict(status,gitJudgeApproved,rollbackVerified,modesValidated=0){
 return Object.freeze({
  schema:'ultra-sentinel-original-kotlin-cross-file-judge/v1',
  status,functionalJudgeApproved:status==='LOCAL_KOTLIN_FACTORIAL_ACCEPTED_NO_RELEASE',
  gitJudgeApproved,rollbackVerified,modesValidated,
  kotlinJVMExecutionVerifiedExternally:false,githubSourceAuthenticatedExternally:false,
  causalityVerified:false,remoteWrites:false,commitAllowed:false,
  mergeAllowed:false,productionReleaseAllowed:false
 });
}
function adjudicateKotlinCrossFileProof({localProof,logs,rows}={}){
 const scenarios=localProof?.scenarios;
 const localShape=localProof?.schema==='ultra-sentinel-local-cross-file-reproduction/v1'&&
  localProof.status==='LOCAL_FACTORIAL_COMPLETED_REQUIRES_EXTERNAL_ORACLE'&&
  localProof.baseSha==='2289f4e4cda55ddaa50f2016113ded82dc17203c'&&
  localProof.headSha==='b74791d9ea7e1e4b88f0ef1e286d87f036c6e7be'&&
  localProof.candidateRule==='NONFINITE_NUMERIC_BOUNDARY'&&
  localProof.sourceAuthenticated===false&&localProof.causalityVerified===false&&
  localProof.commitAllowed===false&&localProof.mergeAllowed===false&&
  localProof.productionReleaseAllowed===false&&
  localProof.independentOracleProvenanceVerified===false&&
  Array.isArray(scenarios)&&scenarios.length===4;
 let gitJudgeApproved=Boolean(localShape),rollbackVerified=Boolean(localShape);
 if(localShape){
  for(let i=0;i<4;i++){
   const s=scenarios[i],mode=MODES[i];
   const selected=[...(mode[0]==='1'?[M]:[]),...(mode[1]==='1'?[B]:[])];
   if(!s||!Array.isArray(s.selectedFiles)||
    s.selectedFiles.length!==selected.length||
    s.selectedFiles.some((p,k)=>p!==selected[k])||
    s.remoteWrites!==false||!SHA.test(s.baselineTree||'')||
    s.judgeStatus!==(i===0?'BASELINE_NO_COMMIT':'APPROVED_LOCAL_POLICY_ONLY'))
    gitJudgeApproved=false;
   if(!s||s.rollbackVerified!==true||s.baselineTree!==s.restoredTree)
    rollbackVerified=false;
  }
 }
 // Reject forged, missing, duplicated or reordered JVM cases, even if all
 // git Judge and rollback evidence looks impeccable.
 if(!localShape||!gitJudgeApproved||!rollbackVerified||
  !logs||typeof logs!=='object'||Array.isArray(logs)||
  Object.keys(logs).sort().join(',')!==[...MODES].sort().join(',')||
  !Array.isArray(rows)||rows.length!==4)
  return verdict('FUNCTIONAL_JUDGE_VETO',gitJudgeApproved,rollbackVerified);
 let modesValidated=0;
 for(const [i,mode] of MODES.entries()){
  const s=scenarios[i],log=logs[mode],row=rows[Number(mode[0])*2+Number(mode[1])];
  const expected=[
   'C2_PR185_ORDINARY_CONTROLS_PASS',
   vector(mode),'C2_PR185_FACTORIAL_SCOPE_PASS'
  ];
  if(typeof log!=='string'||log.length>16000||
   !expected.every(line=>log.split(/\r?\n/).filter(Boolean).filter(x=>x===line).length===1)||
   /Exception|Error:|C2_PR185_.*(?:FAILED|REGRESSION)/.test(log)||
   s.oracleVerdict!=='PASS'||!row||
   row.mathRepair!==(mode[0]==='1')||
   row.batteryRepair!==(mode[1]==='1')||
   row.mathGuardedSuccess!==(mode[0]==='1')||
   row.batteryPolicyRejectsNonfinite!==(mode[1]==='1')||
   row.normalMathControlPassed!==true||
   row.normalBatteryControlPassed!==true||
   row.actualJVMExecution!==true)
   return verdict('FUNCTIONAL_JUDGE_VETO',gitJudgeApproved,rollbackVerified,modesValidated);
  modesValidated++;
 }
 return verdict('LOCAL_KOTLIN_FACTORIAL_ACCEPTED_NO_RELEASE',gitJudgeApproved,
  rollbackVerified,modesValidated);
}
module.exports={PINS,M,B,MODES,vector,verifyPinnedKotlinSourceBytes,
 adjudicateKotlinCrossFileProof};
