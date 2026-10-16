'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {readPinned,run}=require('../../scripts/seal-c2-unseen-truth.cjs');
const {EVIDENCE_SHA256}=require('../../packages/quality-gates/c2-unseen-truth-binder.cjs');
test('CLI refuses absent or unpinned source evidence, never computes a score',()=>{
 assert.throws(()=>run([]),/C2_UNSEEN_TRUTH_INPUT_BLOCKED/);
 assert.throws(()=>run(['a','b','c']),/C2_UNSEEN_TRUTH_INPUT_BLOCKED/);
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'c2-owner-seal-'));
 try{
  const input=path.join(root,'freeze.json');
  fs.writeFileSync(input,'{"schema":"fake evidence"}');
  assert.throws(()=>readPinned(input,EVIDENCE_SHA256.freeze),/C2_UNSEEN_TRUTH_INPUT_BLOCKED/);
  const link=path.join(root,'symlink.json');fs.symlinkSync(input,link);
  assert.throws(()=>readPinned(link,EVIDENCE_SHA256.freeze),/C2_UNSEEN_TRUTH_INPUT_BLOCKED/);
  assert.throws(()=>readPinned('../relative.json',EVIDENCE_SHA256.freeze),/C2_UNSEEN_TRUTH_INPUT_BLOCKED/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
