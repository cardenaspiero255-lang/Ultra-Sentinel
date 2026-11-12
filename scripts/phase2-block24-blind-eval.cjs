#!/usr/bin/env node
'use strict';
/** Block 2.4c: source-only frozen Hunter v2, prediction artifact seal, then independent postseal oracle.
 * This file cannot alter the frozen engine and never attributes global labels or grants repair rights. */
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const crypto=require('node:crypto');
const {TextDecoder}=require('node:util');
const {readPinnedManifest,validateSourceEntries}=require('./phase2-block24-preflight.cjs');
const ENGINE='34679a71aed54abbc3ecbffbf29299cfb25f65b8';
const ENGINE_TREE='c6a0cdc3d2fa10843d4f58c8bec0c15e222176e2';
const SOURCE='cf40e5ba7cd99ba812177d597a9f6ce0570545b1';
const SOURCE_TREE='ca3455d638cbb02307b46c8b11106baa58e55d5d';
const SCOPETREE='b94f506ed869ac50eff051ba70c43e290bb9d90d';
const KINDS=['numeric','codec','identity'];
const FILES=6;
function refuse(reason){throw Error('PHASE24_BLIND_V2_REFUSED:'+reason);}
function sha256(bytes){return crypto.createHash('sha256').update(bytes).digest('hex');}
function gitBlob(bytes){return crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');}
function git(dir,args,{binary=false}={}){
 const r=cp.spawnSync('git',['-C',dir,...args],{encoding:binary?undefined:'utf8',timeout:15000,maxBuffer:4*1024*1024,
  env:{...process.env,GIT_NO_REPLACE_OBJECTS:'1',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_OPTIONAL_LOCKS:'0',GIT_TERMINAL_PROMPT:'0'}});
 if(r.error||r.status!==0)refuse('GIT_FAILED_'+args[0]);
 return binary?r.stdout:r.stdout.trim();
}
function validateReports(kind,bytes,manifest){
 if(!Buffer.isBuffer(bytes)||bytes.length<100||bytes.length>1000000)refuse('MISSING_OR_OVERSIZED_WORKER_RESULT');
 let r;
 try{r=JSON.parse(new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes));}catch{refuse('INVALID_JSON_REPORT');}
 const schemas={numeric:'ultra-sentinel-blind-numeric/v1',codec:'ultra-sentinel-codec-integrity-hunter/v1',identity:'ultra-sentinel-identity-delimiter-hunter/v1'};
 if(r.schema!==schemas[kind]||typeof r.status!=='string'||r.status.startsWith('BLOCKED_')||
   r.filesScanned!==FILES||r.sourceByteIntegrityVerified!==true||r.sourceRepositoryAuthenticated!==false||
   r.remoteWrites!==false||r.mergeAllowed!==false||!Array.isArray(r.findings)||r.findings.length>256)refuse('WORKER_INCOMPLETE_'+kind);
 if(kind==='numeric'){
  if(r.skippedOversized!==0||r.skippedNoncanonical!==0||
     r.originalOracleVerified!==false||r.compilerAuthenticated!==false||
     !['NUMERIC_BLIND_HYPOTHESES_UNVERIFIED','NO_NUMERIC_HYPOTHESES_NOT_CERTIFIED'].includes(r.status))
   refuse('NUMERIC_STATUS');
 }else{
  if(r.originalFunctionalOracleVerified!==false||r.causalityVerified!==false||r.generalizationVerified!==false||
    r.ownerAuthorizationGranted!==false)refuse('ORACLE_CONTAMINATED');
  const allowed=kind==='codec'?['CODEC_INTEGRITY_HYPOTHESES_REQUIRE_ORIGINAL_ORACLE','NO_CODEC_INTEGRITY_HYPOTHESES_NOT_CERTIFIED']:
  ['IDENTITY_DELIMITER_HYPOTHESES_REQUIRE_ORIGINAL_ORACLE','NO_IDENTITY_DELIMITER_HYPOTHESES_NOT_CERTIFIED'];
  if(!allowed.includes(r.status))refuse('UNEXPECTED_REPORT_STATUS');
 }
 const byPath=new Map(manifest.cohort.files.map(f=>[f.path,f.blobSha]));
 const unique=new Set();
 for(const f of r.findings){
  const key=String(f.path)+':'+String(f.line)+':'+String(f.rule);
  if(!byPath.has(f.path)||byPath.get(f.path)!==f.expectedBlobSha||
   !Number.isSafeInteger(f.line)||f.line<1||f.line>4000||
   typeof f.rule!=='string'||!/^[A-Z][A-Z0-9_]{2,90}$/.test(f.rule)||unique.has(key)||
   (f.status!==undefined&&f.status!=='HYPOTHESIS_REQUIRES_INDEPENDENT_KOTLIN_ORACLE'))
   refuse('UNSUPPORTED_OR_FORGED_FINDING');
  unique.add(key);
 }
 return r;
}
function sealBody(reports,manifest){
 if(!reports||Object.keys(reports).sort().join(',')!=='codec,identity,numeric')refuse('INCOMPLETE_WORKER_REPORTS');
 const results=[];let total=0;
 for(const kind of KINDS){
  const bytes=reports[kind],r=validateReports(kind,bytes,manifest);
  results.push({kind,sha256:sha256(bytes),filesScanned:r.filesScanned,
   unverifiedFindings:r.findings.length,status:r.status});
  total+=r.findings.length;
 }
 return {schema:'ultra-sentinel-phase2-block24-v2-original-io-blind-seal/v1',
  engineSha:ENGINE,sourceSha:SOURCE,sourceFiles:FILES,legacyPathsSupported:FILES,
  workerCount:3,reports:results,totalUnverifiedFindings:total,
  sourceAuthenticatedInHost:true,sourceAuthenticatedInWorker:false,
  oracleExecutedBeforeSeal:false,originalPositiveDefectsVerified:false,
  scored:false,precision:null,recall:null,f1:null,truePositives:null,falsePositives:null,falseNegatives:null,
  novelFamilyVerified:false,automatedRepairsVerified:false,
  repairPermissionGranted:false,remoteWrites:false,mergeAllowed:false};
}
function buildSeal(reports){
 const manifest=readPinnedManifest();
 const body=sealBody(reports,manifest);
 return Object.freeze({...body,predictionDigest:sha256(Buffer.from(JSON.stringify(body)))});
}
function verifySeal(receipt,reports){
 if(!receipt||typeof receipt!=='object'||Array.isArray(receipt)||typeof receipt.predictionDigest!=='string')refuse('INVALID_SEAL_OBJECT');
 const expected=buildSeal(reports);
 if(JSON.stringify(receipt)!==JSON.stringify(expected))refuse('UNTRUSTED_OR_MODIFIED_PREDICTION_SEAL');
 return receipt;
}
function adjudicate(seal,markers){
 if(!seal||seal.schema!=='ultra-sentinel-phase2-block24-v2-original-io-blind-seal/v1'||
  seal.engineSha!==ENGINE||seal.sourceSha!==SOURCE||seal.sourceFiles!==6||
  seal.workerCount!==3||seal.oracleExecutedBeforeSeal!==false||seal.scored!==false||
  seal.precision!==null||seal.recall!==null||seal.novelFamilyVerified!==false||
  !/^[a-f0-9]{64}$/.test(seal.predictionDigest))refuse('INVALID_PREORACLE_SEAL');
 if(!Array.isArray(markers)||markers.length!==2||
  markers[0]!=='ORIGINAL_IO_BUILDER_BENIGN_CONTROLS_PASS'||
  markers[1]!=='ORIGINAL_IO_RANDOM_BENIGN_CONTROLS_PASS')refuse('FAILED_ORACLE_CONTROLS');
 return Object.freeze({schema:'ultra-sentinel-phase2-block24-v2-original-io-scoped-verdict/v1',
  status:'FROZEN_V2_SIX_KOTLIN_SOURCES_WITH_TWO_SCOPED_BENIGN_CONTROLS',
  engineSha:ENGINE,sourceSha:SOURCE,predictionDigest:seal.predictionDigest,
  originalKotlinSourcesScanned:6,unsupportedSourceCount:0,
  frozenWorkerCount:3,totalUnverifiedFindings:seal.totalUnverifiedFindings,
  scopedBenignControlsPassed:2,originalFilesWithoutOracle:4,fullyLabeledOriginalFiles:0,
  originalPositiveDefectsVerified:false,novelFamilyVerified:false,
  falsePositives:null,falseNegatives:null,precision:null,recall:null,f1:null,
  automatedRepairsVerified:false,remoteWrites:false,mergeAllowed:false,
  warning:'Six real source blobs scanned by v2 Hunter, but two narrow behavior controls cannot establish full defect truth, false positives, recall or novel-family discovery.'});
}
function prepare(engine,source,out){
 const m=readPinnedManifest();
 if(git(engine,['rev-parse','HEAD'])!==ENGINE||git(engine,['rev-parse','HEAD^{tree}'])!==ENGINE_TREE||
  git(source,['rev-parse','HEAD'])!==SOURCE||git(source,['rev-parse','HEAD^{tree}'])!==SOURCE_TREE||
  git(source,['rev-parse','HEAD:'+m.cohort.scope])!==SCOPETREE)refuse('FROZEN_GIT_IDENTITY');
 if(git(engine,['status','--porcelain','--untracked-files=all'])!==''||
  git(source,['status','--porcelain','--untracked-files=all'])!=='')refuse('DIRTY_CHECKOUT');
 const raw=git(source,['ls-tree','-z',SCOPETREE],{binary:true}).toString('utf8').split('\0').filter(Boolean);
 const entries=raw.map(row=>{
  const x=/^(\d{6}) (blob|tree|commit) ([a-f0-9]{40})\t([^\r\n]+)$/.exec(row);
  if(!x)refuse('BAD_GIT_TREE');return {mode:x[1],type:x[2],sha:x[3],name:x[4]};
 });
 validateSourceEntries(entries,m.cohort);
 const policy=require(path.join(fs.realpathSync(engine),'packages/investigation/novel-kotlin-path-policy.cjs'));
 const files=[];
 for(const f of m.cohort.files){
  if(!policy.isSafeHunterKotlinPath(f.path)||policy.isSafeNovelKotlinPath(f.path))refuse('UNSUPPORTED_OR_BROAD_SOURCE_AUTHORITY');
  const id=git(source,['rev-parse','HEAD:'+f.path]);
  if(id!==f.blobSha||git(source,['cat-file','-t',id])!=='blob')refuse('SOURCE_IDENTITY');
  const bytes=git(source,['cat-file','blob',id],{binary:true});
  if(bytes.length!==f.sizeBytes||gitBlob(bytes)!==id||bytes.includes(0)||bytes.includes(13))refuse('SOURCE_BLOB_BYTES');
  const decoded=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);
  if(!Buffer.from(decoded,'utf8').equals(bytes))refuse('NONCANONICAL_SOURCE');
  files.push({path:f.path,source:decoded,expectedBlobSha:id});
 }
 fs.mkdirSync(out,{mode:0o700});
 fs.writeFileSync(path.join(out,'numeric.json'),JSON.stringify({expectedCommitSha:SOURCE,files,skippedOversized:0,skippedNoncanonical:0}),{flag:'wx',mode:0o600});
 fs.writeFileSync(path.join(out,'codec.json'),JSON.stringify({expectedCommitSha:SOURCE,files}),{flag:'wx',mode:0o600});
 return {files:files.length,sourceSha:SOURCE,engineSha:ENGINE};
}
function loadReports(dir){return Object.fromEntries(KINDS.map(k=>[k,fs.readFileSync(path.join(dir,k+'.json'))]));}
function main(args){
 const [command,...a]=args;
 if(command==='prepare'&&a.length===3){console.log(JSON.stringify(prepare(a[0],a[1],a[2])));return;}
 if(command==='seal'&&a.length===2){
  const [work,out]=a,raw=Object.fromEntries(KINDS.map(k=>[k,fs.readFileSync(path.join(work,k,'discovery.json'))]));
  const receipt=buildSeal(raw);
  fs.mkdirSync(out,{mode:0o700});
  for(const k of KINDS)fs.writeFileSync(path.join(out,k+'.json'),raw[k],{flag:'wx',mode:0o600});
  fs.writeFileSync(path.join(out,'prediction-seal.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log('FROZEN_V2_PREDICTIONS_SEALED_BEFORE_ORACLE='+receipt.predictionDigest);
  console.log('UNVERIFIED_FINDINGS='+receipt.totalUnverifiedFindings);return;
 }
 if(command==='verify'&&a.length===1){
  const receipt=JSON.parse(fs.readFileSync(path.join(a[0],'prediction-seal.json'),'utf8'));
  verifySeal(receipt,loadReports(a[0]));console.log('FROZEN_V2_BLIND_PREDICTION_DIGEST='+receipt.predictionDigest);return;
 }
 if(command==='verdict'&&a.length===5){
  const [sealed,logdir,engine,source,out]=a,receipt=JSON.parse(fs.readFileSync(path.join(sealed,'prediction-seal.json'),'utf8'));
  verifySeal(receipt,loadReports(sealed));
  const fresh=require('./phase2-block24-preflight.cjs').attest(engine,source);
  if(fresh.filesAuthenticated!==6||fresh.hunterExecuted!==false||fresh.oraclesExecuted!==false)refuse('SOURCE_REAUTHENTICATION');
  const markers=['ORIGINAL_IO_BUILDER_BENIGN_CONTROLS_PASS','ORIGINAL_IO_RANDOM_BENIGN_CONTROLS_PASS'];
  for(const [i,name] of ['builder','random'].entries()){
   const log=fs.readFileSync(path.join(logdir,name+'.log'),'utf8').trim();
   if(log!==markers[i])refuse('KOTLIN_ORACLE_MISMATCH');
  }
  const verdict=adjudicate(receipt,markers);
  fs.writeFileSync(out,JSON.stringify(verdict,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(verdict.status);return;
 }
 refuse('INVALID_CLI');
}
if(require.main===module){try{main(process.argv.slice(2));}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports=Object.freeze({buildSeal,verifySeal,adjudicate,prepare,validateReports});
