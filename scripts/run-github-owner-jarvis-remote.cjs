#!/usr/bin/env node
'use strict';
/**
 * Trusted GitHub-hosted owner-only issue_comment operator for JARVIS #105.
 * The PR/plan/source/oracle are ALL pinned; the GitHub RSA-signed OIDC JWT
 * and live owner comment are reverified inside the branch executor.
 * No chat text or JSON artifact alone authorizes the write.
 */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const {PLAN,validateTrialPlan,validateTrialFiles}=
 require('../packages/recovery/owner-jarvis-polite-operator.cjs');
const {makePoliteCandidate}=
 require('../packages/investigation/jarvis-polite-candidate.cjs');
const {digestBranchCandidate,runSupervisedGitHubBranchCommit}=
 require('../packages/recovery/supervised-github-branch-commit.cjs');
const {TARGET_PLAN_DIGEST,REMOTE_WORKFLOW}=
 require('../packages/recovery/github-remote-owner-approval.cjs');
const PATH_BASE='apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/';
const PIN={gate:'bdc3a6a576b3473454df232cd21e3a9a3c4e6465',
 policy:'46e9dd8b4d0fe861935bfb5ee5160cd39f3b5a78'};
function fail(){throw Error('OWNER_GITHUB_REMOTE_REPAIR_BLOCKED');}
function blob(value){
 const b=Buffer.from(value,'utf8');
 return crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
}
function environment(env=process.env){
 if(env.GITHUB_ACTIONS!=='true'||env.GITHUB_WORKFLOW_REF!==REMOTE_WORKFLOW||
  env.GITHUB_ACTOR_ID!=='322222186'||
  env.GITHUB_EVENT_NAME!=='issue_comment'||
  env.GITHUB_REPOSITORY!=='cardenaspiero255-lang/Ultra-Sentinel'||
  env.GITHUB_REF!=='refs/heads/main'||env.GITHUB_RUN_ATTEMPT!=='1'||
  !path.isAbsolute(env.RUNNER_TEMP||'')||
  !path.isAbsolute(env.JARVIS_KOTLIN_HOME||'')||
  typeof env.ULTRA_OWNER_COMMENT_READ_TOKEN!=='string'||
  env.ULTRA_OWNER_COMMENT_READ_TOKEN.length<16)fail();
 const apply=env.ULTRA_SENTINEL_REMOTE_REPAIR_APPLY==='true';
 if(!['true','false',undefined].includes(env.ULTRA_SENTINEL_REMOTE_REPAIR_APPLY))fail();
 if(apply&&env.ULTRA_SENTINEL_REMOTE_DRAFT_APPLY_CONFIRMED!=='true')fail();
 // The owner PAT is a write-only capability. Read-only OIDC previews run
 // entirely with the GitHub Actions read token and no JARVIS secret.
 if(apply&&(typeof env.ULTRA_SENTINEL_JARVIS_OWNER_TOKEN!=='string'||
  env.ULTRA_SENTINEL_JARVIS_OWNER_TOKEN.length<16))fail();
 return apply;
}
async function fetchOriginalFile(name,expectedSha,readToken,fetchImpl=fetch){
 const target='https://api.github.com/repos/cardenaspiero255-lang/JARVIS/contents/'+
  PATH_BASE+name+'?ref='+PLAN.expectedMainSha;
 const response=await fetchImpl(target,{method:'GET',redirect:'error',
  signal:AbortSignal.timeout(15000),
  headers:{Authorization:'Bearer '+readToken,
   Accept:'application/vnd.github+json',
   'X-GitHub-Api-Version':'2022-11-28'}});
 if(!response||response.status!==200)fail();
 const data=await response.json();
 if(data.type!=='file'||data.path!==PATH_BASE+name||
  data.sha!==expectedSha||data.encoding!=='base64'||
  !Number.isSafeInteger(data.size)||data.size<100||data.size>60000||
  typeof data.content!=='string')fail();
 const encoded=data.content.replace(/\n/g,'');
 if(!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded))fail();
 const bytes=Buffer.from(encoded,'base64');
 if(bytes.length!==data.size||bytes.toString('base64')!==encoded)fail();
 const content=bytes.toString('utf8');
 if(!Buffer.from(content,'utf8').equals(bytes)||blob(content)!==expectedSha)fail();
 return content;
}
async function buildPinnedCandidate(readToken,fetchImpl=fetch){
 const [gate,policy]=await Promise.all([
  fetchOriginalFile('OfflineVoiceQuestionGate.kt',PIN.gate,readToken,fetchImpl),
  fetchOriginalFile('LocalGgufPolicy.kt',PIN.policy,readToken,fetchImpl)
 ]);
 const generated=makePoliteCandidate({gate,policy});
 const files=validateTrialFiles([
  {path:PATH_BASE+'OfflineVoiceQuestionGate.kt',before:gate,
   after:generated.gate,beforeBlobSha:PIN.gate,
   afterBlobSha:generated.gateBlob},
  {path:PATH_BASE+'LocalGgufPolicy.kt',before:policy,
   after:generated.policy,beforeBlobSha:PIN.policy,
   afterBlobSha:generated.policyBlob}
 ]);
 if(digestBranchCandidate(PLAN,files)!==TARGET_PLAN_DIGEST)fail();
 return Object.freeze({plan:validateTrialPlan(PLAN),files});
}
/**
 * Host-side Kotlin oracle helper scripts invoke 'node' after we deliberately
 * sanitize PATH. actions/setup-node installs Node outside /usr/bin on hosted
 * runners. Expose ONLY the already running, trusted Node binary through a
 * fresh private symlink directory; never import an event/PR supplied PATH.
 */
