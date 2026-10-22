'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {capturePr150OriginalDetectorBoundary}=require('../../packages/quality-gates/c2-pr150-original-detector-boundary.cjs');
const file='app/src/main/java/com/cardenaspiero255/gamehubultra/domain/SmartRecommendationExplanation.kt';
const source='package com.cardenaspiero255.gamehubultra.domain\nclass Example {\n val good = true\n}\n';
const blob=bytes=>createHash('sha1').update('blob '+Buffer.byteLength(bytes)+'\\0').update(bytes).digest('hex');
const sha='4c6912d7ca17df0669f8a0d9667f34d2f2b205a9';
const base='74c5fb9697b2855a1395c9562c2f9b74df9c34c1';
const patch='@@ -0,0 +1,4 @@\n'+source.trimEnd().split('\n').map(x=>'+'+x).join('\n')+'\n';
function fixture(){
 return {source,expectedSourceBlob:blob(source),expectedSourceLines:4,
  pr:{number:150,head:{sha},base:{sha:base},changed_files:21},
  target:{filename:file,status:'added',sha:blob(source),additions:4,deletions:0,changes:4,patch}};
}
test('RED: genuine core findings on SHA-pinned original source are linked to strict rule/path/line only',()=>{
 const result=capturePr150OriginalDetectorBoundary(fixture());
 assert.equal(result.originalSourceBlobVerified,true);
 assert.equal(result.exactOriginalHeadVerified,true);
 assert.equal(result.originalPrChangedFiles,21);
 assert.equal(result.fullPrCoverageVerified,false);
 assert.equal(result.coreExecutedOnOriginalSource,true);
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
test('RED: false SHA/partial patch/change count and wrong PR head block original source attribution',()=>{
 const changes=[
  x=>{x.target.sha='0'.repeat(40);},
  x=>{x.pr.head.sha='0'.repeat(40);},
  x=>{x.pr.base.sha='0'.repeat(40);},
  x=>{x.pr.changed_files=20;},
  x=>{x.target.status='modified';},
  x=>{x.target.patch='@@ -0,0 +1,4 @@\n+incomplete\n';},
  x=>{x.target.additions=5;},
  x=>{x.expectedSourceBlob='0'.repeat(40);},
  x=>{x.target.filename='../unsafe.kt';},
  x=>{x.source=x.source.replace('good','bad');}
 ];
 for(const mutate of changes){
  const x=fixture();mutate(x);
  assert.throws(()=>capturePr150OriginalDetectorBoundary(x),/C2_PR150_DETECTOR_BOUNDARY_BLOCKED/);
 }
});
test('RED: pretend reviewer finding cannot be supplied or used to fabricate scored negative',()=>{
 const invalid=fixture();
 invalid.findings=[{rule:'WEAK_EXTERNAL_EVIDENCE_DOWNGRADES_CONFIDENCE',path:file,line:250}];
 assert.throws(()=>capturePr150OriginalDetectorBoundary(invalid),/C2_PR150_DETECTOR_BOUNDARY_BLOCKED/);
});
