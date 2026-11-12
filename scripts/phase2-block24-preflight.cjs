#!/usr/bin/env node
'use strict';
/** Read-only phase 2.4 IO source and precommitted oracle attestor.
 * No source execution, Hunter invocation, truth reveal, score or repairs here. */
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
const crypto=require('node:crypto');
const {TextDecoder}=require('node:util');
const ROOT=path.resolve(__dirname,'..');
const M='docs/quality/PHASE2-BLOCK24-V2-PROSPECTIVE-IO-FREEZE-20261112.json';
const ORACLE_DIR='tests/fixtures/phase2-block24-oracle';
const MANIFEST_BLOB='802f204f1a22e67310a2c41435661d9f25a6fedf';
const ORACLE_SEAL_BLOB='cc1f5f01d03580e49cc9fc4d526ee0d2c5d23afc';
const ENGINE_COMMIT='34679a71aed54abbc3ecbffbf29299cfb25f65b8';
const ENGINE_TREE='c6a0cdc3d2fa10843d4f58c8bec0c15e222176e2';
const SOURCE_COMMIT='cf40e5ba7cd99ba812177d597a9f6ce0570545b1';
const ROOT_TREE='ca3455d638cbb02307b46c8b11106baa58e55d5d';
const SCOPE_TREE='b94f506ed869ac50eff051ba70c43e290bb9d90d';
const SHA=/^[a-f0-9]{40}$/;
function fail(reason){throw Error('PHASE24_PRECOMMIT_REFUSED:'+reason);}
function gitBlob(bytes){return crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');}
function digest(bytes){return crypto.createHash('sha256').update(bytes).digest('hex');}
function pinnedFile(relative,expected){
 const f=path.join(ROOT,relative),stat=fs.lstatSync(f);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size>16000)fail('INVALID_PINNED_FILE');
 const bytes=fs.readFileSync(f);
 if(gitBlob(bytes)!==expected)fail('PRECOMMIT_BLOB_CHANGED:'+relative);
 return JSON.parse(new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes));
}
function readPinnedManifest(){
 const x=pinnedFile(M,MANIFEST_BLOB);
 if(x.schema!=='ultra-sentinel-phase2-block24-v2-prospective-cohort/v1'||x.block!=='2.4b'||
  x.engine.repository!=='cardenaspiero255-lang/Ultra-Sentinel'||x.engine.mergeCommitSha!==ENGINE_COMMIT||
  x.engine.treeSha!==ENGINE_TREE||x.engine.originalEngineUnchanged!=='3668a4ff860c49c5aaf69a594efc4fa48d94def3'||
  x.cohort.repository!=='Kotlin/kotlinx-io'||x.cohort.commitSha!==SOURCE_COMMIT||
  x.cohort.rootTreeSha!==ROOT_TREE||x.cohort.scopeTreeSha!==SCOPE_TREE||
  x.cohort.scope!=='bytestring/common/src'||
  x.cohort.selection!=='ALL_IMMEDIATE_DOT_KT_BLOBS_IN_LEXICOGRAPHICALLY_FIRST_COMMON_SRC_TREE_WITH_BETWEEN_4_AND_20_DIRECT_KOTLIN_FILES'||
  !Array.isArray(x.cohort.files)||x.cohort.files.length!==6||
  x.protocol.hunterExecutedAtPreregistration!==false||
  x.protocol.sourceBodiesReadAtPreregistration!==false||
  x.protocol.oracleAnswersPreparedAtPreregistration!==false||
  x.protocol.prohibitDetectorRetuningOnThisCohort!==true||
  x.protocol.scoringAllowedWithoutFullTruth!==false||
  x.protocol.repairPermissionGranted!==false||
  x.protocol.mergePermissionGranted!==false)fail('INVALID_PREREGISTRATION');
 let last='';
 for(const f of x.cohort.files){
  if(typeof f.path!=='string'||!/^bytestring\/common\/src\/[-\w.]+\.kt$/.test(f.path)||
    !SHA.test(f.blobSha)||!Number.isSafeInteger(f.sizeBytes)||f.sizeBytes<10||f.sizeBytes>65536||f.path<=last)fail('INVALID_SOURCE_LIST');
  last=f.path;
 }
 return x;
}
function validateSourceEntries(entries,cohort){
 if(!Array.isArray(entries)||!cohort||!Array.isArray(cohort.files))fail('BAD_SOURCE_TREE');
 const selected=entries.filter(x=>typeof x.name==='string'&&x.name.endsWith('.kt'));
 if(selected.length!==cohort.files.length)fail('SOURCE_COUNT_MISMATCH');
 for(let i=0;i<selected.length;i++){
  const e=selected[i],f=cohort.files[i];
  if(!e||e.mode!=='100644'||e.type!=='blob'||e.name!==path.posix.basename(f.path)||
    e.sha!==f.blobSha||f.path!==cohort.scope+'/'+e.name)fail('SOURCE_ENTRY_MISMATCH');
 }
 return selected.length;
}
function assertOracleSeal(input){
 const m=readPinnedManifest();
 const saved=pinnedFile(ORACLE_DIR+'/oracle-seal.json',ORACLE_SEAL_BLOB);
 const s=input||saved;
 if(gitBlob(Buffer.from(JSON.stringify(s,null,2)+'\n'))!==ORACLE_SEAL_BLOB)fail('ORACLE_SEAL_CHANGED');
 if(s.schema!=='ultra-sentinel-phase2-block24-v2-original-io-oracle-seal/v1'||
  s.frozenHunterCommitSha!==ENGINE_COMMIT||s.cohortCommitSha!==SOURCE_COMMIT||
  s.cohortTreeSha!==ROOT_TREE||
  s.originalDefectPositivesEstablished!==false||s.allSixFilesFullyLabeled!==false||
  s.hunterPredictionsRun!==false||s.oraclesExecuted!==false||
  s.detectorRetunedOnCohort!==false||s.novelFamilyDiscoveryProven!==false||
  s.independentHumanAuditor!==false||s.precision!==null||s.recall!==null||s.f1!==null||
  !Array.isArray(s.oracleFiles)||s.oracleFiles.length!==4||
  !Array.isArray(s.originalSourceControls)||s.originalSourceControls.length!==2)fail('INVALID_ORACLE_CLAIMS');
 const expected=['BuilderOracle.kt','ByteStringStub.kt','RandomOracle.kt','UnsafeByteStringStub.kt'];
 for(let i=0;i<expected.length;i++){
  const item=s.oracleFiles[i];
  if(item.path!==expected[i]||!SHA.test(item.gitBlobSha)||!/^[a-f0-9]{64}$/.test(item.sha256))fail('ORACLE_FILE_SET');
  const source=fs.readFileSync(path.join(ROOT,ORACLE_DIR,item.path));
  if(gitBlob(source)!==item.gitBlobSha||digest(source)!==item.sha256)fail('ORACLE_DIGEST_MISMATCH');
 }
 if(s.originalSourceControls[0].path!==m.cohort.scope+'/ByteStringBuilder.kt'||
    s.originalSourceControls[1].path!==m.cohort.scope+'/Random.kt'||
    s.originalSourceControls[0].expectedMarker!=='ORIGINAL_IO_BUILDER_BENIGN_CONTROLS_PASS'||
    s.originalSourceControls[1].expectedMarker!=='ORIGINAL_IO_RANDOM_BENIGN_CONTROLS_PASS')fail('ORACLE_SCOPE_MISMATCH');
 return true;
}
function git(dir,args,{binary=false}={}){
 const r=cp.spawnSync('git',['-C',dir,...args],{encoding:binary?undefined:'utf8',timeout:18000,maxBuffer:4*1024*1024,
  env:{...process.env,GIT_NO_REPLACE_OBJECTS:'1',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_OPTIONAL_LOCKS:'0',GIT_TERMINAL_PROMPT:'0'}});
 if(r.error||r.status!==0)fail('GIT_'+args[0]);
 return binary?r.stdout:r.stdout.trim();
}
function attest(engine,source){
 const m=readPinnedManifest();
 assertOracleSeal();
 if(git(engine,['rev-parse','HEAD'])!==ENGINE_COMMIT||git(engine,['rev-parse','HEAD^{tree}'])!==ENGINE_TREE||
  git(source,['rev-parse','HEAD'])!==SOURCE_COMMIT||git(source,['rev-parse','HEAD^{tree}'])!==ROOT_TREE||
  git(source,['rev-parse','HEAD:'+m.cohort.scope])!==SCOPE_TREE)fail('GIT_COMMIT_TREE_MISMATCH');
 if(git(engine,['status','--porcelain','--untracked-files=all'])!==''||git(source,['status','--porcelain','--untracked-files=all'])!=='')fail('DIRTY_CHECKOUT');
 const policy=require(path.join(fs.realpathSync(engine),'packages/investigation/novel-kotlin-path-policy.cjs'));
 const rows=git(source,['ls-tree','-z',SCOPE_TREE],{binary:true}).toString('utf8').split('\0').filter(Boolean);
 const entries=rows.map(line=>{
  const match=/^(\d{6}) (blob|tree|commit) ([a-f0-9]{40})\t([^\r\n]+)$/.exec(line);
  if(!match)fail('INVALID_TREE_RECORD');
  return {mode:match[1],type:match[2],sha:match[3],name:match[4]};
 });
 validateSourceEntries(entries,m.cohort);
 const sources=[];
 for(const f of m.cohort.files){
  if(!policy.isSafeHunterKotlinPath(f.path)||policy.isSafeNovelKotlinPath(f.path))fail('INCONSISTENT_V2_POLICY');
  const id=git(source,['rev-parse','HEAD:'+f.path]);
  if(id!==f.blobSha||git(source,['cat-file','-t',id])!=='blob')fail('WRONG_SOURCE_BLOB_ID');
  const bytes=git(source,['cat-file','blob',id],{binary:true});
  if(bytes.length!==f.sizeBytes||gitBlob(bytes)!==id||bytes.includes(0)||bytes.includes(13))fail('INVALID_SOURCE_BYTES');
  const body=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);
  if(!Buffer.from(body,'utf8').equals(bytes))fail('NONCANONICAL_SOURCE');
  sources.push({path:f.path,gitBlobSha:id,sha256:digest(bytes)});
 }
 return Object.freeze({schema:'ultra-sentinel-phase2-block24-source-authenticated/v1',
  frozenEngineSha:ENGINE_COMMIT,cohortSha:SOURCE_COMMIT,
  filesAuthenticated:sources.length,sourceGitTreeVerified:true,
  originalOracleFilesSha256Verified:true,scopedOriginalControlsPrecommitted:2,
  originalPositiveDefectsVerified:false,unlabeledSourceCount:4,
  hunterExecuted:false,oraclesExecuted:false,scored:false,
  precision:null,recall:null,f1:null,remoteWrites:false,repairAuthorized:false,sources});
}
if(require.main===module){
 try{
  if(process.argv.length!==5)fail('CLI_ARGS');
  const r=attest(process.argv[2],process.argv[3]);
  fs.writeFileSync(process.argv[4],JSON.stringify(r,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log('BLOCK24_NEW_COHORT_ATTESTED='+r.filesAuthenticated);
 }catch(e){console.error(e.message);process.exitCode=1;}
}
module.exports=Object.freeze({readPinnedManifest,validateSourceEntries,assertOracleSeal,attest});
