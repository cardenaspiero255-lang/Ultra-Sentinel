'use strict';
/*
 * Independently verify ONE historical semantic observation against the live
 * GitHub API over TLS and a separately pinned archive digest. The trusted
 * host, GitHub's API and the pinned GitHub-hosted workflow are trust roots.
 * This is not fresh execution, a general compiler attestation, causal proof,
 * or an authorization to repair anything.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
// The host must load this module before admitting untrusted same-process code.
const githubFetch=globalThis.fetch;
const {snapshotRecord}=require('./plain-kotlin-payload.cjs');
const {planCommittedKotlinSourceImports}=require('../family-hunter/committed-kotlin-import-graph.cjs');
const {planDependencyExpansion}=require('../family-hunter/dependency-expansion-planner.cjs');
const API='https://api.github.com';
const RUN=42565038417,JOB=128989612596,ARTIFACT=13651395316;
const MAIN='4285e5175a458ae653a870e4139502dcad38ad4d';
const ORIGINAL='e4ca122422f1cb591d407db3fb21fb00fd78b022';
const TREE='52359cf6bfb6ddd5c5869a76d8aa0af9eb172bff';
const ARCHIVE='59b11ecd51eb3ab0e65acae4622219b7ce5cf86699719eb265d23c1a0742c7a9';
const COMPILER='0352c0a45bd22f80f6b26e485cd04da8047baa5de54865281fb9f89a4a7bcf2a';
const ROOT='app/src/main/java/com/cardenaspiero255/gamehubultra/';
const SOURCES=Object.freeze([
 Object.freeze({path:ROOT+'store/SteamMultiAccountSyncGuard.kt',blobSha:'037f4bda0349cef491746b5a7a118cc9b980ddc7'}),
 Object.freeze({path:ROOT+'domain/GameAccountValidation.kt',blobSha:'c608c277ce1b7610a345971fd643c4c0f8b7c9e3'}),
 Object.freeze({path:ROOT+'domain/GamePlatform.kt',blobSha:'673121b0c2e8fc558b88e46aad460c727f9e5fad'})
]);
const STEPS=Object.freeze([
 'Checkout trusted repository without persistent credentials',
 'All architecture and regression tests',
 'Fetch and verify Kotlin compiler 2.0.21',
 'Check compiler symbols and local blob binding on synthetic sources',
 'Require real Bubblewrap plus enforced AppArmor',
 'Checkout pinned original GameHub for call-claim observation',
 'Observe original Kotlin calls in isolated compiler',
 'Archive sanitized GameHub call-claim observation'
]);
const ROUTES=Object.freeze([
 '/repos/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/'+RUN,
 '/repos/cardenaspiero255-lang/Ultra-Sentinel/actions/runs/'+RUN+'/jobs?per_page=100',
 '/repos/cardenaspiero255-lang/Ultra-Sentinel/actions/artifacts/'+ARTIFACT,
 '/repos/cardenaspiero255-lang/gamehub-ultra',
 '/repos/cardenaspiero255-lang/gamehub-ultra/commits/'+ORIGINAL,
 '/repos/cardenaspiero255-lang/gamehub-ultra/git/trees/'+TREE+'?recursive=1'
]);
const LIMITS=Object.freeze([262144,524288,131072,131072,262144,2097152]);
const reject=()=>{throw Error('SEMANTIC_HISTORY_EVIDENCE_REJECTED');};
function json(s,max){
 if(typeof s!=='string'||Buffer.byteLength(s,'utf8')>max)reject();
 try{return JSON.parse(s);}catch{reject();}
}
function assessUntrustedHistoricalSemanticEvidence(options){
 try{
  const o=snapshotRecord(options,['run','jobs','artifact','repository','commit','tree','archive']);
  const [run,jobs,artifact,repository,commit,tree]=
   [o.run,o.jobs,o.artifact,o.repository,o.commit,o.tree].map((s,i)=>json(s,LIMITS[i]));
  if(typeof o.archive!=='string'||o.archive.length>4096||
   !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(o.archive))reject();
  const bytes=Buffer.from(o.archive,'base64');
  if(bytes.toString('base64')!==o.archive||crypto.createHash('sha256').update(bytes).digest('hex')!==ARCHIVE)reject();
  if(!run||run.id!==RUN||run.run_attempt!==1||run.head_sha!==MAIN||run.head_branch!=='main'||
   run.event!=='push'||run.status!=='completed'||run.conclusion!=='success'||
   run.workflow_id!==398396093||run.path!=='.github/workflows/real-kotlin-cross-file-functional-judge.yml'||
   run.actor?.id!==322222186||run.repository?.id!==1418338512||run.head_repository?.id!==1418338512)reject();
  if(!jobs||jobs.total_count!==1||!Array.isArray(jobs.jobs)||jobs.jobs.length!==1)reject();
  const j=jobs.jobs[0];
  if(!j||j.id!==JOB||j.run_id!==RUN||j.name!=='original-kotlin-cross-file'||
   j.status!=='completed'||j.conclusion!=='success'||!Array.isArray(j.steps)||
   j.steps.length<STEPS.length||j.steps.length>100||
   j.steps.some(s=>!s||typeof s.name!=='string'||s.status!=='completed'||s.conclusion!=='success'))reject();
  for(const name of STEPS)if(j.steps.filter(s=>s.name===name).length!==1)reject();
  if(!artifact||artifact.id!==ARTIFACT||artifact.name!=='phase2-gamehub-semantic-call-claims'||
   artifact.digest!=='sha256:'+ARCHIVE||artifact.workflow_run?.id!==RUN||
   artifact.workflow_run?.repository_id!==1418338512||artifact.workflow_run?.head_repository_id!==1418338512||
   artifact.workflow_run?.head_sha!==MAIN||artifact.workflow_run?.head_branch!=='main')reject();
  if(!repository||repository.id!==1375408706||repository.full_name!=='cardenaspiero255-lang/gamehub-ultra'||
   repository.owner?.id!==322222186||!commit||commit.sha!==ORIGINAL||commit.commit?.tree?.sha!==TREE||
   !tree||tree.sha!==TREE||tree.truncated!==false||!Array.isArray(tree.tree)||tree.tree.length>20000)reject();
  for(const source of SOURCES){
   const matches=tree.tree.filter(x=>x?.path===source.path);
   if(matches.length!==1||matches[0].type!=='blob'||matches[0].mode!=='100644'||matches[0].sha!==source.blobSha)reject();
  }
  // Matching caller data is only a consistency check. It never confers trust.
  return Object.freeze({status:'HISTORICAL_EVIDENCE_CONSISTENT_UNTRUSTED',
   githubApiTlsOriginVerified:false,compilerExecutionVerified:false,symbolResolutionVerified:false,
   sourceCommitMembershipVerified:false,causalityVerified:false,freshnessVerified:false,
   ownerAuthorizationGranted:false,commitAllowed:false,mergeAllowed:false});
 }catch{reject();}
}
async function readGithubJson(route,limit,token){
 const headers={'accept':'application/vnd.github+json','user-agent':'Ultra-Sentinel-semantic-history'};
 if(token)headers.authorization='Bearer '+token;
 if(typeof githubFetch!=='function')reject();
 const response=await githubFetch(API+route,{headers,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(20000)});
 if(!response.ok||response.redirected||response.url!==API+route||!response.body)reject();
 const reader=response.body.getReader(),chunks=[];let size=0;
 try{
  while(true){
   const {done,value}=await reader.read();if(done)break;
   size+=value.length;if(size>limit)reject();chunks.push(Buffer.from(value));
  }
 }finally{reader.releaseLock();}
 const text=new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks));
 json(text,limit);return text;
}
function readArchive(filename){
 if(typeof filename!=='string'||!path.isAbsolute(filename)||!fs.constants.O_NOFOLLOW)reject();
 const fd=fs.openSync(filename,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
 try{
  const stat=fs.fstatSync(fd);
  if(!stat.isFile()||stat.size<1||stat.size>3072)reject();
  const bytes=fs.readFileSync(fd);
  if(bytes.length!==stat.size||crypto.createHash('sha256').update(bytes).digest('hex')!==ARCHIVE)reject();
  return bytes.toString('base64');
 }finally{fs.closeSync(fd);}
}
function inspectLocalCheckout(directory){
 const paths=SOURCES.map(s=>s.path);
 const graph=planCommittedKotlinSourceImports({directory,expectedCommitSha:ORIGINAL,
  paths,seeds:paths,maxFiles:paths.length,maxDepth:0});
 if(!graph.localCommitVerified||!graph.repositoryMembershipVerified||
  graph.sourceBlobs.length!==SOURCES.length||
  graph.sourceBlobs.some((x,i)=>x.path!==SOURCES[i].path||x.blobSha!==SOURCES[i].blobSha))reject();
}
async function verifyPinnedGithubSemanticHistory(options){
 try{
  const o=snapshotRecord(options,['directory','archivePath']);
  if(typeof o.directory!=='string'||!path.isAbsolute(o.directory))reject();
  const archive=readArchive(o.archivePath);
  inspectLocalCheckout(o.directory);
  const token=process.env.ULTRA_SENTINEL_GITHUB_READ_TOKEN;
  if(token!==undefined&&(typeof token!=='string'||token.length<16||token.length>4096||/[\r\n]/.test(token)))reject();
  const [run,jobs,artifact,repository,commit,tree]=await Promise.all(
   ROUTES.map((route,i)=>readGithubJson(route,LIMITS[i],token)));
  assessUntrustedHistoricalSemanticEvidence({run,jobs,artifact,repository,commit,tree,archive});
  // Recheck the source checkout after fetching independent GitHub evidence.
  inspectLocalCheckout(o.directory);
  const evidenceSha256=crypto.createHash('sha256').update('Ultra-Sentinel:historical-kotlin-call-graph:v1\n'+ARCHIVE).digest('hex');
  const planned=planDependencyExpansion({headSha:ORIGINAL,seeds:[SOURCES[0].path],
   edges:[{from:SOURCES[0].path,to:SOURCES[1].path,evidenceSha256}],maxFiles:3,maxDepth:2});
  const graph=Object.freeze({...planned,files:Object.freeze(planned.files.map(f=>Object.freeze(f)))});
  const calls=[24,29].map(callLine=>Object.freeze({callPath:SOURCES[0].path,
   callBlobSha:SOURCES[0].blobSha,callLine,declarationPath:SOURCES[1].path,
   declarationBlobSha:SOURCES[1].blobSha,declarationLine:25,calledName:'isSteamId64',dispatch:'STATIC'}));
  return Object.freeze({status:'PINNED_GITHUB_HISTORICAL_SEMANTIC_OBSERVATION_VERIFIED',
   githubApiTlsOriginVerified:true,workflowCommitSha:MAIN,runId:RUN,runAttempt:1,artifactId:ARTIFACT,
   archiveSha256:ARCHIVE,sourceCommitSha:ORIGINAL,sourceCommitMembershipVerified:true,
   sourceRepositoryVerifiedByGithubApi:true,compilerExecutionVerified:true,symbolResolutionVerified:true,
   compilerVersion:'2.0.21',compilerArchiveSha256:COMPILER,languageVersion:'1.9',
   verifiedCalls:Object.freeze(calls),graph,
   freshnessVerified:false,replayProtectionForNewRuns:false,causalityVerified:false,
   originalFunctionalOracleVerified:false,ownerAuthorizationGranted:false,commitAllowed:false,mergeAllowed:false,
   limitation:'Historical evidence only for this pinned run and two static call sites. Trust assumes GitHub HTTPS, its hosted runner, the pinned workflow and the verifier host. It cannot establish freshness, general compiler provenance, function-level control flow, causality or write authority.'});
 }catch{reject();}
}
module.exports=Object.freeze({assessUntrustedHistoricalSemanticEvidence,verifyPinnedGithubSemanticHistory});
