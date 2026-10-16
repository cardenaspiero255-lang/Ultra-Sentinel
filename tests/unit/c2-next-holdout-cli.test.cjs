'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {readEvidence,main}=require('../../scripts/verify-c2-next-holdout.cjs');
const {NEW_LOCK}=require('../../packages/quality-gates/c2-next-holdout.cjs');
test('owner-only eight-case reader refuses untrusted/missing/symlink and excess bytes',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'c2-next-freeze-'));
 try{
  assert.throws(()=>main('relative.json'),/C2_NEXT_HOLDOUT_INPUT_BLOCKED/);
  const f=path.join(root,'input.json');
  fs.writeFileSync(f,JSON.stringify(NEW_LOCK.cases));
  assert.throws(()=>main(f),/C2_NEXT_HOLDOUT_UNVERIFIED/);
  const sym=path.join(root,'sym.json');fs.symlinkSync(f,sym);
  assert.throws(()=>readEvidence(sym),/C2_NEXT_HOLDOUT_INPUT_BLOCKED/);
  fs.writeFileSync(f,'X'.repeat(20001));
  assert.throws(()=>readEvidence(f),/C2_NEXT_HOLDOUT_INPUT_BLOCKED/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
