#!/usr/bin/env node
'use strict';
// Oracle precommit boundary. This script checks *hashes* and builds a receipt;
// it MUST NOT load, execute or adjudicate the JVM oracle before Hunter seals.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {readManifest,attest}=require('./phase2-block26b-v5-preregister.cjs');
const ROOT=path.resolve(__dirname,'..');
const SEAL='tests/fixtures/phase2-block26c-ringbuffer/oracle-seal.json';
const SEAL_GIT_BLOB='79f22da7989e87add2e6468a99bddf6c7087a4ad';
const SOURCE_SHA='498c8a10febe1a97f085a295c1f6b2a818a83f89';
const fail=code=>{throw Error('BLOCK26C_ORACLE_PRECOMMIT_REFUSED:'+code);};
const sha256=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function read(file,max=15000){
 const abs=path.join(ROOT,file),s=fs.lstatSync(abs);
 if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||s.size<1||s.size>max)fail('UNSAFE_FILE');
 return fs.readFileSync(abs);
}
function gitBlob(bytes){
 return crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
}
function readOracleSeal(){
 const bytes=read(SEAL,5000);
 if(gitBlob(bytes)!==SEAL_GIT_BLOB)fail('ORACLE_SEAL_CHANGED');
 return JSON.parse(bytes.toString('utf8'));
}
function verifyOracleSeal(seal){
 if(!seal||JSON.stringify(seal)!==JSON.stringify(readOracleSeal()))fail('ORACLE_CLAIM_CHANGED');
 const cohort=readManifest();
 if(seal.schema!=='ultra-sentinel-phase2-block26c-precommitted-independent-original-oracle/v1'||
  seal.source.repository!==cohort.cohort.repository||
  seal.source.commitSha!==SOURCE_SHA||
  seal.source.treeSha!==cohort.cohort.treeSha||
  seal.cohortManifestGitBlobSha!=='78bd5f2be91de9f3781a7b358f457b91efb1b6a8'||
  !Array.isArray(seal.source.compiledOriginals)||seal.source.compiledOriginals.length!==2||
  !Array.isArray(seal.oracleFiles)||seal.oracleFiles.length!==3||
  seal.protocol.hunterExecuted!==false||
  seal.protocol.oracleExecutedBeforeBlindPredictions!==false||
  seal.protocol.originalOracleResultsKnown!==false||
  seal.protocol.precommitBeforeBlindPredictions!==true||
  seal.protocol.precision!==null||seal.protocol.recall!==null||
  seal.protocol.block26Closed!==false||seal.protocol.block27Allowed!==false||
  seal.limitations.otherOriginalFilesWithoutFunctionalOracles!==11)
  fail('INVALID_PRECOMMIT_CLAIMS');
 const original=new Map(cohort.cohort.files.map(f=>[f.path,f.blobSha]));
 for(const file of seal.source.compiledOriginals){
  if(original.get(file.path)!==file.blobSha)fail('ORIGINAL_GIT_BLOB_CHANGED');
 }
 const allowlist=[
  'tests/fixtures/phase2-block26c-ringbuffer/ColorNoop.kt',
  'tests/fixtures/phase2-block26c-ringbuffer/SupportNoop.kt',
  'tests/fixtures/phase2-block26c-ringbuffer/RingBufferContractOracle.kt'
 ];
 for(const [i,file] of seal.oracleFiles.entries()){
  if(file.path!==allowlist[i])fail('ORACLE_FILE_ALLOWLIST');
  const bytes=read(file.path,10000);
  if(gitBlob(bytes)!==file.gitBlobSha||sha256(bytes)!==file.sha256)fail('ORACLE_SOURCE_SHA256_CHANGED');
 }
 return true;
}
function preflight(engine,source){
 verifyOracleSeal(readOracleSeal());
 const prereg=attest(engine,source);
 return {schema:'ultra-sentinel-phase2-block26c-compiled-only-preflight/v1',
  sourceSha:SOURCE_SHA,engineSha:prereg.frozenEngineSha,
  originalsGitAuthenticated:prereg.originalsAuthenticatedByGitTree,
  oracleFilesAuthenticated:3,oracleExecuted:false,hunterExecuted:false,
  sourceRepaired:false,originalFunctionalCounterexample:null,block26Closed:false};
}
if(require.main===module){
 try{
  if(process.argv.length!==5)fail('ARGUMENTS');
  const result=preflight(process.argv[2],process.argv[3]);
  fs.writeFileSync(process.argv[4],JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify(result));
 }catch(error){console.error(error.message);process.exitCode=1;}
}
module.exports=Object.freeze({readOracleSeal,verifyOracleSeal,preflight});
