'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const entry=path.resolve(__dirname,'../../scripts/evaluate-private-edition-readiness.cjs');
test('offline CLI emits incomplete report, not release approval',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-private-'));
 try{
  const file=path.join(dir,'input.json');
  fs.writeFileSync(file,JSON.stringify({schema:'ultra-sentinel-private-edition-input/v1',
   repository:'cardenaspiero255-lang/Ultra-Sentinel',headSha:'a'.repeat(40),
   openBlockingFindings:0,proofs:[]}));
  const run=spawnSync(process.execPath,[entry,file],{encoding:'utf8'});
  assert.equal(run.status,0);
  const out=JSON.parse(run.stdout);
  assert.equal(out.verdict,'MISSING_OPERATIONAL_EVIDENCE');
  assert.equal(out.releaseAuthorized,false);
  const link=path.join(dir,'link.json');fs.symlinkSync(file,link);
  const rejected=spawnSync(process.execPath,[entry,link],{encoding:'utf8'});
  assert.notEqual(rejected.status,0);
  assert.match(rejected.stderr,/PRIVATE_READINESS_INVALID_OR_INCOMPLETE/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
