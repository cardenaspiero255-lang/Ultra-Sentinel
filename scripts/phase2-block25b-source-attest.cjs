#!/usr/bin/env node
'use strict';
/* 2.5b: fixed Git-provenance-only holdout receipt, no Hunter or oracle imports,
 * no source execution, no labels, no scoring, no remote modifications. */
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..');
const MANIFEST='docs/quality/PHASE2-BLOCK25B-DATETIME-METADATA-20261112.json';
const MANIFEST_BLOB='84550e572a240cffe547a63a61afd728bc689264';
const ENGINE='49235f854c61c29d55a0307ce4a0348553b2ee1f';
const ENGINE_TREE='411a9f24a07a57d21e918c022d1ec8442456537a';
const SOURCE='77c95cc8125015f83ea8fd900404c295fba7276e';
const SOURCE_TREE='110430b9981a688a703a7b8026a4f33bc5fee8ce';
const SCOPE='core/common/src/internal';
const SCOPE_TREE='11043b57ab92ce5198202de539c67a4690e6561a';
const SELECT='LEXICOGRAPHIC_FIRST_DIRECTORY_UNDER_core/common/src_WITH_4_TO_8_DIRECT_DOT_KT_BLOBS_EACH_50_TO_12000_BYTES';
const sha40=s=>typeof s==='string'&&/^[0-9a-f]{40}$/.test(s);
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const gitBlob=bytes=>crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
function fail(message){throw Error('PHASE25B_SOURCE_ATTEST_REFUSED:'+message);}
function verifyProtocol(x){
 if(!x||typeof x!=='object'||Array.isArray(x)||x.schema!=='ultra-sentinel-phase2-block25b-prospective-metadata-v1'||
  x.block!=='2.5b-metadata-precommit'||x.engine?.repository!=='cardenaspiero255-lang/Ultra-Sentinel'||
  x.engine.version!=='HUNTER_V3_CANCELLATION_STRUCTURAL_ADVISORY'||
  x.engine.commitSha!==ENGINE||x.engine.treeSha!==ENGINE_TREE||
  x.engine.successorMayNotRetuneOnCohort!==true||
  JSON.stringify(x.engine.predecessors)!==JSON.stringify(['3668a4ff860c49c5aaf69a594efc4fa48d94def3','34679a71aed54abbc3ecbffbf29299cfb25f65b8'])||
  x.cohort?.repository!=='Kotlin/kotlinx-datetime'||x.cohort.commitSha!==SOURCE||
  x.cohort.rootTreeSha!==SOURCE_TREE||x.cohort.scope!==SCOPE||
  x.cohort.scopeTreeSha!==SCOPE_TREE||x.cohort.selection!==SELECT||
  !Array.isArray(x.cohort.files)||x.cohort.files.length!==6)fail('MANIFEST_IMMUTABILITY');
 const required={
  sourceBodyReadBeforeMetadataCommit:false,engineExecutedBeforeMetadataCommit:false,
  answerLabelsAvailableBeforeMetadataCommit:false,engineRetuningPermitted:false,
  sourceFilesMayBeRemovedAfterInspection:false,oracleContractsMustBeCommittedBeforeBlindPredictions:true,
  sourceGitObjectsMustBeAuthenticated:true,realNetworklessIsolationRequired:true,
  workersMustNotAccessOracles:true,allPredictionsMustBeSealedBeforeOracles:true,
  unknownTruthMustRemainUnknown:true,allowedSourcesToReselect:0,
  priorEightCoroutinesReused:false,priorSixIoReused:false,
  fullTruthEstablished:false,newDefectFound:false,
  precision:null,recall:null,f1:null,remoteWrites:false,repairAuthorized:false,mergeAllowed:false
 };
 const p=x.protocol;
 if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).length!==Object.keys(required).length)
  fail('PROTOCOL_MISMATCH');
 for(const [k,v] of Object.entries(required))if(!Object.hasOwn(p,k)||p[k]!==v)fail('PROTOCOL_CHANGED_'+k);
 let last='';
 for(const f of x.cohort.files){
  if(!f||Object.keys(f).sort().join(',')!=='blobSha,path,sizeBytes'||!/^core\/common\/src\/internal\/[A-Za-z0-9_-]+\.kt$/.test(f.path)||
     !sha40(f.blobSha)||!Number.isSafeInteger(f.sizeBytes)||f.sizeBytes<50||f.sizeBytes>12000||f.path<=last)
   fail('INVALID_SOURCE_METADATA');
  last=f.path;
 }
 return true;
}
function readManifest(){
 const file=path.join(ROOT,MANIFEST);
 const stat=fs.lstatSync(file);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size>12000)fail('MANIFEST_BYTES');
 const bytes=fs.readFileSync(file);
 if(gitBlob(bytes)!==MANIFEST_BLOB)fail('METADATA_PRECOMMIT_CHANGED');
 let value;try{value=JSON.parse(bytes.toString('utf8'));}catch{fail('MALFORMED_MANIFEST');}
 verifyProtocol(value);return value;
}
function validateTreeEntries(entries,cohort){
 if(!Array.isArray(entries)||!cohort||!Array.isArray(cohort.files))fail('INVALID_TREE_LIST');
 const kt=entries.filter(x=>typeof x.name==='string'&&x.name.endsWith('.kt'));
 if(kt.length!==6||kt.length!==cohort.files.length)fail('DIRECT_SOURCE_COUNT');
 for(let i=0;i<kt.length;i++){
  const e=kt[i],f=cohort.files[i];
  if(e.mode!=='100644'||e.type!=='blob'||e.sha!==f.blobSha||
   e.name!==path.posix.basename(f.path)||SCOPE+'/'+e.name!==f.path)
   fail('DIRECT_GIT_ENTRY_MISMATCH');
 }
 return kt.length;
}
function git(directory,args,binary=false){
 const r=cp.spawnSync('git',['-C',directory,...args],{encoding:binary?null:'utf8',timeout:15000,maxBuffer:4*1024*1024,
 env:{...process.env,GIT_NO_REPLACE_OBJECTS:'1',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_OPTIONAL_LOCKS:'0',GIT_TERMINAL_PROMPT:'0'}});
 if(r.error||r.status!==0)fail('GIT_'+args[0]);
 return binary?r.stdout:r.stdout.trim();
}
function attest(engine,source){
 const m=readManifest();
 if(git(engine,['rev-parse','HEAD'])!==ENGINE||git(engine,['rev-parse','HEAD^{tree}'])!==ENGINE_TREE)
  fail('FROZEN_ENGINE_IDENTITY');
 if(git(source,['rev-parse','HEAD'])!==SOURCE||git(source,['rev-parse','HEAD^{tree}'])!==SOURCE_TREE||
  git(source,['rev-parse','HEAD:'+SCOPE])!==SCOPE_TREE)fail('EXTERNAL_SOURCE_IDENTITY');
 if(git(engine,['status','--porcelain','--untracked-files=all'])!==''||
  git(source,['status','--porcelain','--untracked-files=all'])!=='')fail('DIRTY_CHECKOUT');
 const lines=git(source,['ls-tree','-z',SCOPE_TREE],true).toString('utf8').split('\0').filter(Boolean);
 const entries=lines.map(line=>{
  const x=/^(\d{6}) (blob|tree|commit) ([0-9a-f]{40})\t([^\r\n]+)$/.exec(line);
  if(!x)fail('INVALID_GIT_TREE_RECORD');
  return {mode:x[1],type:x[2],sha:x[3],name:x[4]};
 });
 validateTreeEntries(entries,m.cohort);
 const policy=require(path.join(fs.realpathSync(engine),'packages/investigation/novel-kotlin-path-policy.cjs'));
 const files=[];
 for(const f of m.cohort.files){
  if(!policy.isSafeHunterKotlinPath(f.path)||policy.isSafeNovelKotlinPath(f.path))
   fail('UNEXPECTED_SOURCE_PATH_AUTHORITY');
  if(git(source,['rev-parse','HEAD:'+f.path])!==f.blobSha||
     git(source,['cat-file','-t',f.blobSha])!=='blob')fail('SOURCE_BLOB_ID');
  const bytes=git(source,['cat-file','blob',f.blobSha],true);
  if(bytes.length!==f.sizeBytes||gitBlob(bytes)!==f.blobSha)fail('SOURCE_BLOB_BYTES');
  files.push({path:f.path,gitBlobSha:f.blobSha,sha256:digest(bytes)});
 }
 return Object.freeze({schema:'ultra-sentinel-phase2-block25b-frozen-v3-git-source-metadata-attested/v1',
  engineSha:ENGINE,engineTreeSha:ENGINE_TREE,sourceSha:SOURCE,sourceTreeSha:SOURCE_TREE,
  sourceFilesAuthenticated:6,completeDirectKotlinInventory:true,
  previousCoroutinesReused:false,previousKotlinIoReused:false,
  sourceBodyForwardedToHunter:false,hunterExecuted:false,oraclesPrepared:false,oraclesExecuted:false,
  originalPositiveDefectsVerified:false,completeTruthKnown:false,unlabeledSources:6,
  precision:null,recall:null,f1:null,remoteWrites:false,repairAuthorized:false,mergeAllowed:false,
  sources:files});
}
if(require.main===module){
 try{
  if(process.argv.length!==5)fail('ARGUMENT_COUNT');
  const r=attest(process.argv[2],process.argv[3]);
  fs.writeFileSync(process.argv[4],JSON.stringify(r,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log('PHASE25B_NEW_METADATA_ONLY_SOURCE_ATTESTED='+r.sourceFilesAuthenticated);
 }catch(e){console.error(e.message);process.exitCode=1;}
}
module.exports=Object.freeze({readManifest,verifyProtocol,validateTreeEntries,attest});
