'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const fixture=path.join(root,'tests/fixtures/gamehub-three-source');
const workflow=path.join(root,'.github/workflows/phase2-three-source-gamehub.yml');
const entries=[
 'app/src/main/java/com/cardenaspiero255/gamehubultra/BatteryTelemetry.kt',
 'app/src/main/java/com/cardenaspiero255/gamehubultra/platform/RuntimeDiagnostics.kt',
 'app/src/main/java/com/cardenaspiero255/gamehubultra/session/SessionCoachTelemetryMapper.kt'
];
const head='a'.repeat(40);

test('three-source workflow uses the pinned original, isolated runtime and no write permission',()=>{
 const text=fs.readFileSync(workflow,'utf8');
 assert.match(text,/permissions:\n  contents: read/);
 assert.match(text,/--unshare-all/);
 assert.match(text,/--ro-bind "\$GITHUB_WORKSPACE" \/sentinel/);
 assert.match(text,/e4ca122422f1cb591d407db3fb21fb00fd78b022/);
 assert.match(text,/SENTINEL_REQUIRE_BLIND_BWRAP=1 node --test tests\/unit\/phase2-blind-isolation-boundary\.test\.cjs/);
 assert.doesNotMatch(text,/pull_request_target/);
 assert.equal(spawnSync('bash',['-n',path.join(fixture,'reproduce.sh')]).status,0);
});

test('fabricated transcripts do not become authenticated JVM or causal claims',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'three-source-simulated-'));
 try{
  const manifest={head,files:entries.map((p,i)=>({path:p,beforeBlobSha:String(i+1).repeat(40)}))};
  fs.writeFileSync(path.join(dir,'interventions.json'),JSON.stringify(manifest));
  for(let mask=0;mask<8;mask++){
   const base=path.join(dir,`case-${mask}`),good=Boolean(mask&3);
   fs.writeFileSync(base+'.exit',good?'0\n':'2\n');
   fs.writeFileSync(base+'.out','BENIGN_TELEMETRY_PASS\n'+(good?'THREE_SOURCE_TELEMETRY_ORACLE_PASS\n':''));
   fs.writeFileSync(base+'.err',good?'':'EXTREME_TELEMETRY_MISMATCH\n');
   fs.writeFileSync(base+'.jar','not a real jar '+mask);
  }
  const run=spawnSync(process.execPath,[path.join(fixture,'adjudicate.cjs'),root,dir,head],{encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);
  const result=JSON.parse(run.stdout);
  assert.equal(result.status,'TRANSCRIPTS_REQUIRE_TRUSTED_EXECUTION_ATTESTATION');
  assert.equal(result.jvmExecutionAuthenticatedByHelper,false);
  assert.equal(result.sourceRepositoryAuthenticatedByHelper,false);
  assert.equal(result.threeFileMinimalInteractionProven,false);
  assert.deepEqual(result.minimalRepairSets,[[entries[0]],[entries[1]]]);
  assert.deepEqual(result.necessaryFiles,[]);
  assert.equal(result.mergeAllowed,false);
  fs.writeFileSync(path.join(dir,'case-0.exit'),'0\n');
  const invalid=spawnSync(process.execPath,[path.join(fixture,'adjudicate.cjs'),root,dir,head]);
  assert.notEqual(invalid.status,0);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
