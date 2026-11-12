'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const doc=path.join(root,'docs/quality/PHASE2-DOUBLE-EXTERNAL-HOLDOUT-FREEZE-20261111.json');
const lock=JSON.parse(fs.readFileSync(doc,'utf8'));
const oracle=path.join(root,'tests/fixtures/phase2-external-dual-20261111');
const runner=path.join(root,'scripts/phase2-dual-frozen-capture.sh');
const workflow=fs.readFileSync(path.join(root,'.github/workflows/phase2-dual-external-prospective.yml'),'utf8');
test('two complete original Git source cohorts are frozen without prior source inspection',()=>{
 assert.equal(lock.engine.commitSha,'ebd87b7690fa2223ab65ee200ccf816359ee1f08');
 assert.equal(lock.cohorts.length,2);
 assert.deepEqual(lock.cohorts.map(x=>x.files.length),[9,33]);
 assert.deepEqual(lock.cohorts.map(x=>x.repository),['square/kotlinpoet','android/architecture-samples']);
 for(const cohort of lock.cohorts){
  const names=cohort.files.map(f=>f.path);
  assert.equal(new Set(names).size,names.length);
  assert.ok(names.every(p=>p.startsWith(cohort.scope+'/')&&p.endsWith('.kt')));
  assert.ok(cohort.files.every(f=>/^[a-f0-9]{40}$/.test(f.blobSha)));
  assert.match(cohort.commitSha,/^[a-f0-9]{40}$/);
  assert.match(cohort.treeSha,/^[a-f0-9]{40}$/);
 }
 assert.equal(lock.protocol.sourceBodiesReadBeforeFreeze,false);
 assert.equal(lock.protocol.workerPredictionsReadBeforeFreeze,false);
 assert.equal(lock.protocol.allowHunterTrainingAfterUnblind,false);
});
test('independent Kotlin JVM original oracles exactly match the SHA256 precommitment',()=>{
 const names=['IndependentNameAllocatorOracle.kt','TestOnlyCodePointSupport.kt','IndependentTaskOracle.kt'];
 const h=crypto.createHash('sha256');
 for(const name of names)h.update(name+'\0').update(fs.readFileSync(path.join(oracle,name)));
 assert.equal(h.digest('hex'),lock.protocol.truthCommitmentSha256);
 assert.equal(lock.protocol.oracleLabelsPlanned[0].sourceBlobSha,'32d4a1e348c23a7369a5dd81fbd71aafb52846a4');
 assert.equal(lock.protocol.oracleLabelsPlanned[1].sourceBlobSha,'91377071c9d49deab552fc685a8668a791fae051');
});
test('frozen original engine is not replaced by mutable PR code',()=>{
 assert.ok(workflow.includes('ref: ebd87b7690fa2223ab65ee200ccf816359ee1f08'));
 assert.ok(workflow.includes('ref: f4e88d3655b0f5f795186ea8cf3cb5a8ceb6db01'));
 assert.ok(workflow.includes('ref: ee66e1526b84c026615df032c705842b7d2a521f'));
 assert.ok(workflow.includes('persist-credentials: false'));
 assert.match(workflow,/SENTINEL_REQUIRE_BLIND_BWRAP=1/);
});
test('seal raw predictions and upload them strictly before independent oracle reveal',()=>{
 const seal=workflow.indexOf('name: Scan all eligible original sources');
 const upload=workflow.indexOf('name: Publish raw unscored source-only reports');
 const reveal=workflow.indexOf('name: Execute byte-committed original JVM oracles');
 assert.ok(seal>=0&&upload>seal&&reveal>upload);
 assert.match(workflow,/--unshare-all --new-session --clearenv/);
 assert.match(workflow,/--tmpfs \/tmp/);
 assert.match(workflow,/--ro-bind "\$GITHUB_WORKSPACE" \/sentinel/);
});
test('ineligible Kotlin commonMain paths are abstentions and never fabricated false negatives',()=>{
 const source=fs.readFileSync(runner,'utf8');
 assert.ok(source.includes('unsupportedSourceCount:9'));
 assert.ok(source.includes("scopeStatus:'PARTIAL_COHORT_EXPLICIT_ABSTENTION'"));
 assert.ok(source.includes('scored:false,precision:null,recall:null,falsePositives:null'));
 assert.ok(source.includes('for id in android; do'));
 assert.ok(source.includes("BLIND_SOURCE_COUNT=33"));
 assert.ok(!source.includes('for id in poet android; do'));
});
test('both shell executors are syntactically valid, no untrusted external binary is executed in unit tests',()=>{
 for(const src of [runner,path.join(oracle,'reproduce.sh')]){
  const check=spawnSync('bash',['-n',src],{encoding:'utf8'});
  assert.equal(check.status,0,check.stderr);
 }
});
