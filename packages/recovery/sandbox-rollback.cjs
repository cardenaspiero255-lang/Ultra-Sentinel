'use strict';
/* Explicit recovery drill for a local disposable checkout only. */
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const SHA=/^[a-f0-9]{40}$/;
const {assertSafeGitCheckout}=require('./git-sandbox-policy.cjs');
function git(cwd,...args){
 const r=spawnSync('git',['-c','core.hooksPath=/dev/null','-c','core.fsmonitor=false','-c','commit.gpgsign=false','-c','core.autocrlf=false',...args],{cwd,encoding:'utf8',timeout:10000,
  env:{PATH:process.env.PATH,HOME:cwd,GIT_CONFIG_NOSYSTEM:'1',
   GIT_CONFIG_GLOBAL:'/dev/null',GIT_TERMINAL_PROMPT:'0'}});
 if(r.error||r.status!==0)throw Error('ROLLBACK_GIT_FAILED');
 return r.stdout.trim();
}
function rollbackSandbox({directory,baselineHeadSha,repairHeadSha}={}){
 if(!directory||!fs.realpathSync(directory).startsWith(fs.realpathSync(os.tmpdir())+path.sep))
  throw Error('SANDBOX_ONLY');
 assertSafeGitCheckout(directory);
 if(!SHA.test(baselineHeadSha||'')||!SHA.test(repairHeadSha||''))throw Error('INVALID_SHA');
 if(git(directory,'remote')!=='')throw Error('REMOTE_FORBIDDEN');
 if(!git(directory,'branch','--show-current').startsWith('sandbox/'))throw Error('WRONG_BRANCH');
 if(git(directory,'status','--porcelain')!=='')throw Error('DIRTY_WORKTREE');
 if(git(directory,'rev-parse','HEAD')!==repairHeadSha)throw Error('STALE_REPAIR_HEAD');
 if(git(directory,'rev-parse','HEAD^')!==baselineHeadSha)throw Error('NOT_DIRECT_REPAIR_CHILD');
 const baselineTree=git(directory,'rev-parse',baselineHeadSha+'^{tree}');
 git(directory,'-c','user.name=Ultra Sentinel Sandbox','-c','user.email=sandbox@example.invalid',
  'revert','--no-edit',repairHeadSha);
 const restored=git(directory,'rev-parse','HEAD^{tree}');
 if(restored!==baselineTree)throw Error('ROLLBACK_TREE_MISMATCH');
 return Object.freeze({status:'ROLLBACK_VERIFIED',restoredTree:restored,
  remoteWrites:false,mergeAllowed:false});
}
module.exports={rollbackSandbox};
