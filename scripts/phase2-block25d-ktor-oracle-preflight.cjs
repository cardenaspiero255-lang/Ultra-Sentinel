#!/usr/bin/env node
'use strict';
/* Phase 2.5d fourth original source, oracle SHA256 preregistration.
 * NO source execution, predictions, oracle execution or repair. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {readManifest,attest}=require('./phase2-block25d-fourth-cohort-attest.cjs');
const ROOT=path.resolve(__dirname,'..');
const DIR='tests/fixtures/phase2-block25d-ktor-oracle';
const SEAL_GIT_BLOB='0811ad016689eb14ca1c58f15731fa56f471d712';
const ENGINE='84c824ce6bfe3d260296108e955bbbc4624e6b7e';
const ENGINE_TREE='db929ca1233215e47de164201ff69d9b4cb1808e';
const SOURCE='599e1340c718e501bf5fba080b0ade00b49a893f';
const SOURCE_TREE='af2e96c115bd52230de937928f0231f5a0a76ad7';
const SCOPE_TREE='bdb5374433d020116a797102cc9b6cdfceb1c0f7';
const sha1=x=>crypto.createHash('sha1').update('blob '+x.length+'\0').update(x).digest('hex');
const sha256=x=>crypto.createHash('sha256').update(x).digest('hex');
function refuse(why){throw Error('PHASE25D_KTOR_ORACLE_PRECOMMIT_REFUSED:'+why);}
function validateOracleSeal(s,dir){
 const m=readManifest();
 if(!s||typeof s!=='object'||Array.isArray(s)||
  s.schema!=='ultra-sentinel-phase2-block25d-fourth-ktor-original-oracle-precommit/v1'||
  s.frozenV4Sha!==ENGINE||s.frozenV4TreeSha!==ENGINE_TREE||
  s.sourceRepository!=='ktorio/ktor'||s.sourceCommitSha!==SOURCE||
  s.sourceTreeSha!==SOURCE_TREE||s.sourceScopeTreeSha!==SCOPE_TREE||
  s.metadataCommittedBeforeSourceBodiesRead!==true||
  s.sourceFileSelectionChangedAfterInspection!==false||
  s.hunterPredictionsEverExecutedOnThisCohort!==false||
  s.oracleExecuted!==false||s.oracleCommitBeforePrediction!==true||
  s.sourceFilesFullyLabeled!==0||s.originalNovelDefectsConfirmed!==0||
  s.originalCancellationDefectsConfirmed!==0||s.independentHumanAuditor!==false||
  s.precision!==null||s.recall!==null||s.f1!==null||
  s.repairAuthorized!==false||s.remoteWrites!==false||s.mergeAllowed!==false||
  !Array.isArray(s.oracleFiles)||s.oracleFiles.length!==1||
  !Array.isArray(s.scopedBenignControls)||s.scopedBenignControls.length!==1)
  refuse('PROTOCOL_OR_FROZEN_IDENTITY_CHANGED');
 const f=s.oracleFiles[0];
 if(!f||Object.keys(f).sort().join(',')!=='gitBlobSha,path,sha256'||
  f.path!=='ConnectTimeoutOracle.kt'||
  !/^[a-f0-9]{40}$/.test(f.gitBlobSha)||!/^[a-f0-9]{64}$/.test(f.sha256))
  refuse('UNTRUSTED_ORACLE_FILE');
 const file=path.join(dir,f.path),stat=fs.lstatSync(file);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size===0||stat.size>20000)
  refuse('UNSAFE_ORACLE_FILE');
 const bytes=fs.readFileSync(file);
 if(sha1(bytes)!==f.gitBlobSha||sha256(bytes)!==f.sha256)
  refuse('ORACLE_SOURCE_MUTATED_AFTER_PRECOMMIT');
 const control=s.scopedBenignControls[0];
 const original='ktor-client/ktor-client-apache5/jvm/src/io/ktor/client/engine/apache5/ApacheUtils.kt';
 if(!control||JSON.stringify(control.paths)!==JSON.stringify([original])||
  control.marker!=='ORIGINAL_KTOR_APACHE5_CONNECT_TIMEOUT_BENIGN_CONTROL_PASS'||
  !String(control.independentReference).startsWith('java.net.ConnectException')||
  !m.cohort.files.some(item=>item.path===original))
  refuse('ORACLE_SCOPE_CHANGED');
 return true;
}
function readOracleSeal(){
 const p=path.join(ROOT,DIR,'oracle-seal.json'),stat=fs.lstatSync(p);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size<200||stat.size>12000)
  refuse('UNSAFE_PRECOMMIT_BYTES');
 const bytes=fs.readFileSync(p);
 if(sha1(bytes)!==SEAL_GIT_BLOB)refuse('PRECOMMITTED_SEAL_CHANGED');
 const s=JSON.parse(bytes.toString('utf8'));
 validateOracleSeal(s,path.join(ROOT,DIR));
 return s;
}
function preflight(engine,source){
 const m=attest(engine,source);
 if(m.sourceFilesAuthenticated!==7||m.fullLexicographicSelectionVerified!==true||
  m.hunterExecuted!==false||m.oracleContractsPrepared!==false||
  m.oraclesExecuted!==false||m.sourceBodiesForwardedToHunter!==false)
  refuse('NOT_AN_ORIGINAL_PROSPECTIVE_HOLDOUT');
 const s=readOracleSeal();
 return Object.freeze({
  schema:'ultra-sentinel-phase2-block25d-original-ktor-jvm-precommit-only/v1',
  engineSha:ENGINE,sourceSha:SOURCE,
  authenticOriginalKotlinFiles:7,selectedOriginalSourceCount:7,
  scopedIndependentOriginalJvmOracleCount:s.oracleFiles.length,
  originalSourceFilesWithPartialControl:1,
  originalFilesWithoutOracle:6,
  fullTruthEstablished:false,originalPositiveDefectsVerified:false,
  predictionsExecuted:false,oraclesExecuted:false,oracleContractSha256Verified:true,
  precision:null,recall:null,f1:null,
  remoteWrites:false,repairAuthorized:false,mergeAllowed:false,
  oracleFiles:s.oracleFiles.map(x=>({path:x.path,sha256:x.sha256}))
 });
}
if(require.main===module){
 try{
  if(process.argv.length!==5)refuse('EXPECTED_ENGINE_SOURCE_RECEIPT');
  const r=preflight(process.argv[2],process.argv[3]);
  fs.writeFileSync(process.argv[4],JSON.stringify(r,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log('FOURTH_KTOR_JVM_ORACLE_SHA256_PRECOMMITTED_UNEXECUTED');
 }catch(e){console.error(e.message);process.exitCode=1;}
}
module.exports=Object.freeze({readOracleSeal,validateOracleSeal,preflight});
