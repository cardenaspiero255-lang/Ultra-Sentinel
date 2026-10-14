'use strict';
/* Deliberately local-only. No GitHub token, remote, network or privileged executor. */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const SHA=/^[a-f0-9]{40}$/;
const SAFE=/^(?:app\/src\/main\/|supabase\/functions\/)[A-Za-z0-9_./-]+$/;
function git(cwd,...args){
 const p=spawnSync('git',args,{cwd,encoding:'utf8',timeout:10000,maxBuffer:1024*1024,
  env:{PATH:process.env.PATH,HOME:cwd,GIT_CONFIG_NOSYSTEM:'1',GIT_TERMINAL_PROMPT:'0',
   GIT_CONFIG_GLOBAL:'/dev/null',GIT_OPTIONAL_LOCKS:'1'}});
 if(p.error||p.status!==0)throw Error('SANDBOX_GIT_FAILURE');
 return p.stdout.trim();
}
function executeSandboxRepair({directory,plan,changes,nonceStore,nonce,expectedHeadSha}={}){
 if(!directory||!fs.realpathSync(directory).startsWith(fs.realpathSync(require('node:os').tmpdir())+path.sep))
  throw Error('SANDBOX_DIRECTORY_REQUIRED');
 if(!plan||plan.status!=='REVIEW_READY_NO_EXECUTOR'||plan.commitAllowed!==false||
  plan.mergeAllowed!==false||plan.expectedHeadSha!==expectedHeadSha||
  !SHA.test(expectedHeadSha||''))throw Error('INVALID_REPAIR_PLAN');
 if(!Array.isArray(changes)||changes.length===0||changes.length>30||
  changes.length!==plan.changes?.length)throw Error('INVALID_CHANGE_SET');
 if(!nonceStore||typeof nonceStore.consume!=='function'||typeof nonce!=='string'||
  nonce.length<16||nonce!==plan.authorizationNonce)throw Error('INVALID_NONCE');
 if(git(directory,'remote')!=='')throw Error('REMOTE_FORBIDDEN');
 const branch=git(directory,'branch','--show-current');
 if(!branch.startsWith('sandbox/'))throw Error('ISOLATED_BRANCH_REQUIRED');
 if(git(directory,'status','--porcelain')!=='')throw Error('DIRTY_WORKTREE');
 if(git(directory,'rev-parse','HEAD')!==expectedHeadSha)throw Error('STALE_HEAD');
 const original=git(directory,'rev-parse','HEAD^{tree}');
 let bytes=0;const seen=new Set();
 for(let i=0;i<changes.length;i++){
  const c=changes[i],meta=plan.changes[i];
  if(!c||typeof c.path!=='string'||!SAFE.test(c.path)||c.path.includes('..')||
   c.path.includes('\\')||seen.has(c.path)||typeof c.content!=='string'||
   !meta||meta.path!==c.path||!SHA.test(meta.beforeBlobSha||'')||
   !SHA.test(meta.afterBlobSha||'')||!Number.isSafeInteger(meta.patchBytes))
   throw Error('UNTRUSTED_PATCH');
  seen.add(c.path);
  const target=path.resolve(directory,c.path);
  if(!target.startsWith(fs.realpathSync(directory)+path.sep))throw Error('PATH_ESCAPE');
  if(fs.realpathSync(target)!==target||!fs.lstatSync(target).isFile())throw Error('SYMLINK_OR_SPECIAL_FILE');
  const current=fs.readFileSync(target);
  if(crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+current.length+'\0'),current])).digest('hex')!==meta.beforeBlobSha)
   throw Error('BLOB_CAS_MISMATCH');
  const proposed=Buffer.from(c.content);
  if(crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+proposed.length+'\0'),proposed])).digest('hex')!==meta.afterBlobSha)
   throw Error('PATCH_HASH_MISMATCH');
  bytes+=proposed.length;
  if(bytes>65536||bytes>plan.patchBytes+65536)throw Error('PATCH_BUDGET_EXCEEDED');
 }
 if(nonceStore.consume(nonce)!==true)throw Error('NONCE_REPLAY');
 try{
  for(const c of changes)fs.writeFileSync(path.resolve(directory,c.path),c.content,{flag:'w'});
  git(directory,'add','--',...changes.map(x=>x.path));
  git(directory,'-c','user.name=Ultra Sentinel Sandbox','-c','user.email=sandbox@example.invalid',
   'commit','-m','sandbox: supervised repair drill');
  const result=git(directory,'rev-parse','HEAD');
  return Object.freeze({status:'SANDBOX_COMMIT_CREATED',headSha:result,
   branch,baselineTree:original,remoteWrites:false,mergeAllowed:false});
 }catch(e){
  git(directory,'reset','--hard',expectedHeadSha);
  throw e;
 }
}
module.exports={executeSandboxRepair};
