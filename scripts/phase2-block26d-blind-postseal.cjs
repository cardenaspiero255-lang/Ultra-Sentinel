#!/usr/bin/env node
'use strict';
// Immutable prospective source-only predictions BEFORE the independent,
// previously SHA256-precommitted original JVM oracle. No automatic scoring.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const crypto=require('node:crypto'),{TextDecoder}=require('node:util');
const {readManifest,attest}=require('./phase2-block26b-v5-preregister.cjs');
const ENGINE='22a4dfee8e87b62b14501a81a94ca902d8fbca7b';
const SOURCE='498c8a10febe1a97f085a295c1f6b2a818a83f89';
const FILES=13, KINDS=['numeric','codec','identity','cancellation'];
const SCHEMAS=Object.freeze({
 numeric:'ultra-sentinel-blind-numeric/v1',
 codec:'ultra-sentinel-codec-integrity-hunter/v1',
 identity:'ultra-sentinel-identity-delimiter-hunter/v1',
 cancellation:'ultra-sentinel-cancellation-controlflow-hunter/v2'
});
const STATUSES=Object.freeze({
 numeric:['NUMERIC_BLIND_HYPOTHESES_UNVERIFIED','NO_NUMERIC_HYPOTHESES_NOT_CERTIFIED'],
 codec:['CODEC_INTEGRITY_HYPOTHESES_REQUIRE_ORIGINAL_ORACLE','NO_CODEC_INTEGRITY_HYPOTHESES_NOT_CERTIFIED'],
 identity:['IDENTITY_DELIMITER_HYPOTHESES_REQUIRE_ORIGINAL_ORACLE','NO_IDENTITY_DELIMITER_HYPOTHESES_NOT_CERTIFIED'],
 cancellation:['CANCELLATION_CONTROLFLOW_HYPOTHESES_REQUIRE_ORIGINAL_ORACLE','NO_CANCELLATION_CONTROLFLOW_HYPOTHESES_NOT_CERTIFIED']
});
const refuse=code=>{throw Error('BLOCK26D_BLIND_REFUSED:'+code);};
const sha256=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const gitBlob=bytes=>crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
function git(root,args,binary=false){
 const result=cp.spawnSync('git',['-C',root,...args],{
  encoding:binary?undefined:'utf8',timeout:15000,maxBuffer:8*1024*1024,
  env:{...process.env,GIT_NO_REPLACE_OBJECTS:'1',GIT_CONFIG_NOSYSTEM:'1',
   GIT_CONFIG_GLOBAL:'/dev/null',GIT_OPTIONAL_LOCKS:'0',GIT_TERMINAL_PROMPT:'0'}
 });
 if(result.error||result.status!==0)refuse('GIT_'+args[0]);
 return binary?result.stdout:result.stdout.trim();
}
function prepare(engine,source,out){
 const pinned=attest(engine,source),manifest=readManifest();
 if(pinned.frozenEngineSha!==ENGINE||pinned.originalSourceSha!==SOURCE||
  pinned.originalsAuthenticatedByGitTree!==FILES||manifest.cohort.files.length!==FILES)
  refuse('FROZEN_GIT_IDENTITY_CHANGED');
 const files=manifest.cohort.files.map(f=>{
  const bytes=git(source,['cat-file','blob',f.blobSha],true);
  if(bytes.length!==f.sizeBytes||gitBlob(bytes)!==f.blobSha||bytes.includes(0)||bytes.includes(13))
   refuse('UNSUPPORTED_OR_MODIFIED_ORIGINAL_BYTES');
  let text;
  try{text=new TextDecoder('utf8',{fatal:true,ignoreBOM:true}).decode(bytes);}
  catch{refuse('INVALID_ORIGINAL_UTF8');}
  if(!Buffer.from(text,'utf8').equals(bytes))refuse('NONCANONICAL_SOURCE_BYTES');
  return {path:f.path,expectedBlobSha:f.blobSha,source:text};
 });
 fs.mkdirSync(out,{mode:0o700});
 save(path.join(out,'source.json'),{expectedCommitSha:SOURCE,files});
 save(path.join(out,'numeric.json'),{expectedCommitSha:SOURCE,files,skippedOversized:0,skippedNoncanonical:0});
 return {sourceSha:SOURCE,engineSha:ENGINE,originals:files.length,
  oraclesMountedIntoHunter:false,originalSourceUnmodified:true};
}
function validateReport(kind,raw){
 if(!KINDS.includes(kind)||!Buffer.isBuffer(raw)||raw.length<90||raw.length>1024*1024)
  refuse('INVALID_REPORT_SIZE_OR_KIND');
 let value;
 try{value=JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(raw));}
 catch{refuse('INVALID_WORKER_REPORT_ENCODING');}
 if(!value||Array.isArray(value)||typeof value!=='object'||value.schema!==SCHEMAS[kind]||
  !STATUSES[kind].includes(value.status)||value.filesScanned!==FILES||
  value.sourceByteIntegrityVerified!==true||value.sourceRepositoryAuthenticated!==false||
  value.remoteWrites!==false||value.mergeAllowed!==false||
  !Array.isArray(value.findings)||value.findings.length>256)
  refuse('INVALID_SOURCE_ONLY_REPORT_'+kind);
 if(kind==='numeric'){
  if(value.skippedOversized!==0||value.skippedNoncanonical!==0||
   value.compilerAuthenticated!==false||value.originalOracleVerified!==false||
   value.repairAuthorized!==false)refuse('NUMERIC_UNTRUSTED_TRUTH');
 }else if(kind==='cancellation'){
  if(value.originalFunctionalOracleVerified!==false||value.compilerTypeResolutionVerified!==false||
   value.causalityVerified!==false||value.generalizationVerified!==false||
   value.repairAuthorized!==false)refuse('CANCELLATION_UNTRUSTED_TRUTH');
 }else if(value.originalFunctionalOracleVerified!==false||value.causalityVerified!==false||
  value.generalizationVerified!==false||value.ownerAuthorizationGranted!==false)
  refuse('UNAUTHORIZED_ADJUDICATION_'+kind);
 const source=new Map(readManifest().cohort.files.map(f=>[f.path,f.blobSha]));
 const seen=new Set();
 for(const f of value.findings){
  if(!f||typeof f!=='object'||Array.isArray(f)||!source.has(f.path)||
   source.get(f.path)!==f.expectedBlobSha||!Number.isSafeInteger(f.line)||
   f.line<1||f.line>10000||typeof f.rule!=='string'||
   !/^[A-Z][A-Z0-9_]{2,90}$/.test(f.rule)||
   (f.status!==undefined&&f.status!=='HYPOTHESIS_REQUIRES_INDEPENDENT_KOTLIN_ORACLE'))
   refuse('UNAUTHENTICATED_HYPOTHESIS_'+kind);
  const identity=f.path+':'+f.line+':'+f.rule;
  if(seen.has(identity))refuse('DUPLICATE_HYPOTHESIS');
  seen.add(identity);
 }
 return value;
}
function buildSeal(reports){
 if(!reports||typeof reports!=='object'||Array.isArray(reports)||
  Object.keys(reports).sort().join(',')!==KINDS.slice().sort().join(','))
  refuse('FOUR_REPORTS_REQUIRED');
 const stats=[];let count=0;
 for(const kind of KINDS){
  const bytes=reports[kind],parsed=validateReport(kind,bytes);
  stats.push({kind,sha256:sha256(bytes),filesScanned:parsed.filesScanned,
   unverifiedFindings:parsed.findings.length,status:parsed.status});
  count+=parsed.findings.length;
 }
 const body={schema:'ultra-sentinel-phase2-block26d-original-source-only-seal/v1',
  engineSha:ENGINE,sourceSha:SOURCE,sourceFiles:FILES,workerCount:4,
  reports:stats,totalUnverifiedFindings:count,oracleExecutedBeforeSeal:false,
  sourceAuthenticatedInHost:true,sourceAuthenticatedInWorker:false,
  originalFunctionalTruthKnown:false,hunterConfirmedDefects:0,
  precision:null,recall:null,f1:null,block26Closed:false,block27Allowed:false,
  remoteWrites:false,repairAuthorized:false,mergeAllowed:false};
 return Object.freeze({...body,predictionDigest:sha256(Buffer.from(JSON.stringify(body)))});
}
function verifySeal(seal,reports){
 const expected=buildSeal(reports);
 if(!seal||typeof seal!=='object'||Array.isArray(seal)||
  JSON.stringify(seal)!==JSON.stringify(expected))
  refuse('SEALED_PREDICTION_TAMPERED');
 return expected;
}
function adjudicate(seal,observation){
 if(!seal||seal.schema!=='ultra-sentinel-phase2-block26d-original-source-only-seal/v1'||
  seal.engineSha!==ENGINE||seal.sourceSha!==SOURCE||seal.sourceFiles!==FILES||
  seal.workerCount!==4||seal.oracleExecutedBeforeSeal!==false||
  seal.block26Closed!==false||seal.block27Allowed!==false||
  seal.hunterConfirmedDefects!==0||seal.precision!==null||seal.recall!==null||
  !/^[a-f0-9]{64}$/.test(seal.predictionDigest))refuse('INVALID_PRESEALED_CONTRACT');
 if(!observation||typeof observation!=='object'||Array.isArray(observation)||
  observation.schema!=='ultra-sentinel-phase2-block26c-original-jvm-observations/v1'||
  observation.originalBenignControlsPassed!==26||
  observation.clearExpectedEmpty!==true||observation.capacityAfterClear!==3||
  observation.enqueueAfterClearRejected!==true||
  observation.originalCounterexampleObserved!==true||
  observation.hunterConfirmedFindings!==null||
  observation.precision!==null||observation.recall!==null||observation.block26Closed!==false||
  Object.keys(observation).sort().join(',')!==[
   'schema','originalBenignControlsPassed','clearExpectedEmpty','capacityAfterClear',
   'enqueueAfterClearRejected','originalCounterexampleObserved','hunterConfirmedFindings',
   'precision','recall','block26Closed'].sort().join(','))
  refuse('INVALID_INDEPENDENT_ORIGINAL_ORACLE_OUTPUT');
 return {schema:'ultra-sentinel-phase2-block26d-original-postseal-verdict/v1',
  predictionDigest:seal.predictionDigest,engineSha:ENGINE,sourceSha:SOURCE,
  scannedOriginals:FILES,independentScopedControlsPassed:26,
  scopedOriginalCounterexampleObserved:true,oracleScope:'RingBuffer.clear() and bounded FIFO controls',
  originalFilesWithScopedOracle:1,originalFilesWithoutOracle:12,
  unverifiedHunterHypotheses:seal.totalUnverifiedFindings,
  hunterConfirmedDefects:0,functionalFamiliesDiscoveredByHunter:0,
  precision:null,recall:null,f1:null,
  block26Closed:false,block27Allowed:false,remoteWrites:false,repairAuthorized:false,
  limitations:'The independent original queue oracle demonstrates one scoped counterexample; no verified source-only Hunter hypothesis has been causally linked to it.'};
}
function save(file,data){
 fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n',{flag:'wx',mode:0o600});
}
function readFile(file,max=1024*1024){
 const st=fs.lstatSync(file);
 if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||st.size<10||st.size>max)
  refuse('UNSAFE_SEALED_FILE');
 return fs.readFileSync(file);
}
function reportsAt(dir){
 return Object.fromEntries(KINDS.map(kind=>[kind,readFile(path.join(dir,kind+'.json'))]));
}
function sealReports(input,output){
 const reports=Object.fromEntries(KINDS.map(kind=>[
  kind,readFile(path.join(input,kind,'discovery.json'))]));
 const seal=buildSeal(reports);
 fs.mkdirSync(output,{mode:0o700});
 for(const kind of KINDS)fs.writeFileSync(path.join(output,kind+'.json'),reports[kind],
  {flag:'wx',mode:0o600});
 save(path.join(output,'prediction-seal.json'),seal);
 return seal;
}
function verifiedSealedDirectory(dir){
 const reports=reportsAt(dir);
 return verifySeal(JSON.parse(readFile(path.join(dir,'prediction-seal.json')).toString('utf8')),reports);
}
if(require.main===module){
 try{
  const [action,...args]=process.argv.slice(2);
  if(action==='prepare'&&args.length===3){
   console.log(JSON.stringify(prepare(...args)));
  }else if(action==='seal'&&args.length===2){
   const seal=sealReports(...args);
   console.log('BLOCK26D_SEALED_SHA256='+seal.predictionDigest);
   console.log('BLOCK26D_UNVERIFIED_HYPOTHESES='+seal.totalUnverifiedFindings);
  }else if(action==='verify'&&args.length===1){
   console.log('BLOCK26D_SEAL_VERIFIED='+verifiedSealedDirectory(args[0]).predictionDigest);
  }else if(action==='verdict'&&args.length===3){
   const seal=verifiedSealedDirectory(args[0]);
   // Only reached in the second, dependent job AFTER the sealed artifact is downloaded.
   const {verifyOracleSeal,readOracleSeal}=require('./phase2-block26c-oracle-preflight.cjs');
   verifyOracleSeal(readOracleSeal());
   const observation=JSON.parse(readFile(args[1],4096).toString('utf8'));
   const result=adjudicate(seal,observation);
   save(args[2],result);console.log(JSON.stringify(result));
  }else refuse('UNSUPPORTED_COMMAND');
 }catch(err){console.error(err.message);process.exitCode=1;}
}
module.exports=Object.freeze({prepare,validateReport,buildSeal,verifySeal,adjudicate,sealReports,verifiedSealedDirectory});
