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
test('Judge vetoes a repair that replaces an approved file with a symlink',()=>{
 const f=fixture();
 try{
  fs.unlinkSync(path.join(f.directory,f.filename));
  fs.symlinkSync('target',path.join(f.directory,f.filename));
  git(f.directory,'add',f.filename);git(f.directory,'commit','--amend','-qm','symlink repair');
  f.repairHeadSha=git(f.directory,'rev-parse','HEAD');
  f.plan.changes[0].afterBlobSha=git(f.directory,'rev-parse',f.repairHeadSha+':'+f.filename);
  assert.equal(judgeLocalRepair(f).approved,false);
 }finally{fs.rmSync(f.directory,{recursive:true,force:true});}
});
test('Judge vetoes a repair that changes a regular file mode',()=>{
 const f=fixture();
 try{
  git(f.directory,'update-index','--chmod=+x',f.filename);
  git(f.directory,'commit','--amend','-qm','executable repair');
  f.repairHeadSha=git(f.directory,'rev-parse','HEAD');
  assert.equal(judgeLocalRepair(f).approved,false);
 }finally{fs.rmSync(f.directory,{recursive:true,force:true});}
});
test('Judge vetoes a merge commit even when its first parent is the baseline',()=>{
 const f=fixture();
 try{
  const tree=git(f.directory,'rev-parse',f.repairHeadSha+'^{tree}');
  const merge=git(f.directory,'commit-tree',tree,'-p',f.baselineHeadSha,'-p',f.repairHeadSha,'-m','merge');
  git(f.directory,'reset','--hard',merge);f.repairHeadSha=merge;
  assert.equal(judgeLocalRepair(f).approved,false);
 }finally{fs.rmSync(f.directory,{recursive:true,force:true});}
});
test('Judge vetoes an unapproved file hidden by a replacement baseline commit',()=>{
 const f=fixture();
 try{
  git(f.directory,'reset','--hard',f.baselineHeadSha);
  const extra='app/src/main/Unexpected.kt';
  fs.writeFileSync(path.join(f.directory,extra),'hidden change\n');
  git(f.directory,'add','.');git(f.directory,'commit','-qm','replacement baseline');
  const replacement=git(f.directory,'rev-parse','HEAD');
  git(f.directory,'reset','--soft',f.baselineHeadSha);
  fs.writeFileSync(path.join(f.directory,f.filename),'repaired\n');
  git(f.directory,'add','.');git(f.directory,'commit','-qm','repair with hidden file');
  f.repairHeadSha=git(f.directory,'rev-parse','HEAD');
  git(f.directory,'replace',f.baselineHeadSha,replacement);
  assert.deepEqual(git(f.directory,'--no-replace-objects','diff','--name-only',
   f.baselineHeadSha,f.repairHeadSha).split('\n').sort(),[f.filename,extra].sort());
  assert.equal(judgeLocalRepair(f).approved,false);
 }finally{fs.rmSync(f.directory,{recursive:true,force:true});}
});
