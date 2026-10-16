'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {readJson,main}=require('../../scripts/evaluate-c2-unseen-first.cjs');
const {TRUTH_SHA256}=require('../../packages/quality-gates/c2-unseen-unblind-evaluator.cjs');
test('offline evaluator rejects missing, symlinked, altered and unpinned source bytes',()=>{
 assert.throws(()=>main([]),/C2_UNSEEN_INPUT_UNVERIFIED/);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'c2-unblind-cli-'));
 try{
  const p=path.join(dir,'truth.json');fs.writeFileSync(p,'{"forged":true}');
  assert.throws(()=>readJson(p,{sha256:TRUTH_SHA256}),/C2_UNSEEN_INPUT_UNVERIFIED/);
  assert.throws(()=>readJson('relative',{sha256:TRUTH_SHA256}),/C2_UNSEEN_INPUT_UNVERIFIED/);
  const sym=path.join(dir,'link.json');fs.symlinkSync(p,sym);
  assert.throws(()=>readJson(sym,{sha256:TRUTH_SHA256}),/C2_UNSEEN_INPUT_UNVERIFIED/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
