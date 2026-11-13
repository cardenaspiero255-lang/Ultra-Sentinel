#!/usr/bin/env node
'use strict';
/* Fourth original Kotlin Git cohort: selection by immutable tree metadata only.
 * No source execution, no oracle, no Hunter predictions, no repairs. */
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const {isSafeHunterKotlinPath}=require('../packages/investigation/novel-kotlin-path-policy.cjs');
const ROOT=path.resolve(__dirname,'..');
const MANIFEST='docs/quality/PHASE2-BLOCK25D-KTOR-METADATA-20261112.json';
const MANIFEST_BLOB='8acd75de6563dd1beaed846e20af805f74c21cd8';
const ENGINE='84c824ce6bfe3d260296108e955bbbc4624e6b7e';
const ENGINE_TREE='db929ca1233215e47de164201ff69d9b4cb1808e';
const SOURCE='599e1340c718e501bf5fba080b0ade00b49a893f';
const SOURCE_TREE='af2e96c115bd52230de937928f0231f5a0a76ad7';
const SCOPE='ktor-client/ktor-client-apache5/jvm/src/io/ktor/client/engine/apache5';
const SCOPE_TREE='bdb5374433d020116a797102cc9b6cdfceb1c0f7';
const SELECTION='LEXICOGRAPHIC_FIRST_KTOR_PRODUCTION_DIRECTORY_WITH_6_TO_8_DIRECT_DOT_KT_BLOBS_EACH_50_TO_12000_BYTES';
const isSha=v=>typeof v==='string'&&/^[a-f0-9]{40}$/.test(v);
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const gitBlob=bytes=>crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
function fail(msg){throw Error('PHASE25D_FOURTH_COHORT_REFUSED:'+msg);}
function assertMetadata(x){
 if(!x||typeof x!=='object'||Array.isArray(x)||
  x.schema!=='ultra-sentinel-phase2-block25d-v4-fourth-original-cohort-metadata/v1'||
  x.block!=='2.5d-fourth-cohort-prospective-metadata'||
  x.engine?.repository!=='cardenaspiero255-lang/Ultra-Sentinel'||
  x.engine.version!=='HUNTER_V4_IMPORT_AWARE_BRANCH_RETURNS'||
  x.engine.commitSha!==ENGINE||x.engine.treeSha!==ENGINE_TREE||
  x.engine.previousV3Commit!=='49235f854c61c29d55a0307ce4a0348553b2ee1f'||
  x.engine.retuningOnHoldoutProhibited!==true||
  x.cohort?.repository!=='ktorio/ktor'||x.cohort.commitSha!==SOURCE||
  x.cohort.rootTreeSha!==SOURCE_TREE||x.cohort.scope!==SCOPE||
  x.cohort.scopeTreeSha!==SCOPE_TREE||x.cohort.selection!==SELECTION||
  !Array.isArray(x.cohort.files)||x.cohort.files.length!==7)
  fail('UNTRUSTED_FROZEN_VERSION_OR_SOURCE');
 const flags={
  selectionOnlyGitTreeMetadata:true,sourceBodiesReadAtPreregistration:false,
  engineRunAtPreregistration:false,oracleAnswersKnownAtPreregistration:false,
  sourceRetuningAllowed:false,preserveAllSourceFileIdentities:true,
  previousKotlinCoroutinesEightReused:false,previousKotlinIoSixReused:false,
  previousKotlinDatetimeSixReused:false,allowSourceReselection:0,
  requiresAllOriginalGitBlobAuthentication:true,requiresIndependentOracleCommitBeforePrediction:true,
  requiresRealNoNetworkNamespaces:true,predictionsSealedBeforeOracleExecution:true,
  allOriginalsFullyLabeled:false,confirmedOriginalNovelDefects:0,
  precision:null,recall:null,f1:null,remoteWrites:false,repairAuthorized:false,mergeAllowed:false
 };
 const protocol=x.protocol;
 if(!protocol||typeof protocol!=='object'||Array.isArray(protocol)||
   Object.keys(protocol).sort().join(',')!==Object.keys(flags).sort().join(','))
  fail('PROTOCOL_KEYS');
 for(const [key,value] of Object.entries(flags))
  if(protocol[key]!==value)fail('PROTOCOL_CHANGED_'+key);
 let prev='';
 for(const f of x.cohort.files){
  if(!f||Object.keys(f).sort().join(',')!=='blobSha,path,sizeBytes'||
    !/^ktor-client\/ktor-client-apache5\/jvm\/src\/io\/ktor\/client\/engine\/apache5\/[A-Za-z0-9_-]+\.kt$/.test(f.path)||
    !isSha(f.blobSha)||!Number.isSafeInteger(f.sizeBytes)||
    f.sizeBytes<50||f.sizeBytes>12000||f.path<=prev||
    !isSafeHunterKotlinPath(f.path))fail('INVALID_SOURCE_INVENTORY');
  prev=f.path;
 }
 return true;
}
function readManifest(){
 const location=path.join(ROOT,MANIFEST),stat=fs.lstatSync(location);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size>16000)fail('INVALID_METADATA_BYTES');
 const bytes=fs.readFileSync(location);
 if(gitBlob(bytes)!==MANIFEST_BLOB)fail('CHANGED_PRIOR_METADATA_PRECOMMIT');
 const value=JSON.parse(bytes.toString('utf8'));
 assertMetadata(value);
 return value;
}
function validateTreeEntries(entries,cohort){
 if(!Array.isArray(entries)||!cohort||!Array.isArray(cohort.files))fail('INVALID_GIT_TREE');
 const filtered=entries.filter(e=>typeof e.name==='string'&&e.name.endsWith('.kt'));
 if(filtered.length!==7||filtered.length!==cohort.files.length)fail('ORIGINAL_SOURCE_COUNT_CHANGED');
 for(let i=0;i<filtered.length;i++){
  const e=filtered[i],f=cohort.files[i];
  if(e.mode!=='100644'||e.type!=='blob'||e.sha!==f.blobSha||
    e.name!==path.posix.basename(f.path)||e.size!==f.sizeBytes||
    SCOPE+'/'+e.name!==f.path)fail('GIT_BLOB_METADATA_MISMATCH');
 }
 return filtered.length;
}
function selectDeterministicDirectory(entries){
 const grouped=new Map();
 for(const e of entries){
  if(!e||e.mode!=='100644'||e.type!=='blob'||typeof e.path!=='string'||
   !e.path.endsWith('.kt')||!Number.isSafeInteger(e.size)||
   e.size<50||e.size>12000||/test|fixtures|generated|build/i.test(e.path)||
   !isSafeHunterKotlinPath(e.path))continue;
  const dir=e.path.slice(0,e.path.lastIndexOf('/'));
  if(!grouped.has(dir))grouped.set(dir,[]);
  grouped.get(dir).push(e);
 }
 const eligible=[...grouped.entries()].filter(([,a])=>a.length>=6&&a.length<=8).map(([dir])=>dir).sort((a,b)=>a.localeCompare(b,'en'));
 return eligible[0]??null;
}
function git(dir,args,binary=false){
 const r=cp.spawnSync('git',['-C',dir,...args],{
  encoding:binary?undefined:'utf8',timeout:20000,maxBuffer:8*1024*1024,
  env:{...process.env,GIT_NO_REPLACE_OBJECTS:'1',GIT_CONFIG_NOSYSTEM:'1',
   GIT_CONFIG_GLOBAL:'/dev/null',GIT_OPTIONAL_LOCKS:'0',GIT_TERMINAL_PROMPT:'0'}
 });
 if(r.error||r.status!==0)fail('GIT_'+args[0]);
 return binary?r.stdout:r.stdout.trim();
}
function parseGitEntries(raw,scope){
 return raw.toString('utf8').split('\0').filter(Boolean).map(line=>{
  const m=/^(\d{6}) (blob|tree|commit) ([0-9a-f]{40})\s+(\d+|-)\t([^\r\n]+)$/.exec(line);
  if(!m)fail('INVALID_GIT_RECORD');
  const name=m[5];
  return {mode:m[1],type:m[2],sha:m[3],size:m[4]==='-'?null:Number(m[4]),
   name,path:scope?scope+'/'+name:name};
 });
}
function attest(engine,source){
 const m=readManifest();
 if(git(engine,['rev-parse','HEAD'])!==ENGINE||
  git(engine,['rev-parse','HEAD^{tree}'])!==ENGINE_TREE)fail('FROZEN_V4_CHANGED');
 if(git(source,['rev-parse','HEAD'])!==SOURCE||
  git(source,['rev-parse','HEAD^{tree}'])!==SOURCE_TREE||
  git(source,['rev-parse','HEAD:'+SCOPE])!==SCOPE_TREE)fail('ORIGINAL_SOURCE_CHANGED');
 if(git(engine,['status','--porcelain','--untracked-files=all'])!==''||
  git(source,['status','--porcelain','--untracked-files=all'])!=='')fail('DIRTY_SOURCE_OR_FROZEN_ENGINE');
 const all=parseGitEntries(git(source,['ls-tree','-r','-l','-z','HEAD'],true),'');
 if(selectDeterministicDirectory(all)!==SCOPE)fail('PRECOMMITTED_SELECTION_NOT_REPRODUCIBLE');
 const direct=parseGitEntries(git(source,['ls-tree','-l','-z','HEAD:'+SCOPE],true),'');
 validateTreeEntries(direct,m.cohort);
 const files=[];
 for(const f of m.cohort.files){
  if(git(source,['rev-parse','HEAD:'+f.path])!==f.blobSha||
   git(source,['cat-file','-t',f.blobSha])!=='blob')fail('SOURCE_NOT_COMMIT_MEMBER');
  const bytes=git(source,['cat-file','blob',f.blobSha],true);
  if(bytes.length!==f.sizeBytes||gitBlob(bytes)!==f.blobSha)fail('SOURCE_BYTES_MISMATCH');
  files.push({path:f.path,blobSha:f.blobSha,sha256:digest(bytes)});
 }
 return Object.freeze({
  schema:'ultra-sentinel-phase2-block25d-fourth-original-git-verified/v1',
  frozenEngineSha:ENGINE,frozenEngineTreeSha:ENGINE_TREE,
  sourceRepository:'ktorio/ktor',sourceCommitSha:SOURCE,sourceRootTreeSha:SOURCE_TREE,
  sourceFilesAuthenticated:7,fullLexicographicSelectionVerified:true,
  previousKotlinCohortsReused:false,
  sourceBodiesForwardedToHunter:false,hunterExecuted:false,
  oracleContractsPrepared:false,oraclesExecuted:false,
  allOriginalsFullyLabeled:false,confirmedNovelDefects:0,
  precision:null,recall:null,f1:null,remoteWrites:false,repairAuthorized:false,mergeAllowed:false,
  sources:files
 });
}
if(require.main===module){
 try{
  if(process.argv.length!==5)fail('EXPECTED_ENGINE_SOURCE_OUTPUT');
  const result=attest(process.argv[2],process.argv[3]);
  fs.writeFileSync(process.argv[4],JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log('FOURTH_KTOR_GIT_COHORT_METADATA_AUTHENTICATED_ONLY='+result.sourceFilesAuthenticated);
 }catch(e){console.error(e.message);process.exitCode=1;}
}
module.exports=Object.freeze({readManifest,assertMetadata,validateTreeEntries,selectDeterministicDirectory,attest});
