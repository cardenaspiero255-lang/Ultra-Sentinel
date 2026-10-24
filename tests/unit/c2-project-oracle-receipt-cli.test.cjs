'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {main}=require('../../scripts/c2-project-oracle-receipt.cjs');
const SHA='f'.repeat(40);
function sample(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'c2-project-oracle-'));
 for(const phase of ['original','fixed','benign']){
  fs.writeFileSync(path.join(dir,phase+'.test.cjs'),
   "test('"+phase+"',()=>{});\n");
  fs.writeFileSync(path.join(dir,phase+'.log'),
   '# oracle phase '+phase+'\n# tests 2\n# pass '+(phase==='original'?'1':'2')+'\n# fail '+(phase==='original'?'1':'0')+'\n');
 }
 return dir;
}
test('trusted selftest outputs are byte-bound but never new labels',()=>{
 const dir=sample();
 try{
  assert.equal(main(['generate',dir,SHA]).phases.length,3);
  const checked=main(['verify',dir,SHA]);
  assert.equal(checked.actualBytesVerified,true);
  assert.equal(checked.newGoldLabels,0);
  assert.equal(checked.runtimeIsolationAuthenticated,false);
  assert.equal(checked.remaining,111);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('independent reader fails on source tampering, log changes and symlinks',()=>{
 const dir=sample();
 try{
  main(['generate',dir,SHA]);
  fs.appendFileSync(path.join(dir,'fixed.test.cjs'),'// modified');
  assert.throws(()=>main(['verify',dir,SHA]),/C2_PROJECT_ORACLE_BLOCKED/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
 const next=sample();
 try{
  main(['generate',next,SHA]);
  fs.unlinkSync(path.join(next,'fixed.log'));
  fs.symlinkSync(path.join(next,'original.log'),path.join(next,'fixed.log'));
  assert.throws(()=>main(['verify',next,SHA]),/C2_PROJECT_ORACLE_BLOCKED/);
 }finally{fs.rmSync(next,{recursive:true,force:true});}
});
test('source reader rejects extra files and altered worker commit',()=>{
 const dir=sample();
 try{
  main(['generate',dir,SHA]);
  assert.throws(()=>main(['verify',dir,'e'.repeat(40)]),/C2_PROJECT_ORACLE_BLOCKED/);
  fs.writeFileSync(path.join(dir,'fake-GOLD.json'),'{}');
  assert.throws(()=>main(['verify',dir,SHA]),/C2_PROJECT_ORACLE_BLOCKED/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
