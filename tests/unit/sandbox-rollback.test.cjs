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
