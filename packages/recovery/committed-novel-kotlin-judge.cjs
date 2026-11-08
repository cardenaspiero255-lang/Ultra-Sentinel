'use strict';
/*
 * Read-only ORIGINAL-SOURCE bridge: exact Git objects from an isolated,
 * clean LOCAL commit -> unregistered Kotlin Hunter/Fixer candidate intake ->
 * disposable Git Judge plus exact rollback. No Kotlin JVM execution here.
 * A matching local commit is NOT remote repository authentication, and
 * removing a static hypothesis does NOT establish functional causality.
 */
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {TextDecoder}=require('node:util');
const {snapshotRecord,snapshotArray}=
 require('../investigation/plain-kotlin-payload.cjs');
const {isSafeNovelKotlinPath}=
 require('../investigation/novel-kotlin-path-policy.cjs');
const {blobSha}=require('../investigation/novel-kotlin-hypotheses.cjs');
const {planCommittedKotlinSourceImports}=
 require('../family-hunter/committed-kotlin-import-graph.cjs');
const {drillNovelKotlinCandidateBatch}=
 require('./novel-kotlin-batch-local-judge.cjs');
const SHA=/^[a-f0-9]{40}$/;
const MAX_FILES=12;

function outcome(status,checkedFiles=0,cases=[],graphStatus=null,verified=false,rollback=false){
 return Object.freeze({
  schema:'ultra-sentinel-committed-novel-kotlin-local-judge/v1',
  status,checkedFiles,cases:Object.freeze(cases),importGraphStatus:graphStatus,
  sourceCommitMembershipVerified:verified,localGitRollbackVerified:rollback,
  candidateIntakeVerified:verified&&rollback,
  originalFunctionalOracleVerified:false,causalityVerified:false,
  kotlinCompilerExecutionVerified:false,fixerCandidateGenerationVerified:false,
  externalRepositoryAuthenticated:false,ownerAuthorizationGranted:false,
  remoteWrites:false,mergeAllowed:false,productionReleaseAllowed:false,
  limitation:'Only inert original-source bytes from a clean local Git commit and a disposable Git rollback were verified. Candidate proposals are caller-supplied. Kotlin compiler execution, independent original functional oracle, causal diagnosis, remote repository identity and owner authorization are NOT proven.'
 });
}
function reject(){throw Error('COMMITTED_KOTLIN_HANDOFF_REJECTED');}
function readGitBlob(root,sha){
 const r=spawnSync('git',[
  '-c','core.hooksPath=/dev/null','-c','core.fsmonitor=false',
  '-c','commit.gpgsign=false','-c','core.autocrlf=false',
  'cat-file','blob',sha
 ],{cwd:root,encoding:null,timeout:10000,maxBuffer:65536,
  env:{PATH:process.env.PATH,HOME:root,GIT_CONFIG_NOSYSTEM:'1',
   GIT_CONFIG_GLOBAL:'/dev/null',GIT_OPTIONAL_LOCKS:'0',
   GIT_CONFIG_COUNT:'0',GIT_TERMINAL_PROMPT:'0',GIT_NO_REPLACE_OBJECTS:'1'}});
 if(r.error||r.status!==0||!Buffer.isBuffer(r.stdout)||
    r.stdout.length<10||r.stdout.length>60000)reject();
 const bytes=Buffer.from(r.stdout);
 let source;
 try{source=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{reject();}
 if(!Buffer.from(source,'utf8').equals(bytes)||blobSha(source)!==sha)reject();
 return source;
}
function judgeCommittedNovelKotlinCandidates(options={}){
 try{
  const o=snapshotRecord(options,
   ['directory','expectedCommitSha','files','proposals']);
  if(typeof o.directory!=='string'||!path.isAbsolute(o.directory)||
   typeof o.expectedCommitSha!=='string'||!SHA.test(o.expectedCommitSha))reject();
  const selections=snapshotArray(o.files,['path'],MAX_FILES);
  const proposals=snapshotArray(o.proposals,
   ['path','rule','candidateSource','expectedCandidateBlobSha'],MAX_FILES);
  const paths=selections.map(x=>x.path);
  if(!paths.every(isSafeNovelKotlinPath)||new Set(paths).size!==paths.length)reject();
  const graphOptions={directory:o.directory,expectedCommitSha:o.expectedCommitSha,
   paths,seeds:paths,maxFiles:paths.length,maxDepth:0};
  const graph=planCommittedKotlinSourceImports(graphOptions);
  if(!graph.localCommitVerified||!graph.repositoryMembershipVerified||
   graph.sourceBlobs.length!==paths.length||graph.plan.files.length!==paths.length)reject();
  const byPath=new Map(graph.sourceBlobs.map(x=>[x.path,x.blobSha]));
  const files=paths.map(p=>{
   const sha=byPath.get(p);
   if(typeof sha!=='string'||!SHA.test(sha))reject();
   return {path:p,source:readGitBlob(o.directory,sha),expectedBlobSha:sha};
  });
  const local=drillNovelKotlinCandidateBatch({
   expectedCommitSha:o.expectedCommitSha,files,proposals
  });
  if(local.status!=='LOCAL_BATCH_JUDGE_AND_ROLLBACK_VERIFIED_NEEDS_ORIGINAL_ORACLE'||
   local.checkedFiles!==paths.length||!local.localGitRollbackVerified)reject();
  if(local.cases.length!==proposals.length||
   local.cases.some(c=>byPath.get(c.path)!==c.originalBlobSha))reject();
  // Re-validate the same head and clean isolated source checkout after the
  // sandbox operation. Never infer trusted remote identity from this check.
  const final=planCommittedKotlinSourceImports(graphOptions);
  if(!final.localCommitVerified||final.sourceBlobs.length!==graph.sourceBlobs.length||
   final.sourceBlobs.some((x,i)=>x.path!==graph.sourceBlobs[i].path||
    x.blobSha!==graph.sourceBlobs[i].blobSha))reject();
  return outcome('COMMITTED_LOCAL_KOTLIN_JUDGE_NEEDS_INDEPENDENT_JVM_ORACLE',
   local.checkedFiles,local.cases,graph.status,true,true);
 }catch{return outcome('BLOCKED_UNTRUSTED_COMMITTED_KOTLIN_HANDOFF');}
}
module.exports=Object.freeze({judgeCommittedNovelKotlinCandidates});
