'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {executeSandboxRepair}=require('../../packages/recovery/sandbox-executor.cjs');
function git(cwd,...args){return execFileSync('git',args,{cwd,encoding:'utf8'}).trim();}
function fixture(){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'ultra-repair-'));
 git(directory,'init','-q','-b','main');
 git(directory,'config','user.name','Fixture');
 git(directory,'config','user.email','fixture@example.invalid');
 const file='app/src/main/Engine.kt';fs.mkdirSync(path.dirname(path.join(directory,file)),{recursive:true});
 fs.writeFileSync(path.join(directory,file),'before\n');
 git(directory,'add','.');git(directory,'commit','-qm','baseline');
 git(directory,'switch','-q','-c','sandbox/repair');
 const head=git(directory,'rev-parse','HEAD');
 const before=git(directory,'hash-object',file);
 const proposed='after\n';
 const crypto=require('node:crypto');const buf=Buffer.from(proposed);const after=crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+buf.length+'\\0'.replace('\\0','\0')),buf])).digest('hex');
 return {directory,file,head,before,after,proposed};
}
function run(f,nonceStore={consume:()=>true},changes=[{path:f.file,content:f.proposed}]){
 const nonce='nonce-1234567890123456';
 const plan={status:'REVIEW_READY_NO_EXECUTOR',commitAllowed:false,mergeAllowed:false,
 expectedHeadSha:f.head,authorizationNonce:nonce,patchBytes:100,
 changes:[{path:f.file,beforeBlobSha:f.before,afterBlobSha:f.after,patchBytes:10}]};
 return executeSandboxRepair({directory:f.directory,plan,changes,nonceStore,nonce,expectedHeadSha:f.head});
}
test('isolated sandbox commits without a remote and rejects nonce replay',()=>{
 const f=fixture();try{
  const seen=new Set();
  const store={consume:n=>{if(seen.has(n))return false;seen.add(n);return true;}};
  const r=run(f,store);assert.equal(r.status,'SANDBOX_COMMIT_CREATED');
  assert.equal(r.remoteWrites,false);assert.equal(r.mergeAllowed,false);
  assert.equal(git(f.directory,'show','HEAD:'+f.file),'after');
  assert.throws(()=>run(f,store),/STALE_HEAD/);
  assert.equal(git(f.directory,'branch','--show-current'),'sandbox/repair');
 }finally{fs.rmSync(f.directory,{recursive:true,force:true});}
});
test('rejects wrong HEAD, modified blobs and unauthorized paths',()=>{
 const f=fixture();try{
  assert.throws(()=>executeSandboxRepair({directory:f.directory,plan:{status:'REVIEW_READY_NO_EXECUTOR',
   commitAllowed:false,mergeAllowed:false,expectedHeadSha:'b'.repeat(40)},
   expectedHeadSha:'b'.repeat(40),changes:[],nonce:'1234567890123456',nonceStore:{consume:()=>true}}),/INVALID_CHANGE_SET/);
  fs.writeFileSync(path.join(f.directory,f.file),'tampered\n');
  assert.throws(()=>run(f),/DIRTY_WORKTREE/);
  git(f.directory,'reset','--hard','HEAD');
  assert.throws(()=>run(f,{consume:()=>true},[{path:'.github/workflows/ci.yml',content:'evil'}]),/UNTRUSTED_PATCH/);
 }finally{fs.rmSync(f.directory,{recursive:true,force:true});}
});
test('rejects remotes and unisolated branches before any write',()=>{
 const f=fixture();try{
  git(f.directory,'remote','add','origin','https://example.invalid/repo.git');
  assert.throws(()=>run(f),/REMOTE_FORBIDDEN/);
  git(f.directory,'remote','remove','origin');
  git(f.directory,'switch','-q','main');
  assert.throws(()=>run(f),/ISOLATED_BRANCH_REQUIRED/);
 }finally{fs.rmSync(f.directory,{recursive:true,force:true});}
});
