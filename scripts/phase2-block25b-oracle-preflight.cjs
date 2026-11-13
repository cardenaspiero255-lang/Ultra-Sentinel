#!/usr/bin/env node
'use strict';
/* Cryptographic precommit for previously selected original JVM *oracle code*
 * in block 2.5b. Does not execute Hunter, the oracles, or external source. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {readManifest,attest}=require('./phase2-block25b-source-attest.cjs');
const ROOT=path.resolve(__dirname,'..');
const DIR='tests/fixtures/phase2-block25b-oracle';
const ORACLE_SEAL_BLOB='c0e201367f2ce68dfc7064d9646d16821a3af158';
const ENGINE='49235f854c61c29d55a0307ce4a0348553b2ee1f';
const ENGINE_TREE='411a9f24a07a57d21e918c022d1ec8442456537a';
const SOURCE='77c95cc8125015f83ea8fd900404c295fba7276e';
const SOURCE_TREE='110430b9981a688a703a7b8026a4f33bc5fee8ce';
const SCOPE_TREE='11043b57ab92ce5198202de539c67a4690e6561a';
const sha=s=>typeof s==='string'&&/^[a-f0-9]{40}$/.test(s);
const sha256=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const gitBlob=bytes=>crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
function refuse(why){throw Error('PHASE25B_ORACLE_PRECOMMIT_REFUSED:'+why);}
function readOracleSeal(){
 const target=path.join(ROOT,DIR,'oracle-seal.json');
 const stat=fs.lstatSync(target);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size>12000)refuse('INVALID_SEAL_BYTES');
 const bytes=fs.readFileSync(target);
 if(gitBlob(bytes)!==ORACLE_SEAL_BLOB)refuse('ORACLE_SEAL_EDITED_AFTER_PRECOMMIT');
 let seal;try{seal=JSON.parse(bytes.toString('utf8'));}catch{refuse('INVALID_SEAL_JSON');}
 validateOracleSeal(path.join(ROOT,DIR),seal);
 return seal;
}
function validateOracleSeal(folder,s){
 const m=readManifest();
 if(!s||typeof s!=='object'||Array.isArray(s)||
  s.schema!=='ultra-sentinel-phase2-block25b-datetime-independent-oracle-seal/v1'||
  s.frozenHunterCommitSha!==ENGINE||s.frozenHunterTreeSha!==ENGINE_TREE||
  s.sourceCommitSha!==SOURCE||s.sourceTreeSha!==SOURCE_TREE||
  s.sourceScopeTreeSha!==SCOPE_TREE||
  s.sourceBodiesReadAfterMetadataCommit!==true||
  s.sourceSelectionAlteredAfterCodeRead!==false||
  s.hunterPredictionsRun!==false||s.oraclesExecuted!==false||
  s.separateOracleProcessFromHunterRequired!==true||
  s.truthCommitmentBeforePrediction!==true||
  s.originalPositiveDefectsVerified!==false||s.fullyLabeledOriginalFiles!==0||
  s.independentHumanAuditor!==false||s.novelCancellationFamilyDiscovered!==false||
  s.precision!==null||s.recall!==null||s.f1!==null||
  s.remoteWrites!==false||s.repairAuthorized!==false||s.mergeAllowed!==false||
  !Array.isArray(s.oracleFiles)||s.oracleFiles.length!==2||
  !Array.isArray(s.scopedOriginalControls)||s.scopedOriginalControls.length!==2)
  refuse('INVALID_ORACLE_PROTOCOL');
 const names=['BinaryReaderOracle.kt','CalendarOracle.kt'];
 for(let i=0;i<names.length;i++){
  const x=s.oracleFiles[i];
  if(!x||Object.keys(x).sort().join(',')!=='gitBlobSha,path,sha256'||
     x.path!==names[i]||!sha(x.gitBlobSha)||!/^[a-f0-9]{64}$/.test(x.sha256))
   refuse('INVALID_ORACLE_SOURCE_LIST');
  const pathToSource=path.join(folder,names[i]),stat=fs.lstatSync(pathToSource);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.size>20000)refuse('INVALID_ORACLE_SOURCE');
  const bytes=fs.readFileSync(pathToSource);
  if(gitBlob(bytes)!==x.gitBlobSha||sha256(bytes)!==x.sha256)
   refuse('ORACLE_BYTES_MODIFIED');
 }
 const scoped=s.scopedOriginalControls;
 const expectedSource=[
  ['core/common/src/internal/BinaryDataReader.kt'],
  ['core/common/src/internal/dateCalculations.kt','core/common/src/internal/util.kt']
 ];
 const markers=['ORIGINAL_DATETIME_BINARY_READER_BENIGN_CONTROLS_PASS','ORIGINAL_DATETIME_CALENDAR_BENIGN_CONTROLS_PASS'];
 for(let i=0;i<2;i++){
  const c=scoped[i];
  if(!c||JSON.stringify(c.paths)!==JSON.stringify(expectedSource[i])||
    c.expectedMarker!==markers[i]||typeof c.independentReference!=='string'||
    !c.independentReference.startsWith(i?'java.time':'java.nio.ByteBuffer'))
   refuse('ORIGINAL_SCOPE_OR_EXPECTATION_CHANGED');
  for(const p of c.paths)if(!m.cohort.files.some(f=>f.path===p))
   refuse('ORACLE_ORIGINAL_NOT_IN_HOLDOUT');
 }
 return true;
}
function preflight(engine,source){
 const receipt=attest(engine,source);
 if(receipt.sourceFilesAuthenticated!==6||receipt.hunterExecuted!==false||
  receipt.oraclesExecuted!==false||receipt.sourceBodyForwardedToHunter!==false)
  refuse('HOLDOUT_REAUTHENTICATION');
 const s=readOracleSeal();
 return Object.freeze({schema:'ultra-sentinel-phase2-block25b-precommitted-original-oracle-compiled-only/v1',
  frozenEngineSha:ENGINE,originalSourceSha:SOURCE,originalKotlinSourcesAuthenticated:6,
  independentOracleFilesSha256Authenticated:s.oracleFiles.length,
  originalKotlinSourceControlsPrepared:3,
  actualOriginalPositiveDefectsVerified:false,
  truthComplete:false,fullyLabeledOriginalFiles:0,
  predictionsExecuted:false,oraclesExecuted:false,
  precision:null,recall:null,f1:null,
  remoteWrites:false,repairAuthorized:false,mergeAllowed:false,
  oracleFiles:s.oracleFiles.map(x=>({path:x.path,sha256:x.sha256}))});
}
if(require.main===module){
 try{
  if(process.argv.length!==5)refuse('EXPECTED_ENGINE_SOURCE_RECEIPT_ARGS');
  const result=preflight(process.argv[2],process.argv[3]);
  fs.writeFileSync(process.argv[4],JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log('PHASE25B_ORACLE_SHA256_SEALED_AND_NOT_EXECUTED');
 }catch(e){console.error(e.message);process.exitCode=1;}
}
module.exports=Object.freeze({readOracleSeal,validateOracleSeal,preflight});
