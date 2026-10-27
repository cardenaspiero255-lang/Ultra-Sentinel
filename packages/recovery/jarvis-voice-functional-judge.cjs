'use strict';
// Data-only adjudication. Logs are admissible only as local observations;
// trusted CI is responsible for separately compiling the pinned real Kotlin.
const crypto=require('node:crypto');
const BASE='apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/';
const BARGE=BASE+'BargeInStopPolicy.kt',WAKE=BASE+'PartialWakeSignalPolicy.kt';
const PATHS=Object.freeze([BARGE,WAKE]);
const PINS=Object.freeze([
 Object.freeze({path:BARGE,commit:'f2572a8abb0a1ef5b34d971ea8c4dc5acbecf868',
  blob:'507e78e8220f63283b356629047b23032c527214'}),
 Object.freeze({path:WAKE,commit:'f2572a8abb0a1ef5b34d971ea8c4dc5acbecf868',
  blob:'2ed097d73563542a33e8bd0051849c555d118c26'})
]);
const MODES=Object.freeze(['00','10','01','11']),SHA=/^[a-f0-9]{40}$/;
function verifyJarvisSourceBytes(sources){
 if(!sources||typeof sources!=='object'||Array.isArray(sources)||
  Object.keys(sources).length!==2)throw Error('JARVIS_PINNED_SOURCE_INVALID');
 const evidence=[];
 for(const entry of PINS){
  const text=sources[entry.path];
  if(typeof text!=='string'||text.length<100||
   Buffer.byteLength(text,'utf8')>10000||text.includes('\0'))throw Error('JARVIS_PINNED_SOURCE_INVALID');
  const bytes=Buffer.from(text,'utf8');
  const sha=crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
  if(sha!==entry.blob)throw Error('JARVIS_PINNED_SOURCE_INVALID');
  evidence.push(Object.freeze({path:entry.path,commit:entry.commit,blob:sha,
   sourceSha256:crypto.createHash('sha256').update(bytes).digest('hex')}));
 }
 return Object.freeze({sources:Object.freeze(evidence),githubRemoteAttestation:false,
  noRemoteWrites:true});
}
function result(ok,git,rollback,modes=0){
 return Object.freeze({schema:'ultra-sentinel-jarvis-voice-matrix-judge/v1',
  status:ok?'LOCAL_VOICE_MATRIX_ACCEPTED_NOT_CERTIFIED':'VOICE_FUNCTIONAL_JUDGE_VETO',
  functionalJudgeApproved:ok,gitJudgeApproved:git,rollbackVerified:rollback,
  modesValidated:modes,authenticatedRuntimeEvidence:false,
  sourceIdentityVerifiedByTrustedCI:false,causalityVerified:false,
  mergeAllowed:false,remoteWrites:false,productionReleaseAllowed:false,
  ownerAuthorizationRequired:true});
}
function assessJarvisVoiceMatrix({localProof,logs}={}){
 const scenarios=localProof?.scenarios;
 const shape=localProof?.schema==='ultra-sentinel-local-cross-file-reproduction/v1'&&
  localProof.status==='LOCAL_FACTORIAL_COMPLETED_REQUIRES_EXTERNAL_ORACLE'&&
  localProof.candidateRule==='JARVIS_VOICE_GUARD'&&
  localProof.commitAllowed===false&&localProof.mergeAllowed===false&&
  localProof.productionReleaseAllowed===false&&
  Array.isArray(scenarios)&&scenarios.length===4;
 let git=Boolean(shape),rollback=Boolean(shape);
 if(shape)for(let i=0;i<4;i++){
  const s=scenarios[i],mode=MODES[i];
  const expected=PATHS.filter((_,j)=>mode[j]==='1');
  if(!s||!Array.isArray(s.selectedFiles)||
   s.selectedFiles.length!==expected.length||
   s.selectedFiles.some((p,j)=>p!==expected[j])||
   s.remoteWrites!==false||s.oracleVerdict!=='PASS'||
   s.judgeStatus!==(i===0?'BASELINE_NO_COMMIT':'APPROVED_LOCAL_POLICY_ONLY')||
   !SHA.test(s.baselineTree||''))git=false;
  if(!s||s.rollbackVerified!==true||s.baselineTree!==s.restoredTree)
   rollback=false;
 }
 if(!git||!rollback||!logs||typeof logs!=='object'||Array.isArray(logs)||
  Object.keys(logs).sort().join(',')!==[...MODES].sort().join(','))
  return result(false,git,rollback);
 let checked=0;
 for(const mode of MODES){
  const t=logs[mode];if(typeof t!=='string'||t.length>12000)return result(false,git,rollback,checked);
  const rows=t.split(/\r?\n/).filter(Boolean);
  const lines=['JARVIS_VOICE_NORMAL_CONTROLS_PASS',
   'JARVIS_VOICE_VECTOR mode='+mode+' barge='+(mode[0]==='1')+
    ' wake='+(mode[1]==='1'),
   'JARVIS_VOICE_MATRIX_PROBED'];
  if(rows.length!==3||rows.some((r,i)=>r!==lines[i]))
   return result(false,git,rollback,checked);
  checked++;
 }
 return result(true,git,rollback,checked);
}
module.exports={PATHS,PINS,MODES,verifyJarvisSourceBytes,assessJarvisVoiceMatrix};
