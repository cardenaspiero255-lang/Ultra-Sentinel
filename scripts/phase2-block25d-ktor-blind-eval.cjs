#!/usr/bin/env node
'use strict';
/* Phase 2.5d: immutable v4, original Kotlin source-only capture, SHA256 prediction
 * artifact THEN separately executed independent scoped JVM controls. NO scoring
 * without complete defect truth, NO original source changes, NO repair. */
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const {TextDecoder}=require('node:util');
const {readManifest,attest}=require('./phase2-block25d-fourth-cohort-attest.cjs');
const {readOracleSeal,preflight}=require('./phase2-block25d-ktor-oracle-preflight.cjs');
const ENGINE='84c824ce6bfe3d260296108e955bbbc4624e6b7e';
const SOURCE='599e1340c718e501bf5fba080b0ade00b49a893f';
const KINDS=['numeric','codec','identity','cancellation'];
const FILES=7;
const SCHEMAS={
 numeric:'ultra-sentinel-blind-numeric/v1',
 codec:'ultra-sentinel-codec-integrity-hunter/v1',
 identity:'ultra-sentinel-identity-delimiter-hunter/v1',
 cancellation:'ultra-sentinel-cancellation-controlflow-hunter/v2'
};
const STATUS={
 numeric:['NUMERIC_BLIND_HYPOTHESES_UNVERIFIED','NO_NUMERIC_HYPOTHESES_NOT_CERTIFIED'],
 codec:['CODEC_INTEGRITY_HYPOTHESES_REQUIRE_ORIGINAL_ORACLE','NO_CODEC_INTEGRITY_HYPOTHESES_NOT_CERTIFIED'],
 identity:['IDENTITY_DELIMITER_HYPOTHESES_REQUIRE_ORIGINAL_ORACLE','NO_IDENTITY_DELIMITER_HYPOTHESES_NOT_CERTIFIED'],
 cancellation:['CANCELLATION_CONTROLFLOW_HYPOTHESES_REQUIRE_ORIGINAL_ORACLE','NO_CANCELLATION_CONTROLFLOW_HYPOTHESES_NOT_CERTIFIED']
};
function refuse(reason){throw Error('PHASE25C_FROZEN_BLIND_REFUSED:'+reason);}
const sha256=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const gitBlob=bytes=>crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
function git(root,args,binary=false){
 const r=cp.spawnSync('git',['-C',root,...args],{encoding:binary?undefined:'utf8',timeout:15000,maxBuffer:4*1024*1024,
 env:{...process.env,GIT_NO_REPLACE_OBJECTS:'1',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_OPTIONAL_LOCKS:'0',GIT_TERMINAL_PROMPT:'0'}});
 if(r.error||r.status!==0)refuse('GIT_'+args[0]);
 return binary?r.stdout:r.stdout.trim();
}
function validateReports(kind,bytes,manifest){
 if(!Object.hasOwn(SCHEMAS,kind)||!Buffer.isBuffer(bytes)||bytes.length<100||bytes.length>1000000)
  refuse('MISSING_OR_OVERSIZED_WORKER_REPORT_'+kind);
 let obj;
 try{obj=JSON.parse(new TextDecoder('utf8',{fatal:true}).decode(bytes));}catch{refuse('UNTRUSTED_JSON_'+kind);}
 if(!obj||typeof obj!=='object'||Array.isArray(obj)||obj.schema!==SCHEMAS[kind]||
  !STATUS[kind].includes(obj.status)||obj.filesScanned!==FILES||
  obj.sourceByteIntegrityVerified!==true||obj.sourceRepositoryAuthenticated!==false||
  obj.remoteWrites!==false||obj.mergeAllowed!==false||
  !Array.isArray(obj.findings)||obj.findings.length>256)refuse('UNTRUSTED_WORKER_'+kind);
 if(kind==='numeric'){
  if(obj.skippedOversized!==0||obj.skippedNoncanonical!==0||
   obj.compilerAuthenticated!==false||obj.originalOracleVerified!==false||
   obj.repairAuthorized!==false)refuse('NUMERIC_TRUTH_OR_OMISSION');
 }else if(kind==='cancellation'){
  if(obj.originalFunctionalOracleVerified!==false||obj.compilerTypeResolutionVerified!==false||
   obj.causalityVerified!==false||obj.generalizationVerified!==false||
   obj.repairAuthorized!==false)refuse('CANCELLATION_TRUTH_OR_REPAIR');
 }else{
  if(obj.originalFunctionalOracleVerified!==false||obj.causalityVerified!==false||
   obj.generalizationVerified!==false||obj.ownerAuthorizationGranted!==false)
   refuse('UNAUTHORIZED_ADJUDICATION_'+kind);
 }
 const expected=new Map(manifest.cohort.files.map(f=>[f.path,f.blobSha]));
 const seen=new Set();
 for(const f of obj.findings){
  if(!f||typeof f!=='object'||Array.isArray(f)||!expected.has(f.path)||
   expected.get(f.path)!==f.expectedBlobSha||
   !Number.isSafeInteger(f.line)||f.line<1||f.line>4000||
   typeof f.rule!=='string'||!/^[A-Z][A-Z0-9_]{2,90}$/.test(f.rule)||
   (f.status!==undefined&&f.status!=='HYPOTHESIS_REQUIRES_INDEPENDENT_KOTLIN_ORACLE'))
   refuse('INVALID_FINDING_'+kind);
  const identity=f.path+':'+f.line+':'+f.rule;
  if(seen.has(identity))refuse('DUPLICATE_FINDING_'+kind);
  seen.add(identity);
 }
 return obj;
}
function buildSeal(reports){
 const manifest=readManifest();
 if(!reports||typeof reports!=='object'||Array.isArray(reports)||
  Object.keys(reports).sort().join(',')!==KINDS.slice().sort().join(','))
  refuse('FOUR_SOURCE_ONLY_WORKERS_REQUIRED');
 const stats=[];
 let total=0;
 for(const kind of KINDS){
  const bytes=reports[kind],report=validateReports(kind,bytes,manifest);
  stats.push({kind,sha256:sha256(bytes),filesScanned:report.filesScanned,
   unverifiedFindings:report.findings.length,status:report.status});
  total+=report.findings.length;
 }
 const body={schema:'ultra-sentinel-phase2-block25d-v4-ktor-blind-seal/v1',
  engineSha:ENGINE,sourceSha:SOURCE,sourceFiles:FILES,
  sourcePathsSupported:FILES,workerCount:4,reports:stats,
  totalUnverifiedFindings:total,sourceAuthenticatedInHost:true,
  sourceAuthenticatedInWorker:false,oracleExecutedBeforeSeal:false,
  originalPositiveDefectsVerified:false,scored:false,
  truePositives:null,falsePositives:null,falseNegatives:null,precision:null,recall:null,f1:null,
  novelCancellationFamilyVerified:false,automatedRepairsVerified:false,
  repairPermissionGranted:false,remoteWrites:false,mergeAllowed:false};
 return Object.freeze({...body,predictionDigest:sha256(Buffer.from(JSON.stringify(body)))});
}
function verifySeal(seal,reports){
 if(!seal||typeof seal!=='object'||Array.isArray(seal))refuse('MISSING_SEALED_RECEIPT');
 const expected=buildSeal(reports);
 if(JSON.stringify(seal)!==JSON.stringify(expected))refuse('TAMPERED_OR_INCOMPLETE_PREDICTIONS');
 return expected;
}
function adjudicate(seal,markers){
 if(!seal||typeof seal!=='object'||Array.isArray(seal)||
  seal.schema!=='ultra-sentinel-phase2-block25d-v4-ktor-blind-seal/v1'||
  seal.engineSha!==ENGINE||seal.sourceSha!==SOURCE||seal.sourceFiles!==FILES||
  seal.sourcePathsSupported!==FILES||seal.workerCount!==4||
  seal.oracleExecutedBeforeSeal!==false||seal.originalPositiveDefectsVerified!==false||
  seal.scored!==false||seal.precision!==null||seal.recall!==null||seal.f1!==null||
  seal.falsePositives!==null||seal.novelCancellationFamilyVerified!==false||
  seal.automatedRepairsVerified!==false||seal.repairPermissionGranted!==false||
  seal.remoteWrites!==false||seal.mergeAllowed!==false||
  !Number.isSafeInteger(seal.totalUnverifiedFindings)||seal.totalUnverifiedFindings<0||
  !/^[a-f0-9]{64}$/.test(seal.predictionDigest))refuse('INVALID_PRIOR_PREDICTIONS');
 const labels=['ORIGINAL_KTOR_APACHE5_CONNECT_TIMEOUT_BENIGN_CONTROL_PASS'];
 if(!Array.isArray(markers)||markers.length!==labels.length||
  !markers.every((x,i)=>x===labels[i]))refuse('ORIGINAL_JVM_ORACLES_FAILED');
 return Object.freeze({schema:'ultra-sentinel-phase2-block25d-v4-ktor-scoped-verdict/v1',
  status:'FROZEN_V4_SEVEN_AUTHENTICATED_KTOR_ORIGINALS_ONE_SCOPED_BENIGN_JVM_ORACLE',
  engineSha:ENGINE,sourceSha:SOURCE,predictionDigest:seal.predictionDigest,
  frozenWorkerCount:4,originalKotlinSourcesScanned:7,unsupportedSourceCount:0,
  totalUnverifiedFindings:seal.totalUnverifiedFindings,
  scopedBenignControlsPassed:1,originalFilesWithPartialControl:1,
  originalFilesWithoutOracle:6,fullyLabeledOriginalFiles:0,
  originalPositiveDefectsVerified:false,novelCancellationFamilyVerified:false,
  truePositives:null,falsePositives:null,falseNegatives:null,precision:null,recall:null,f1:null,
  automatedRepairsVerified:false,remoteWrites:false,repairAuthorized:false,mergeAllowed:false,
  limitation:'The one independent JDK reference test covers ApacheUtils.kt only partially; six other original Kotlin files have no oracles. A hypothesis is not a verified novel defect. No scoring or repair is allowed.'});
}
function prepare(engine,source,out){
 const receipt=attest(engine,source);
 if(receipt.frozenEngineSha!==ENGINE||receipt.sourceCommitSha!==SOURCE||
  receipt.sourceFilesAuthenticated!==FILES||
  receipt.sourceBodiesForwardedToHunter!==false||receipt.hunterExecuted!==false)
  refuse('UNTRUSTED_PROSPECTIVE_COHORT');
 const m=readManifest(),files=[];
 for(const f of m.cohort.files){
  const binary=git(source,['cat-file','blob',f.blobSha],true);
  if(binary.length!==f.sizeBytes||gitBlob(binary)!==f.blobSha||
   binary.includes(0)||binary.includes(13))refuse('UNSAFE_KOTLIN_BLOB');
  let text;
  try{text=new TextDecoder('utf8',{fatal:true,ignoreBOM:true}).decode(binary);}catch{refuse('INVALID_KOTLIN_TEXT');}
  if(!Buffer.from(text,'utf8').equals(binary))refuse('NONCANONICAL_SOURCE_BYTES');
  files.push({path:f.path,source:text,expectedBlobSha:f.blobSha});
 }
 fs.mkdirSync(out,{recursive:false,mode:0o700});
 fs.writeFileSync(path.join(out,'numeric.json'),
  JSON.stringify({expectedCommitSha:SOURCE,files,skippedOversized:0,skippedNoncanonical:0}),
  {flag:'wx',mode:0o600});
 fs.writeFileSync(path.join(out,'source.json'),JSON.stringify({expectedCommitSha:SOURCE,files}),
  {flag:'wx',mode:0o600});
 return {schema:'ultra-sentinel-phase2-block25c-source-only-inventory/v1',
  sourceSha:SOURCE,engineSha:ENGINE,originalSourceFiles:files.length,
  oraclesAvailableToWorkers:false,sourceRepaired:false,remoteWrites:false};
}
function readReports(dir){
 return Object.fromEntries(KINDS.map(kind=>{
  const f=path.join(dir,kind+'.json'),stat=fs.lstatSync(f);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.size<100||stat.size>1000000)refuse('UNSAFE_REPORT_FILE');
  return [kind,fs.readFileSync(f)];
 }));
}
function main(argv){
 const [command,...a]=argv;
 if(command==='prepare'&&a.length===3){
  console.log(JSON.stringify(prepare(a[0],a[1],a[2])));return;
 }
 if(command==='seal'&&a.length===2){
  const [workerOutput,out]=a;
  const reports=Object.fromEntries(KINDS.map(k=>[k,fs.readFileSync(path.join(workerOutput,k,'discovery.json'))]));
  const seal=buildSeal(reports);
  fs.mkdirSync(out,{mode:0o700});
  for(const kind of KINDS)fs.writeFileSync(path.join(out,kind+'.json'),reports[kind],{flag:'wx',mode:0o600});
  fs.writeFileSync(path.join(out,'prediction-seal.json'),JSON.stringify(seal,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log('BLOCK25C_FOUR_FROZEN_PREDICTIONS_SEALED_BEFORE_ORACLE='+seal.predictionDigest);
  console.log('UNVERIFIED_HYPOTHESES='+seal.totalUnverifiedFindings);return;
 }
 if(command==='verify'&&a.length===1){
  const reports=readReports(a[0]);
  const seal=JSON.parse(fs.readFileSync(path.join(a[0],'prediction-seal.json'),'utf8'));
  verifySeal(seal,reports);
  console.log('BLOCK25C_SEAL_AUTHENTICATED='+seal.predictionDigest);return;
 }
 if(command==='verdict'&&a.length===5){
  const [sealed,oracleLogs,engine,source,out]=a;
  const reports=readReports(sealed);
  const seal=verifySeal(JSON.parse(fs.readFileSync(path.join(sealed,'prediction-seal.json'),'utf8')),reports);
  const attestation=preflight(engine,source);
  if(attestation.authenticOriginalKotlinFiles!==7||
   attestation.predictionsExecuted!==false||attestation.oraclesExecuted!==false)
   refuse('ORIGINAL_KOTLIN_GIT_ORACLE_PRECOMMIT');
  const oracle=readOracleSeal();
  if(oracle.oracleFiles.length!==1||oracle.sourceFilesFullyLabeled!==0)refuse('MISSING_PRECOMMITTED_ORACLES');
  const markers=['apache'].map(k=>{
   const target=path.join(oracleLogs,k+'.log'),stat=fs.lstatSync(target);
   if(!stat.isFile()||stat.isSymbolicLink()||stat.size>1024)refuse('UNTRUSTED_ORACLE_OUTPUT');
   return fs.readFileSync(target,'utf8').trim();
  });
  const verdict=adjudicate(seal,markers);
  fs.writeFileSync(out,JSON.stringify(verdict,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(verdict.status);return;
 }
 refuse('INVALID_CLI');
}
if(require.main===module){try{main(process.argv.slice(2));}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports=Object.freeze({buildSeal,verifySeal,adjudicate,validateReports,prepare});
