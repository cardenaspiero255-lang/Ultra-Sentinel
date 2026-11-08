'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {planCommittedKotlinSourceImports}=
 require('../../packages/family-hunter/committed-kotlin-import-graph.cjs');
const git=(root,...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
function fixture(count=8){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-pinned-imports-'));
 git(directory,'init','-q','-b','main');
 git(directory,'config','user.name','Local Fixture');
 git(directory,'config','user.email','local@example.invalid');
 const paths=Array.from({length:count},(_,i)=>'app/src/main/kotlin/demo/Source'+i+'.kt');
 for(let i=0;i<count;i++){
  const dest=path.join(directory,paths[i]);
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  const lines=['package demo'];
  if(i+1<count)lines.push('import demo.Source'+(i+1));
  lines.push('class Source'+i,'');
  fs.writeFileSync(dest,lines.join('\n'));
 }
 git(directory,'add','.');git(directory,'commit','-qm','pinned Kotlin sources');
 const expectedCommitSha=git(directory,'rev-parse','HEAD');
 return {directory,expectedCommitSha,paths};
}
function run(f,opts={}){
 return planCommittedKotlinSourceImports({directory:f.directory,
  expectedCommitSha:f.expectedCommitSha,paths:f.paths,seeds:[f.paths[0]],
  maxFiles:64,maxDepth:4,...opts});
}
test('reads eight exact Kotlin blob identities from immutable local HEAD for bounded source relationships',()=>{
 const f=fixture(8);
 try{
  const x=run(f);
  assert.equal(x.repositoryMembershipVerified,true);
  assert.equal(x.localCommitVerified,true);
  assert.equal(x.externalRepositoryAuthenticated,false);
  assert.equal(x.causalityVerified,false);
  assert.equal(x.remoteWrites,false);assert.equal(x.mergeAllowed,false);
  assert.equal(x.status,'INCOMPLETE_PLANNER');
  assert.deepEqual(x.plan.files.map(y=>y.path),f.paths.slice(0,5));
  // Bound is explicit: 8 linear files need depth 7; above only depth 4.
 }finally{fs.rmSync(f.directory,{recursive:true,force:true});}
});
test('full depth 4 discloses unvisited relationships rather than inventing causal proof',()=>{
 const f=fixture(8);try{
  const x=run(f);
  assert.equal(x.plan.status,'INCOMPLETE_DEPTH');
  assert.equal(x.status,'INCOMPLETE_PLANNER');
  assert.equal(x.plan.files.length,5);
 }finally{fs.rmSync(f.directory,{recursive:true,force:true});}
});
test('fails closed on stale HEAD, dirty checkout, unknown source and configured remote',()=>{
 const f=fixture();try{
  assert.throws(()=>run(f,{expectedCommitSha:'a'.repeat(40)}),/PINNED_KOTLIN_SOURCE_REJECTED/);
  assert.throws(()=>run(f,{paths:[...f.paths,'app/src/main/kotlin/demo/Missing.kt']}),/PINNED_KOTLIN_SOURCE_REJECTED/);
  git(f.directory,'remote','add','origin','https://example.invalid/not-allowed');
  assert.throws(()=>run(f),/PINNED_KOTLIN_SOURCE_REJECTED/);
  git(f.directory,'remote','remove','origin');
  fs.appendFileSync(path.join(f.directory,f.paths[0]),'//modified\n');
  assert.throws(()=>run(f),/PINNED_KOTLIN_SOURCE_REJECTED/);
 }finally{fs.rmSync(f.directory,{recursive:true,force:true});}
});
test('rejects path traversal and directory shadowing without performing network operations',()=>{
 const f=fixture();try{
  for(const bad of ['../escape.kt','/etc/passwd','app/src/main/kotlin/demo/../A.kt'])
   assert.throws(()=>run(f,{paths:[bad]}),/PINNED_KOTLIN_SOURCE_REJECTED/);
  assert.equal(git(f.directory,'remote'),'');
 }finally{fs.rmSync(f.directory,{recursive:true,force:true});}
});
