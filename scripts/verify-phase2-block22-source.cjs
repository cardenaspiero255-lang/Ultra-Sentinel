#!/usr/bin/env node
'use strict';
/** Block 2.2: authenticate raw external source Git objects and precommitted independent oracle bytes.
 * Never import/run external source as JS, run frozen Hunter, score, modify or repair a repository. */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const cp=require('node:child_process');
const {parseBlock21Freeze}=require('../packages/quality-gates/phase2-block21-freeze.cjs');
const root=path.resolve(__dirname,'..');
const manifestBytes=fs.readFileSync(path.join(root,'docs/quality/PHASE2-BLOCK21-FREEZE-20261112.json'));
const manifest=parseBlock21Freeze(manifestBytes);
const oracleDir=path.join(root,'tests/fixtures/phase2-block22-oracle');
const oracleSeal=JSON.parse(fs.readFileSync(path.join(oracleDir,'oracle-seal.json'),'utf8'));
const SHA40=/^[0-9a-f]{40}$/;
const SHA256=/^[0-9a-f]{64}$/;
function reject(message){throw Error('BLOCK22_ATTESTATION_REFUSED:'+message);}
function validateEntries(entries,expected,scope){
 if(!Array.isArray(entries)||!Array.isArray(expected)||entries.length<expected.length)reject('MISSING_GIT_TREE_ENTRIES');
 const files=entries.filter(x=>x.name.endsWith('.kt'));
 if(files.length!==expected.length)reject('CLOSED_WORLD_KOTLIN_SET_MISMATCH');
 let last='';
 for(let i=0;i<expected.length;i++){
  const entry=files[i],f=expected[i];
  const base=path.posix.basename(f.path);
  if(entry.name!==base||entry.name<=last||entry.type!=='blob'||entry.mode!=='100644'||
      entry.sha!==f.blobSha||f.path!==scope+'/'+base||
      !SHA40.test(entry.sha)||!Number.isSafeInteger(f.sizeBytes))reject('GIT_TREE_ENTRY_MISMATCH');
  last=entry.name;
 }
 return files.length;
}
function validateOracleSeal(folder,seal){
 const f=manifest.cohort.files;
 if(seal===null||typeof seal!=='object'||Array.isArray(seal)||
  seal.schema!=='ultra-sentinel-phase2-block22-independent-oracle-seal/v1'||
  seal.phaseBlock!=='2.2'||seal.frozenEngineSha!==manifest.engine.commitSha||
  seal.sourceCommitSha!==manifest.cohort.commitSha||seal.positiveOriginalDefectsVerified!==false||
  seal.completeUniverseLabeled!==false||seal.predictionsExecuted!==false||
  seal.automatedRepairsVerified!==false||seal.independentHumanReview!==false||seal.score!==null||
  !Array.isArray(seal.sourceFiles)||seal.sourceFiles.length!==f.length||
  !Array.isArray(seal.oracleFiles)||seal.oracleFiles.length!==6||
  !Array.isArray(seal.scopedControls)||seal.scopedControls.length!==2)reject('ORACLE_SEAL_SCHEMA');
 for(let i=0;i<f.length;i++){
  if(seal.sourceFiles[i].path!==f[i].path||seal.sourceFiles[i].blobSha!==f[i].blobSha)reject('ORACLE_SOURCE_IDENTITY');
 }
 const known=['FlowCollectorContract.kt','KotlinCoroutineStub.kt','KotlinFlowInternalStub.kt','KotlinFlowStub.kt','KotlinInternalStub.kt','SharingStartedContract.kt'];
 for(let i=0;i<known.length;i++){
  const o=seal.oracleFiles[i];
  if(o.path!==known[i]||!SHA256.test(o.sha256))reject('ORACLE_FILE_SET');
  const bytes=fs.readFileSync(path.join(folder,known[i]));
  if(crypto.createHash('sha256').update(bytes).digest('hex')!==o.sha256)reject('ORACLE_BYTES_CHANGED');
 }
 const truth=seal.scopedControls.map(x=>x.sourcePath);
 if(truth[0]!==manifest.cohort.scope+'/FlowCollector.kt'||truth[1]!==manifest.cohort.scope+'/SharingStarted.kt')reject('ORACLE_SCOPE_CHANGED');
 return true;
}
function git(directory,args,{binary=false}={}){
 const opts={encoding:binary?undefined:'utf8',timeout:12000,maxBuffer:1024*1024,
  env:{...process.env,GIT_NO_REPLACE_OBJECTS:'1',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_OPTIONAL_LOCKS:'0'}};
 const r=cp.spawnSync('git',['-C',directory,...args],opts);
 if(r.status!==0||r.error)reject('GIT_COMMAND_FAILED_'+args[0]);
 return binary?r.stdout:r.stdout.trimEnd();
}
function attest(checkout){
 validateOracleSeal(oracleDir,oracleSeal);
 const p=manifest.cohort;
 if(!checkout||!fs.statSync(checkout).isDirectory())reject('MISSING_SOURCE_CHECKOUT');
 if(git(checkout,['rev-parse','HEAD'])!==p.commitSha)reject('EXTERNAL_COMMIT_MISMATCH');
 if(git(checkout,['rev-parse','HEAD^{tree}'])!==p.treeSha)reject('EXTERNAL_ROOT_TREE_MISMATCH');
 if(git(checkout,['rev-parse','HEAD:'+p.scope])!==p.scopeTreeSha)reject('EXTERNAL_DIRECTORY_TREE_MISMATCH');
 const raw=git(checkout,['ls-tree','-z',p.scopeTreeSha],{binary:true});
 const entries=raw.toString('utf8').split('\0').filter(Boolean).map(line=>{
  const m=/^(\d{6}) (blob|tree|commit) ([0-9a-f]{40})\t([^\0\r\n]+)$/.exec(line);
  if(!m)reject('INVALID_TREE_OBJECT_ENTRY');
  return {mode:m[1],type:m[2],sha:m[3],name:m[4]};
 });
 validateEntries(entries,p.files,p.scope);
 const digests=[];
 for(const entry of p.files){
  const id=git(checkout,['rev-parse','HEAD:'+entry.path]);
  if(id!==entry.blobSha||git(checkout,['cat-file','-t',id])!=='blob')reject('EXTERNAL_SOURCE_BLOB_ID');
  const bytes=git(checkout,['cat-file','blob',id],{binary:true});
  if(bytes.length!==entry.sizeBytes)reject('EXTERNAL_SOURCE_BLOB_LENGTH');
  const localSha=crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
  if(localSha!==entry.blobSha)reject('EXTERNAL_SOURCE_BLOB_CONTENT');
  digests.push({path:entry.path,gitBlobSha:localSha,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
 }
 return Object.freeze({schema:'ultra-sentinel-phase2-block22-attestation/v1',
  engineCommitSha:manifest.engine.commitSha,cohortCommitSha:p.commitSha,
  originalKotlinFilesAuthenticated:digests.length,sourceTreeAuthenticated:true,
  sourceBlobsAuthenticated:true,oracleFileSha256Sealed:true,oracleExecuted:false,
  frozenHunterExecuted:false,independentTruthConfirmed:false,positiveOriginalDefectsVerified:false,
  globalPrecision:null,globalRecall:null,globalF1:null,sourceDigests:digests,
  automatedRepairVerified:false,remoteWrites:false,mergeAllowed:false,
  warning:'Source originality authenticated by Git object identities; only separately run independent JVM controls can establish scoped benign behavior. No complete truth or new-family discovery.'});
}
if(require.main===module){
 try{if(process.argv.length!==3)reject('SOURCE_CHECKOUT_ARGUMENT');console.log(JSON.stringify(attest(process.argv[2])));}
 catch(e){console.error(String(e.message));process.exitCode=1;}
}
module.exports=Object.freeze({validateEntries,validateOracleSeal,attest});
