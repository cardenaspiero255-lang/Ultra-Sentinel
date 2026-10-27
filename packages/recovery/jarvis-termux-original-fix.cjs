'use strict';
/**
 * First original-source novel-defect development pilot for JARVIS Termux result
 * grammar. The repair is deliberately tailored to this verified source, not an
 * autonomous generator. Runs in disposable local Git only; never grants writes.
 */
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const {judgeLocalRepair}=require('./repair-judge.cjs');
const {rollbackSandbox}=require('./sandbox-rollback.cjs');
const PATH='apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/CompanionResultPolicy.kt';
const PIN=Object.freeze({
 commit:'f2572a8abb0a1ef5b34d971ea8c4dc5acbecf868',
 blob:'7c6f326cb267b56f4ca6b2d0614753695259da56'
});
const oldLine=String.raw`    private val uidPattern = Regex("^uid=[0-9]+(?:\\([^)]{1,64}\\))?(?:\\s|$)")`;
const safeLine=String.raw`    private val uidPattern = Regex(
        "^uid=[0-9]+(?:\\([A-Za-z0-9_.-]{1,64}\\))?" +
            "(?: gid=[0-9]+(?:\\([A-Za-z0-9_.-]{1,64}\\))?)?" +
            "(?: groups=[0-9]+(?:\\([A-Za-z0-9_.-]{1,64}\\))?" +
            "(?:,[0-9]+(?:\\([A-Za-z0-9_.-]{1,64}\\))?)*)?" +
            "(?: context=[A-Za-z0-9_:.,-]{1,128})?$"
    )`;
