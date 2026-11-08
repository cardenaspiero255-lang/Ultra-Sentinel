'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {rollbackSandbox}=require('../../packages/recovery/sandbox-rollback.cjs');
function git(cwd,...args){return execFileSync('git',args,{cwd,encoding:'utf8'}).trim();}
test('rollback restores exact baseline tree without touching a remote',()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'ultra-rollback-'));
 try{
  git(directory,'init','-q','-b','main');
  git(directory,'config','user.name','Fixture');git(directory,'config','user.email','fixture@example.invalid');
  fs.writeFileSync(path.join(directory,'file.txt'),'before\n');
  git(directory,'add','.');git(directory,'commit','-qm','baseline');
  git(directory,'switch','-q','-c','sandbox/recovery');
  const baselineHeadSha=git(directory,'rev-parse','HEAD');
  fs.writeFileSync(path.join(directory,'file.txt'),'after\n');
  git(directory,'add','.');git(directory,'commit','-qm','repair');
  const repairHeadSha=git(directory,'rev-parse','HEAD');
  assert.throws(()=>rollbackSandbox({directory,baselineHeadSha,repairHeadSha:'b'.repeat(40)}),/STALE_REPAIR_HEAD/);
  const result=rollbackSandbox({directory,baselineHeadSha,repairHeadSha});
  assert.equal(result.status,'ROLLBACK_VERIFIED');
  assert.equal(result.remoteWrites,false);
  assert.equal(fs.readFileSync(path.join(directory,'file.txt'),'utf8'),'before\n');
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
});
test('rollback ignores a replacement baseline commit and restores the original Git tree',()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'ultra-rollback-replace-'));
 const gitInput=(input,...args)=>execFileSync('git',args,{cwd:directory,encoding:'utf8',input}).trim();
 try{
  git(directory,'init','-q','-b','sandbox/recovery');
  git(directory,'config','user.name','Fixture');git(directory,'config','user.email','fixture@example.invalid');
  fs.writeFileSync(path.join(directory,'file.txt'),'before\n');
  git(directory,'add','.');git(directory,'commit','-qm','baseline');
  const baselineHeadSha=git(directory,'rev-parse','HEAD');
  const baselineTree=git(directory,'--no-replace-objects','rev-parse','HEAD^{tree}');
  fs.writeFileSync(path.join(directory,'file.txt'),'after\n');
  git(directory,'add','.');git(directory,'commit','-qm','repair');
  const repairHeadSha=git(directory,'rev-parse','HEAD');
  const substitutedBlob=gitInput('replacement baseline\n','hash-object','-w','--stdin');
  const substitutedTree=gitInput(`100644 blob ${substitutedBlob}\tfile.txt\n`,'mktree');
  const substitutedCommit=gitInput('replacement baseline\n','commit-tree',substitutedTree);
  git(directory,'replace',baselineHeadSha,substitutedCommit);
  assert.equal(git(directory,'rev-parse',`${baselineHeadSha}^{tree}`),substitutedTree);
  const result=rollbackSandbox({directory,baselineHeadSha,repairHeadSha});
  assert.equal(result.status,'ROLLBACK_VERIFIED');
  assert.equal(result.restoredTree,baselineTree);
  assert.equal(git(directory,'--no-replace-objects','rev-parse','HEAD^{tree}'),baselineTree);
  assert.equal(fs.readFileSync(path.join(directory,'file.txt'),'utf8'),'before\n');
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
});
