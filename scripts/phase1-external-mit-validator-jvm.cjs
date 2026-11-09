'use strict';
/*
 * Trusted CI-only, read-only proof for a NEW-to-Sentinel upstream MIT Kotlin
 * source case. Uses authenticated GitHub API metadata, pinned upstream commit
 * and Git blob bytes, an independent Kotlin/JVM oracle under OS isolation,
 * ordinary controls, an unsafe counterfactual and exact local Git rollback.
 * NEVER writes to upstream, JARVIS, GameHub or production.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const {blobSha}=require('../packages/investigation/novel-kotlin-hypotheses.cjs');
const {scanAndDraftAnchoredRegexCase}=
 require('../packages/investigation/external-kotlin-anchored-regex-case.cjs');
const {judgeExternalKotlinOriginalBytes}=
 require('../packages/recovery/external-kotlin-original-byte-judge.cjs');
const UPSTREAM='iamkurtgoz/ECommerceAndroidCompose';
const UPSTREAM_ID=464093153;
const COMMIT='57f7a95021a125e0cdae4924c32891f6b70b0c5a';
const FILE='domain/src/main/java/com/iamkurtgoz/domain/util/Validator.kt';
const ORIGINAL='5b8af35cf6393dc9dbc6217b8d00329bda7bc196';
const PACKAGE='com.iamkurtgoz.domain.util.ExternalMitValidatorOracle';
const GREEN='MIT_VALIDATOR_ORIGINAL_JVM_INDEPENDENT_ORACLE_GREEN';
const sha256=buf=>crypto.createHash('sha256').update(buf).digest('hex');
function veto(reason){throw Error('PHASE1_EXTERNAL_KOTLIN_VETO_'+reason);}
function exec(cmd,args,opt={}){
 const r=spawnSync(cmd,args,{
  encoding:null,timeout:120000,maxBuffer:2000000,
  ...opt
 });
 if(r.error)veto('TOOL_'+cmd.toUpperCase());
 return r;
}
function readFile(name,min=1,max=15000000){
 const stat=fs.lstatSync(name);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||
  stat.size<min||stat.size>max)veto('BAD_ARTIFACT');
 return fs.readFileSync(name);
}
function github(url){
 const r=exec('gh',['api',url],{timeout:20000,maxBuffer:200000});
 if(r.status!==0)veto('GITHUB_READER');
 let obj;
 try{obj=JSON.parse(r.stdout.toString('utf8'));}catch{veto('GITHUB_JSON');}
 if(!obj||typeof obj!=='object'||Array.isArray(obj))veto('GITHUB_METADATA');
 return obj;
}
function localProof(original,after){
 const out=judgeExternalKotlinOriginalBytes({file:{
  path:FILE,before:original,after,beforeBlobSha:ORIGINAL,
  afterBlobSha:blobSha(after)
 }});
 if(out.status!=='EXTERNAL_ORIGINAL_BYTES_LOCAL_JUDGE_ROLLBACK_VERIFIED'||
  !out.exactTreeRollbackVerified||out.remoteWrites!==false||
  out.originalOracleVerifiedByThisFunction!==false)veto('LOCAL_GIT_JUDGE');
 return out;
}
function sandboxMounts(){
 const mounts=['--ro-bind','/usr','/usr'];
 for(const name of ['/bin','/lib','/lib64']){
  const st=fs.lstatSync(name);
  if(st.isSymbolicLink()){
   const target=fs.readlinkSync(name);
   if(path.isAbsolute(target)||target.includes('..'))veto('BAD_SYSTEM_SYMLINK');
   mounts.push('--symlink',target,name);
  }else if(st.isDirectory())mounts.push('--ro-bind',name,name);
  else veto('MISSING_SYSTEM_MOUNT');
 }
 return mounts;
}
function executeIsolated(root,mode,kind,command,mounts,jdk,kotlin){
 const folder=path.join(root,mode);
 const outputMount=kind==='compile'?'--bind':'--ro-bind';
 const args=[
  '--die-with-parent','--unshare-all','--new-session','--clearenv',
  '--setenv','PATH','/usr/bin:/bin','--setenv','HOME','/tmp',
  '--setenv','JAVA_HOME','/jdk','--setenv','JAVA_OPTS','-Xmx512m',
  ...mounts,'--ro-bind',jdk,'/jdk',
  '--ro-bind',kotlin,'/kotlin',
  '--ro-bind',path.join(folder,'input'),'/input',
  outputMount,path.join(folder,'out'),'/out',
  '--proc','/proc','--dev','/dev','--tmpfs','/tmp','--chdir','/tmp',
  '--',...command
 ];
 return exec('bwrap',args,{timeout:120000,maxBuffer:2000000,
  env:{PATH:process.env.PATH,HOME:'/tmp'}});
}
function main(){
 if(process.env.GITHUB_ACTIONS!=='true'||
  process.env.GITHUB_REPOSITORY!=='cardenaspiero255-lang/Ultra-Sentinel'||
  process.env.GITHUB_REPOSITORY_ID!=='1418338512'||
  !process.env.GH_TOKEN||!process.env.RUNNER_TEMP||
  !process.env.EXTERNAL_KOTLIN_HOME||!process.env.JAVA_HOME)
  veto('TRUSTED_RUNNER_CONTRACT');
 const temp=fs.realpathSync(process.env.RUNNER_TEMP);
 const root=path.resolve(process.argv[2]||'');
 if(!root.startsWith(temp+path.sep)||fs.existsSync(root))veto('OUT_OF_SCOPE_OUTPUT');
 fs.mkdirSync(root,{mode:0o700});
 const upstream=github('/repos/'+UPSTREAM);
 if(upstream.id!==UPSTREAM_ID||upstream.full_name!==UPSTREAM||
  upstream.license?.spdx_id!=='MIT')veto('ORIGINAL_REPO_IDENTITY');
 const remote=github('/repos/'+UPSTREAM+'/contents/'+FILE+'?ref='+COMMIT);
 if(remote.type!=='file'||remote.path!==FILE||remote.sha!==ORIGINAL||
  remote.encoding!=='base64'||remote.size<100||remote.size>60000)
  veto('PINNED_SOURCE_METADATA');
 const bytes=Buffer.from(remote.content.replace(/\s/g,''),'base64');
 const original=bytes.toString('utf8');
 if(!Buffer.from(original,'utf8').equals(bytes)||blobSha(original)!==ORIGINAL||
  !readFile('tests/fixtures/mit-external-validator/Validator.kt',100,60000).equals(bytes))
  veto('PINNED_ORIGINAL_BYTES');
 const license=readFile('tests/fixtures/mit-external-validator/LICENSE.upstream',100,4000);
 if(!license.toString('utf8').includes('Copyright (c) 2022 Mehmet Kurtgoz'))
  veto('MIT_LICENSE_MISSING');
 const caseResult=scanAndDraftAnchoredRegexCase({
  repository:UPSTREAM,expectedCommitSha:COMMIT,
  path:FILE,source:original,expectedBlobSha:ORIGINAL
 });
 if(caseResult.status!=='ADVISORY_CANDIDATE_REQUIRES_INDEPENDENT_ORIGINAL_JVM'||
  caseResult.findings.length!==3||caseResult.originalJVMOracleVerified!==false||
  caseResult.remoteWrites!==false)veto('HUNTER_FIXER');
 const candidate=caseResult.candidateSource,unsafe=caseResult.unsafeSource;
 const sourceByMode={original,candidate,unsafe};
 const oracle=readFile('tests/oracles/phase1-external-mit-validator-oracle.kt',100,12000);
 const oracleDigest=sha256(oracle);
 const localCandidate=localProof(original,candidate);
 const localUnsafe=localProof(original,unsafe);
 const jdk=fs.realpathSync(process.env.JAVA_HOME);
 const kotlin=fs.realpathSync(process.env.EXTERNAL_KOTLIN_HOME);
 if(!fs.statSync(path.join(jdk,'bin/java')).isFile()||
  !fs.statSync(path.join(kotlin,'bin/kotlinc')).isFile())
  veto('MISSING_PINNED_JVM_TOOLCHAIN');
 const mounts=sandboxMounts(),artifacts={};
 for(const mode of ['original','candidate','unsafe']){
  const folder=path.join(root,mode);
  fs.mkdirSync(path.join(folder,'input'),{recursive:true,mode:0o700});
  fs.mkdirSync(path.join(folder,'out'),{mode:0o700});
  fs.writeFileSync(path.join(folder,'input','source.kt'),sourceByMode[mode],{
   flag:'wx',mode:0o400});
  fs.writeFileSync(path.join(folder,'input','oracle.kt'),oracle,{flag:'wx',mode:0o400});
  const compile=executeIsolated(root,mode,'compile',[
   '/kotlin/bin/kotlinc','/input/source.kt','/input/oracle.kt',
   '-include-runtime','-d','/out/validator.jar'
  ],mounts,jdk,kotlin);
  fs.writeFileSync(path.join(folder,'compile.log'),
   Buffer.concat([compile.stdout,compile.stderr]),{flag:'wx',mode:0o600});
  if(compile.status!==0)veto('KOTLIN_COMPILATION_'+mode);
  const jar=readFile(path.join(folder,'out','validator.jar'),1000,15000000);
  const jvm=executeIsolated(root,mode,'run',[
   '/jdk/bin/java','-Xmx512m','-cp','/out/validator.jar',PACKAGE
  ],mounts,jdk,kotlin);
  fs.writeFileSync(path.join(folder,'oracle.stdout'),jvm.stdout,{flag:'wx',mode:0o600});
  fs.writeFileSync(path.join(folder,'oracle.stderr'),jvm.stderr,{flag:'wx',mode:0o600});
  const stdout=jvm.stdout.toString('utf8'),stderr=jvm.stderr.toString('utf8');
  if(mode==='candidate'){
   if(jvm.status!==0||stdout.trim()!==GREEN||stderr.trim()!=='')
    veto('CANDIDATE_JVM_GREEN');
  }else{
   const required=mode==='original'?'NAME_FINAL_NEWLINE_ACCEPTED':'BENIGN_EMAIL_REJECTED';
   if(jvm.status===0||!stderr.includes('java.lang.IllegalStateException: '+required)||
    stdout.includes(GREEN))veto('INDEPENDENT_JVM_VETO_'+mode);
  }
  if(!readFile(path.join(folder,'input','source.kt'),100,60000)
   .equals(Buffer.from(sourceByMode[mode],'utf8'))||
   !readFile(path.join(folder,'input','oracle.kt'),100,12000).equals(oracle))
   veto('SOURCE_OR_ORACLE_TAMPER');
  artifacts[mode]={
   sourceBlobSha:blobSha(sourceByMode[mode]),
   sourceSha256:sha256(Buffer.from(sourceByMode[mode])),
   oracleSha256:oracleDigest,
   jarSha256:sha256(jar),
   stdoutSha256:sha256(jvm.stdout),stderrSha256:sha256(jvm.stderr),
   jvmExit:jvm.status,
   verdict:mode==='candidate'?'GREEN':mode==='original'?'RED':'VETO'
  };
 }
 if(artifacts.original.sourceBlobSha!==ORIGINAL||
  artifacts.candidate.sourceBlobSha!==caseResult.candidateBlobSha||
  artifacts.unsafe.sourceBlobSha!==caseResult.unsafeBlobSha||
  localCandidate.exactTreeRollbackVerified!==true||
  localUnsafe.exactTreeRollbackVerified!==true)veto('SAME_CASE_EVIDENCE');
 const receipt={
  schema:'ultra-sentinel-independent-external-kotlin-jvm-oracle/v1',
  sourceRepository:UPSTREAM,sourceRepositoryId:UPSTREAM_ID,
  sourceLicense:'MIT',sourceCommit:COMMIT,sourcePath:FILE,
  sourceOriginalGitBlobSha:ORIGINAL,
  repositoryAndCommitMembershipCheckedViaGitHubAPI:true,
  originalRemoteCommitSignatureVerified:false,
  independentOriginalKotlinJVMExecuted:true,
  originalRed:true,fixerCandidateGreen:true,
  unsafeCandidateFunctionallyVetoed:true,benignControlsPreserved:true,
  originalAndCandidateSameSourceCase:true,
  candidateGeneratedByHunterFixer:true,
  exactOriginalByteLocalRollbackVerified:true,
  originalJVMCaseNewToSentinelHistoricalSet:true,
  originalDefectUniversallyUndisclosed:false,
  androidDeviceTested:false,ownerProductionAuthorization:false,
  remoteWrites:false,productionReleaseAllowed:false,
  phaseOneClosed:false,requiredManualReleaseGatePending:true,
  rule:caseResult.rule,originalFindingLines:caseResult.findings.map(x=>x.line),
  artifacts
 };
 const target=path.join(root,'receipt.json');
 fs.writeFileSync(target,JSON.stringify(receipt,null,2)+'\n',
  {flag:'wx',mode:0o600});
 process.stdout.write('PHASE1_EXTERNAL_MIT_KOTLIN_ORIGINAL_RED_GREEN_UNSAFE_VETO_ROLLBACK_PASS\n');
}
try{main();}catch(error){
 process.stderr.write(String(error.message||error)+'\n');
 process.exitCode=1;
}
