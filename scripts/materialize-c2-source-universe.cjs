#!/usr/bin/env node
'use strict';
// Byte-for-byte frozen C2 input bundle; never loads reviewer engines or ground truth.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {verifyEightSourceCompares,BASELINE_LOCK}=require('../packages/quality-gates/c2-source-universe.cjs');
const {NEW_LOCK}=require('../packages/quality-gates/c2-next-holdout.cjs');
const MAX_SOURCE=8*1024*1024;
function fail(){throw Error('C2_SOURCE_MATERIALIZATION_BLOCKED');}
function hash(x){return crypto.createHash('sha256').update(x).digest('hex');}
function safeInput(p,max){
 if(!path.isAbsolute(p))fail();
 let s;try{s=fs.lstatSync(p);}catch{fail();}
 if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||s.size<100||s.size>max)fail();
 return fs.readFileSync(p);
}
function git(dir,args,maxBuffer=MAX_SOURCE*2){
 try{return execFileSync('git',args,{cwd:dir,encoding:'buffer',maxBuffer,timeout:60000,stdio:['ignore','pipe','pipe']});}
 catch{fail();}
}
function gitText(dir,args){return git(dir,args).toString('utf8').trim();}
function gitBlob(dir,commit,filename){
 const obj=gitText(dir,['rev-parse','--verify',commit+':'+filename]);
 if(!/^[0-9a-f]{40}$/.test(obj))fail();
 const bytes=git(dir,['cat-file','blob',obj]);
 if(bytes.length>MAX_SOURCE||bytes.subarray(0,45).toString('utf8').startsWith('version https://git-lfs.github.com/spec/v1'))fail();
 const actual=crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
 if(actual!==obj)fail();
 return {sha:obj,bytes,sha256:hash(bytes)};
}
function write(dest,relative,bytes){
 const root=path.resolve(dest),target=path.resolve(dest,relative);
 if(!target.startsWith(root+path.sep)||relative.split('/').includes('..'))fail();
 fs.mkdirSync(path.dirname(target),{recursive:true});
 fs.writeFileSync(target,bytes,{flag:'wx',mode:0o600});
}
function run(argv){
 if(!Array.isArray(argv)||argv.length!==3||argv.some(x=>!path.isAbsolute(x)))fail();
 const [compareDir,repoDir,dest]=argv;
 let stat;
 try{stat=fs.statSync(repoDir);}catch{fail();}
 if(!stat.isDirectory())fail();
 if(fs.existsSync(dest))fail();
 // Every JSON is sourced by an owner-only GitHub API job using immutable base...HEAD.
 const comparisons=NEW_LOCK.cases.map(c=>JSON.parse(safeInput(
  path.join(compareDir,'pr-'+c.pr+'.json'),20*1024*1024).toString('utf8')));
 const inventory=verifyEightSourceCompares(comparisons);
 if(inventory.changedFileEntries!==241)fail();
 const samples=[];
 fs.mkdirSync(dest,{recursive:false,mode:0o700});
 for(let i=0;i<NEW_LOCK.cases.length;i++){
  const lock=NEW_LOCK.cases[i],meta=inventory.cases[i];
  for(const sha of [lock.baseSha,lock.headSha]){
   if(gitText(repoDir,['rev-parse','--verify',sha+'^{commit}'])!==sha)fail();
  }
  if(gitText(repoDir,['merge-base',lock.baseSha,lock.headSha])!==lock.baseSha)fail();
  const changed=git(repoDir,['diff','--name-only','-z','--no-renames',
   lock.baseSha,lock.headSha]).toString('utf8').split('\0').filter(Boolean).sort();
  const declared=meta.files.map(x=>x.path).sort();
  if(JSON.stringify(changed)!==JSON.stringify(declared))fail();
  const files=[];
  for(let j=0;j<meta.files.length;j++){
   const f=meta.files[j];
   const prefix='pr-'+lock.pr+'/';
   const head=f.status==='removed'?null:gitBlob(repoDir,lock.headSha,f.path);
   const base=f.status==='added'?null:gitBlob(repoDir,lock.baseSha,f.path);
   if((head??base)?.sha!==f.headBlobSha||f.status==='removed')fail(); // frozen cohort has no deletions
   if(head)write(dest,prefix+'head/'+f.path,head.bytes);
   if(base)write(dest,prefix+'base/'+f.path,base.bytes);
   const patch=git(repoDir,['diff','--binary','--full-index','--no-textconv','--no-ext-diff',
    '--no-renames',lock.baseSha,lock.headSha,'--',f.path]);
   if(!patch.length||patch.length>MAX_SOURCE)fail();
   const name='patches/'+String(j).padStart(3,'0')+'.patch';
   write(dest,prefix+name,patch);
   files.push({path:f.path,status:f.status,
    headBlobSha:f.headBlobSha,headSha256:head?.sha256||null,
    baseBlobSha:base?.sha||null,baseSha256:base?.sha256||null,
    patchSha256:hash(patch),patchBytes:patch.length,
    githubPatchSha256:f.patchSha256,githubPatchBytes:f.githubPatchBytes});
  }
  samples.push({pr:lock.pr,baseSha:lock.baseSha,headSha:lock.headSha,
   changedFiles:lock.changedFiles,materializedFiles:files.length,files});
 }
 const body={schema:'ultra-sentinel-c2-frozen-source-universe/v1',
  repository:NEW_LOCK.repository,packetDigest:inventory.packetDigest,
  sourceInventorySha256:inventory.sourceInventorySha256,
  baselineSourceSha:BASELINE_LOCK.sha,candidateSourceSha:NEW_LOCK.engineSourceSha,
  samples,materializedChangedEntries:samples.reduce((a,x)=>a+x.materializedFiles,0),
  completeForBothInputs:true,detectorsExecuted:false,truthRead:false,
  scoredLabels:0,precision:null,recall:null,f1:null,tripleSPlusCertified:false};
 if(body.materializedChangedEntries!==241)fail();
 const seal={...body,sourceUniverseSha256:hash(JSON.stringify(body))};
 write(dest,'manifest.json',Buffer.from(JSON.stringify(seal)+'\n'));
 return seal;
}
if(require.main===module){
 try{const m=run(process.argv.slice(2));
  process.stdout.write(JSON.stringify({schema:m.schema,changedFiles:m.materializedChangedEntries,
   sourceUniverseSha256:m.sourceUniverseSha256,
   baselineSourceSha:m.baselineSourceSha,candidateSourceSha:m.candidateSourceSha,
   completeForBothInputs:m.completeForBothInputs,detectorsExecuted:false,
   scoredLabels:0,tripleSPlusCertified:false})+'\n');}
 catch{process.stderr.write('C2_SOURCE_MATERIALIZATION_BLOCKED\n');process.exitCode=2;}
}
module.exports={run};
