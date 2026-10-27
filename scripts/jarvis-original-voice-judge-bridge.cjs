'use strict';
// CI-controlled bridge: the trusted Bash step compiles and runs pinned JARVIS
// sources in offline AppArmor/Bubblewrap, then this code stages the *same bytes*
// in isolated no-remote Git repos and verifies local Judge/rollback/veto.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const crypto=require('node:crypto');
const {PATHS,PINS,MODES,verifyJarvisSourceBytes,assessJarvisVoiceMatrix}=
 require('../packages/recovery/jarvis-voice-functional-judge.cjs');
const {reproduceCrossFileInterventions}=
 require('../packages/recovery/cross-file-sandbox-reproduction.cjs');
function fail(){throw Error('JARVIS_VOICE_PINNED_KOTLIN_BRIDGE_BLOCKED');}
function read(root,name,cap=12000){
 const pathname=path.join(root,name),stat=fs.lstatSync(pathname);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||
  stat.size<1||stat.size>cap)fail();
 const bytes=fs.readFileSync(pathname),content=bytes.toString('utf8');
 if(!Buffer.from(content,'utf8').equals(bytes)||content.includes('\0'))fail();
 return content;
}
function replaceOnly(text,oldValue,newValue){
 if(text.indexOf(oldValue)<0||text.indexOf(oldValue)!==text.lastIndexOf(oldValue))fail();
 return text.replace(oldValue,newValue);
}
function sha256(data){return crypto.createHash('sha256').update(data).digest('hex');}
function experimentPlan(){
 // These are controlled mutation experiments, NOT a Core-confirmed
 // cross-module root cause or a real GitHub PR candidate SHA.
 const files=PATHS;
 return {schema:'ultra-sentinel-cross-file-interventions/v1',
  status:'EXPERIMENTS_REQUIRED',baseSha:PINS[0].commit,
  headSha:'1'.repeat(40),sourceAuthenticated:false,
  causalityVerified:false,commitAllowed:false,mergeAllowed:false,
  candidates:[{rule:'JARVIS_VOICE_GUARD',
   status:'MULTI_FILE_CAUSAL_HYPOTHESIS_NOT_VERIFIED',causalLinksProved:false,
   files,experiments:[0,1,2,3].map(mask=>({
    kind:mask===0?'baseline':mask===3?'combined':'subset',
    selectedFiles:files.filter((_,i)=>Boolean(mask&(1<<i))),
    executed:false,independentOracleVerified:false
   }))}]
 };
}
function modeOf(files,bargeOriginal,bargeMutant,wakeOriginal,wakeMutant){
 const b=files[PATHS[0]]===bargeOriginal?'0':
  files[PATHS[0]]===bargeMutant?'1':null;
 const w=files[PATHS[1]]===wakeOriginal?'0':
  files[PATHS[1]]===wakeMutant?'1':null;
 if(b===null||w===null)fail();
 return b+w;
}
function expectedLog(mode){
 return 'JARVIS_VOICE_NORMAL_CONTROLS_PASS\n'+
  'JARVIS_VOICE_VECTOR mode='+mode+' barge='+(mode[0]==='1')+
  ' wake='+(mode[1]==='1')+'\n'+
  'JARVIS_VOICE_MATRIX_PROBED\n';
}
function bridge(root){
 const originalBarge=read(root,'BargeInStopPolicy.kt-original.kt'),
  originalWake=read(root,'PartialWakeSignalPolicy.kt-original.kt');
 const pin=verifyJarvisSourceBytes({[PATHS[0]]:originalBarge,[PATHS[1]]:originalWake});
 const mutantBarge=read(root,'barge-mutant.kt'),
  mutantWake=read(root,'wake-mutant.kt'),
  regressedBarge=read(root,'barge-regressed.kt');
 if(mutantBarge!==replaceOnly(originalBarge,
    'if (spokenWords.any { it in setOf(',
    'if (false && spokenWords.any { it in setOf(')||
  mutantWake!==replaceOnly(originalWake,
    'if (normalized != "jarvis") return false',
    'if (!normalized.contains("jarvis")) return false')||
  regressedBarge!==replaceOnly(originalBarge,
    'return if (heardNormalized in setOf(',
    'return if (false && heardNormalized in setOf('))fail();
 const logs={};const jarDigests={};
 for(const mode of MODES){
  logs[mode]=read(root,'run-'+mode+'.log');
  if(logs[mode]!==expectedLog(mode))fail();
  const jar=path.join(root,'matrix-'+mode+'.jar'),stat=fs.lstatSync(jar);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||
   stat.size<1000||stat.size>8000000)fail();
  jarDigests[mode]=sha256(fs.readFileSync(jar));
 }
 const negative=read(root,'regression-10.log');
 if(!negative.includes('JARVIS_VOICE_BENIGN_BARGE_STOP_REGRESSION')||
  negative.includes('JARVIS_VOICE_NORMAL_CONTROLS_PASS'))fail();
 const plan=experimentPlan();
 const versions=[
  {path:PATHS[0],before:originalBarge,after:mutantBarge},
  {path:PATHS[1],before:originalWake,after:mutantWake}
 ];
 const oracle=files=>{
  const mode=modeOf(files,originalBarge,mutantBarge,originalWake,mutantWake);
  return logs[mode]===expectedLog(mode);
 };
 const proof=reproduceCrossFileInterventions({plan,
  candidateRule:'JARVIS_VOICE_GUARD',versions,independentOracle:oracle});
 const accepted=assessJarvisVoiceMatrix({localProof:proof,logs});
 if(!accepted.functionalJudgeApproved||!accepted.gitJudgeApproved||
  !accepted.rollbackVerified||accepted.modesValidated!==4)fail();

 const corrupted=reproduceCrossFileInterventions({plan,
  candidateRule:'JARVIS_VOICE_GUARD',
  versions:[{path:PATHS[0],before:originalBarge,after:regressedBarge},versions[1]],
  independentOracle:files=>{
   if(files[PATHS[0]]===regressedBarge)return false;
   const mode=modeOf(files,originalBarge,mutantBarge,originalWake,mutantWake);
   return logs[mode]===expectedLog(mode);
  }});
 const rejected=assessJarvisVoiceMatrix({localProof:corrupted,logs});
 if(rejected.status!=='VOICE_FUNCTIONAL_JUDGE_VETO'||
  rejected.gitJudgeApproved!==true||rejected.rollbackVerified!==true||
  corrupted.scenarios.filter(s=>s.selectedFiles.includes(PATHS[0]))
   .some(s=>s.judgeStatus!=='APPROVED_LOCAL_POLICY_ONLY'||
    s.rollbackVerified!==true||s.oracleVerdict!=='FAIL'))fail();
 return Object.freeze({
  schema:'ultra-sentinel-jarvis-original-kotlin-voice-e2e/v1',
  status:'JARVIS_SOURCE_PINNED_KOTLIN_VOICE_JUDGE_VETO_VERIFIED',
  sourceRepository:'cardenaspiero255-lang/JARVIS',
  sourceRefs:pin.sources,sourceCommit:PINS[0].commit,
  realKotlinJVMMatrixScenarios:4,benignControlsPassed:true,
  realKotlinJvmRegressionDetected:true,
  negativeRegressionLogSha256:sha256(negative),
  jarSha256:jarDigests,verifiedGitPolicyJudge:true,
  exactGitRollbackVerified:true,functionalJudgeVetoedUnsafeVariant:true,
  separateVoiceSafetyFamilies:['UI_ONLY_WAKE_SIGNAL','TTS_BARGE_IN_ECHO_GUARD'],
  sourceExecutionSandbox:'bubblewrap-apparmor-offline',
  mutationNotPresentInOriginalJarvis:true,
  fullAndroidHardwareIntegrationProven:false,
  coreDerivedRootCause:false,autonomousRepairCompleted:false,
  remoteWrites:false,mergeAllowed:false,productionReleaseAllowed:false
 });
}
function main(){
 try{
  if(process.argv.length!==3)fail();
  const root=fs.realpathSync(process.argv[2]);
  const roots=[os.tmpdir(),process.env.RUNNER_TEMP].filter(Boolean)
   .map(x=>fs.realpathSync(x));
  if(!roots.some(x=>root.startsWith(x+path.sep))||
   !fs.statSync(root).isDirectory()||fs.lstatSync(root).isSymbolicLink())fail();
  const receipt=bridge(root);
  fs.writeFileSync(path.join(root,'jarvis-voice-safe-receipt.json'),
   JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});
  process.stdout.write('JARVIS_KOTLIN_ORIGINAL_MULTIFILE_JUDGE_AND_ROLLBACK_PASS\n');
 }catch(e){
  process.stderr.write('JARVIS_ORIGINAL_KOTLIN_BRIDGE_BLOCKED: '+e.message+'\n');
  process.exitCode=1;
 }
}
if(require.main===module)main();
module.exports={bridge,experimentPlan,expectedLog};
