'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const entry=path.resolve(__dirname,'../../scripts/plan-regression-bisect.cjs');
test('offline regression CLI recommends test, not code execution or merge',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-regression-'));
 try{
  const hashes=Array.from({length:5},(_,i)=>i.toString(16).padStart(40,'0'));
  const file=path.join(dir,'input.json');
  fs.writeFileSync(file,JSON.stringify({repository:'cardenaspiero255-lang/JARVIS',
   commits:hashes,observations:[{sha:hashes[0],result:'GOOD'},{sha:hashes[4],result:'BAD'}]}));
  const p=spawnSync(process.execPath,[entry,file],{encoding:'utf8'});
  assert.equal(p.status,0);
  const result=JSON.parse(p.stdout);
  assert.equal(result.status,'TEST_REQUIRED');
  assert.equal(result.nextSha,hashes[2]);
  assert.equal(result.executable,false);
  const link=path.join(dir,'link.json');fs.symlinkSync(file,link);
  assert.notEqual(spawnSync(process.execPath,[entry,link]).status,0);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
