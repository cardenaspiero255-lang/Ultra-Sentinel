'use strict';
/*
 * Trusted-runner source checkout screen. This script reads only the original
 * owner-owned Kotlin implementation from the current local Git commit.
 * It does not fetch external repositories, run arbitrary Kotlin, or repair.
 */
const fs=require('node:fs'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const {blobSha}=require('../packages/investigation/novel-kotlin-hypotheses.cjs');
const {screenOwnerKotlinSource}=
 require('../packages/investigation/phase1-owner-kotlin-source-screen.cjs');
const REPO='cardenaspiero255-lang/Ultra-Sentinel';
const SOURCE_PATH='packages/kotlin-semantic/C2OptionalKotlinSemantic.kt';
function git(...args){
 const r=spawnSync('git',['-c','core.hooksPath=/dev/null',
  '-c','core.fsmonitor=false',...args],{
  encoding:null,timeout:10000,maxBuffer:300000,
  env:{PATH:process.env.PATH,GIT_CONFIG_NOSYSTEM:'1',
   GIT_CONFIG_GLOBAL:'/dev/null',GIT_NO_REPLACE_OBJECTS:'1',
   GIT_OPTIONAL_LOCKS:'0',GIT_TERMINAL_PROMPT:'0',GIT_CONFIG_COUNT:'0'}
 });
 if(r.error||r.status!==0||!Buffer.isBuffer(r.stdout))
  throw Error('GIT_READ_REJECTED');
 return r.stdout;
}
function main(){
 if(process.env.GITHUB_ACTIONS!=='true'||
  process.env.GITHUB_REPOSITORY!==REPO||
  process.env.GITHUB_REPOSITORY_ID!=='1418338512')throw Error('RUNNER_IDENTITY_REJECTED');
 const current=git('rev-parse','HEAD').toString('utf8').trim();
 if(!/^[0-9a-f]{40}$/.test(current)||current!==process.env.GITHUB_SHA)
  throw Error('RUNNER_COMMIT_MISMATCH');
 const entry=git('ls-tree',current,'--',SOURCE_PATH).toString('utf8');
 const match=/^100644 blob ([0-9a-f]{40})\t([^\n]+)\n$/.exec(entry);
 if(!match||match[2]!==SOURCE_PATH)throw Error('UNEXPECTED_KOTLIN_SOURCE_ENTRY');
 const bytes=git('show',current+':'+SOURCE_PATH);
 if(bytes.length<100||bytes.length>60000)throw Error('UNBOUNDED_SOURCE_BYTES');
 const source=bytes.toString('utf8'),local=fs.readFileSync(SOURCE_PATH);
 if(!Buffer.from(source,'utf8').equals(bytes)||!local.equals(bytes)||
  blobSha(source)!==match[1])
  throw Error('ORIGINAL_SOURCE_GIT_MISMATCH');
 const result=screenOwnerKotlinSource({repository:REPO,commit:current,
  path:SOURCE_PATH,source,expectedBlobSha:match[1]});
 if(!['NO_ELIGIBLE_KOTLIN_HYPOTHESIS_NOT_CERTIFIED',
      'UNVERIFIED_KOTLIN_HYPOTHESIS_REQUIRES_ORIGINAL_ORACLE'].includes(result.status)||
  result.originalBlobSha!==match[1]||result.phaseOneClosed!==false||
  result.remoteWrites!==false||result.originalJVMOracleVerified!==false)
  throw Error('UNTRUSTED_KOTLIN_SCREEN_RESULT');
 const receipt=Object.freeze({
  schema:'ultra-sentinel-phase1-owner-kotlin-ci-receipt/v1',
  runnerCommit:current,sourcePath:SOURCE_PATH,
  gitBlobSha:match[1],localGitCommitMembershipVerified:true,
  sourceBytesMatchLocalCheckout:true,screening:result,
  sourceRemoteIdentityAuthenticatedByThisReceipt:false,
  novelDefectReproduced:false,originalJVMOracleExecuted:false,
  phaseOneClosed:false,remoteWrites:false,productionReleaseAllowed:false
 });
 const output=process.argv[2];
 if(typeof output!=='string'||!path.isAbsolute(output)||
  !process.env.RUNNER_TEMP||
  !path.resolve(output).startsWith(path.resolve(process.env.RUNNER_TEMP)+path.sep))
  throw Error('UNSAFE_RECEIPT_PATH');
 fs.writeFileSync(output,JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});
 process.stdout.write('PHASE1_OWNER_KOTLIN_SCREEN_'+result.status+'\n');
}
if(require.main===module)main();
module.exports=Object.freeze({main});
