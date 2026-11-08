'use strict';
/*
 * Narrow, read-only Fixer generation from an immutable LOCAL Git source.
 * Applies no repair to the owner repository; only the existing disposable
 * local Judge stages and rolls back the candidate. JVM oracle still required.
 */
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {TextDecoder}=require('node:util');
const {snapshotRecord}=require('../investigation/plain-kotlin-payload.cjs');
const {isSafeNovelKotlinPath}=require('../investigation/novel-kotlin-path-policy.cjs');
const {blobSha}=require('../investigation/novel-kotlin-hypotheses.cjs');
const {draftBoundedReadProgressRepair}=
 require('../investigation/bounded-read-progress-repair.cjs');
const {planCommittedKotlinSourceImports}=
 require('../family-hunter/committed-kotlin-import-graph.cjs');
const {judgeCommittedNovelKotlinCandidates}=
 require('./committed-novel-kotlin-judge.cjs');
const SHA=/^[a-f0-9]{40}$/;

function outcome(status,originalBlobSha=null,candidateBlobSha=null,success=false){
 return Object.freeze({
  schema:'ultra-sentinel-committed-bounded-read-fixer-judge/v1',
  status,originalBlobSha,candidateBlobSha,
  sourceCommitMembershipVerified:success,
  fixerCandidateGenerationVerified:success,
  localGitRollbackVerified:success,
  originalFunctionalOracleVerified:false,causalityVerified:false,
  externalRepositoryAuthenticated:false,kotlinCompilerExecutionVerified:false,
  ownerAuthorizationGranted:false,remoteWrites:false,mergeAllowed:false,
  productionReleaseAllowed:false,
  limitation:'The Fixer generated a narrow candidate from a local committed blob and the disposable Judge restored its tree. No original Kotlin JVM execution, independent functional veto, authenticated remote repository, novel real-world defect or production authorization is proven.'
 });
}
function fail(){throw Error('COMMITTED_BOUNDED_READ_FIXER_REJECTED');}
function committedBlob(directory,sha){
 const p=spawnSync('git',[
  '-c','core.hooksPath=/dev/null','-c','core.fsmonitor=false',
  '-c','commit.gpgsign=false','-c','core.autocrlf=false',
  'cat-file','blob',sha
 ],{cwd:directory,encoding:null,timeout:10000,maxBuffer:65536,
  env:{PATH:process.env.PATH,HOME:directory,GIT_CONFIG_NOSYSTEM:'1',
   GIT_CONFIG_GLOBAL:'/dev/null',GIT_OPTIONAL_LOCKS:'0',
   GIT_CONFIG_COUNT:'0',GIT_TERMINAL_PROMPT:'0',GIT_NO_REPLACE_OBJECTS:'1'}});
 if(p.error||p.status!==0||!Buffer.isBuffer(p.stdout)||
  p.stdout.length<10||p.stdout.length>60000)fail();
 let source;
 try{source=new TextDecoder('utf-8',{fatal:true}).decode(p.stdout);}catch{fail();}
 if(!Buffer.from(source,'utf8').equals(p.stdout)||blobSha(source)!==sha)fail();
 return source;
}
function draftAndJudgeCommittedBoundedRead(options={}){
 try{
  const args=snapshotRecord(options,['directory','expectedCommitSha','file']);
  const file=snapshotRecord(args.file,['path']);
  if(typeof args.directory!=='string'||!path.isAbsolute(args.directory)||
   typeof args.expectedCommitSha!=='string'||!SHA.test(args.expectedCommitSha)||
   !isSafeNovelKotlinPath(file.path))fail();
  const graph=planCommittedKotlinSourceImports({
   directory:args.directory,expectedCommitSha:args.expectedCommitSha,
   paths:[file.path],seeds:[file.path],maxFiles:1,maxDepth:0
  });
  if(!graph.localCommitVerified||!graph.repositoryMembershipVerified||
   graph.sourceBlobs.length!==1||graph.sourceBlobs[0].path!==file.path)fail();
  const originalBlobSha=graph.sourceBlobs[0].blobSha;
  const source=committedBlob(args.directory,originalBlobSha);
  const draft=draftBoundedReadProgressRepair({
   expectedCommitSha:args.expectedCommitSha,
   file:{path:file.path,source,expectedBlobSha:originalBlobSha}
  });
  if(draft.status!=='CANDIDATE_REQUIRES_TRUSTED_ORIGINAL_ORACLE'||
   draft.rule!=='BOUNDED_READ_ZERO_PROGRESS'||draft.sourceBlobSha!==originalBlobSha||
   typeof draft.candidateSource!=='string'||blobSha(draft.candidateSource)!==draft.candidateBlobSha)
   fail();
  const adjudicated=judgeCommittedNovelKotlinCandidates({
   directory:args.directory,expectedCommitSha:args.expectedCommitSha,
   files:[{path:file.path}],
   proposals:[{path:file.path,rule:draft.rule,candidateSource:draft.candidateSource,
    expectedCandidateBlobSha:draft.candidateBlobSha}]
  });
  if(adjudicated.status!=='COMMITTED_LOCAL_KOTLIN_JUDGE_NEEDS_INDEPENDENT_JVM_ORACLE'||
   !adjudicated.localGitRollbackVerified||!adjudicated.sourceCommitMembershipVerified||
   adjudicated.checkedFiles!==1||adjudicated.cases.length!==1||
   adjudicated.cases[0].originalBlobSha!==originalBlobSha||
   adjudicated.cases[0].candidateBlobSha!==draft.candidateBlobSha||
   adjudicated.cases[0].familyId!==draft.familyId)
   fail();
  return outcome('COMMITTED_BOUNDED_READ_FIXER_AND_LOCAL_JUDGE_NEEDS_JVM_ORACLE',
   originalBlobSha,draft.candidateBlobSha,true);
 }catch{return outcome('BLOCKED_COMMITTED_BOUNDED_READ_DRAFT_OR_LOCAL_JUDGE');}
}
module.exports=Object.freeze({draftAndJudgeCommittedBoundedRead});
