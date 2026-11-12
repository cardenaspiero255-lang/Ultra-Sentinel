'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process'),{createHash}=require('node:crypto');
const worker=path.resolve(__dirname,'../../packages/family-hunter/phase2-blind-cancellation-worker.cjs');
const head='b'.repeat(40);
const src='package sample\nsuspend fun refresh() { try { retrieve() } catch (cancel: CancellationException) { record(cancel) } }\n';
function input(){
 const bytes=Buffer.from(src),blob=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
 return {expectedCommitSha:head,files:[{path:'module/src/commonMain/kotlin/Refresh.kt',source:src,expectedBlobSha:blob}]};
}
test('source-only cancellation worker emits unverified bounded findings and never labels truth or repair',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ultra-phase25-worker-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const file=path.join(dir,'input.json'),output=path.join(dir,'discovery.json');
 fs.writeFileSync(file,JSON.stringify(input()));
 const run=spawnSync(process.execPath,[worker,file,output],{encoding:'utf8',timeout:15000});
 assert.equal(run.status,0,run.stderr);
 const r=JSON.parse(fs.readFileSync(output,'utf8'));
 assert.equal(r.filesScanned,1);assert.equal(r.findings.length,1);
 assert.equal(r.findings[0].rule,'CANCELLATION_EXCEPTION_SWALLOWED');
 assert.equal(r.status,'CANCELLATION_PROPAGATION_HYPOTHESES_REQUIRE_ORIGINAL_ORACLE');
 for(const key of ['sourceRepositoryAuthenticated','originalFunctionalOracleVerified','compilerTypeResolutionVerified','causalityVerified','generalizationVerified','repairAuthorized','remoteWrites','mergeAllowed'])
  assert.equal(r[key],false,key);
 assert.throws(()=>fs.writeFileSync(output,'tamper',{flag:'wx'}));
});
test('source worker refuses fabricated blob metadata, expected labels and source traversal without output',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ultra-phase25-bad-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const cases=[
  {...input(),files:[{...input().files[0],expectedBlobSha:'0'.repeat(40)}]},
  {...input(),files:[{...input().files[0],path:'module/src/test/kotlin/Leak.kt'}]},
  {...input(),files:[{...input().files[0],expectedTruth:'positive'}]},
  {...input(),expectedOracleResult:'PASS'},
 ];
 for(let i=0;i<cases.length;i++){
  const file=path.join(dir,'input-'+i+'.json'),output=path.join(dir,'output-'+i+'.json');
  fs.writeFileSync(file,JSON.stringify(cases[i]));
  const run=spawnSync(process.execPath,[worker,file,output],{encoding:'utf8',timeout:15000});
  assert.equal(run.status,1,i+':'+run.stderr);
  assert.equal(fs.existsSync(output),false);
 }
});
test('blind launcher only mounts exact scanner, worker, inert inventory and policy; not oracles',()=>{
 const source=fs.readFileSync(path.resolve(__dirname,'../fixtures/phase2-block25/run-blind-cancellation-hunter.sh'),'utf8');
 assert.match(source,/--unshare-all --new-session --clearenv/);
 assert.match(source,/--ro-bind "\$inventory" \/input\/inventory\.json/);
 assert.match(source,/--ro-bind "\$worker" \/packages\/family-hunter\/phase2-blind-cancellation-worker\.cjs/);
 assert.doesNotMatch(source,/--ro-bind "\$GITHUB_WORKSPACE"/);
 assert.doesNotMatch(source,/\/oracle|\/truth|\/answers/i);
});
