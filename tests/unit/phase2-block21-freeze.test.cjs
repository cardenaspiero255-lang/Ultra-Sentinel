'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {inspectBlock21Freeze}=require('../../packages/quality-gates/phase2-block21-freeze.cjs');
const base=path.resolve(__dirname,'../..');
const file=path.join(base,'docs/quality/PHASE2-BLOCK21-FREEZE-20261112.json');
const bytes=fs.readFileSync(file);
const sha='3c1a8036ec8e880c0d474ce9de6cd263feefc862';
const manifest=JSON.parse(bytes.toString('utf8'));
test('block 2.1 pins PR 380 merged engine, full Git tree, and relevant module blobs',()=>{
 const hash=crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
 assert.equal(hash,sha);
 assert.equal(manifest.engine.commitSha,'3668a4ff860c49c5aaf69a594efc4fa48d94def3');
 assert.equal(manifest.engine.treeSha,'09b8e8a9e598c4c1184fb0b97617cc3b2ff9c73e');
 assert.equal(manifest.engine.completeDependencyClosure,'ALL_GIT_BLOBS_IN_PINNED_ENGINE_TREE');
 assert.equal(manifest.engine.relevantBlobs.length,11);
 assert.ok(manifest.engine.relevantBlobs.some(x=>x.path==='packages/family-hunter/bounded-kotlin-range-flow.cjs'));
 const report=inspectBlock21Freeze(bytes);
 assert.equal(report.status,'FROZEN_METADATA_ONLY_NOT_EVALUATED');
 assert.equal(report.engineCommitSha,manifest.engine.commitSha);
 assert.equal(report.manifestBlobSha,sha);
});
test('holdout is newly pinned using only source tree metadata, eight direct Kotlin blobs',()=>{
 assert.equal(manifest.cohort.repository,'Kotlin/kotlinx.coroutines');
 assert.equal(manifest.cohort.commitSha,'ead082131ceb45b8e4fda027c74471103c1cd09f');
 assert.equal(manifest.cohort.treeSha,'6c999bde5fe9f473d1418e67127d06dbb4306426');
 assert.equal(manifest.cohort.scopeTreeSha,'3937a995d91588afdba190d90755c347a4afa80a');
 assert.equal(manifest.cohort.selection,'ALL_IMMEDIATE_DOT_KT_BLOBS_IN_SCOPE_AT_PINNED_TREE');
 assert.equal(manifest.cohort.files.length,8);
 assert.equal(new Set(manifest.cohort.files.map(x=>x.path)).size,8);
 for(const x of manifest.cohort.files){
  assert.match(x.path,/^kotlinx-coroutines-core\/common\/src\/flow\/[A-Za-z0-9_.-]+\.kt$/);
  assert.match(x.blobSha,/^[a-f0-9]{40}$/);
  assert.ok(Number.isSafeInteger(x.sizeBytes)&&x.sizeBytes>0&&x.sizeBytes<=65536);
 }
 assert.equal(inspectBlock21Freeze(bytes).sourceCount,8);
});
test('metadata-only preregistration never asserts independent truth, coverage, novelty or repair',()=>{
 assert.equal(manifest.protocol.sourceBodiesReadBeforeFreeze,false);
 assert.equal(manifest.protocol.oracleAnswersReadBeforeFreeze,false);
 assert.equal(manifest.protocol.hunterPredictionsRunBeforeFreeze,false);
 assert.equal(manifest.protocol.trainingOrRetuningOnThisCohortForbidden,true);
 assert.equal(manifest.protocol.requireIndependentOracleCommitmentBeforePrediction,true);
 assert.equal(manifest.protocol.requireSealedPredictionsBeforeOracleReveal,true);
 assert.equal(manifest.protocol.allowHunterExecutionInBlock21,false);
 assert.equal(manifest.protocol.allowRemoteWritesInBlock21,false);
 const r=inspectBlock21Freeze(bytes);
 for(const k of ['sourceBodiesAuthenticated','independentTruthSealed','engineExecuted','novelFamilyVerified','automatedRepairVerified','mergeAllowed','remoteWrites'])assert.equal(r[k],false,k);
 for(const k of ['precision','recall','f1','falsePositives','falseNegatives'])assert.equal(r[k],null,k);
 assert.doesNotMatch(bytes.toString('utf8'),/"(positive|negative|line|expectedResult|oracleFile|candidatePatch|accuracy|precision|recall|f1)"\s*:/);
});
test('mutated, missing, or fabricated freeze evidence fails closed',()=>{
 const corrupt=[Buffer.concat([bytes,Buffer.from(' ')]),
  Buffer.from(bytes.toString('utf8').replace('3668a4ff','8668a4ff')),
  Buffer.from(bytes.toString('utf8').replace('"allowRepairInBlock21": false','"allowRepairInBlock21": true')),
  Buffer.from('{}')];
 for(const b of corrupt){
  const r=inspectBlock21Freeze(b);
  assert.equal(r.status,'BLOCKED_INVALID_BLOCK21_FREEZE');
  assert.equal(r.engineExecuted,false);
  assert.equal(r.mergeAllowed,false);
 }
});
