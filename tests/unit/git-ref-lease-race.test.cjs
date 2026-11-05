'use strict';
// A fast-forward alone does not compare the ref with the SHA last read.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {execFileSync,spawnSync}=require('node:child_process');

test('a stale fast-forward can succeed while an explicit expected-SHA lease rejects it',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'us-git-lease-'));
 const source=path.join(dir,'source'),remote=path.join(dir,'remote.git');
 const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 try{
  fs.mkdirSync(source);
  git(dir,'init','--bare',remote);
  git(source,'init','-b','demo');
  git(source,'config','user.name','Local Test');
  git(source,'config','user.email','test@example.invalid');
  const file=path.join(source,'fixture.txt');
  const commit=(value)=>{fs.writeFileSync(file,value);git(source,'add','fixture.txt');
   git(source,'commit','-m',value);return git(source,'rev-parse','HEAD');};
  const original=commit('original'),repair=commit('repair'),restore=commit('restore');
  git(source,'push',remote,repair+':refs/heads/demo');
  assert.equal(git(remote,'rev-parse','refs/heads/demo'),repair); // last read
  // Another authorized actor rewinds after the read and before publication.
  git(remote,'update-ref','refs/heads/demo',original,repair);
  git(source,'push',remote,restore+':refs/heads/demo');
  assert.equal(git(remote,'rev-parse','refs/heads/demo'),restore);
  // Recreate the race: a lease with the exact expected old SHA rejects it.
  git(remote,'update-ref','refs/heads/demo',original,restore);
  const leased=spawnSync('git',['push','--force-with-lease=refs/heads/demo:'+repair,
   remote,restore+':refs/heads/demo'],{cwd:source,encoding:'utf8'});
  assert.notEqual(leased.status,0);
  assert.equal(git(remote,'rev-parse','refs/heads/demo'),original);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
