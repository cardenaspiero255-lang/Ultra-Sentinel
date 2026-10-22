'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {capturePr150OriginalDetectorBoundary,captureSyntheticPr150Fixture}=require('../../packages/quality-gates/c2-pr150-original-detector-boundary.cjs');
const file='app/src/main/java/com/cardenaspiero255/gamehubultra/domain/SmartRecommendationExplanation.kt';
const source='package com.cardenaspiero255.gamehubultra.domain\nclass Example {\n val good = true\n}\n';
const blob=bytes=>createHash('sha1').update('blob '+Buffer.byteLength(bytes)+'\0').update(bytes).digest('hex');
const sha='4c6912d7ca17df0669f8a0d9667f34d2f2b205a9';
const base='74c5fb9697b2855a1395c9562c2f9b74df9c34c1';
const patch='@@ -0,0 +1,4 @@\n'+source.trimEnd().split('\n').map(x=>'+'+x).join('\n');
function fixture(){
 return {source,expectedSourceBlob:blob(source),expectedSourceLines:4,
  pr:{number:150,head:{sha},base:{sha:base},changed_files:21},
  target:{filename:file,status:'added',sha:blob(source),additions:4,deletions:0,changes:4,patch}};
}
test('RED: genuine Core executes on the exact SHA-bound source and joins only rule/path/line',()=>{
 const result=captureSyntheticPr150Fixture(fixture());
 assert.equal(result.sourceMatchesSuppliedBlob,true);
 assert.equal(result.pinnedOriginalSource,false);
 assert.equal(result.originalPrChangedFiles,21);
 assert.equal(result.fullPrCoverageVerified,false);
 assert.equal(result.coreExecutedOnSuppliedSource,true);
 assert.equal(result.benign.rule,'WEAK_EXTERNAL_EVIDENCE_DOWNGRADES_CONFIDENCE');
 assert.equal(result.benign.path,file);
 assert.equal(result.benign.line,250);
 assert.equal(result.benign.status,'NO_EXACT_DETECTOR_PREDICTION_UNSCORED');
 assert.equal(result.benign.falsePositiveScored,false);
 assert.equal(result.negativeDetectorLabelsScored,0);
 assert.equal(result.measuredFalsePositiveRate,null);
 assert.equal(result.precision,null);
 assert.equal(result.recall,null);
 assert.equal(result.f1,null);
 assert.equal(result.sssPlusCertified,false);
});
test('RED: production entrypoint rejects synthetic non-PR150 source',()=>{
 assert.throws(()=>capturePr150OriginalDetectorBoundary(fixture()),/C2_PR150_DETECTOR_BOUNDARY_BLOCKED/);
});
test('RED: tampered source, patch, source SHA or original PR identity fail closed',()=>{
 const changes=[
  x=>{x.target.sha='0'.repeat(40);},
  x=>{x.pr.head.sha='0'.repeat(40);},
  x=>{x.pr.base.sha='0'.repeat(40);},
  x=>{x.pr.changed_files=20;},
  x=>{x.target.status='modified';},
  x=>{x.target.patch='@@ -0,0 +1,4 @@\n+incomplete';},
  x=>{x.target.additions=5;},
  x=>{x.expectedSourceBlob='0'.repeat(40);},
  x=>{x.target.filename='../unsafe.kt';},
  x=>{x.source=x.source.replace('good','bad');}
 ];
 for(const mutate of changes){
  const x=fixture();mutate(x);
  assert.throws(()=>captureSyntheticPr150Fixture(x),/C2_PR150_DETECTOR_BOUNDARY_BLOCKED/);
 }
});
test('RED: injected alleged findings never substitute for actual Core execution',()=>{
 const invalid=fixture();
 invalid.findings=[{rule:'WEAK_EXTERNAL_EVIDENCE_DOWNGRADES_CONFIDENCE',path:file,line:250}];
 assert.throws(()=>captureSyntheticPr150Fixture(invalid),/C2_PR150_DETECTOR_BOUNDARY_BLOCKED/);
});
