'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {inspectProspectiveFreeze,captureProspectivePredictions}=
 require('../../packages/quality-gates/phase2-prospective-hunter-freeze.cjs');
const location=path.resolve(__dirname,'../../docs/quality/PHASE2-PROSPECTIVE-HUNTER-FREEZE-20261111.json');
const bytes=fs.readFileSync(location);
const manifest=JSON.parse(bytes);
const expectedGitBlob='9679e6063491d9a16a5e2d5679982400d400b917';
const gitBlob=b=>crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
function prediction(){
 return {schema:'ultra-sentinel-phase2-prospective-predictions/v1',
  manifestBlobSha:expectedGitBlob,
  engineCommitSha:manifest.engine.commitSha,
  holdoutCommitSha:manifest.holdout.commitSha,
  snapshots:manifest.holdout.files.map(x=>({path:x.path,expectedBlobSha:x.blobSha,findings:[]}))};
}
test('freeze is byte-pinned, covers nine unseen external Kotlin source blobs and never supplies labels',()=>{
 assert.equal(gitBlob(bytes),expectedGitBlob);
 const report=inspectProspectiveFreeze(bytes);
 assert.equal(report.status,'FROZEN_SOURCE_METADATA_ONLY');
 assert.equal(report.manifestBlobSha,expectedGitBlob);
 assert.equal(report.engineCommitSha,'2db0d9890d437ea407b61349203c94e3d76f2d5b');
 assert.equal(report.sourceCount,9);
 assert.equal(report.holdoutRepository,'android/nowinandroid');
 assert.equal(report.authenticatedSourceEvidence,false);
 assert.equal(report.independentTruthSealed,false);
 assert.equal(report.trainingDisjointnessAuthenticated,false);
 assert.equal(report.novelFamilyVerified,false);
 assert.equal(report.precision,null);
 assert.equal(report.falsePositiveCount,null);
 assert.equal(report.tripleSPlusCertified,false);
});
test('manifest must not contain oracle answers, baseline predictions or source bodies',()=>{
 assert.equal(manifest.protocol.truthCommitmentSha256,null);
 assert.equal(manifest.protocol.labelsReadBeforeFreeze,false);
 assert.equal(manifest.protocol.predictionsReadBeforeFreeze,false);
 assert.equal(JSON.stringify(manifest).includes('candidateSource'),false);
 assert.equal(JSON.stringify(manifest).includes('originalOracle'),false);
 const report=inspectProspectiveFreeze(bytes);
 assert.equal(report.sourceCount,manifest.holdout.files.length);
});
test('sealed zero-hit source reports are an abstention, never zero false positives',()=>{
 const report=captureProspectivePredictions(bytes,prediction());
 assert.equal(report.status,'PREDICTIONS_SEALED_NO_INDEPENDENT_TRUTH');
 assert.equal(report.filesCovered,9);
 assert.equal(report.unverifiedFindings,0);
 assert.equal(report.verifiableFalsePositives,null);
 assert.equal(report.precision,null);
 assert.equal(report.recall,null);
 assert.equal(report.f1,null);
 assert.equal(report.falsePositiveRate,null);
 assert.equal(report.verifiedRepairs,0);
 assert.equal(report.engineExecutedAndAuthenticated,false);
 assert.equal(report.tripleSPlusCertified,false);
 assert.match(report.predictionDigest,/^[a-f0-9]{64}$/);
});
test('partial, duplicate, ambiguous or purported truth-bearing predictions fail closed',()=>{
 const base=prediction(),one=manifest.holdout.files[0];
 const attacks=[
  x=>x.snapshots.pop(),
  x=>x.snapshots[0]=x.snapshots[1],
  x=>x.snapshots[0].path='../foo.kt',
  x=>x.snapshots[0].expectedBlobSha='a'.repeat(40),
  x=>x.snapshots[0].findings.push({rule:'UNRELATED',path:one.path,line:0,expectedBlobSha:one.blobSha,status:'HYPOTHESIS_REQUIRES_INDEPENDENT_KOTLIN_ORACLE'}),
  x=>x.snapshots[0].findings.push({rule:'UNRELATED',path:one.path,line:1,expectedBlobSha:one.blobSha,status:'VERIFIED'}),
  x=>x.manifestBlobSha='f'.repeat(40),
  x=>x.engineCommitSha='b'.repeat(40),
  x=>x.holdoutCommitSha='c'.repeat(40),
  x=>x.truth={positive:true},
  x=>x.snapshots[0].findings.push({rule:'RULE',path:one.path,line:1,expectedBlobSha:one.blobSha,status:'HYPOTHESIS_REQUIRES_INDEPENDENT_KOTLIN_ORACLE',positive:true})
 ];
 for(const edit of attacks){
  const p=prediction();edit(p);
  const output=captureProspectivePredictions(bytes,p);
  assert.equal(output.status,'BLOCKED_PROSPECTIVE_PREDICTIONS');
  assert.equal(output.falsePositiveCount,null);
 }
});
test('unverified findings remain advisory even when their lines and blobs are pinned',()=>{
 const x=prediction(),f=manifest.holdout.files[0];
 x.snapshots[0].findings=[{rule:'AMBIGUOUS_DELIMITED_IDENTITY',path:f.path,line:17,expectedBlobSha:f.blobSha,status:'HYPOTHESIS_REQUIRES_INDEPENDENT_KOTLIN_ORACLE'}];
 const r=captureProspectivePredictions(bytes,x);
 assert.equal(r.unverifiedFindings,1);
 assert.equal(r.verifiedRepairs,0);
 assert.equal(r.falsePositiveCount,null);
 assert.equal(r.precision,null);
 assert.equal(r.findingsByCase[0].count,1);
 assert.equal(Object.isFrozen(r.findingsByCase[0]),true);
});
test('forged changes in frozen engine, holdout, policy or whitespace invalidate byte seal',()=>{
 for(const change of [
  b=>Buffer.concat([b,Buffer.from(' ')]),
  b=>Buffer.from(b.toString('utf8').replace('2982e63c','9982e63c')),
  b=>Buffer.from(b.toString('utf8').replace('true','false')),
  b=>Buffer.from(b.toString('utf8').replace('9679e','9678e'))
 ]){
  const mutated=change(bytes);
  assert.equal(inspectProspectiveFreeze(mutated).status,'BLOCKED_UNTRUSTED_FREEZE');
 }
});
test('reject active JavaScript getters and proxies without performing their side effects',()=>{
 const one=prediction(),f=manifest.holdout.files[0];let calls=0;
 Object.defineProperty(one.snapshots[0],'findings',{enumerable:true,get(){calls++;throw Error('getter');}});
 assert.equal(captureProspectivePredictions(bytes,one).status,'BLOCKED_PROSPECTIVE_PREDICTIONS');
 const prox=new Proxy(prediction(),{ownKeys(){calls++;throw Error('proxy');}});
 assert.equal(captureProspectivePredictions(bytes,prox).status,'BLOCKED_PROSPECTIVE_PREDICTIONS');
 assert.equal(calls,0);
});
test('full label coverage is a prerequisite to any scoring, not a fabricated zero',()=>{
 const p=prediction();
 p.snapshots[0].findings.push({rule:'OTHER',path:p.snapshots[0].path,line:1,expectedBlobSha:p.snapshots[0].expectedBlobSha,status:'HYPOTHESIS_REQUIRES_INDEPENDENT_KOTLIN_ORACLE'});
 const r=captureProspectivePredictions(bytes,p);
 assert.equal(r.status,'PREDICTIONS_SEALED_NO_INDEPENDENT_TRUTH');
 assert.equal(r.verifiedNegativeLabels,0);
 assert.equal(r.verifiedPositiveLabels,0);
 assert.equal(r.falsePositiveRate,null);
 assert.equal(r.precision,null);
 assert.equal(r.recall,null);
});
