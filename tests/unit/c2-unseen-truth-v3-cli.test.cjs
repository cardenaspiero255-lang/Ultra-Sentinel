'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {readPinned,run}=require('../../scripts/extend-c2-unseen-truth-v3.cjs');
const {HASHES}=require('../../packages/quality-gates/c2-unseen-truth-v3.cjs');
test('tampered source bytes, absent or symlink source never become a score',()=>{
 assert.throws(()=>run([]),/C2_UNSEEN_V3_SOURCE_INVALID/);
 assert.throws(()=>run(['relative','relative2']),/C2_UNSEEN_V3_SOURCE_INVALID/);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'c2-v3-cli-'));
 try{
  const file=path.join(dir,'original.json');
  fs.writeFileSync(file,'{"forged":"true"}');
  assert.throws(()=>readPinned(file,HASHES.witness208),/C2_UNSEEN_V3_SOURCE_INVALID/);
  const link=path.join(dir,'symlink.json');fs.symlinkSync(file,link);
  assert.throws(()=>readPinned(link,HASHES.witness208),/C2_UNSEEN_V3_SOURCE_INVALID/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
