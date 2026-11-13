'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {readOracleSeal,validateOracleSeal}=require('../../scripts/phase2-block25d-ktor-oracle-preflight.cjs');
const dir=path.join(__dirname,'../fixtures/phase2-block25d-ktor-oracle');
test('fourth Ktor original oracle code fixed by SHA256 before any prediction or JVM execution',()=>{
 const s=readOracleSeal();
 assert.equal(s.frozenV4Sha,'84c824ce6bfe3d260296108e955bbbc4624e6b7e');
 assert.equal(s.sourceCommitSha,'599e1340c718e501bf5fba080b0ade00b49a893f');
 assert.equal(s.oracleFiles.length,1);
 assert.equal(s.scopedBenignControls[0].paths.length,1);
 assert.equal(s.oracleCommitBeforePrediction,true);
 assert.equal(s.hunterPredictionsEverExecutedOnThisCohort,false);
 assert.equal(s.oracleExecuted,false);
 assert.equal(s.sourceFilesFullyLabeled,0);
 assert.equal(s.originalNovelDefectsConfirmed,0);
 assert.equal(s.precision,null);
 assert.equal(validateOracleSeal(s,dir),true);
});
test('oracle SHA256, scope, truth and frozen source identity tampering fail closed',()=>{
 const s=readOracleSeal();
 for(const mutate of [
  x=>x.oracleFiles[0].sha256='a'.repeat(64),
  x=>x.oracleFiles[0].gitBlobSha='0'.repeat(40),
  x=>x.scopedBenignControls[0].paths=['other/path.kt'],
  x=>x.sourceCommitSha='b'.repeat(40),
  x=>x.oracleExecuted=true,
  x=>x.hunterPredictionsEverExecutedOnThisCohort=true,
  x=>x.originalNovelDefectsConfirmed=1,
  x=>x.precision=1,
  x=>x.sourceFilesFullyLabeled=7
 ]){
  const modified=structuredClone(s);mutate(modified);
  assert.throws(()=>validateOracleSeal(modified,dir));
 }
});
test('precommit workflow authenticates original 7 Git blobs, compiles with no-network JVM, executes neither Hunter nor oracles',()=>{
 const yaml=fs.readFileSync(path.join(__dirname,'../../.github/workflows/phase2-block25d-ktor-oracle-precommit.yml'),'utf8');
 assert.match(yaml,/ref: 84c824ce6bfe3d260296108e955bbbc4624e6b7e/);
 assert.match(yaml,/ref: 599e1340c718e501bf5fba080b0ade00b49a893f/);
 assert.match(yaml,/phase2-block25d-fourth-cohort-attest\.cjs/);
 assert.match(yaml,/phase2-block25d-ktor-oracle-preflight\.cjs/);
 assert.match(yaml,/--unshare-all --new-session --clearenv/);
 assert.match(yaml,/FOURTH_KTOR_JVM_ORACLE_COMPILED_NOT_EXECUTED/);
 assert.doesNotMatch(yaml,/java\s+-jar/);
 assert.doesNotMatch(yaml,/phase2-blind-cancellation-v4-worker\.cjs/);
});
