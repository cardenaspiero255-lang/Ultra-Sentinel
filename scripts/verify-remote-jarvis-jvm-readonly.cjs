#!/usr/bin/env node
'use strict';
// Exercise the production JVM verifier on a GitHub-hosted runner without
// invoking the authorization or remote-write executor.
const fs=require('node:fs'),path=require('node:path');
const {buildPinnedCandidate,makeOriginalJvmVerifier}=
 require('./run-github-owner-jarvis-remote.cjs');
const {digestBranchCandidate}=
 require('../packages/recovery/supervised-github-branch-commit.cjs');
async function main(env=process.env){
 if(env.GITHUB_ACTIONS!=='true'||!path.isAbsolute(env.RUNNER_TEMP||'')||
  !path.isAbsolute(env.JARVIS_KOTLIN_HOME||'')||
  typeof env.ULTRA_OWNER_COMMENT_READ_TOKEN!=='string'||
  env.ULTRA_OWNER_COMMENT_READ_TOKEN.length<16||
  env.ULTRA_SENTINEL_JARVIS_OWNER_TOKEN||
  env.ULTRA_SENTINEL_REMOTE_REPAIR_APPLY==='true')
  throw Error('READONLY_REMOTE_JVM_PREFLIGHT_BLOCKED');
 const candidate=await buildPinnedCandidate(env.ULTRA_OWNER_COMMENT_READ_TOKEN);
 const planDigest=digestBranchCandidate(candidate.plan,candidate.files);
 const verify=makeOriginalJvmVerifier(candidate,env);
 const result=await verify({...candidate,planDigest});
 if(result.status!=='TRUSTED_ORIGINAL_KOTLIN_JVM_RED_GREEN'||
  result.genuineOriginalRed!==true||result.originalJVMGreen!==true||
  result.benignControlsPassed!==true||result.isolatedExecution!==true||
  result.remoteWrites!==false||result.mergeAllowed!==false)
  throw Error('READONLY_REMOTE_JVM_PROOF_BLOCKED');
 const receipt={...result,schema:'ultra-sentinel-readonly-remote-jvm/v1',
  sourceRepository:'cardenaspiero255-lang/JARVIS',
  sourceMainSha:candidate.plan.expectedMainSha,
  ownerAuthorizationVerified:false,remoteExecutorInvoked:false,
  androidDeviceObserved:false,productionReleaseCertified:false};
 fs.writeFileSync(path.join(env.RUNNER_TEMP,'readonly-remote-jarvis-jvm.json'),
  JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});
 process.stdout.write('READONLY_REMOTE_JARVIS_JVM_RED_GREEN_AND_LOCAL_ROLLBACK_PASS\n');
}
if(require.main===module)main().catch(error=>{
 const allowed=new Set(['OWNER_ORIGINAL_KOTLIN_ORACLE_FAILED',
  'OWNER_KOTLIN_MATRIX_OR_JUDGE_FAILED','READONLY_REMOTE_JVM_PREFLIGHT_BLOCKED',
  'READONLY_REMOTE_JVM_PROOF_BLOCKED']);
 process.stderr.write((allowed.has(error?.message)?error.message:
  'READONLY_REMOTE_JVM_FAILED')+'\n');
 process.exitCode=1;
});
