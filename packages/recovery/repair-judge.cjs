'use strict';
/**
 * Separate, deterministic policy Judge for a disposable local Git repair.
 * Recomputes the approved blob IDs directly from Git. Never fetches, runs
 * untrusted code, writes, signs, pushes, merges or certifies the remote.
 */
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const {assertSafeGitCheckout}=require('./git-sandbox-policy.cjs');
const SHA=/^[a-f0-9]{40}$/;
const SAFE=/^(?:app\/src\/main\/|supabase\/functions\/)[A-Za-z0-9_./-]+$/;
function git(directory,...args){
 const p=spawnSync('git',['-c','core.hooksPath=/dev/null','-c','core.fsmonitor=false',
  '-c','commit.gpgsign=false','-c','core.autocrlf=false',...args],{
  cwd:directory,encoding:'utf8',timeout:10000,maxBuffer:1024*1024,
  env:{PATH:process.env.PATH,HOME:directory,GIT_CONFIG_NOSYSTEM:'1',
   GIT_CONFIG_GLOBAL:'/dev/null',GIT_TERMINAL_PROMPT:'0'}
 });
 if(p.error||p.status!==0)throw Error('JUDGE_GIT_ERROR');
 return p.stdout.trim();
}
function rejected(){
 return Object.freeze({status:'JUDGE_VETO',approved:false,mergeAllowed:false,
  remoteWrites:false,externalCertification:false});
}
function judgeLocalRepair({directory,baselineHeadSha,repairHeadSha,plan}={}){
 try{
  if(typeof directory!=='string'||!path.isAbsolute(directory)||
   !fs.realpathSync(directory).startsWith(fs.realpathSync(os.tmpdir())+path.sep)||
   !SHA.test(baselineHeadSha||'')||!SHA.test(repairHeadSha||'')||
   baselineHeadSha===repairHeadSha||!plan||plan.expectedHeadSha!==baselineHeadSha||
   typeof plan.branch!=='string'||!/^sandbox\/[a-z0-9._/-]+$/.test(plan.branch)||
   !Array.isArray(plan.changes)||plan.changes.length===0||plan.changes.length>30)
   return rejected();
  assertSafeGitCheckout(directory);
  if(git(directory,'remote')!==''||git(directory,'branch','--show-current')!==plan.branch||
   git(directory,'status','--porcelain')!==''||
   git(directory,'rev-parse','HEAD')!==repairHeadSha||
   git(directory,'rev-parse',repairHeadSha+'^')!==baselineHeadSha)
   return rejected();
  const all=git(directory,'diff','--name-only','-z',baselineHeadSha,repairHeadSha)
   .split('\0').filter(Boolean);
  if(all.length!==plan.changes.length||new Set(all).size!==all.length)return rejected();
  const known=new Set();
  for(const change of plan.changes){
   if(!change||typeof change!=='object'||Array.isArray(change)||
    typeof change.path!=='string'||!SAFE.test(change.path)||
    change.path.includes('..')||change.path.includes('\\')||
    known.has(change.path)||!SHA.test(change.beforeBlobSha||'')||
    !SHA.test(change.afterBlobSha||'')||change.beforeBlobSha===change.afterBlobSha||
    !Number.isSafeInteger(change.patchBytes)||change.patchBytes<1||
    !all.includes(change.path))return rejected();
   known.add(change.path);
   if(git(directory,'rev-parse',baselineHeadSha+':'+change.path)!==change.beforeBlobSha||
    git(directory,'rev-parse',repairHeadSha+':'+change.path)!==change.afterBlobSha)
    return rejected();
  }
  if(git(directory,'diff','--check',baselineHeadSha,repairHeadSha)!=='')return rejected();
  return Object.freeze({status:'APPROVED_LOCAL_POLICY_ONLY',approved:true,
   baselineHeadSha,repairHeadSha,checkedFiles:known.size,
   mergeAllowed:false,remoteWrites:false,externalCertification:false});
 }catch{return rejected();}
}
module.exports={judgeLocalRepair};
