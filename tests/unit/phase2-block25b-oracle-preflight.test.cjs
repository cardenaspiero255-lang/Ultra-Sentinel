'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {readOracleSeal,validateOracleSeal}=require('../../scripts/phase2-block25b-oracle-preflight.cjs');
const dir=path.join(__dirname,'../fixtures/phase2-block25b-oracle');
test('two original JVM controls are cryptographically precommitted to frozen v3 and third Git cohort',()=>{
 const s=readOracleSeal();
 assert.equal(s.frozenHunterCommitSha,'49235f854c61c29d55a0307ce4a0348553b2ee1f');
 assert.equal(s.sourceCommitSha,'77c95cc8125015f83ea8fd900404c295fba7276e');
 assert.equal(s.sourceSelectionAlteredAfterCodeRead,false);
 assert.equal(s.hunterPredictionsRun,false);
 assert.equal(s.oraclesExecuted,false);
 assert.equal(s.truthCommitmentBeforePrediction,true);
 assert.equal(validateOracleSeal(dir,s),true);
});
test('altered seal, oracle digest and original references fail closed',()=>{
 const s=readOracleSeal();
 for(const alter of [
  x=>x.oracleFiles[0].sha256='a'.repeat(64),
  x=>x.oracleFiles[1].gitBlobSha='b'.repeat(40),
  x=>x.scopedOriginalControls[0].paths=['core/common/src/internal/math.kt'],
  x=>x.frozenHunterCommitSha='c'.repeat(40),
  x=>x.hunterPredictionsRun=true,
  x=>x.oraclesExecuted=true,
  x=>x.originalPositiveDefectsVerified=true,
  x=>x.precision=1,
  x=>x.fullyLabeledOriginalFiles=6
 ]){
  const changed=structuredClone(s);alter(changed);
  assert.throws(()=>validateOracleSeal(dir,changed));
 }
});
test('original sources remain non-certified even after two narrow independent benign controls',()=>{
 const s=readOracleSeal();
 assert.equal(s.oracleFiles.length,2);
 assert.equal(s.scopedOriginalControls.length,2);
 assert.equal(s.fullyLabeledOriginalFiles,0);
 assert.equal(s.originalPositiveDefectsVerified,false);
 assert.equal(s.independentHumanAuditor,false);
 assert.equal(s.novelCancellationFamilyDiscovered,false);
 assert.equal(s.repairAuthorized,false);
 assert.equal(s.mergeAllowed,false);
 assert.equal(s.precision,null);
 assert.equal(s.recall,null);
 assert.equal(s.f1,null);
});
test('metadata first and no original oracle main is executed in the preregistration workflow',()=>{
 const workflow=fs.readFileSync(path.join(__dirname,'../../.github/workflows/phase2-block25b-oracle-preregister.yml'),'utf8');
 assert.match(workflow,/node scripts\/phase2-block25b-source-attest\.cjs/);
 assert.match(workflow,/node scripts\/phase2-block25b-oracle-preflight\.cjs/);
 assert.match(workflow,/--unshare-all --new-session --clearenv/);
 assert.match(workflow,/--ro-bind "\$GITHUB_WORKSPACE\/tests\/fixtures\/phase2-block25b-oracle"/);
 assert.match(workflow,/ORIGINAL_DATETIME_ORACLES_COMPILED_NOT_EXECUTED/);
 assert.doesNotMatch(workflow,/java\s+-jar/);
 assert.doesNotMatch(workflow,/phase2-blind-cancellation-worker\.cjs/);
});
