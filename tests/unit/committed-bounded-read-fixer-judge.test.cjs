'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {draftAndJudgeCommittedBoundedRead}=
 require('../../packages/recovery/committed-bounded-read-fixer-judge.cjs');
const FILE='apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/BoundedImageInputStream.kt';
const FIXTURE=path.join(__dirname,'../fixtures/jarvis-bounded-image/BoundedImageInputStream.kt');
const original=fs.readFileSync(FIXTURE,'utf8');
const git=(root,...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();

function fixture(source=original){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'ultra-committed-auto-fixer-'));
 git(directory,'init','-q','-b','main');
 git(directory,'config','user.name','Fixture');git(directory,'config','user.email','test@example.invalid');
 const filename=path.join(directory,FILE);
 fs.mkdirSync(path.dirname(filename),{recursive:true});
 fs.writeFileSync(filename,source);
 git(directory,'add','.');git(directory,'commit','-qm','local original source');
 const expectedCommitSha=git(directory,'rev-parse','HEAD');
 return {directory,expectedCommitSha,source,options:{
  directory,expectedCommitSha,file:{path:FILE}
 }};
}
test('Fixer generates a candidate from committed source and Judge restores the original',()=>{
 const f=fixture();
 try{
  const r=draftAndJudgeCommittedBoundedRead(f.options);
  assert.equal(r.status,'COMMITTED_BOUNDED_READ_FIXER_AND_LOCAL_JUDGE_NEEDS_JVM_ORACLE');
  assert.equal(r.sourceCommitMembershipVerified,true);
  assert.equal(r.fixerCandidateGenerationVerified,true);
  assert.equal(r.localGitRollbackVerified,true);
  assert.equal(r.originalFunctionalOracleVerified,false);
  assert.equal(r.causalityVerified,false);
  assert.equal(r.externalRepositoryAuthenticated,false);
  assert.equal(r.ownerAuthorizationGranted,false);
  assert.equal(r.remoteWrites,false);
  assert.equal(r.mergeAllowed,false);
  assert.equal(r.originalBlobSha,git(f.directory,'rev-parse','HEAD:'+FILE));
  assert.match(r.candidateBlobSha,/^[a-f0-9]{40}$/);
  assert.notEqual(r.candidateBlobSha,r.originalBlobSha);
  assert.equal(git(f.directory,'status','--porcelain'),'');
  assert.equal(git(f.directory,'remote'),'');
 }finally{fs.rmSync(f.directory,{recursive:true,force:true});}
});
test('Fixer remains general to renamed variables and refuses already-repaired Kotlin source',()=>{
 const renamed=original.replace(/\bactual\b/g,'received').replace(/\ballowed\b/g,'permitted');
 const a=fixture(renamed);
 try{
  const r=draftAndJudgeCommittedBoundedRead(a.options);
  assert.equal(r.fixerCandidateGenerationVerified,true);
  assert.equal(r.originalFunctionalOracleVerified,false);
 }finally{fs.rmSync(a.directory,{recursive:true,force:true});}
 const safe=original.replace('if (actual > allowed || actual < -1)',
  'if (actual == 0 || actual > allowed || actual < -1)');
 const b=fixture(safe);
 try{
  const r=draftAndJudgeCommittedBoundedRead(b.options);
  assert.match(r.status,/^BLOCKED_/);
  assert.equal(r.fixerCandidateGenerationVerified,false);
  assert.equal(r.remoteWrites,false);
 }finally{fs.rmSync(b.directory,{recursive:true,force:true});}
});
test('Fixer refuses wrong commit, dirty checkout, and remote without writes',()=>{
 const f=fixture();
 try{
  assert.match(draftAndJudgeCommittedBoundedRead({...f.options,
   expectedCommitSha:'1'.repeat(40)}).status,/^BLOCKED_/);
  git(f.directory,'remote','add','origin','https://invalid.example/never');
  assert.match(draftAndJudgeCommittedBoundedRead(f.options).status,/^BLOCKED_/);
  git(f.directory,'remote','remove','origin');
  fs.appendFileSync(path.join(f.directory,FILE),'// altered after pin\n');
  assert.match(draftAndJudgeCommittedBoundedRead(f.options).status,/^BLOCKED_/);
 }finally{fs.rmSync(f.directory,{recursive:true,force:true});}
});
test('Fixer refuses malicious getters and Proxies without evaluating them',()=>{
 const f=fixture();let executed=0;
 const bad=()=>{executed++;throw Error('untrusted getter');};
 try{
  for(const position of ['root','file']){
   const o={...f.options,file:{...f.options.file}};
   if(position==='root')Object.defineProperty(o,'expectedCommitSha',{get:bad,enumerable:true});
   else Object.defineProperty(o.file,'path',{get:bad,enumerable:true});
   assert.match(draftAndJudgeCommittedBoundedRead(o).status,/^BLOCKED_/);
  }
  const o={...f.options,file:new Proxy(f.options.file,{
   get(){executed++;throw Error('proxy trap');}
  })};
  assert.match(draftAndJudgeCommittedBoundedRead(o).status,/^BLOCKED_/);
  assert.equal(executed,0);
 }finally{fs.rmSync(f.directory,{recursive:true,force:true});}
});
