'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const manifest=JSON.parse(read('docs/quality/PHASE2-NEW-KMP-PROSPECTIVE-FREEZE-20261112.json'));
const workflow=read('.github/workflows/phase2-new-kmp-prospective.yml');
test('immutable expanded Hunter SHA and previously unused original Kotlin Multiplatform trees are preregistered',()=>{
 assert.equal(manifest.engine.commitSha,'ce2c030fde3465ee4c3203022fee2c09c2233f59');
 assert.deepEqual(manifest.cohorts.map(x=>x.repository),['Kotlin/kotlinx-atomicfu','JetBrains/compose-multiplatform']);
 assert.deepEqual(manifest.cohorts.flatMap(c=>c.scopes.map(s=>s.files.length)),[7,6,25]);
 const paths=manifest.cohorts.flatMap(c=>c.scopes.flatMap(s=>s.files.map(f=>f.path)));
 assert.equal(paths.length,38);
 assert.equal(new Set(paths).size,38);
 for(const c of manifest.cohorts){
  assert.match(c.commitSha,/^[a-f0-9]{40}$/);
  assert.match(c.treeSha,/^[a-f0-9]{40}$/);
  for(const s of c.scopes)for(const f of s.files){
   assert.ok(f.path.startsWith(s.scope+'/')&&f.path.endsWith('.kt'),f.path);
   assert.match(f.blobSha,/^[a-f0-9]{40}$/);
   assert.ok(Number.isSafeInteger(f.sizeBytes)&&f.sizeBytes>=10&&f.sizeBytes<=65536);
  }
 }
 assert.equal(manifest.protocol.sourceBodiesReadBeforeFreeze,false);
 assert.equal(manifest.protocol.ruleOrTrainingAdjustmentsAfterUnblindForbidden,true);
});
test('independent original Kotlin JVM oracle source SHA256 and Git blob commitment match BEFORE worker predictions',()=>{
 const content=fs.readFileSync(path.join(root,manifest.truth.committedOracleFile));
 const hash=crypto.createHash('sha256').update(content).digest('hex');
 const gitHash=crypto.createHash('sha1').update('blob '+content.length+'\0').update(content).digest('hex');
 assert.equal(hash,manifest.truth.commitmentSha256);
 assert.equal(gitHash,manifest.truth.committedOracleGitBlobSha);
 assert.equal(manifest.truth.oraclePreparedBeforeWorkerPredictions,true);
 assert.equal(manifest.truth.independentHumanAdjudication,false);
 assert.equal(manifest.truth.completePositiveNegativeTruth,false);
 assert.match(content.toString('utf8'),/ORIGINAL_CLDR_ABSOLUTE_INT_MIN_OVERFLOW/);
 assert.match(content.toString('utf8'),/BENIGN_PLURAL_REGRESSION/);
 const truth=manifest.truth.scopedPositive,benign=manifest.truth.scopedBenignControl;
 const sourceBlobs=new Map(manifest.cohorts.flatMap(c=>c.scopes.flatMap(s=>s.files.map(f=>[f.path,f.blobSha]))));
 assert.equal(sourceBlobs.get(truth.path),truth.sourceBlobSha);
 assert.equal(sourceBlobs.get(benign.path),benign.sourceBlobSha);
 assert.equal(truth.line,136);
 assert.equal(benign.line,20);
});
test('source-only inventory, frozen dynamic JVM probe, and independent oracle reveal remain strictly ordered',()=>{
 const a=workflow.indexOf('name: Run nine immutable source-only workers');
 const b=workflow.indexOf('name: Run frozen cgroup-bounded generic JVM method probe');
 const c=workflow.indexOf('name: Upload raw immutable source and JVM predictions BEFORE');
 const d=workflow.indexOf('name: Run independent precommitted original Kotlin RED GREEN');
 assert.ok(a>=0&&b>a&&c>b&&d>c,'oracle must not run before immutable workers and sealed artifact');
 assert.match(workflow,/ref: ce2c030fde3465ee4c3203022fee2c09c2233f59/);
 assert.match(workflow,/--die-with-parent --unshare-all --new-session --clearenv/);
 assert.match(workflow,/SENTINEL_REQUIRE_BLIND_BWRAP=1/);
 assert.match(workflow,/--ro-bind "\$RUNNER_TEMP\/kmp-frozen-sealed" \/predictions/);
 assert.match(workflow,/--setenv JAVA_HOME \/jdk/);
 assert.match(workflow,/--ro-bind "\$node_root" \/node/);
 assert.doesNotMatch(workflow,/pull_request_target/);
});
test('all eligible source files are scanned without oracle labels and no global metrics are invented',()=>{
 const script=read('scripts/phase2-kmp-frozen-capture.sh');
 const oracle=read('tests/fixtures/phase2-frozen-kmp-20261112/reproduce.sh');
 assert.match(script,/FROZEN_KMP_SOURCE_FILES=38/);
 assert.match(script,/FROZEN_KMP_REPORTS=9/);
 assert.match(script,/source-only-seal\.json/);
 assert.match(script,/scored:false/);
 assert.match(script,/truePositives:null,falsePositives:null,falseNegatives:null/);
 assert.match(script,/FROZEN_KMP_ALL_PREDICTIONS_SEALED_WITHOUT_ORACLE/);
 assert.match(oracle,/SCOPED_CLDR_ORIGINAL_JVM_RED_GREEN_WRONG_PATCH_VETO_PASS/);
 assert.match(oracle,/automatedFixerVerified:false/);
 assert.match(oracle,/globalPrecision:null,globalRecall:null,globalF1:null/);
 assert.match(oracle,/wrongPatchVeto:true/);
 for(const p of ['scripts/phase2-kmp-frozen-capture.sh',
  'tests/fixtures/phase2-frozen-kmp-20261112/reproduce.sh']){
  const r=spawnSync('bash',['-n',path.join(root,p)],{encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);
 }
});
