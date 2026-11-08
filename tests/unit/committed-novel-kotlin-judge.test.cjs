'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {blobSha}=require('../../packages/investigation/novel-kotlin-hypotheses.cjs');
const {judgeCommittedNovelKotlinCandidates}=
 require('../../packages/recovery/committed-novel-kotlin-judge.cjs');

const ROOT='app/src/main/kotlin/demo/';
const ID=ROOT+'Identity.kt',CLOCK=ROOT+'Clock.kt';
const identity=[
 'package demo',
 'class Identity {',
 ' private val uidPattern = Regex("^uid=[0-9]+")',
 ' fun check(stdout: String): Boolean {',
 '  val outputIsUidOnly = stdout.length <= 256 &&',
 '   uidPattern.containsMatchIn(stdout.trim())',
 '  return outputIsUidOnly',
 ' }',
 '}',''
].join('\n');
const clock=[
 'package demo',
 'class Clock {',
 ' private var startedAtMillis: Long? = null',
 ' fun isPending(nowMillis: Long): Boolean {',
 '  val started = startedAtMillis ?: return false',
 '  if (nowMillis < started) return false',
 '  return nowMillis - started < 180000L',
 ' }',
 ' fun consume(nowMillis: Long): Boolean {',
 '  val accepted = isPending(nowMillis)',
 '  cancel()',
 '  return accepted',
 ' }',
 ' fun cancel() { startedAtMillis = null }',
 '}',''
].join('\n');
const git=(dir,...args)=>execFileSync('git',args,{cwd:dir,encoding:'utf8'}).trim();
function fixture(){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-committed-batch-'));
 git(directory,'init','-q','-b','main');
 git(directory,'config','user.name','Local Fixture');
 git(directory,'config','user.email','local@example.invalid');
 for(const [p,content] of [[ID,identity],[CLOCK,clock]]){
  const dest=path.join(directory,p);
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  fs.writeFileSync(dest,content);
 }
 git(directory,'add','.');git(directory,'commit','-qm','immutable original baseline');
 const expectedCommitSha=git(directory,'rev-parse','HEAD');
 const nextIdentity=identity.replace('uidPattern.containsMatchIn(stdout.trim())',
  'uidPattern.matches(stdout.trim())');
 const nextClock=clock.replace('if (nowMillis < started) return false',
  'if (nowMillis < started) { cancel(); return false }');
 return {directory,expectedCommitSha,options:{
  directory,expectedCommitSha,files:[{path:ID},{path:CLOCK}],
  proposals:[
   {path:ID,rule:'REGEX_PREFIX_AS_COMPLETE_VALIDATION',
    candidateSource:nextIdentity,expectedCandidateBlobSha:blobSha(nextIdentity)},
   {path:CLOCK,rule:'CLOCK_ROLLBACK_WITHOUT_INVALIDATION',
    candidateSource:nextClock,expectedCandidateBlobSha:blobSha(nextClock)}
  ]
 }};
}
test('committed original bytes flow through Hunter, Fixer and disposable local Judge',()=>{
 const f=fixture();
 try{
  const result=judgeCommittedNovelKotlinCandidates(f.options);
  assert.equal(result.status,'COMMITTED_LOCAL_KOTLIN_JUDGE_NEEDS_INDEPENDENT_JVM_ORACLE');
  assert.equal(result.sourceCommitMembershipVerified,true);
  assert.equal(result.localGitRollbackVerified,true);
  assert.equal(result.checkedFiles,2);
  assert.equal(result.originalFunctionalOracleVerified,false);
  assert.equal(result.causalityVerified,false);
  assert.equal(result.externalRepositoryAuthenticated,false);
  assert.equal(result.mergeAllowed,false);
  assert.equal(result.remoteWrites,false);
  assert.deepEqual(result.cases.map(c=>[c.path,c.originalBlobSha]),[
   [CLOCK,git(f.directory,'rev-parse','HEAD:'+CLOCK)],
   [ID,git(f.directory,'rev-parse','HEAD:'+ID)]]);
  assert.equal(git(f.directory,'status','--porcelain'),'');
  assert.equal(git(f.directory,'remote'),'');
 }finally{fs.rmSync(f.directory,{recursive:true,force:true});}
});
test('rejects remote, modified worktree, stale commit and untracked source',()=>{
 const f=fixture();
 try{
  assert.match(judgeCommittedNovelKotlinCandidates({...f.options,
   expectedCommitSha:'f'.repeat(40)}).status,/^BLOCKED_/);
  assert.match(judgeCommittedNovelKotlinCandidates({...f.options,
   files:[{path:ROOT+'Unknown.kt'}]}).status,/^BLOCKED_/);
  git(f.directory,'remote','add','origin','https://example.invalid/never-fetch');
  assert.match(judgeCommittedNovelKotlinCandidates(f.options).status,/^BLOCKED_/);
  git(f.directory,'remote','remove','origin');
  fs.appendFileSync(path.join(f.directory,ID),'// malicious dirty source\n');
  assert.match(judgeCommittedNovelKotlinCandidates(f.options).status,/^BLOCKED_/);
 }finally{fs.rmSync(f.directory,{recursive:true,force:true});}
});
test('rejects untrusted candidate and unsupported proposal without partial approval',()=>{
 const f=fixture();
 try{
  const original=f.options.proposals[0];
  for(const candidate of [
   {...original,expectedCandidateBlobSha:'0'.repeat(40)},
   {...original,rule:'FORGED_RULE'},
   {...original,candidateSource:identity,expectedCandidateBlobSha:blobSha(identity)}
  ]){
   const result=judgeCommittedNovelKotlinCandidates({...f.options,proposals:[candidate]});
   assert.match(result.status,/^BLOCKED_/);
   assert.equal(result.checkedFiles,0);
   assert.equal(result.remoteWrites,false);
   assert.equal(result.mergeAllowed,false);
  }
 }finally{fs.rmSync(f.directory,{recursive:true,force:true});}
});
test('rejects getters and Proxy input without running attacker code',()=>{
 const f=fixture();let called=0;
 const bad=()=>{called++;throw Error('getter executed');};
 try{
  for(const kind of ['root','file','proposal']){
   const options={...f.options,files:f.options.files.map(x=>({...x})),proposals:f.options.proposals.map(x=>({...x}))};
   if(kind==='root')Object.defineProperty(options,'directory',{get:bad,enumerable:true});
   if(kind==='file')Object.defineProperty(options.files[0],'path',{get:bad,enumerable:true});
   if(kind==='proposal')Object.defineProperty(options.proposals[0],'candidateSource',{get:bad,enumerable:true});
   assert.match(judgeCommittedNovelKotlinCandidates(options).status,/^BLOCKED_/);
  }
  const input={...f.options,proposals:[new Proxy(f.options.proposals[1],{
   get(){called++;throw Error('proxy trap executed');}
  })]};
  assert.match(judgeCommittedNovelKotlinCandidates(input).status,/^BLOCKED_/);
  assert.equal(called,0);
 }finally{fs.rmSync(f.directory,{recursive:true,force:true});}
});
