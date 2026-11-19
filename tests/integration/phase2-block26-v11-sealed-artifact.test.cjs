'use strict';
// Regression of the *historically sealed* V11 artifact after the independent
// oracle was prospectively SHA-committed. Not a new cohort, truth or prediction.
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {verifyV11OracleCommitment,verifyPredictionSeal}=require(
 '../../scripts/phase2-block26-v11-independent-judge.cjs');
const root=process.env.SENTINEL_V11_EVIDENCE_DIR;
if(!root)throw Error('REQUIRES_PREVIOUSLY_PUBLISHED_FROZEN_ARTIFACT');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const commitment=verifyV11OracleCommitment();
const raw=fs.readFileSync(path.join(root,'full-prediction-seal.json'));
assert.equal(sha(raw),commitment.predictionSealSha256);
const manifest=JSON.parse(raw),files=Object.create(null);
for(const r of manifest.reportFiles){
 assert.match(r.path,/^candidate-[0-9]{1,3}\/scope-[0-5]\/discovery\.json$/);
 const file=path.resolve(root,r.path);
 assert.ok(file.startsWith(path.resolve(root)+path.sep));
 const stat=fs.lstatSync(file);
 assert.ok(stat.isFile()&&!stat.isSymbolicLink());
 files[r.path]=fs.readFileSync(file);
}
test('V11 verifies every original published report SHA and selected 4-method/2-repository frozen quorum',()=>{
 const result=verifyPredictionSeal(manifest,files);
 assert.equal(result.allSelectedReportsAuthenticated,true);
 assert.equal(result.predictionsSealedBeforeOracle,true);
 assert.equal(result.originalReportCount,manifest.reportFiles.length);
 assert.equal(result.frozenEngineCommit,commitment.frozenEngineCommit);
 assert.equal(result.hypotheses.length,9);
 assert.equal(result.hypotheses.filter(x=>x.cohortId===2).length,9);
});
test('V11 rejects any source/report swap, missing report or byte tampering',()=>{
 const copy={...files},entry=manifest.reportFiles[0];
 delete copy[entry.path];
 assert.throws(()=>verifyPredictionSeal(manifest,copy),/REPORT_SHA_MISMATCH/);
 const bad={...files,[entry.path]:Buffer.from(files[entry.path])};
 bad[entry.path][0]^=1;
 assert.throws(()=>verifyPredictionSeal(manifest,bad),/REPORT_SHA_MISMATCH/);
 const adjusted={...manifest,reportFiles:manifest.reportFiles.map((r,i)=>i===0?{...r,jarSha256:'a'.repeat(64)}:r)};
 assert.throws(()=>verifyPredictionSeal(adjusted,files),/REPORT_CONTENTS/);
});
test('V11 refuses uncommitted rank, altered scope identity, changed original source pool and partial selected reports',()=>{
 assert.throws(()=>verifyPredictionSeal({...manifest,poolSha256:'b'.repeat(64)},files),/MANIFEST/);
 const corrupt={...manifest,reportFiles:manifest.reportFiles.map((r,i)=>
  i===0?{...r,path:'../hidden.json'}:r)};
 assert.throws(()=>verifyPredictionSeal(corrupt,files),/REPORT_METADATA/);
 const selected=manifest.reportFiles.find(x=>x.rank===276);
 assert.ok(selected);
 const partial={...manifest,reportFiles:manifest.reportFiles.filter(x=>x!==selected)};
 assert.throws(()=>verifyPredictionSeal(partial,files),/SELECTED_REPORTS_INCOMPLETE/);
});
