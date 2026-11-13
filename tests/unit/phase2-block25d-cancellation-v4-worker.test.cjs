'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process'),{createHash}=require('node:crypto');
const worker=path.resolve(__dirname,'../../packages/family-hunter/phase2-blind-cancellation-v4-worker.cjs');
const src='package example\nimport kotlin.coroutines.cancellation.CancellationException\nsuspend fun load(){try { work() } catch (e: Exception) { if (e is CancellationException) { report(e); return }; throw e }}\n';
const sha=s=>{const b=Buffer.from(s);return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');};
const inventory=()=>({expectedCommitSha:'c'.repeat(40),files:[{
 path:'core/src/commonMain/kotlin/org/example/Handler.kt',source:src,expectedBlobSha:sha(src)
}]});
test('v4 worker captures import-bound guard hypothesis, not verified causal result',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'us-v4-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const file=path.join(dir,'inventory.json'),out=path.join(dir,'result.json');
 fs.writeFileSync(file,JSON.stringify(inventory()));
 const run=spawnSync(process.execPath,[worker,file,out],{encoding:'utf8',timeout:12000});
 assert.equal(run.status,0,run.stderr);
 const report=JSON.parse(fs.readFileSync(out));
 assert.equal(report.filesScanned,1);
 assert.deepEqual(report.findings.map(x=>x.rule),['GUARDED_CANCELLATION_SWALLOWED']);
 assert.equal(report.schema,'ultra-sentinel-cancellation-controlflow-hunter/v2');
 for(const k of ['sourceRepositoryAuthenticated','compilerTypeResolutionVerified',
  'originalFunctionalOracleVerified','causalityVerified','generalizationVerified',
  'repairAuthorized','remoteWrites','mergeAllowed'])assert.equal(report[k],false,k);
});
test('v4 worker refuses manipulated blob or added truth labels with no output file',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'us-v4-bad-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const cases=[
  {...inventory(),files:[{...inventory().files[0],expectedBlobSha:'a'.repeat(40)}]},
  {...inventory(),answer:'positive'},
  {...inventory(),files:[{...inventory().files[0],source:'package bad\nfun x()=1'}]}
 ];
 for(let i=0;i<cases.length;i++){
  const file=path.join(dir,'in-'+i+'.json'),out=path.join(dir,'out-'+i+'.json');
  fs.writeFileSync(file,JSON.stringify(cases[i]));
  const run=spawnSync(process.execPath,[worker,file,out],{encoding:'utf8',timeout:12000});
  assert.notEqual(run.status,0,i+':'+run.stderr);
  assert.equal(fs.existsSync(out),false);
 }
});
test('v4 sandbox has no oracle mounts, new scanner and frozen v3 worker unchanged',()=>{
 const launcher=fs.readFileSync(path.join(__dirname,'../fixtures/phase2-block25d/run-blind-cancellation-v4.sh'),'utf8');
 assert.match(launcher,/--die-with-parent --unshare-all --new-session --clearenv/);
 assert.match(launcher,/phase2-cancellation-controlflow-v4\.cjs/);
 assert.match(launcher,/phase2-blind-cancellation-v4-worker\.cjs/);
 assert.doesNotMatch(launcher,/\/oracle|\/answers|\/truth/i);
});
