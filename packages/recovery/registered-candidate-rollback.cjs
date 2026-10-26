'use strict';
/* Read-only source Git checkouts -> separate temporary offline Git patch -> revert.
 * No PR mutation, no push, no network and no automatic merge.
 */
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const SHA=/^[0-9a-f]{40}$/;
function deny(){throw Error('REGISTERED_ROLLBACK_DENIED');}
function git(cwd,...args){
 const run=spawnSync('git',['-c','core.hooksPath=/dev/null','-c','core.fsmonitor=false',
  '-c','commit.gpgsign=false','-c','core.autocrlf=false',...args],{
  cwd,encoding:'utf8',timeout:10000,maxBuffer:1024*1024,
  env:{PATH:process.env.PATH,HOME:cwd,
   GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_TERMINAL_PROMPT:'0'}
 });
 if(run.error||run.status!==0)deny();
 return run.stdout.trim();
}
function blob(bytes){
 return crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
}
function trustedSource(root,sha,blobSha,file,repo){
 if(typeof root!=='string'||!path.isAbsolute(root)||!SHA.test(sha||'')||
  !SHA.test(blobSha||'')||typeof file!=='string'||file.includes('..')||
  !/^app\/src\/main\/java\/com\/cardenaspiero255\/gamehubultra\/[a-zA-Z0-9_./-]+\.kt$/.test(file))deny();
 const dir=fs.realpathSync(root);
 if(git(dir,'rev-parse','HEAD')!==sha||git(dir,'status','--porcelain')!=='')deny();
 // actions/checkout can install a read-only origin. A foreign remote is NOT allowed.
 const remote=git(dir,'remote');
 if(remote!==''&&remote!=='origin')deny();
 if(remote==='origin'){
  const url=git(dir,'remote','get-url','origin');
  if(![
   'https://github.com/'+repo,'https://github.com/'+repo+'.git'
  ].includes(url))deny();
 }
 let current=dir;
 for(const part of file.split('/')){
  current=path.join(current,part);
  const st=fs.lstatSync(current);
  if(st.isSymbolicLink())deny();
 }
 const stat=fs.statSync(current);
 if(!stat.isFile()||stat.size>65536||stat.size<1)deny();
 const bytes=fs.readFileSync(current);
 if(blob(bytes)!==blobSha||git(dir,'rev-parse',sha+':'+file)!==blobSha)deny();
 return bytes;
}
function runRegisteredCandidateRollback({baseRoot,candidateRoot,plan}={}){
 try{
  if(!plan||typeof plan!=='object'||plan.targetRepo!=='cardenaspiero255-lang/gamehub-ultra'||
   plan.remoteWrites!==false||plan.mergeAllowed!==false||plan.maxChangedFiles!==1||
   !SHA.test(plan.baseSha||'')||!SHA.test(plan.candidateSha||'')||
   plan.baseSha===plan.candidateSha||plan.baseBlob===plan.candidateBlob)deny();
  const before=trustedSource(baseRoot,plan.baseSha,plan.baseBlob,plan.targetFile,plan.targetRepo);
  const after=trustedSource(candidateRoot,plan.candidateSha,plan.candidateBlob,plan.targetFile,plan.targetRepo);
  if(before.equals(after))deny();
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'registered-owner-rollback-'));
  try{
   git(dir,'init','-q','-b','sandbox/registered-owner');
   git(dir,'config','user.name','Ultra Sentinel sandbox verification');
   git(dir,'config','user.email','sandbox@example.invalid');
   const target=path.join(dir,plan.targetFile);
   fs.mkdirSync(path.dirname(target),{recursive:true,mode:0o700});
   fs.writeFileSync(target,before,{mode:0o600,flag:'wx'});
   git(dir,'add','--',plan.targetFile);git(dir,'commit','-qm','baseline: exact trusted source');
   const baselineHead=git(dir,'rev-parse','HEAD');
   const originalTree=git(dir,'rev-parse','HEAD^{tree}');
   if(git(dir,'remote')!==''||git(dir,'rev-parse','HEAD:'+plan.targetFile)!==plan.baseBlob)deny();
   fs.writeFileSync(target,after,{flag:'w'});
   git(dir,'add','--',plan.targetFile);
   git(dir,'commit','-qm','sandbox: supervised repair drill');
   const patchedHead=git(dir,'rev-parse','HEAD');
   if(git(dir,'rev-parse','HEAD^')!==baselineHead||
    git(dir,'rev-parse','HEAD:'+plan.targetFile)!==plan.candidateBlob||
    git(dir,'status','--porcelain')!==''||git(dir,'remote')!=='')deny();
   git(dir,'revert','--no-edit',patchedHead);
   const restoredTree=git(dir,'rev-parse','HEAD^{tree}');
   if(restoredTree!==originalTree||git(dir,'rev-parse','HEAD:'+plan.targetFile)!==plan.baseBlob||
    git(dir,'remote')!==''||git(dir,'status','--porcelain')!==''||
    !fs.readFileSync(target).equals(before))deny();
   return Object.freeze({
    schema:'ultra-sentinel-registered-candidate-rollback/v1',
    status:'REGISTERED_GIT_CANDIDATE_ROLLBACK_VERIFIED',
    planId:plan.id,originalCommit:plan.baseSha,candidateCommit:plan.candidateSha,
    originalBlob:plan.baseBlob,proposedBlob:plan.candidateBlob,
    originalTree,restoredTree,localBaselineCommit:baselineHead,
    localPatchedCommit:patchedHead,remoteWrites:false,mergeAllowed:false,
    productionCertified:false
   });
  }finally{fs.rmSync(dir,{force:true,recursive:true});}
 }catch{deny();}
}
module.exports={runRegisteredCandidateRollback};
