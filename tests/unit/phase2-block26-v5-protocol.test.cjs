'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),os=require('node:os');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),bytes=p=>fs.readFileSync(path.join(root,p));
const read=p=>JSON.parse(bytes(p)),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const manifest='docs/quality/PHASE2-BLOCK26-V5-COHORT.json';
test('v5 freezes the corrected tested engine before metadata reservation and independent oracle commitment',()=>{
 const f=read('docs/quality/PHASE2-BLOCK26-V5-FREEZE.json'),r=read('docs/quality/PHASE2-BLOCK26-V5-RESERVATION.json'),m=read(manifest);
 assert.equal(f.engine.commitSha,'d059ac1f41f093fca5ecca42964e2d16e0ea2c41');
 assert.deepEqual(m.engine,f.engine);assert.equal(m.freezeSha,r.freezeSha);
 assert.equal(m.freezeSha,'0cb27a1127f1af75551cf28851ccf786e7e5811d');
 assert.equal(m.metadataReservationCommitSha,'efc1d2f25999322e338ebc1d0be2750a2cf175c0');
 assert.equal(m.metadataReservationBlobSha,'803db9a662289ced0f62f0b33912b22cafed6992');
 assert.equal(r.engineCi.exactHeadPassedChecks,16);assert.equal(r.engineCi.realIsolation,true);
 for(const k of ['sourceMetadataSearched','sourceBodiesRead','predictionsExecuted','oracleExecuted','engineRetuned','block27Allowed'])assert.equal(f[k],false);
 assert.equal(r.sourceBodiesRead,false);assert.equal(r.predictionsExecuted,false);
 assert.equal(m.oraclesCommittedBeforeHunter,true);assert.equal(m.oracleExcludedFromHunterMounts,true);assert.equal(m.block27Allowed,false);
});
test('reserved v5 sources are whole original inventories and exclude every previously named source and blob',()=>{
 const f=read('docs/quality/PHASE2-BLOCK26-V5-FREEZE.json'),ex=read(f.exclusions.path),m=read(manifest),r=read('docs/quality/PHASE2-BLOCK26-V5-RESERVATION.json');
 assert.equal(sha(bytes(f.exclusions.path)),f.exclusions.sha256);
 assert.equal(ex.repositories.length,138);assert.equal(ex.blobShas.length,455);
 assert.deepEqual(m.cohorts,r.cohorts);assert.equal(m.cohorts.length,3);
 assert.deepEqual(m.cohorts.map(c=>c.source.files.length),[3,17,11]);
 const seen=new Set(ex.repositories.map(x=>x.toLowerCase())),blobs=new Set(ex.blobShas);
 for(const c of m.cohorts){
  assert.equal(seen.has(c.source.repository.toLowerCase()),false);
  assert.match(c.source.commitSha,/^[a-f0-9]{40}$/);assert.match(c.source.treeSha,/^[a-f0-9]{40}$/);
  assert.ok(c.source.files.reduce((n,f)=>n+f.sizeBytes,0)<=1048576);
  for(const f of c.source.files){assert.match(f.path,/^src\/main\/.+\.kt$/);assert.equal(blobs.has(f.blobSha),false);}
 }
});
test('the recorded public metadata pool reproduces the frozen ranking and admission prefix',()=>{
 const pool=read('docs/quality/evidence/block26-v5-selection/search-response.json').repositories;
 const metadata=read('docs/quality/evidence/block26-v5-selection/ranking-metadata.json');
 const r=read('docs/quality/PHASE2-BLOCK26-V5-RESERVATION.json');
 assert.equal(pool.length,100);assert.deepEqual(metadata.map(x=>x.repository),pool.map(x=>x.repository_full_name));
 const sorted=metadata.toSorted((a,b)=>b.stargazers_count-a.stargazers_count||
  (a.full_name.toLowerCase()<b.full_name.toLowerCase()?-1:a.full_name.toLowerCase()>b.full_name.toLowerCase()?1:0));
 assert.deepEqual(r.selectionAudit.map(x=>x.repository),sorted.slice(0,r.selectionAudit.length).map(x=>x.full_name));
 assert.deepEqual(r.selectionAudit.filter(x=>x.reason==='RESERVED').map(x=>x.repository),r.cohorts.map(c=>c.source.repository));
 assert.equal(r.selectionAudit.at(-1).reason,'RESERVED');
});
test('all independent v5 oracles are SHA256 committed and staged without original execution',()=>{
 const m=read(manifest);assert.equal(m.oracles.length,3);
 for(const o of m.oracles){
  assert.equal(sha(bytes(o.path)),o.sha256);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-v5-oracle-'));
  try{
   const out=path.join(dir,'staged');fs.mkdirSync(out);
   const r=spawnSync(process.execPath,['scripts/phase2-kotlin-api-v2-eval.cjs','oracle-input',manifest,String(o.cohortId),out],{cwd:root,encoding:'utf8',timeout:10000});
   assert.equal(r.status,0,r.stderr);
   assert.equal(sha(fs.readFileSync(path.join(out,'oracle/IndependentArithmeticOracle.kt'))),o.sha256);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
 }
});
test('v5 reuses frozen real-isolation runners and publishes a prediction seal before independent execution',()=>{
 const w=bytes('.github/workflows/phase2-block26-v5-prospective.yml').toString(),m=read(manifest);
 assert.equal((w.match(/ref: d059ac1f41f093fca5ecca42964e2d16e0ea2c41/g)||[]).length,2);
 for(const c of m.cohorts){assert.equal(w.split('repository: '+c.source.repository).length-1,2);assert.equal(w.split('ref: '+c.source.commitSha).length-1,2);}
 assert.match(w,/needs: frozen-v5-predictions/);assert.match(w,/SENTINEL_REQUIRE_BLIND_BWRAP=1/);
 const preflight=w.indexOf('compile-only'),capture=w.indexOf('phase2-kotlin-api-v2/capture.cjs'),publish=w.indexOf('name: block26-v5-prospective-predictions');
 const independent=w.indexOf('independent-v5-oracle:'),download=w.indexOf('actions/download-artifact@',independent);
 const verify=w.indexOf('phase2-kotlin-api-v2-eval.cjs verify',download),run=w.indexOf('phase2-kotlin-api-v2/run-independent.cjs',verify);
 assert.ok(preflight>0&&capture>preflight&&publish>capture&&independent>publish&&download>independent&&verify>download&&run>verify);
 assert.match(w,/persist-credentials: false/);assert.doesNotMatch(w,/persist-credentials: true/);
});
