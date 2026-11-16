'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p)));
test('prospective v4 source metadata precedes oracle and boxed-array frozen candidate',()=>{
 const reserve=read('docs/quality/PHASE2-BLOCK26-V4-RESERVATION.json');
 const m=read('docs/quality/PHASE2-BLOCK26-V4-COHORT.json');
 assert.equal(reserve.sourceRead,false);
 assert.equal(reserve.predictionsExecuted,false);
 assert.equal(reserve.oracleExecuted,false);
 assert.equal(reserve.engineRetuned,false);
 assert.equal(m.engine.commitSha,'a4156d8853f9714346b436d65f18bbd22d464ef0');
 assert.equal(m.engine.commitSha,reserve.engine.commitSha);
 assert.equal(m.engine.treeSha,reserve.engine.treeSha);
 assert.equal(m.freezeSha,'85d29240c41f6e51a4d54910ca51faf217d38e74');
 assert.equal(m.cohorts[0].source.repository,'andrewass/kalgos');
 assert.equal(m.cohorts[0].source.commitSha,reserve.selection.sourceCommitSha);
 const compact=a=>a.map(f=>JSON.stringify([f.path,f.blobSha,f.sizeBytes])).sort();
 assert.deepEqual(compact(m.cohorts[0].source.files),compact(reserve.selection.files));
 assert.equal(m.cohorts[0].source.files.length,52);
 assert.equal(new Set(m.cohorts[0].source.files.map(f=>f.blobSha)).size,52);
 assert.equal(m.predictionsExecuted,false);
 assert.equal(m.block27Allowed,false);
});
test('independent original gcd oracle has committed SHA256 and is staged without execution',()=>{
 const m=read('docs/quality/PHASE2-BLOCK26-V4-COHORT.json'),o=m.oracles[0];
 assert.equal(m.oracles.length,1);
 assert.equal(o.path,'tests/fixtures/phase2-block26-v4/oracle-1.kt');
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,o.path))).digest('hex'),o.sha256);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-v4-oracle-'));
 try{
  const out=path.join(dir,'output');fs.mkdirSync(out);
  const res=spawnSync(process.execPath,['scripts/phase2-kotlin-api-v2-eval.cjs','oracle-input','docs/quality/PHASE2-BLOCK26-V4-COHORT.json','1',out],{cwd:root,encoding:'utf8',timeout:10000});
  assert.equal(res.status,0,res.stderr);
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(out,'oracle/IndependentArithmeticOracle.kt'))).digest('hex'),o.sha256);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
