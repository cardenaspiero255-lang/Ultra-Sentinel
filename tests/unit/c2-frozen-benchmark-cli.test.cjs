'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {evaluateFile}=require('../../scripts/evaluate-c2-frozen-benchmark.cjs');

test('no missing, relative, symlink or extra-hardlink input may enter blind C2 comparator',()=>{
 assert.throws(()=>evaluateFile('./campaign.json'),/C2_FROZEN_INPUT_BLOCKED/);
 assert.throws(()=>evaluateFile('/does-not-exist-c2-frozen-campaign.json'),/C2_FROZEN_INPUT_BLOCKED/);
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'c2-input-'));
 try{
  const file=path.join(root,'campaign.json'),alias=path.join(root,'symlink.json'),hard=path.join(root,'hard.json');
  fs.writeFileSync(file,JSON.stringify({schema:'wrong'}));
  fs.symlinkSync(file,alias);
  assert.throws(()=>evaluateFile(alias),/C2_FROZEN_INPUT_BLOCKED/);
  fs.linkSync(file,hard);
  assert.throws(()=>evaluateFile(file),/C2_FROZEN_INPUT_BLOCKED/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('invalid supplied campaign never leaks false precision and never authenticates its provenance',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'c2-input-'));
 try{
  const file=path.join(root,'campaign.json');
  fs.writeFileSync(file,JSON.stringify({schema:'wrong'}));
  const v=evaluateFile(file);
  assert.equal(v.comparisonPerformed,false);
  assert.equal(v.precision,null);
  assert.equal(v.realEvidenceAuthenticated,false);
  assert.equal(v.tripleSPlusCertified,false);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
