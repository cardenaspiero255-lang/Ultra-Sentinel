'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {main,readJson}=require('../../scripts/capture-c2-unseen-targeted.cjs');
test('offline target collector rejects relative path, symlinks and oversized data',()=>{
 assert.throws(()=>main('relative-path'),/C2_TARGET_LOCAL_SOURCE_UNVERIFIED/);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'c2-target-'));
 try{
  const file=path.join(dir,'compare.json');
  fs.writeFileSync(file,'{"fake":true}');
  const symlink=path.join(dir,'link.json');fs.symlinkSync(file,symlink);
  assert.throws(()=>readJson(symlink),/C2_TARGET_LOCAL_SOURCE_UNVERIFIED/);
  fs.writeFileSync(file,'X'.repeat(2*1024*1024+1));
  assert.throws(()=>readJson(file),/C2_TARGET_LOCAL_SOURCE_UNVERIFIED/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
