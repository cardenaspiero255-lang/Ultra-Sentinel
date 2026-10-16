'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {readEvidence,main}=require('../../scripts/seal-c2-next-source-truth.cjs');
const {WITNESS_SHA256}=require('../../packages/quality-gates/c2-next-one-positive-truth.cjs');
test('offline seal rejects untrusted bytes, symlinks and wrong number of sources',()=>{
 assert.throws(()=>main([]),/C2_NEXT_SOURCE_TRUTH_BLOCKED/);
 assert.throws(()=>main(['relative','relative']),/C2_NEXT_SOURCE_TRUTH_BLOCKED/);
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'c2-next-positive-'));
 try{
  const f=path.join(folder,'source.json');fs.writeFileSync(f,'{"malicious":true}');
  assert.throws(()=>readEvidence(f,WITNESS_SHA256),/C2_NEXT_SOURCE_TRUTH_BLOCKED/);
  const link=path.join(folder,'link.json');fs.symlinkSync(f,link);
  assert.throws(()=>readEvidence(link),/C2_NEXT_SOURCE_TRUTH_BLOCKED/);
  fs.writeFileSync(f,'X'.repeat(20001));
  assert.throws(()=>readEvidence(f),/C2_NEXT_SOURCE_TRUTH_BLOCKED/);
 }finally{fs.rmSync(folder,{recursive:true,force:true});}
});
