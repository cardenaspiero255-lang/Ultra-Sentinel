'use strict';
/* Local-only orchestrator. The owner identity is fetched with a bearer token,
   but no token is ever handed to the sandbox git process. */
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {spawnSync}=require('node:child_process');
const {authenticateGitHubOwner}=require('./github-owner-identity.cjs');
const {stableAuthorization,verifyOwnerAuthorization,PersistentNonceStore}=require('./owner-authorization.cjs');
const {executeSandboxRepair}=require('./sandbox-executor.cjs');
const {rollbackSandbox}=require('./sandbox-rollback.cjs');
function digestPlan(plan,changes){
 return crypto.createHash('sha256').update(JSON.stringify({plan,changes})).digest('hex');
}
async function runOwnerAuthorizedSandboxRepair({token,expectedOwner,expectedOwnerId,
 authorization,authorizationSignature,trustedPublicKey,nonceStorePath,directory,plan,changes,expectedHeadSha,fetchImpl,
 verifyRepair,now=Date.now()}={}){
 if(typeof verifyRepair!=='function')throw Error('REPAIR_VERIFIER_REQUIRED');
 if(!authorization||!plan||!Array.isArray(changes)||
  authorization.repo!=='cardenaspiero255-lang/Ultra-Sentinel'||
  authorization.branch!==plan.branch||
  authorization.headSha!==expectedHeadSha||
  authorization.nonce!==plan.authorizationNonce||
  authorization.planDigest!==digestPlan(plan,changes))
  throw Error('AUTHORIZATION_SCOPE_MISMATCH');
 const actor=await authenticateGitHubOwner({token,expectedOwner,expectedOwnerId,fetchImpl});
 const check=verifyOwnerAuthorization({authorization,verifiedActor:actor,expectedOwner,expectedOwnerId,signature:authorizationSignature,
  trustedPublicKey,now});
 if(!check.authorized||check.canonical!==stableAuthorization(authorization))
  throw Error('OWNER_AUTHORIZATION_DENIED');
 const nonceStore=new PersistentNonceStore(nonceStorePath);
 // Journal lifetime spans all writes, asynchronous verification, and rollback.
 // It is stored outside Git, with a create-exclusive lock shared by processes.
 const journal=beginTransaction({directory,nonceStorePath,plan,expectedHeadSha,
  planDigest:authorization.planDigest});
 let repair;
 try{
  repair=executeSandboxRepair({directory,plan,changes,nonceStore,
   nonce:authorization.nonce,expectedHeadSha});
  if(await verifyRepair(repair)!==true)throw Error('REPAIR_VERIFICATION_FAILED');
  finishTransaction(journal);
  return Object.freeze({status:'SANDBOX_REPAIR_VERIFIED',repair,
   remoteWrites:false,mergeAllowed:false});
 }catch(error){
  try{
   if(repair){
    const rollback=rollbackSandbox({directory,baselineHeadSha:expectedHeadSha,
     repairHeadSha:repair.headSha});
    finishTransaction(journal);
    return Object.freeze({status:'SANDBOX_REPAIR_ROLLED_BACK',reason:error.message,
     rollback,remoteWrites:false,mergeAllowed:false});
   }
   // Executor failed before returning. Only clear the journal if baseline
   // is proven intact; otherwise require explicit crash recovery.
   if(sandboxGit(directory,'rev-parse','HEAD')===expectedHeadSha &&
      sandboxGit(directory,'status','--porcelain')==='' &&
      sandboxGit(directory,'rev-parse','HEAD^{tree}')===journal.baselineTree){
    finishTransaction(journal);
    throw error;
   }
  }catch(recoveryError){
   if(recoveryError===error)throw error;
   throw Error('RECOVERY_REQUIRED: '+recoveryError.message,{cause:error});
  }
  throw Error('RECOVERY_REQUIRED',{cause:error});
 }
}
function sandboxGit(directory,...args){
 const result=spawnSync('git',args,{cwd:directory,encoding:'utf8',timeout:10000,
  env:{PATH:process.env.PATH,HOME:directory,GIT_CONFIG_NOSYSTEM:'1',
   GIT_CONFIG_GLOBAL:'/dev/null',GIT_TERMINAL_PROMPT:'0'}});
 if(result.error||result.status!==0)throw Error('SANDBOX_GIT_FAILURE');
 return result.stdout.trim();
}
function validateSandbox(directory,nonceStorePath){
 const root=fs.realpathSync(directory),tmp=fs.realpathSync(os.tmpdir());
 if(!root.startsWith(tmp+path.sep))throw Error('SANDBOX_ONLY');
 if(fs.realpathSync(path.dirname(nonceStorePath)).startsWith(root+path.sep))
  throw Error('NONCE_STORE_INSIDE_WORKTREE');
 if(sandboxGit(root,'remote')!=='')throw Error('REMOTE_FORBIDDEN');
 const branch=sandboxGit(root,'branch','--show-current');
 if(!branch.startsWith('sandbox/'))throw Error('WRONG_BRANCH');
 return {root,branch};
}
function syncParent(file){
 const fd=fs.openSync(path.dirname(file),'r');
 try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
}
function beginTransaction({directory,nonceStorePath,plan,expectedHeadSha,planDigest}){
 const {root,branch}=validateSandbox(directory,nonceStorePath);
 if(branch!==plan.branch||sandboxGit(root,'rev-parse','HEAD')!==expectedHeadSha||
  sandboxGit(root,'status','--porcelain')!=='')throw Error('STALE_OR_DIRTY_SANDBOX');
 const baselineTree=sandboxGit(root,'rev-parse','HEAD^{tree}');
 const file=nonceStorePath+'.txn';
 const data={version:1,pid:process.pid,directory:root,branch,baselineHeadSha:expectedHeadSha,
  baselineTree,planDigest};
 let fd;
 try{fd=fs.openSync(file,'wx',0o600);}
 catch(e){if(e.code==='EEXIST')throw Error('PENDING_RECOVERY_REQUIRED');throw e;}
 try{
  fs.writeSync(fd,JSON.stringify(data)+'\n');
  fs.fsyncSync(fd);
 }finally{fs.closeSync(fd);}
 syncParent(file);
 return Object.freeze({...data,file});
}
function finishTransaction(journal){
 const stat=fs.lstatSync(journal.file);
 if(!stat.isFile()||stat.isSymbolicLink()||(stat.mode&0o077)!==0)
  throw Error('JOURNAL_UNSAFE');
 fs.unlinkSync(journal.file);
 syncParent(journal.file);
}
// Explicit recovery operation: never automatically delete a stale lock or
// reset an unfamiliar commit. No remote can be configured in the sandbox.
function recoverInterruptedSandboxRepair({directory,nonceStorePath}={}){
 const {root,branch}=validateSandbox(directory,nonceStorePath);
 const file=nonceStorePath+'.txn',stat=fs.lstatSync(file);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||(stat.mode&0o077)!==0)
  throw Error('JOURNAL_UNSAFE');
 const journal=JSON.parse(fs.readFileSync(file,'utf8'));
 const sha=/^[0-9a-f]{40}$/,digest=/^[0-9a-f]{64}$/;
 if(journal.version!==1||!Number.isSafeInteger(journal.pid)||journal.pid<=0||
  journal.directory!==root||journal.branch!==branch||
  !sha.test(journal.baselineHeadSha||'')||!sha.test(journal.baselineTree||'')||
  !digest.test(journal.planDigest||''))throw Error('JOURNAL_MISMATCH');
 // Never recover another live process. A reused PID fails closed.
 try{
  process.kill(journal.pid,0);
  throw Error('TRANSACTION_OWNER_STILL_ACTIVE');
 }catch(e){
  if(e.message==='TRANSACTION_OWNER_STILL_ACTIVE'||e.code!=='ESRCH')throw e;
 }

 const head=sandboxGit(root,'rev-parse','HEAD');
 const dirty=sandboxGit(root,'status','--porcelain');
 let disposition;
 if(head===journal.baselineHeadSha){
  if(dirty!=='')sandboxGit(root,'reset','--hard',journal.baselineHeadSha);
  disposition='BASELINE_RESTORED';
 }else if(dirty==='' && sandboxGit(root,'rev-parse','HEAD^{tree}')===journal.baselineTree){
  disposition='ALREADY_RESTORED';
 }else if(dirty==='' &&
  sandboxGit(root,'rev-parse','HEAD^')===journal.baselineHeadSha &&
  sandboxGit(root,'show','-s','--format=%s','HEAD')==='sandbox: supervised repair drill'){
  rollbackSandbox({directory:root,baselineHeadSha:journal.baselineHeadSha,repairHeadSha:head});
  disposition='REVERTED_INTERRUPTED_REPAIR';
 }else throw Error('RECOVERY_CONFLICT_MANUAL_INTERVENTION');
 if(sandboxGit(root,'status','--porcelain')!==''||
  sandboxGit(root,'rev-parse','HEAD^{tree}')!==journal.baselineTree)
  throw Error('RECOVERY_TREE_MISMATCH');
 // A crash during nonce consumption may leave a durable lock. Only the
 // lock owned by this verified, dead transaction can be released.
 const nonceLock=nonceStorePath+'.lock';
 if(fs.existsSync(nonceLock)){
  const lockStat=fs.lstatSync(nonceLock);
  if(!lockStat.isFile()||lockStat.isSymbolicLink()||lockStat.nlink!==1||
   (lockStat.mode&0o077)!==0||lockStat.size>512)throw Error('NONCE_LOCK_UNSAFE');
  let lockOwner;
  try{lockOwner=JSON.parse(fs.readFileSync(nonceLock,'utf8'));}
  catch{throw Error('NONCE_LOCK_UNVERIFIED');}
  if(lockOwner.version!==1||lockOwner.pid!==journal.pid)
   throw Error('NONCE_LOCK_OWNER_MISMATCH');
  fs.unlinkSync(nonceLock);
  syncParent(nonceLock);
 }
 finishTransaction({...journal,file});
 return Object.freeze({status:'RECOVERY_VERIFIED',disposition,remoteWrites:false,mergeAllowed:false});
}
module.exports={runOwnerAuthorizedSandboxRepair,digestPlan,recoverInterruptedSandboxRepair};
