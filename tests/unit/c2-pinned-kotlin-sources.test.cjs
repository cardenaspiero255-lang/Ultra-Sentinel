'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const crypto=require('node:crypto');
const {PINNED,verifyKotlinSources}=require('../../packages/quality-gates/c2-pinned-kotlin-sources.cjs');
function makeRoot(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'c2-kotlin-pinned-test-'));
 for(const s of PINNED){
  const p=path.join(dir,String(s.pr),path.basename(s.path));
  fs.mkdirSync(path.dirname(p),{recursive:true});
  fs.writeFileSync(p,'wrong but plausible pinned source\n'.repeat(120));
 }
 return dir;
}
test('three frozen PRs and seven files have fixed identities and no duplicate paths',()=>{
 assert.deepEqual([...new Set(PINNED.map(x=>x.pr))],[132,159,161]);
 assert.equal(PINNED.length,7);
 assert.ok(PINNED.every(x=>/^[a-f0-9]{40}$/.test(x.headSha)&&
 /^[a-f0-9]{40}$/.test(x.blobSha)&&
 x.path.startsWith('app/src/main/java/')));
 assert.equal(new Set(PINNED.map(x=>x.pr+':'+x.path)).size,7);
});
test('mutated source cannot pass pinned hashes or be called an empirical observation',()=>{
 const root=makeRoot();
 try{assert.throws(()=>verifyKotlinSources(root),/C2_KOTLIN_PINNED_SOURCE_INVALID/);}
 finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('relative root and symlink injection are rejected before compilation',()=>{
 const root=makeRoot();
 try{
  assert.throws(()=>verifyKotlinSources('relative'),/C2_KOTLIN_PINNED_SOURCE_INVALID/);
  const p=path.join(root,'132','HomeUiState.kt');
  fs.unlinkSync(p);fs.symlinkSync('/etc/passwd',p);
  assert.throws(()=>verifyKotlinSources(root),/C2_KOTLIN_PINNED_SOURCE_INVALID/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('fixed nonsource files are rejected even if a caller supplies an arbitrary SHA',()=>{
 const root=makeRoot();
 try{
  assert.throws(()=>verifyKotlinSources(root,[{pr:132,headSha:'a'.repeat(40),
   blobSha:'b'.repeat(40),path:'../../etc/passwd'}]),
   /C2_KOTLIN_PINNED_SOURCE_INVALID/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
