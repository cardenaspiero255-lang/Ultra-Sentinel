'use strict';
/*
 * Authenticate source bytes against an existing, isolated LOCAL Git tree.
 * This is NOT a remote GitHub identity attestation and not a causal oracle.
 */
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const {types}=require('node:util');
const {assertSafeGitCheckout}=require('../recovery/git-sandbox-policy.cjs');
const {isSafeNovelKotlinPath}=require('../investigation/novel-kotlin-path-policy.cjs');
const {planSourceImports}=require('./source-import-graph.cjs');
const SHA=/^[a-f0-9]{40}$/;
function reject(){throw Error('PINNED_KOTLIN_SOURCE_REJECTED');}
function copyArray(raw,max){
 if(!Array.isArray(raw)||types.isProxy(raw)||
  Object.getPrototypeOf(raw)!==Array.prototype||
  raw.length===0||raw.length>max||Reflect.ownKeys(raw).length!==raw.length+1)reject();
 const out=[];
 for(let i=0;i<raw.length;i++){
  const d=Object.getOwnPropertyDescriptor(raw,String(i));
  if(!d||!Object.hasOwn(d,'value'))reject();
  out.push(d.value);
 }
 return out;
}
function git(root,...args){
 const p=spawnSync('git',['-c','core.hooksPath=/dev/null','-c','core.fsmonitor=false',
  '-c','commit.gpgsign=false','-c','core.autocrlf=false',...args],{
  cwd:root,encoding:null,timeout:10000,maxBuffer:350000,
  env:{PATH:process.env.PATH,HOME:root,GIT_CONFIG_NOSYSTEM:'1',
   GIT_CONFIG_GLOBAL:'/dev/null',GIT_OPTIONAL_LOCKS:'0',
   GIT_TERMINAL_PROMPT:'0',GIT_CONFIG_COUNT:'0',GIT_NO_REPLACE_OBJECTS:'1'}
 });
 if(p.error||p.status!==0||!Buffer.isBuffer(p.stdout))reject();
 return p.stdout;
}
function plain(root,...args){return git(root,...args).toString('utf8').trim();}
function planCommittedKotlinSourceImports(options={}){
 try{
  if(!options||typeof options!=='object'||types.isProxy(options)||
   Array.isArray(options))reject();
  const snapshot={};
  for(const key of ['directory','expectedCommitSha','paths','seeds','maxFiles','maxDepth']){
   const d=Object.getOwnPropertyDescriptor(options,key);
   if(d&&!Object.hasOwn(d,'value'))reject();
   snapshot[key]=d?.value;
  }
  options=snapshot;
  if(typeof options.directory!=='string'||!path.isAbsolute(options.directory)||
   typeof options.expectedCommitSha!=='string'||!SHA.test(options.expectedCommitSha))reject();
  const paths=copyArray(options.paths,64),seeds=copyArray(options.seeds,64);
  if(!paths.every(isSafeNovelKotlinPath)||new Set(paths).size!==paths.length||
   !seeds.every(isSafeNovelKotlinPath)||new Set(seeds).size!==seeds.length||
   seeds.some(p=>!paths.includes(p)))reject();
  const root=fs.realpathSync(options.directory),tmp=fs.realpathSync(os.tmpdir());
  if(!root.startsWith(tmp+path.sep))reject();
  assertSafeGitCheckout(root);
  const baseline=options.expectedCommitSha;
  if(plain(root,'remote')!==''||plain(root,'rev-parse','HEAD')!==baseline||
   plain(root,'status','--porcelain')!=='')reject();
  const sources=[];let total=0;
  for(const p of paths){
   const entry=git(root,'ls-tree','-z',baseline,'--',p).toString('utf8');
   const match=/^(100644) blob ([a-f0-9]{40})\t([^\0]+)\0$/.exec(entry);
   if(!match||match[3]!==p)reject();
   const content=git(root,'cat-file','blob',match[2]);
   total+=content.length;
   if(content.length===0||content.length>262144||total>4194304)reject();
   sources.push({path:p,blobSha:match[2],content});
  }
  if(plain(root,'remote')!==''||plain(root,'rev-parse','HEAD')!==baseline||
   plain(root,'status','--porcelain')!=='')reject();
  const report=planSourceImports({headSha:baseline,sources,seeds,
   maxFiles:options.maxFiles,maxDepth:options.maxDepth});
  return Object.freeze({...report,localCommitVerified:true,
   repositoryMembershipVerified:true,externalRepositoryAuthenticated:false,
   ownerAuthorizationGranted:false,remoteWrites:false,mergeAllowed:false,
   limitation:'The source belongs to an immutable local Git tree at the declared HEAD. No proof that the repository is the authenticated remote owner, nor evidence of Kotlin functional correctness or causality.'});
 }catch{reject();}
}
module.exports=Object.freeze({planCommittedKotlinSourceImports});
