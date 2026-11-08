'use strict';
/*
 * Trusted-CI adapter: bind the EXACT JARVIS original Kotlin bytes, independently
 * executed JVM oracle artifacts and generic two-file sandbox Judge. This script
 * reads ONLY existing runner-local, pinned artifacts and performs no network,
 * signing, repository write, production repair or owner authorization.
 */
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const crypto=require('node:crypto');
const {blobSha}=require('../packages/investigation/novel-kotlin-hypotheses.cjs');
const {makeTermuxCandidate}=
 require('../packages/recovery/jarvis-termux-original-fix.cjs');
const {drillNovelKotlinCandidateBatch}=
 require('../packages/recovery/novel-kotlin-batch-local-judge.cjs');
const SOURCE_COMMIT='f2572a8abb0a1ef5b34d971ea8c4dc5acbecf868';
const BASE='apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/';
const TERMUX=BASE+'CompanionResultPolicy.kt',VOICE=BASE+'VoiceRecognitionRequestGate.kt';
const PINS=Object.freeze({
 termux:'7c6f326cb267b56f4ca6b2d0614753695259da56',
 voice:'606d1184e7d57e49ef15b983a8646706abadf3da'
});
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
function deny(){throw Error('JARVIS_GENERIC_BATCH_JVM_EVIDENCE_BLOCKED');}
function read(root,filename,max=100000){
 if(!/^[A-Za-z0-9._-]+$/.test(filename))deny();
 const name=path.join(root,filename);
 const stat=fs.lstatSync(name);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||
  stat.size<1||stat.size>max)deny();
 const bytes=fs.readFileSync(name),decoded=bytes.toString('utf8');
 if(!Buffer.from(decoded,'utf8').equals(bytes)||decoded.includes('\0'))deny();
 return decoded;
}
function json(root,filename){
 let obj;try{obj=JSON.parse(read(root,filename,24000));}catch{deny();}
 if(!obj||typeof obj!=='object'||Array.isArray(obj))deny();
 return obj;
}
function exactMarker(log,marker,positive){
 const count=log.split(/\r?\n/).filter(x=>x===marker).length;
 if((count===1)!==positive)deny();
}
function artifact(root,kind,mode){
 const prefix=kind==='termux'?'':kind+'_';
 const source=read(root,prefix+mode+'.kt',60000);
 const oracle=read(root,prefix+mode+'.log',20000);
 const jar=path.join(root,prefix+mode+'.jar');
 const stat=fs.lstatSync(jar);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||
  stat.size<1000||stat.size>12000000)deny();
 const digest=hash(fs.readFileSync(jar));
 return {source,sourceSha256:hash(Buffer.from(source)),oracle,
  oracleLogSha256:hash(Buffer.from(oracle)),jarSha256:digest};
}
function batch(source,termuxCandidate,voice,voiceCandidate){
 const files=[{path:TERMUX,source,expectedBlobSha:PINS.termux},
  {path:VOICE,source:voice,expectedBlobSha:PINS.voice}];
 const proposals=[
  {path:TERMUX,rule:'REGEX_PREFIX_AS_COMPLETE_VALIDATION',
   candidateSource:termuxCandidate,expectedCandidateBlobSha:blobSha(termuxCandidate)},
  {path:VOICE,rule:'CLOCK_ROLLBACK_WITHOUT_INVALIDATION',
   candidateSource:voiceCandidate,expectedCandidateBlobSha:blobSha(voiceCandidate)}
 ];
 return drillNovelKotlinCandidateBatch({
  expectedCommitSha:SOURCE_COMMIT,files,proposals
 });
}
function adjudicate(root){
 if(typeof root!=='string'||!path.isAbsolute(root))deny();
 const real=fs.realpathSync(root);
 const allowed=[os.tmpdir(),process.env.RUNNER_TEMP].filter(Boolean).map(x=>fs.realpathSync(x));
 if(!allowed.some(x=>real.startsWith(x+path.sep))||
  !fs.statSync(real).isDirectory()||fs.lstatSync(real).isSymbolicLink())deny();
 const termux=read(real,'original.kt'),voice=read(real,'voice_original.kt');
 if(blobSha(termux)!==PINS.termux||blobSha(voice)!==PINS.voice||
  termux!==read(real,'termux.kt')||voice!==read(real,'voice.kt'))deny();
 const repaired=makeTermuxCandidate(termux);
 if(repaired.candidate!==read(real,'candidate.kt')||
  repaired.unsafe!==read(real,'unsafe.kt'))deny();
 const originalVoice=read(real,'voice_original.kt');
 const phrase='if (nowMillis < started) return false';
 if(originalVoice.indexOf(phrase)<0||
  originalVoice.indexOf(phrase)!==originalVoice.lastIndexOf(phrase))deny();
 const voiceCandidate=originalVoice.replace(phrase,
  'if (nowMillis < started) { cancel(); return false }');
 if(voiceCandidate!==read(real,'voice_candidate.kt'))deny();
 const positive=batch(termux,repaired.candidate,voice,voiceCandidate);
 const unsafe=batch(termux,repaired.unsafe,voice,voiceCandidate);
 for(const result of [positive,unsafe])
  if(result.status!=='LOCAL_BATCH_JUDGE_AND_ROLLBACK_VERIFIED_NEEDS_ORIGINAL_ORACLE'||
   result.checkedFiles!==2||result.localGitRollbackVerified!==true||
   result.originalFunctionalOracleVerified!==false||
   result.mergeAllowed!==false||result.remoteWrites!==false)deny();

 const termuxReceipt=json(real,'termux-sanitized-receipt.json');
 const voiceReceipt=json(real,'voice-clock-oracle-receipt.json');
 if(termuxReceipt.sourceRepo!=='cardenaspiero255-lang/JARVIS'||
  termuxReceipt.sourceBlob!==PINS.termux||
  termuxReceipt.originalJVMOracleFailedAsExpected!==true||
  termuxReceipt.repairedJVMOraclePassed!==true||
  termuxReceipt.unsafeRepairJVMOracleRejected!==true||
  termuxReceipt.exactLocalGitRollbackVerified!==true||
  voiceReceipt.sourceRepo!=='cardenaspiero255-lang/JARVIS'||
  voiceReceipt.sourceCommit!==SOURCE_COMMIT||
  voiceReceipt.originalGitBlob!==PINS.voice||
  voiceReceipt.originalRed!==true||voiceReceipt.candidateGreen!==true||
  voiceReceipt.unsafeControlRejected!==true)deny();

 const rows={};
 for(const kind of ['termux','voice']){
  rows[kind]={};
  for(const mode of ['original','candidate','unsafe']){
   const a=artifact(real,kind,mode);
   const receipt=kind==='termux'?termuxReceipt.artifacts?.[mode]:
    voiceReceipt.receipts?.[mode];
   if(!receipt||receipt.sourceSha256!==a.sourceSha256||
    receipt.jarSha256!==a.jarSha256||
    receipt.oracleLogSha256!==a.oracleLogSha256)deny();
   const positive=mode==='candidate';
   const expected=kind==='termux'?{
    original:'UNTRUSTED_SUFFIX_ACCEPTED',
    candidate:'TERMUX_ORIGINAL_ORACLE_PASS',
    unsafe:'NORMAL_ID_FORMAT_FAILED'
   }:{
    original:'CLOCK_REWIND_REANIMATED',
    candidate:'VOICE_CLOCK_ORIGINAL_ORACLE_PASS',
    unsafe:'NORMAL_PENDING_REJECTED'
   };
   exactMarker(a.oracle,expected[mode],true);
   exactMarker(a.oracle,expected.candidate,positive);
   rows[kind][mode]=Object.freeze({sourceSha256:a.sourceSha256,
    oracleLogSha256:a.oracleLogSha256,jarSha256:a.jarSha256,
    expectedOutcome:positive?'GREEN':'RED'});
  }
 }
 if(rows.termux.original.sourceSha256!==hash(Buffer.from(termux))||
  rows.voice.original.sourceSha256!==hash(Buffer.from(voice))||
  rows.termux.candidate.sourceSha256!==hash(Buffer.from(repaired.candidate))||
  rows.voice.candidate.sourceSha256!==hash(Buffer.from(voiceCandidate))||
  rows.termux.unsafe.sourceSha256!==hash(Buffer.from(repaired.unsafe)))deny();
 return Object.freeze({
  schema:'ultra-sentinel-generic-kotlin-batch-independent-original-jvm/v1',
  status:'LOCAL_TWO_SOURCE_FUNCTIONAL_JUDGE_VERIFIED_WITH_VETO',
  sourceRepository:'cardenaspiero255-lang/JARVIS',
  sourceCommit:SOURCE_COMMIT,
  sourceGitBlobs:Object.freeze([PINS.termux,PINS.voice]),
  originalKotlinSources:2,originalJVMOracles:2,
  independentlyExecutedOriginalRed:true,
  independentlyExecutedCandidateGreen:true,
  benignControlsPreserved:true,
  unsafeCandidateStructurallyAccepted:true,
  unsafeCandidateFunctionallyVetoed:true,
  exactLocalBatchRollbackVerified:true,
  evidenceDigests:rows,
  trustedGithubRunnerAttestedByThisFunction:false,
  fourIndependentOriginalOraclesProven:false,
  androidDeviceTested:false,
  realRemoteRepairApplied:false,
  ownerAuthorizationGranted:false,remoteWrites:false,
  mergeAllowed:false,productionReleaseAllowed:false
 });
}
function main(){
 try{
  if(process.argv.length!==3)deny();
  const root=fs.realpathSync(process.argv[2]),result=adjudicate(root);
  fs.writeFileSync(path.join(root,'generic-batch-functional-receipt.json'),
   JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
  process.stdout.write('GENERIC_KOTLIN_BATCH_REAL_JVM_ORACLES_AND_UNSAFE_VETO_PASS\n');
 }catch{
  process.stderr.write('GENERIC_KOTLIN_BATCH_ORACLE_VETO\n');
  process.exitCode=1;
 }
}
if(require.main===module)main();
module.exports={adjudicate};
