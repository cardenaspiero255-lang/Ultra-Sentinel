'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {readPinned,run}=require('../../scripts/extend-c2-unseen-truth.cjs');
const {SOURCE_HASHES}=require('../../packages/quality-gates/c2-unseen-two-positive-truth.cjs');
test('CLI refuses missing or untrusted files rather than emitting 95% metrics',()=>{
 assert.throws(()=>run([]),/C2_UNSEEN_TRUTH_V2_INPUT_INVALID/);
 assert.throws(()=>run(['a','b']),/C2_UNSEEN_TRUTH_V2_INPUT_INVALID/);
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'c2-v2-test-'));
 try{
  const file=path.join(root,'oracle.json');
  fs.writeFileSync(file,'{"test":"untrusted"}');
  assert.throws(()=>readPinned(file,SOURCE_HASHES.pr205),/C2_UNSEEN_TRUTH_V2_INPUT_INVALID/);
  const sym=path.join(root,'oracle-link.json');fs.symlinkSync(file,sym);
  assert.throws(()=>readPinned(sym,SOURCE_HASHES.pr205),/C2_UNSEEN_TRUTH_V2_INPUT_INVALID/);
  assert.throws(()=>readPinned('relative.json',SOURCE_HASHES.pr205),/C2_UNSEEN_TRUTH_V2_INPUT_INVALID/);
 }finally{fs.rmSync(root,{force:true,recursive:true});}
});
