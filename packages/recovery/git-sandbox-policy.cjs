'use strict';
// Reject local Git configuration that could execute processes, redirect a
// worktree, or load filter drivers. Never trust a checkout based on path alone.
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
function checkedGit(root,...args){
 const result=spawnSync('git',['-c','core.hooksPath=/dev/null','-c','core.fsmonitor=false',
  '-c','commit.gpgsign=false','-c','core.autocrlf=false',...args],{
   cwd:root,encoding:'utf8',timeout:10000,
   env:{PATH:process.env.PATH,HOME:root,GIT_CONFIG_NOSYSTEM:'1',
    GIT_CONFIG_GLOBAL:'/dev/null',GIT_TERMINAL_PROMPT:'0'}
 });
 if(result.error||result.status!==0)throw Error('GIT_CHECKOUT_POLICY_UNVERIFIED');
 return result.stdout.trim();
}
function assertSafeGitCheckout(directory){
 const root=fs.realpathSync(directory);
 const gitDir=path.join(root,'.git');
 const stat=fs.lstatSync(gitDir);
 if(!stat.isDirectory()||stat.isSymbolicLink()||fs.realpathSync(gitDir)!==gitDir)
  throw Error('UNSAFE_GIT_DIRECTORY');
 if(fs.realpathSync(checkedGit(root,'rev-parse','--show-toplevel'))!==root)
  throw Error('GIT_WORKTREE_MISMATCH');
 const keys=checkedGit(root,'config','--local','--name-only','--list').split('\n');
 if(keys.some(x=>/^(filter\.|include\.|includeif\.|credential\.|core\.worktree$|core\.fsmonitor$|core\.hookspath$|core\.sshcommand$|commit\.gpgsign$)/i.test(x)))
  throw Error('UNSAFE_LOCAL_GIT_CONFIGURATION');
 return root;
}
module.exports={assertSafeGitCheckout};
