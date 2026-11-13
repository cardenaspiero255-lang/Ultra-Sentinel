#!/usr/bin/env node
'use strict';
// Metadata-only preregistration: authenticates frozen Git trees and path
// identities. It MUST NOT read original Kotlin bodies or invoke Hunter/oracles.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const {createHash}=require('node:crypto');
const {isSafeHunterKotlinPath,isSafeNovelKotlinPath}=
 require('../packages/investigation/novel-kotlin-path-policy.cjs');
const MANIFEST=path.resolve(__dirname,'../docs/quality/PHASE2-BLOCK26B-V5-COHORT.json');
const MANIFEST_BLOB='78bd5f2be91de9f3781a7b358f457b91efb1b6a8';
const ENGINE_SHA='22a4dfee8e87b62b14501a81a94ca902d8fbca7b';
const ENGINE_TREE='df5831983bbd610cf3bd7841aadac054e465e8fa';
const SOURCE_SHA='498c8a10febe1a97f085a295c1f6b2a818a83f89';
const SOURCE_TREE='87d62e0b07ef435d4b0f99ce26057d8dca22b17f';
const SHA=/^[a-f0-9]{40}$/;
const fail=code=>{throw Error('BLOCK26B_METADATA_REFUSED:'+code);};
function readManifest(){
 const stat=fs.lstatSync(MANIFEST);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||stat.size<100||stat.size>15000)fail('MANIFEST_FILE');
 const bytes=fs.readFileSync(MANIFEST);
 const blob=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
 if(blob!==MANIFEST_BLOB)fail('MANIFEST_GIT_BLOB_CHANGED');
 return JSON.parse(bytes.toString('utf8'));
}
function verifyPinnedMetadata(m){
 if(!m||JSON.stringify(m)!==JSON.stringify(readManifest()))fail('PROSPECTIVE_METADATA_CHANGED');
 if(m.schema!=='ultra-sentinel-phase2-block26b-root-originals/v1'||m.block!=='2.6'||
  m.engine.commitSha!==ENGINE_SHA||m.engine.treeSha!==ENGINE_TREE||
  m.engine.frozenBeforeSelection!==true||m.engine.retuningAllowed!==false||
  m.cohort.commitSha!==SOURCE_SHA||m.cohort.treeSha!==SOURCE_TREE||
  m.cohort.scope!=='src/main/kotlin'||
  m.cohort.selection!=='ALL_REGULAR_KT_BLOBS_RECURSIVELY_UNDER_SRC_MAIN_KOTLIN'||
  m.cohort.files.length!==13||m.protocol.hunterExecutedBeforeReservation!==false||
  m.protocol.sourceBodiesReadBeforeReservation!==false||
  m.protocol.oracleExecutedBeforeReservation!==false||
  m.protocol.oracleMustBePrecommittedBeforePredictions!==true||
  m.protocol.predictionsSealedBeforeOracle!==true||
  m.limitations.block26Closed!==false||m.limitations.block27Allowed!==false)
  fail('UNSAFE_METADATA_CLAIM');
 return true;
}
function validateSelectedKotlinEntries(entries,m){
 verifyPinnedMetadata(m);
 if(!Array.isArray(entries)||entries.length>30000)fail('TREE_INPUT_BUDGET');
 const files=[];
 for(const row of entries){
  if(!row||typeof row.path!=='string')fail('TREE_RECORD');
  if(!row.path.startsWith('src/main/kotlin/')||!row.path.endsWith('.kt'))continue;
  if(row.mode!=='100644'||row.type!=='blob'||!SHA.test(row.sha)||
   !Number.isSafeInteger(row.size)||row.size<50||row.size>12000||
   !isSafeHunterKotlinPath(row.path)||isSafeNovelKotlinPath(row.path))
   fail('UNAUTHORIZED_OR_NONREGULAR_KOTLIN_SOURCE');
  files.push({path:row.path,blobSha:row.sha,sizeBytes:row.size});
 }
 if(JSON.stringify(files)!==JSON.stringify(m.cohort.files))fail('SOURCE_SELECTION_NOT_EXACT');
 return files.length;
}
function git(root,args,binary=false){
 const directory=fs.realpathSync(root);
 if(!fs.statSync(directory).isDirectory())fail('INVALID_CHECKOUT');
 const environment={PATH:process.env.PATH||'/usr/bin:/bin',HOME:process.env.HOME||'/tmp',
  GIT_NO_REPLACE_OBJECTS:'1',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',
  GIT_OPTIONAL_LOCKS:'0',GIT_TERMINAL_PROMPT:'0'};
 const x=cp.spawnSync('git',['-C',directory,...args],{
  env:environment,timeout:20000,maxBuffer:16*1024*1024,encoding:binary?undefined:'utf8'});
 if(x.error||x.status!==0)fail('GIT_'+args[0]);
 return binary?x.stdout:x.stdout.trim();
}
function checkIdentity(root,sha,tree){
 if(git(root,['rev-parse','HEAD'])!==sha||
  git(root,['rev-parse','HEAD^{tree}'])!==tree||
  git(root,['status','--porcelain','--untracked-files=all'])!=='')fail('CHANGED_OR_DIRTY_CHECKOUT');
}
function attest(engine,source){
 const m=readManifest();verifyPinnedMetadata(m);
 checkIdentity(engine,ENGINE_SHA,ENGINE_TREE);
 checkIdentity(source,SOURCE_SHA,SOURCE_TREE);
 const raw=git(source,['ls-tree','-r','-l','-z','HEAD'],true);
 const entries=raw.toString('utf8').split('\0').filter(Boolean).map(line=>{
  const match=/^(\d{6}) (blob|tree|commit) ([a-f0-9]{40})\s+(\d+|-)\t(.+)$/.exec(line);
  if(!match)fail('UNPARSEABLE_GIT_TREE');
  return {path:match[5],mode:match[1],type:match[2],sha:match[3],size:Number(match[4])};
 });
 const count=validateSelectedKotlinEntries(entries,m);
 return Object.freeze({schema:'ultra-sentinel-phase2-block26b-metadata-receipt/v1',
  frozenEngineSha:ENGINE_SHA,originalSourceSha:SOURCE_SHA,originalsAuthenticatedByGitTree:count,
  originalSourceBodiesRead:false,hunterExecuted:false,oraclesExecuted:false,
  hunterFindings:null,independentVerdict:null,block26Closed:false,block27Allowed:false});
}
if(require.main===module){
 try{
  if(process.argv.length!==5)fail('ARGUMENTS');
  const outcome=attest(process.argv[2],process.argv[3]);
  fs.writeFileSync(process.argv[4],JSON.stringify(outcome,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify(outcome));
 }catch(err){console.error(err.message);process.exitCode=1;}
}
module.exports=Object.freeze({readManifest,verifyPinnedMetadata,validateSelectedKotlinEntries,attest});
