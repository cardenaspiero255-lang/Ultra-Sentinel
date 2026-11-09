'use strict';
/** Execute exactly three precompiled JVM artifacts in the caller's trusted sandbox.
 * Jar bytes are hashed, not independently authenticated to a compiler or source.
 * The isolated parent must authenticate original Git blobs and independently
 * verify the local Git Judge and rollback. This module never writes source. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {createHash}=require('node:crypto');
const {spawnSync}=require('node:child_process');
const {types}=require('node:util');
const {adjudicateGenericJvmTriplets}=require('./phase2-generic-jvm-judge.cjs');
const SHA=/^[a-f0-9]{40}$/;
const MAIN=/^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*){1,20}$/;
const JARS=Object.freeze({original:'original.jar',candidate:'candidate.jar',unsafe:'wrong.jar'});
function deny(){throw Error('EXECUTED_JVM_TRIPLET_BLOCKED');}
function record(x,keys){
 if(!x||typeof x!=='object'||Array.isArray(x)||types.isProxy(x)||
    Object.getPrototypeOf(x)!==Object.prototype||Reflect.ownKeys(x).length!==keys.length)deny();
 const obj={};for(const key of keys){const d=Object.getOwnPropertyDescriptor(x,key);
  if(!d||!Object.hasOwn(d,'value'))deny();obj[key]=d.value;}return obj;
}
function blocked(){return Object.freeze({status:'BLOCKED_EXECUTED_JVM_TRIPLET',
 jvmProcessesExecutedLocally:false,originalSourceAuthenticated:false,
 compilerProvenanceAuthenticated:false,gitJudgeExecuted:false,
 ownerAuthorizationGranted:false,remoteWrites:false,mergeAllowed:false});}
function executeOriginalJvmTriplet(input){
 try{
  const opts=record(input,['directory','mainClass','caseId','sourceHeadSha',
   'originalBlobSha','candidateBlobSha','markers']);
  if(typeof opts.directory!=='string'||!path.isAbsolute(opts.directory)||
    typeof opts.mainClass!=='string'||!MAIN.test(opts.mainClass)||
    typeof opts.caseId!=='string'||!/^[A-Z0-9_]{6,80}$/.test(opts.caseId)||
    ![opts.sourceHeadSha,opts.originalBlobSha,opts.candidateBlobSha].every(s=>
      typeof s==='string'&&SHA.test(s))||opts.originalBlobSha===opts.candidateBlobSha)deny();
  // Fully snapshot the nested policy before executing ANY JVM bytecode.
  const m=record(opts.markers,['originalFailure','green','unsafeFailure']);
  if(!Array.isArray(m.green)||types.isProxy(m.green)||
     Object.getPrototypeOf(m.green)!==Array.prototype||m.green.length<2||
     m.green.length>24||Reflect.ownKeys(m.green).length!==m.green.length+1)deny();
  const green=[];
  for(let i=0;i<m.green.length;i++){
   const d=Object.getOwnPropertyDescriptor(m.green,String(i));
   if(!d||!Object.hasOwn(d,'value'))deny();green.push(d.value);
  }
  const marker=/^[A-Z0-9_]{4,95}$/;
  if(typeof m.originalFailure!=='string'||typeof m.unsafeFailure!=='string'||
     !marker.test(m.originalFailure)||!marker.test(m.unsafeFailure)||
     !green.every(v=>typeof v==='string'&&marker.test(v))||
     new Set(green).size!==green.length||
     m.originalFailure===m.unsafeFailure||
     green.includes(m.originalFailure)||green.includes(m.unsafeFailure)||
     !green.some(v=>v.startsWith('BENIGN_')&&v.endsWith('_PASS'))||
     !green.some(v=>v.endsWith('_ORACLE_PASS')))deny();
  const trustedMarkers={originalFailure:m.originalFailure,green,unsafeFailure:m.unsafeFailure};
  // Inspect all artifact metadata before running ANY untrusted JVM bytecode.
  const dir=fs.lstatSync(opts.directory);
  if(!dir.isDirectory()||dir.isSymbolicLink()||fs.realpathSync(opts.directory)!==opts.directory)deny();
  const jars={};const digest={};const pinnedBytes={};
  for(const [phase,basename] of Object.entries(JARS)){
   const file=path.join(opts.directory,basename),st=fs.lstatSync(file);
   if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||st.size<4||st.size>32*1024*1024||
      fs.realpathSync(file)!==file)deny();
   const bytes=fs.readFileSync(file);
   if(bytes.length!==st.size||bytes[0]!==0x50||bytes[1]!==0x4b)deny();
   const again=fs.lstatSync(file);
   if(again.ino!==st.ino||again.dev!==st.dev||again.size!==st.size)deny();
   pinnedBytes[phase]=Buffer.from(bytes);
   digest[phase]=createHash('sha256').update(pinnedBytes[phase]).digest('hex');
   jars[phase]=file;
  }
  const outcomes={};
  const env={PATH:process.env.PATH||'/usr/bin:/bin',HOME:'/tmp',
   JAVA_HOME:process.env.JAVA_HOME||'',GIT_NO_REPLACE_OBJECTS:'1',
   GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null'};
  for(const phase of Object.keys(jars)){
   // A previous process never sees the next phase's classpath: each snapshot
   // is created from pinned in-memory bytes AFTER the preceding process exits.
   // OS-level read-only mounts remain a separate isolated-caller requirement.
   const snapshot=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-jvm-snapshot-'));
   const executable=path.join(snapshot,'oracle.jar');
   try{
    fs.writeFileSync(executable,pinnedBytes[phase],{flag:'wx',mode:0o400});
    fs.chmodSync(snapshot,0o500);
    const result=spawnSync('java',['-XX:-UsePerfData','-cp',executable,opts.mainClass],{
     cwd:snapshot,env,encoding:'utf8',timeout:15000,maxBuffer:16384,
     windowsHide:true,shell:false
    });
    if(result.error||result.signal||!Number.isSafeInteger(result.status)||
       typeof result.stdout!=='string'||typeof result.stderr!=='string'||
       Buffer.byteLength(result.stdout,'utf8')>8192||
       Buffer.byteLength(result.stderr,'utf8')>8192)deny();
    outcomes[phase]={exitCode:result.status,stdout:result.stdout,stderr:result.stderr};
    // A phase that changes its own executable or any source JAR is rejected.
    const actual=fs.readFileSync(executable);
    if(createHash('sha256').update(actual).digest('hex')!==digest[phase])deny();
    for(const [originalPhase,originalPath] of Object.entries(jars)){
     const st=fs.lstatSync(originalPath);
     if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||
        createHash('sha256').update(fs.readFileSync(originalPath)).digest('hex')!==digest[originalPhase])deny();
    }
   }finally{
    fs.chmodSync(snapshot,0o700);
    fs.rmSync(snapshot,{recursive:true,force:true});
   }
  }
  const verdict=adjudicateGenericJvmTriplets({cases:[{
   caseId:opts.caseId,sourceHeadSha:opts.sourceHeadSha,
   originalBlobSha:opts.originalBlobSha,candidateBlobSha:opts.candidateBlobSha,
   markers:trustedMarkers,...outcomes
  }]});
  if(verdict.status!=='INERT_JVM_BATCH_AWAITING_TRUSTED_RUNNER'||
     verdict.casesChecked!==1||verdict.approvedCaseIds[0]!==opts.caseId)deny();
  return Object.freeze({status:'LOCAL_JVM_TRIPLET_EXECUTED_AND_CLASSIFIED',
   caseId:opts.caseId,artifactsSha256:Object.freeze(digest),
   jvmProcessesExecutedLocally:true,artifactsHashed:true,
   originalSourceAuthenticated:false,compilerProvenanceAuthenticated:false,
   gitJudgeExecuted:false,ownerAuthorizationGranted:false,
   remoteWrites:false,mergeAllowed:false,
   limitation:'Real JVM processes executed, but source-to-jar compiler provenance and Git policy/rollback must be verified by the trusted isolated caller.'});
 }catch{return blocked();}
}
module.exports=Object.freeze({executeOriginalJvmTriplet});
