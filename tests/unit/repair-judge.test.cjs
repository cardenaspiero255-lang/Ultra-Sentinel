'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {judgeLocalRepair}=require('../../packages/recovery/repair-judge.cjs');
function git(dir,...args){return execFileSync('git',args,{cwd:dir,encoding:'utf8'}).trim();}
function fixture(){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-judge-'));
 git(directory,'init','-q','-b','main');
 git(directory,'config','user.name','Fixture');
 git(directory,'config','user.email','fixture@example.invalid');
 const filename='app/src/main/Engine.kt';
 fs.mkdirSync(path.dirname(path.join(directory,filename)),{recursive:true});
 fs.writeFileSync(path.join(directory,filename),'original\n');
 git(directory,'add','.');git(directory,'commit','-qm','baseline');
 const baselineHeadSha=git(directory,'rev-parse','HEAD');
 const beforeBlobSha=git(directory,'rev-parse',baselineHeadSha+':'+filename);
 git(directory,'switch','-q','-c','sandbox/judge');
 fs.writeFileSync(path.join(directory,filename),'repaired\n');
 git(directory,'add','.');git(directory,'commit','-qm','sandbox: supervised repair drill');
 const repairHeadSha=git(directory,'rev-parse','HEAD');
 const afterBlobSha=git(directory,'rev-parse',repairHeadSha+':'+filename);
 const plan={branch:'sandbox/judge',expectedHeadSha:baselineHeadSha,
  changes:[{path:filename,beforeBlobSha,afterBlobSha,patchBytes:30}]};
 return {directory,baselineHeadSha,repairHeadSha,plan,filename};
}
test('separate local Judge accepts only one SHA-bound approved repair commit',()=>{
 const f=fixture();
 try{
  const r=judgeLocalRepair(f);
  assert.equal(r.approved,true);
  assert.equal(r.status,'APPROVED_LOCAL_POLICY_ONLY');
  assert.equal(r.mergeAllowed,false);
 }finally{fs.rmSync(f.directory,{recursive:true,force:true});}
});
test('Judge vetoes forged post-image, wrong parent, remote or dirty tree',()=>{
 const f=fixture();
 try{
  assert.equal(judgeLocalRepair({...f,plan:{...f.plan,changes:[{...f.plan.changes[0],afterBlobSha:'a'.repeat(40)}]}}).approved,false);
  assert.equal(judgeLocalRepair({...f,baselineHeadSha:'c'.repeat(40)}).approved,false);
  git(f.directory,'remote','add','origin','https://example.invalid/unsafe.git');
  assert.equal(judgeLocalRepair(f).approved,false);
  git(f.directory,'remote','remove','origin');
  fs.writeFileSync(path.join(f.directory,f.filename),'dirty\n');
  assert.equal(judgeLocalRepair(f).approved,false);
 }finally{fs.rmSync(f.directory,{recursive:true,force:true});}
});
test('Judge vetoes unapproved second file and duplicate file identities',()=>{
 const f=fixture();
 try{
  assert.equal(judgeLocalRepair({...f,plan:{...f.plan,changes:[f.plan.changes[0],f.plan.changes[0]]}}).approved,false);
  fs.writeFileSync(path.join(f.directory,'app/src/main/Unexpected.kt'),'surprise\n');
  git(f.directory,'add','.');git(f.directory,'commit','-qm','unauthorized second commit');
  assert.equal(judgeLocalRepair({...f,repairHeadSha:git(f.directory,'rev-parse','HEAD')}).approved,false);
 }finally{fs.rmSync(f.directory,{recursive:true,force:true});}
});