function trustedNodePath(directory,nodeExecutable=process.execPath){
 try{
  if(typeof directory!=='string'||!path.isAbsolute(directory)||
   typeof nodeExecutable!=='string'||!path.isAbsolute(nodeExecutable))
   throw Error('BAD_PATH');
  const root=fs.lstatSync(directory);
  if(!root.isDirectory()||root.isSymbolicLink()||
   (root.mode&0o077)!==0)throw Error('UNSAFE_PRIVATE_DIRECTORY');
  const canonical=fs.realpathSync(nodeExecutable);
  const binary=fs.statSync(canonical);
  // setup-node's actual executable may be group-writable on GitHub-hosted
  // runners. It is already executing THIS trusted workflow; reject only a
  // world-writable binary and never accept an untrusted PATH entry.
  if(!binary.isFile()||(binary.mode&0o002)!==0||
   (binary.mode&0o111)===0)throw Error('UNSAFE_NODE_EXECUTABLE');
  const bin=path.join(directory,'trusted-tools');
  fs.mkdirSync(bin,{mode:0o700});
  fs.symlinkSync(canonical,path.join(bin,'node'),'file');
  if(fs.realpathSync(path.join(bin,'node'))!==canonical)
   throw Error('NODE_SYMLINK_INCONSISTENT');
  return bin+':/usr/local/bin:/usr/bin:/bin';
 }catch{throw Error('OWNER_TRUSTED_NODE_PATH_UNAVAILABLE');}
}
function spawnIsolated(label,args,env){
 const result=spawnSync('/bin/bash',args,{encoding:'utf8',timeout:240000,
  maxBuffer:65536,env,stdio:['ignore','pipe','pipe']});
 if(result.error||result.status!==0||
  typeof result.stdout!=='string'||
  !result.stdout.includes(label))
  throw Error(label==='ORIGINAL_VOICE_INTENT_RED_OBSERVED'?
   'OWNER_ORIGINAL_KOTLIN_ORACLE_FAILED':
   'OWNER_KOTLIN_MATRIX_OR_JUDGE_FAILED');
}
function makeOriginalJvmVerifier({plan,files},env=process.env){
 const digest=digestBranchCandidate(plan,files);
 return async ({plan:verificationPlan,files:verificationFiles,planDigest})=>{
  if(planDigest!==digest||
   verificationPlan.expectedHeadSha!==PLAN.expectedHeadSha||
   verificationPlan.expectedMainSha!==PLAN.expectedMainSha||
   digestBranchCandidate(verificationPlan,
    validateTrialFiles(verificationFiles))!==digest)fail();
  const dir=fs.mkdtempSync(path.join(env.RUNNER_TEMP,'owner-remote-jvm-'));
  try{
   const subprocessEnv={
    PATH:trustedNodePath(dir),HOME:env.HOME||'/tmp',
    GITHUB_ACTIONS:'true',JARVIS_POLITE_ISOLATED:'1',
    JARVIS_KOTLIN_HOME:env.JARVIS_KOTLIN_HOME,
    GH_TOKEN:env.ULTRA_OWNER_COMMENT_READ_TOKEN
   };
   const original=path.resolve(__dirname,'jarvis-polite-operational-original-red.sh');
   const matrix=path.resolve(__dirname,'jarvis-polite-candidate-matrix.sh');
   spawnIsolated('ORIGINAL_VOICE_INTENT_RED_OBSERVED',[original,dir],subprocessEnv);
   // NEVER forward owner JARVIS write credentials into the source oracle.
   delete subprocessEnv.GH_TOKEN;
   spawnIsolated('PINNED_SOURCE_MATRIX_AND_LOCAL_ROLLBACK_OBSERVED',
    [matrix,dir],subprocessEnv);
   const inputGate=fs.readFileSync(path.join(dir,'input','gate.kt'),'utf8');
   const inputPolicy=fs.readFileSync(path.join(dir,'input','policy.kt'),'utf8');
   if(inputGate!==files.find(x=>x.path.endsWith('OfflineVoiceQuestionGate.kt')).before||
      inputPolicy!==files.find(x=>x.path.endsWith('LocalGgufPolicy.kt')).before)fail();
   return Object.freeze({
    status:'TRUSTED_ORIGINAL_KOTLIN_JVM_RED_GREEN',
    baselineHeadSha:plan.expectedHeadSha,planDigest:digest,
    sourceBlobs:files.map(f=>f.beforeBlobSha),
    candidateBlobs:files.map(f=>f.afterBlobSha),
    genuineOriginalRed:true,originalJVMGreen:true,
    benignControlsPassed:true,isolatedExecution:true,
    remoteWrites:false,mergeAllowed:false
   });
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
 };
}
async function main({env=process.env,fetchImpl=fetch}={}){
 let stage='ENVIRONMENT';
 try{
  const apply=environment(env);
  stage='PINNED_SOURCE_CANDIDATE';
  const candidate=await buildPinnedCandidate(env.ULTRA_OWNER_COMMENT_READ_TOKEN,fetchImpl);
  const verifyOriginalJVM=makeOriginalJvmVerifier(candidate,env);
  stage='SUPERVISED_EXECUTOR';
  const result=await runSupervisedGitHubBranchCommit({
   ...candidate,
   token:apply?env.ULTRA_SENTINEL_JARVIS_OWNER_TOKEN:env.ULTRA_OWNER_COMMENT_READ_TOKEN,
   nonceStorePath:path.join(env.RUNNER_TEMP,'owner-remote-jarvis-nonces'),
   verifyOriginalJVM,githubOwnerSingleApproval:true,fetchImpl,apply
  });
  if(apply){
   if(result.status!=='OWNER_APPROVED_PR_BRANCH_COMMIT_CREATED'||
    result.remoteWrites!==true||result.mergeAllowed!==false||
    result.remoteRollbackExecuted!==false||!result.rollbackPlan)fail();
   // Never output the owner token or issuer JWT. Exact rollback still
   // requires a DIFFERENT independently approved operation.
   fs.writeFileSync(path.join(env.RUNNER_TEMP,'owner-remote-jarvis-rollback-plan.json'),
    JSON.stringify({rollbackPlan:result.rollbackPlan,
     digest:result.rollbackPlanDigest,repairCommitSha:result.commitSha})+'\n',
    {flag:'wx',mode:0o600});
   process.stdout.write('OWNER_GITHUB_REMOTE_DRAFT_REPAIR_COMMIT_CONFIRMED_ROLLBACK_NOT_AUTHORIZED\n');
  }else{
   if(result.status!=='OWNER_AUTHENTICATED_DRAFT_PR_READY'||
    result.remoteWrites!==false||result.ownerNonceConsumed!==false)fail();
   process.stdout.write('OWNER_GITHUB_REMOTE_DRAFT_PREFLIGHT_VERIFIED_NO_WRITE\n');
  }
  return result;
 }catch(error){
  // Never print remote response bodies, tokens, URLs or untrusted exceptions.
  // Only fixed, locally authored error codes and the stage are diagnostic.
  const allowed=new Set([
   'REMOTE_OWNER_WORKFLOW_BLOCKED',
   'REMOTE_GITHUB_APPROVAL_SCOPE_MISMATCH',
   'GITHUB_AUTHENTICATION_FAILED','OWNER_IDENTITY_MISMATCH',
   'UNTRUSTED_OR_STALE_DRAFT_PR','STALE_MAIN_HEAD',
   'STALE_REMOTE_BRANCH_HEAD','REMOTE_BASELINE_TREE_MISMATCH',
   'UNTRUSTED_REMOTE_GIT_TREE','REMOTE_SOURCE_BLOB_MISMATCH',
   'GITHUB_API_REFUSED','GITHUB_API_TRANSPORT_UNCERTAIN',
   'OWNER_ORIGINAL_KOTLIN_ORACLE_FAILED','OWNER_KOTLIN_MATRIX_OR_JUDGE_FAILED',
   'LOCAL_JUDGE_OR_EXACT_ROLLBACK_VETO','TRUSTED_ORIGINAL_ORACLE_VETO'
  ]);
  const reason=allowed.has(error?.message)?error.message:'REDACTED_INTERNAL_FAILURE';
  process.stderr.write('OWNER_GITHUB_REMOTE_DIAGNOSTIC_STAGE='+stage+'\n');
  process.stderr.write('OWNER_GITHUB_REMOTE_DIAGNOSTIC_REASON='+reason+'\n');
  fail();
 }
}
if(require.main===module)main().catch(()=>{
 process.stderr.write('OWNER_GITHUB_REMOTE_REPAIR_BLOCKED\n');process.exitCode=1;
});
module.exports={environment,fetchOriginalFile,buildPinnedCandidate,trustedNodePath,makeOriginalJvmVerifier,main};
