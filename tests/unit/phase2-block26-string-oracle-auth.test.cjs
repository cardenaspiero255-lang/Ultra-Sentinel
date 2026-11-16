'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const adapter=path.join(root,'scripts/phase2-kotlin-api-v2-eval.cjs');

test('prospective oracle-input authenticates the separate frozen String cohort oracle without changing historical oracles',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-string-oracle-'));
 try {
  const originalPath='tests/fixtures/phase2-kotlin-api-v2/oracle-string-holdout-1.kt';
  const original=fs.readFileSync(path.join(root,originalPath));
  const m={engine:{commitSha:'a'.repeat(40)},cohorts:[{id:1,source:{repository:'fixture/untouched',commitSha:'b'.repeat(40)}}],
   oracles:[{cohortId:1,path:originalPath,sha256:crypto.createHash('sha256').update(original).digest('hex')}],block27Allowed:false};
  const manifest=path.join(temp,'manifest.json');
  fs.writeFileSync(manifest,JSON.stringify(m));
  const input=path.join(temp,'input');fs.mkdirSync(input);
  const run=()=>spawnSync(process.execPath,[adapter,'oracle-input',manifest,'1',input],{encoding:'utf8',timeout:15000});
  let r=run();assert.equal(r.status,0,r.stderr);
  assert.deepEqual(fs.readFileSync(path.join(input,'oracle/IndependentArithmeticOracle.kt')),original);
  fs.rmSync(path.join(input,'oracle'),{recursive:true});
  m.oracles[0].sha256='0'.repeat(64);fs.writeFileSync(manifest,JSON.stringify(m));
  r=run();assert.notEqual(r.status,0,'tampered oracle bytes must fail closed');
  assert.ok(!fs.existsSync(path.join(input,'oracle/IndependentArithmeticOracle.kt')));
  m.oracles[0].path='tests/fixtures/phase2-kotlin-api-v2/../../../../../etc/passwd';
  fs.writeFileSync(manifest,JSON.stringify(m));r=run();
  assert.notEqual(r.status,0,'path traversal is always forbidden');
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
