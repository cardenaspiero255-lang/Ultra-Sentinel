#!/usr/bin/env node
'use strict';
// Cohort adapter only. Reuses immutable v4 workers, path policy and sandbox
// launchers; never broadens their input authority or runs a detector in-process.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..');
const MANIFEST='docs/quality/PHASE2-BLOCK26-COHORT.json';
const ORACLE='tests/fixtures/phase2-block26/oracle-seal.json';
const MANIFEST_SHA256='e645c91a8b1758a625e286e23f93304a498c9e466cec20f21d99b898b32be12b';
const ORACLE_SHA256='ff5958ebf1f6eb892791fe85dcf8342beaf4a8dd4b9afa0edc07553fc7947aff';
const MARKERS=Object.freeze({numeric:'BAD_BLIND_NUMERIC_INVENTORY',codec:'BLIND_CODEC_WORKER_BLOCKED: UNTRUSTED_HUNTER_VERDICT',identity:'BLIND_IDENTITY_WORKER_BLOCKED: UNTRUSTED_IDENTITY_HUNTER_VERDICT',cancellation:'BLIND_CANCELLATION_V4_WORKER_BLOCKED: UNTRUSTED_HUNTER_VERDICT'});
const KINDS=Object.keys(MARKERS);
const sha256=b=>crypto.createHash('sha256').update(b).digest('hex');
const blob=b=>crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const refuse=s=>{throw Error('BLOCK26_REFUSED:'+s);};
function read(file,max=1024*1024){
 const s=fs.lstatSync(file);
 if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||s.size<1||s.size>max)refuse('UNSAFE_FILE');
 return fs.readFileSync(file);
}
function readManifest(){
 const bytes=read(path.join(ROOT,MANIFEST),20000);
 if(sha256(bytes)!==MANIFEST_SHA256)refuse('PREREGISTERED_COHORT_CHANGED');
 return JSON.parse(bytes);
}
function readOracle(){
 const bytes=read(path.join(ROOT,ORACLE),10000);
 if(sha256(bytes)!==ORACLE_SHA256)refuse('ORACLE_COMMIT_CHANGED');
 const s=JSON.parse(bytes),source=read(path.join(ROOT,s.path),20000);
 if(sha256(source)!==s.sha256||blob(source)!==s.gitBlobSha)refuse('ORACLE_SOURCE_CHANGED');
 return s;
}
function git(root,args,binary=false){
 const r=cp.spawnSync('git',['-C',root,...args],{encoding:binary?undefined:'utf8',timeout:15000,maxBuffer:8*1024*1024,
 env:{...process.env,GIT_NO_REPLACE_OBJECTS:'1',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_OPTIONAL_LOCKS:'0',GIT_TERMINAL_PROMPT:'0'}});
 if(r.error||r.status!==0)refuse('GIT_'+args[0]);
 return binary?r.stdout:r.stdout.trim();
}
function attestSources(engine,source){
 const m=readManifest();readOracle();
 for(const [root,pin] of [[engine,m.engine],[source,m.source]]){
  if(git(root,['rev-parse','HEAD'])!==pin.commitSha||git(root,['rev-parse','HEAD^{tree}'])!==pin.treeSha||
   git(root,['status','--porcelain','--untracked-files=all'])!=='')refuse('DIRTY_OR_CHANGED_CHECKOUT');
 }
 const records=git(source,['ls-tree','-r','-l','-z','HEAD'],true).toString('utf8').split('\0').filter(Boolean);
 const selected=records.map(row=>{
  const match=/^(\d{6}) (blob|tree|commit) ([a-f0-9]{40})\s+(\d+|-)\t(.+)$/.exec(row);
  if(!match)refuse('GIT_TREE_RECORD');
  return {mode:match[1],type:match[2],blobSha:match[3],sizeBytes:Number(match[4]),path:match[5]};
 }).filter(f=>f.mode==='100644'&&f.type==='blob'&&f.path.startsWith('src/main/kotlin/')&&f.path.endsWith('.kt'))
 .map(({path,blobSha,sizeBytes})=>({path,blobSha,sizeBytes}));
 if(JSON.stringify(selected)!==JSON.stringify(m.source.files))refuse('SOURCE_SELECTION_CHANGED');
 const policy=require(path.join(path.resolve(engine),'packages/investigation/novel-kotlin-path-policy.cjs'));
 const files=m.source.files.map(f=>{
  if(policy.isSafeHunterKotlinPath(f.path)!==false)refuse('UNEXPECTED_FROZEN_PATH_AUTHORITY');
  const bytes=git(source,['cat-file','blob','HEAD:'+f.path],true);
  if(bytes.length!==f.sizeBytes||blob(bytes)!==f.blobSha||!read(path.join(source,f.path)).equals(bytes))refuse('ORIGINAL_SOURCE_CHANGED');
  const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  // Preserve every original byte, including CRLF; unsupported inputs abstain inside frozen workers.
  return {path:f.path,source:text,expectedBlobSha:f.blobSha};
 });
 return {expectedCommitSha:m.source.commitSha,files};
}
function validateAttempts(attempts){
 if(!attempts||Object.keys(attempts).sort().join(',')!==KINDS.slice().sort().join(','))refuse('FOUR_WORKER_ATTEMPTS_REQUIRED');
 return KINDS.map(kind=>{
  const a=attempts[kind];
  if(!a||Object.keys(a).sort().join(',')!=='exitCode,outputPresent,stderr,stdout'||a.exitCode!==1||a.outputPresent!==false||
   a.stdout!==''||typeof a.stderr!=='string'||a.stderr.length>20000||!a.stderr.includes(MARKERS[kind])||
   /bwrap:|Operation not permitted|MODULE_NOT_FOUND|command not found/.test(a.stderr))refuse('UNEXPECTED_WORKER_FAILURE_'+kind);
  return {kind,exitCode:1,stdoutSha256:sha256(a.stdout),stderrSha256:sha256(a.stderr),outputPresent:false};
 });
}
function buildSeal(attempts){
 const m=readManifest(),oracle=readOracle();
 const body={schema:'ultra-sentinel-block26-frozen-worker-abstentions/v1',manifestSha256:MANIFEST_SHA256,
  oracleSourceSha256:oracle.sha256,engineSha:m.engine.commitSha,sourceSha:m.source.commitSha,
  sourceFiles:27,filesAnalyzed:0,abstentions:27,unverifiedFindings:0,attempts:validateAttempts(attempts),
  oracleExecutedBeforeSeal:false,precision:null,recall:null,f1:null,
  block26Closed:false,block27Allowed:false,remoteWrites:false,repairAuthorized:false};
 return {...body,predictionDigest:sha256(JSON.stringify(body))};
}
function verifySeal(seal,attempts){
 const expected=buildSeal(attempts);
 if(JSON.stringify(seal)!==JSON.stringify(expected))refuse('PREDICTIONS_OR_RAW_ERRORS_CHANGED');
 return expected;
}
function adjudicate(seal,attempts,oracle){
 verifySeal(seal,attempts);
 if(!oracle||oracle.schema!=='ultra-sentinel-block26-original-jvm-observations/v1'||
  JSON.stringify(oracle.controls)!==JSON.stringify({sort:8,search:8,factorial:21})||
  !Array.isArray(oracle.numeric)||oracle.numeric.length!==2)refuse('ORIGINAL_JVM_CONTRACTS_INCOMPLETE');
 const rows=oracle.numeric;
 for(const [i,id] of ['median','average'].entries()){
  const r=rows[i];
  if(!r||r.id!==id||r.cases!==780||!Number.isSafeInteger(r.mismatches)||r.mismatches<0||r.mismatches>780||
   !Array.isArray(r.examples)||r.examples.length!==Math.min(3,r.mismatches))refuse('INVALID_ORACLE_OBSERVATIONS');
  for(const e of r.examples){
   if(!e||!Array.isArray(e.input)||e.input.length<1||e.input.length>4||
    !e.input.every(v=>[-2147483648,-1,0,1,2147483647].includes(v))||
    typeof e.expected!=='string'||typeof e.actual!=='string'||!Number.isFinite(Number(e.actual))||e.expected===e.actual)refuse('INVALID_COUNTEREXAMPLE');
   const ordered=e.input.slice().sort((a,b)=>a-b),n=ordered.length;
   const expected=id==='average'?Number(ordered.reduce((s,v)=>s+BigInt(v),0n)/BigInt(n)):
    n%2?ordered[(n-1)/2]:(ordered[n/2-1]+ordered[n/2])/2;
   if(Number(e.expected)!==expected||Number(e.actual)===expected)refuse('REFERENCE_CONTRACT_MISMATCH');
  }
 }
 return {schema:'ultra-sentinel-block26-postseal-original-verdict/v1',predictionDigest:seal.predictionDigest,
  oracleSourceSha256:seal.oracleSourceSha256,sourceSha:seal.sourceSha,
  independentCounterexampleFunctions:rows.filter(r=>r.mismatches>0).length,
  independentCounterexampleFamily:rows.some(r=>r.mismatches>0)?'INTEGER_ACCUMULATION_OVERFLOW':null,
  independentObservations:oracle,originalFilesWithPartialOracle:5,originalFilesWithoutOracle:22,
  hunterConfirmedDefects:0,functionalFamiliesDiscoveredByHunter:0,filesAnalyzed:0,abstentions:27,
  block26Closed:false,block27Allowed:false,precision:null,recall:null,f1:null,
  remoteWrites:false,repairAuthorized:false};
}
function attemptsFrom(dir){return Object.fromEntries(KINDS.map(kind=>[kind,{
 exitCode:Number(read(path.join(dir,kind+'.exit'),100).toString().trim()),
 stdout:fs.readFileSync(path.join(dir,kind+'.stdout'),'utf8'),
 stderr:read(path.join(dir,kind+'.stderr'),20000).toString('utf8'),
 outputPresent:fs.existsSync(path.join(dir,kind,'discovery.json'))
}]));}
function save(file,value){fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});}
if(require.main===module){
 try{
  const [command,...args]=process.argv.slice(2);
  if(command==='prepare'&&args.length===3){
   const [engine,source,out]=args,inventory=attestSources(engine,source);
   fs.mkdirSync(out,{mode:0o700});
   save(path.join(out,'inventory.json'),inventory);
   save(path.join(out,'numeric-inventory.json'),{...inventory,skippedOversized:0,skippedNoncanonical:0});
   save(path.join(out,'source-attestation.json'),{engineSha:readManifest().engine.commitSha,sourceSha:inventory.expectedCommitSha,
    manifestSha256:MANIFEST_SHA256,sources:inventory.files.map(f=>({path:f.path,blobSha:f.expectedBlobSha,sha256:sha256(f.source)})),allOriginalFilesAuthenticated:true});
  }else if(command==='seal'&&args.length===1){
   save(path.join(args[0],'predictions.json'),buildSeal(attemptsFrom(args[0])));
  }else if(command==='verify'&&args.length===1){
   verifySeal(JSON.parse(read(path.join(args[0],'predictions.json'))),attemptsFrom(args[0]));
  }else if(command==='adjudicate'&&args.length===3){
   const [engine,source,dir]=args;attestSources(engine,source);
   const bytes=read(path.join(dir,'oracle-observations.json'));
   const result=adjudicate(JSON.parse(read(path.join(dir,'predictions.json'))),attemptsFrom(dir),JSON.parse(bytes));
   save(path.join(dir,'verdict.json'),{...result,oracleOutputSha256:sha256(bytes)});
   console.log(JSON.stringify(result));
  }else refuse('ARGUMENTS');
 }catch(e){console.error(e.message);process.exitCode=1;}
}
module.exports=Object.freeze({readManifest,attestSources,buildSeal,verifySeal,adjudicate,MARKERS});
