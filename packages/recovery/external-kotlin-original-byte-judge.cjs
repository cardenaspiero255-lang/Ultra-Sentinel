'use strict';
/*
 * Exact-byte disposable Git Judge for the pinned MIT-licensed external Kotlin
 * validation case. The original upstream Git blob lacks a final newline;
 * existing Kotlin sandbox intentionally rejects this layout, so we must NOT
 * silently normalize its bytes and then claim an exact original rollback.
 * This module never compiles Kotlin or authenticates its execution origin.
 */
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const {snapshotRecord}=require('../investigation/plain-kotlin-payload.cjs');
const {blobSha}=require('../investigation/novel-kotlin-hypotheses.cjs');
const {judgeLocalRepair}=require('./repair-judge.cjs');
const {rollbackSandbox}=require('./sandbox-rollback.cjs');
const {scanAndDraftAnchoredRegexCase}=
 require('../investigation/external-kotlin-anchored-regex-case.cjs');
const REPO='iamkurtgoz/ECommerceAndroidCompose';
const COMMIT='57f7a95021a125e0cdae4924c32891f6b70b0c5a';
const FILE='domain/src/main/java/com/iamkurtgoz/domain/util/Validator.kt';
const ORIGINAL='5b8af35cf6393dc9dbc6217b8d00329bda7bc196';
function outcome(status,success=false){
 return Object.freeze({
  schema:'ultra-sentinel-external-kotlin-original-byte-git-judge/v1',
  status,originalBlobSha:success?ORIGINAL:null,
  exactTreeRollbackVerified:success,
  originalOracleVerifiedByThisFunction:false,
  originalRepositoryAuthenticatedByThisFunction:false,
  ownerAuthorizationGranted:false,remoteWrites:false,
  mergeAllowed:false,productionReleaseAllowed:false,
  limitation:'Only exact bytes of a pinned upstream Git blob and a disposable local Git Judge/rollback are verified. Actual original Kotlin JVM causality and source repository authentication belong to the independent trusted CI runner.'
 });
}
function git(root,...args){
 const r=spawnSync('git',['-c','core.hooksPath=/dev/null',
  '-c','core.fsmonitor=false','-c','commit.gpgsign=false',
  '-c','core.autocrlf=false',...args],{
   cwd:root,encoding:'utf8',timeout:10000,maxBuffer:1024*1024,
   env:{PATH:process.env.PATH,HOME:root,GIT_CONFIG_NOSYSTEM:'1',
    GIT_CONFIG_GLOBAL:'/dev/null',GIT_NO_REPLACE_OBJECTS:'1',
    GIT_OPTIONAL_LOCKS:'0',GIT_TERMINAL_PROMPT:'0',GIT_CONFIG_COUNT:'0'}
 });
 if(r.error||r.status!==0||typeof r.stdout!=='string')
  throw Error('LOCAL_GIT_OPERATION_DENIED');
 return r.stdout.trim();
}
function judgeExternalKotlinOriginalBytes(options={}){
 let root=null;
 try{
  const o=snapshotRecord(options,['file']);
  const f=snapshotRecord(o.file,
   ['path','before','after','beforeBlobSha','afterBlobSha']);
  if(f.path!==FILE||typeof f.before!=='string'||typeof f.after!=='string'||
   typeof f.beforeBlobSha!=='string'||typeof f.afterBlobSha!=='string'||
   f.beforeBlobSha!==ORIGINAL||blobSha(f.before)!==ORIGINAL||
   f.after===f.before||f.before.length>60000||f.after.length>60000||
   f.after.includes('\0')||f.before.includes('\0')||
   f.after.includes('\r')||f.before.includes('\r')||
   blobSha(f.after)!==f.afterBlobSha)
   return outcome('BLOCKED_UNTRUSTED_ORIGINAL_BYTES');
  const generated=scanAndDraftAnchoredRegexCase({
   repository:REPO,expectedCommitSha:COMMIT,path:FILE,
   source:f.before,expectedBlobSha:ORIGINAL
  });
  if(generated.status!=='ADVISORY_CANDIDATE_REQUIRES_INDEPENDENT_ORIGINAL_JVM'||
   ![generated.candidateSource,generated.unsafeSource].includes(f.after))
   return outcome('BLOCKED_UNSUPPORTED_FIXER_CANDIDATE');
  root=fs.mkdtempSync(path.join(os.tmpdir(),'us-external-kotlin-byte-'));
  const branch='sandbox/original-external-kotlin-bytes';
  git(root,'init','-q','-b',branch);
  if(git(root,'remote')!=='')throw Error('EXTERNAL_GIT_REMOTE');
  const file=path.join(root,FILE);
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,f.before,{flag:'wx',mode:0o600});
  git(root,'add','--',FILE);
  git(root,'-c','user.name=Ultra Sentinel Local Judge',
   '-c','user.email=sandbox@example.invalid','commit','-qm','original exact Kotlin bytes');
  const baseline=git(root,'rev-parse','HEAD'),baselineTree=git(root,'rev-parse','HEAD^{tree}');
  if(git(root,'rev-parse','HEAD:'+FILE)!==ORIGINAL)throw Error('BASELINE_BLOB_CHANGED');
  fs.writeFileSync(file,f.after,{flag:'w',mode:0o600});
  git(root,'add','--',FILE);
  git(root,'-c','user.name=Ultra Sentinel Local Judge',
   '-c','user.email=sandbox@example.invalid','commit','-qm','candidate exact Kotlin bytes');
  const candidate=git(root,'rev-parse','HEAD');
  if(git(root,'rev-parse','HEAD:'+FILE)!==f.afterBlobSha)
   throw Error('CANDIDATE_GIT_BLOB_CHANGED');
  const plan={branch,expectedHeadSha:baseline,changes:[{
   path:FILE,beforeBlobSha:ORIGINAL,afterBlobSha:f.afterBlobSha,
   patchBytes:Buffer.byteLength(f.after,'utf8')
  }]};
  const judged=judgeLocalRepair({
   directory:root,baselineHeadSha:baseline,repairHeadSha:candidate,plan
  });
  if(!judged.approved||judged.status!=='APPROVED_LOCAL_POLICY_ONLY'||
   judged.checkedFiles!==1)throw Error('LOCAL_POLICY_JUDGE_VETO');
  const rollback=rollbackSandbox({
   directory:root,baselineHeadSha:baseline,repairHeadSha:candidate
  });
  if(rollback.status!=='ROLLBACK_VERIFIED'||
   rollback.restoredTree!==baselineTree||
   git(root,'rev-parse','HEAD:'+FILE)!==ORIGINAL||
   git(root,'status','--porcelain')!==''||
   git(root,'remote')!=='')throw Error('LOCAL_ROLLBACK_VETO');
  const restored=fs.readFileSync(file);
  if(!restored.equals(Buffer.from(f.before,'utf8')))
   throw Error('ORIGINAL_BYTES_NOT_RESTORED');
  return outcome('EXTERNAL_ORIGINAL_BYTES_LOCAL_JUDGE_ROLLBACK_VERIFIED',true);
 }catch{return outcome('BLOCKED_LOCAL_GIT_OR_ROLLBACK');}
 finally{if(root!==null)fs.rmSync(root,{recursive:true,force:true});}
}
module.exports=Object.freeze({judgeExternalKotlinOriginalBytes});