const oldMatch='uidPattern.containsMatchIn(stdout.trim())';
const newMatch='uidPattern.matches(stdout.trim())';
const bad=()=>{throw Error('TERMUX_ORIGINAL_FIX_GATE_BLOCKED');};
function digest(data,kind='sha256'){
 return crypto.createHash(kind).update(data).digest('hex');
}
function gitBlob(s){
 const bytes=Buffer.from(s,'utf8');
 return digest(Buffer.concat([Buffer.from('blob '+bytes.length+'\0'),bytes]),'sha1');
}
function replaceOne(input,oldText,replacement){
 if(input.indexOf(oldText)<0||input.indexOf(oldText)!==input.lastIndexOf(oldText))bad();
 return input.replace(oldText,replacement);
}
function makeTermuxCandidate(original){
 if(typeof original!=='string'||!original.endsWith('\n')||
    original.length<100||original.length>10000||original.includes('\0')||
    original.includes('\r')||
    !original.includes('class TermuxResultTracker'))bad();
 const unsafe=replaceOne(original,oldMatch,newMatch);
 const candidate=replaceOne(replaceOne(original,oldLine,safeLine),oldMatch,newMatch);
 if(unsafe===candidate||candidate===original)bad();
 return Object.freeze({candidate,unsafe,sourceSha256:digest(original),
  candidateSha256:digest(candidate),unsafeSha256:digest(unsafe)});
}
function verifyOriginalAndCandidate({original,candidate}={}){
 try{
  if(gitBlob(original)!==PIN.blob)return false;
  return makeTermuxCandidate(original).candidate===candidate;
 }catch{return false;}
}
function read(root,name,min=1,max=100000){
 const loc=path.join(root,name),stat=fs.lstatSync(loc);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||
    stat.size<min||stat.size>max)bad();
 return fs.readFileSync(loc);
}
function utf8(data){
 const s=data.toString('utf8');
 if(!Buffer.from(s,'utf8').equals(data)||s.includes('\0'))bad();
 return s;
}
function git(cwd,...args){
 const p=spawnSync('git',['-c','core.hooksPath=/dev/null',
  '-c','core.fsmonitor=false','-c','commit.gpgsign=false',
  '-c','core.autocrlf=false',...args],{
  cwd,encoding:'utf8',timeout:10000,maxBuffer:1000000,
  env:{PATH:process.env.PATH,HOME:cwd,GIT_CONFIG_NOSYSTEM:'1',
   GIT_CONFIG_GLOBAL:'/dev/null',GIT_TERMINAL_PROMPT:'0'}
 });
 if(p.status!==0||p.error)bad();
 return p.stdout.trim();
}
function gitScenario(original,next,expectedBlob){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'termux-real-kotlin-judge-'));
 try{
  git(root,'init','-q','-b','sandbox/termux-real');
  git(root,'-c','user.name=Sentinel Sandbox',
    '-c','user.email=sandbox@example.invalid','config','--local','user.name','Sentinel Sandbox');
  git(root,'config','user.email','sandbox@example.invalid');
  const target=path.join(root,PATH);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,original,{flag:'wx',mode:0o600});
  git(root,'add','--',PATH);git(root,'commit','-qm','baseline');
  const base=git(root,'rev-parse','HEAD');
  const originalTree=git(root,'rev-parse','HEAD^{tree}');
  if(git(root,'rev-parse','HEAD:'+PATH)!==PIN.blob||
     git(root,'remote')!=='')bad();
  fs.writeFileSync(target,next);
  git(root,'add','--',PATH);git(root,'commit','-qm','sandbox candidate');
  const repaired=git(root,'rev-parse','HEAD');
  const judge=judgeLocalRepair({directory:root,baselineHeadSha:base,
   repairHeadSha:repaired,plan:{
    expectedHeadSha:base,branch:'sandbox/termux-real',
    changes:[{path:PATH,beforeBlobSha:PIN.blob,afterBlobSha:expectedBlob,
      patchBytes:Buffer.byteLength(next,'utf8')}]}
  });
  if(!judge.approved||judge.checkedFiles!==1)bad();
  const recovery=rollbackSandbox({directory:root,baselineHeadSha:base,
    repairHeadSha:repaired});
  if(recovery.status!=='ROLLBACK_VERIFIED'||recovery.restoredTree!==originalTree||
     git(root,'remote')!==''||git(root,'status','--porcelain')!==''||
     git(root,'rev-parse','HEAD:'+PATH)!==PIN.blob)bad();
  return true;
 }finally{fs.rmSync(root,{recursive:true,force:true});}
}
function bridge(root){
 if(typeof root!=='string'||!path.isAbsolute(root))bad();
 const real=fs.realpathSync(root),tmp=fs.realpathSync(os.tmpdir());
 if(!real.startsWith(tmp+path.sep)||!fs.statSync(real).isDirectory())bad();
 const original=utf8(read(real,'original.kt',100,10000));
 const candidate=utf8(read(real,'candidate.kt',100,12000));
 const unsafe=utf8(read(real,'unsafe.kt',100,12000));
 if(!verifyOriginalAndCandidate({original,candidate})||
  unsafe!==makeTermuxCandidate(original).unsafe)bad();
 process.stdout.write('TERMUX_ORIGINAL_SOURCE_PIN_VERIFIED\n');
 const proof=makeTermuxCandidate(original);
 const expected=[
  ['original','UNTRUSTED_SUFFIX_ACCEPTED',false,original],
  ['unsafe','NORMAL_ID_FORMAT_FAILED',false,unsafe],
  ['candidate','TERMUX_ORIGINAL_ORACLE_PASS',true,candidate]
 ];
 const artifacts={};
 for(const [mode,marker,passing,src] of expected){
  const log=utf8(read(real,mode+'.log',1,10000));
  const jar=read(real,mode+'.jar',1000,8000000);
  const compiler=read(real,mode+'.compile',0,100000);
  const row=JSON.parse(utf8(read(real,mode+'.json',2,4000)));
  const keys=Object.keys(row).sort().join(',');
  if(keys!=='compileLogSha256,jarSha256,oracleLogSha256,sourceSha256,status'||
    row.sourceSha256!==digest(src)||
    row.compileLogSha256!==digest(compiler)||
    row.jarSha256!==digest(jar)||
    row.oracleLogSha256!==digest(log)||
    row.status!==(passing?'GREEN':'RED')||
    !log.includes(marker)||log.includes('TERMUX_ORIGINAL_ORACLE_PASS')!==passing)bad();
  artifacts[mode]=Object.freeze({sourceSha256:row.sourceSha256,
   jarSha256:row.jarSha256,oracleLogSha256:row.oracleLogSha256});
 }
 process.stdout.write('TERMUX_JVM_ARTIFACT_HASHES_VERIFIED\n');
 const good=gitScenario(original,candidate,gitBlob(candidate));
 process.stdout.write('TERMUX_REPAIR_LOCAL_JUDGE_ROLLBACK_VERIFIED\n');
 const negative=gitScenario(original,unsafe,gitBlob(unsafe));
 if(!good||!negative)bad();
 return Object.freeze({
  schema:'ultra-sentinel-jarvis-novel-original-functional-pilot/v1',
  status:'PINNED_ORIGINAL_KOTLIN_RED_GREEN_AND_LOCAL_ROLLBACK',
  sourceRepo:'cardenaspiero255-lang/JARVIS',
  sourceCommit:PIN.commit,sourceBlob:PIN.blob,
  originalSourceSha256:proof.sourceSha256,
  candidateSourceSha256:proof.candidateSha256,
  artifactDigests:artifacts,
  originalJVMOracleFailedAsExpected:true,
  repairedJVMOraclePassed:true,
  unsafeRepairJVMOracleRejected:true,
  localGitPolicyJudgeApproved:true,
  exactLocalGitRollbackVerified:true,
  trustedRunnerStillRequired:true,
  autonomousDetectionProven:false,
  autonomousRepairProven:false,
  androidE2eProven:false,remoteWrites:false,
  mergeAllowed:false,productionReleaseAllowed:false
 });
}
module.exports={PATH,PIN,makeTermuxCandidate,verifyOriginalAndCandidate,bridge};
