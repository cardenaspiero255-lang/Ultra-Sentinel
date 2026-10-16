'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {NEW_LOCK}=require('../../packages/quality-gates/c2-next-holdout.cjs');
const {verifyEightSourceCompares}=require('../../packages/quality-gates/c2-source-universe.cjs');
const {auditCoreEligibility}=require('../../packages/quality-gates/c2-core-eligibility.cjs');
function input(){
 const cmps=NEW_LOCK.cases.map((p,i)=>({status:'ahead',base_commit:{sha:p.baseSha},
 merge_base_commit:{sha:p.baseSha},commits:[{sha:p.headSha}],
 files:Array.from({length:p.changedFiles},(_,j)=>({
  filename:j===0?'app/src/test/Case'+i+'Test.kt':'app/src/main/Source'+i+'Case'+j+'.kt',
  sha:crypto.createHash('sha1').update(i+':'+j).digest('hex'),
  status:'modified',additions:1,deletions:1,
  patch:'@@ -1 +1 @@\n-old\n+new\n'
 }))}));
 return verifyEightSourceCompares(cmps);
}
test('input entry coverage is not analyzed-code coverage for frozen Core',()=>{
 const a=auditCoreEligibility(input());
 assert.equal(a.totalInputFileEntries,241);
 assert.equal(a.coreProductionEligibleUpperBound,233);
 assert.equal(a.coreExcludedFileEntries,8);
 assert.equal(a.eligibilityPerPr.length,8);
 assert.equal(a.status,'BLOCKED_FROZEN_CORE_ANALYZED_COUNT');
 assert.equal(a.fullCoreAnalysis241Proven,false);
 assert.equal(a.fullInputDelivery241Proven,true);
 assert.equal(a.detectorExecuted,false);
 assert.equal(a.benchmarkScoredLabels,0);
 assert.equal(a.precision,null);
 assert.equal(a.tripleSPlusCertified,false);
 assert.equal(a.legacyBaselineCoreBlob,'db29f94be1e0afb791a241d26f449695df0eafd0');
});
test('tampered inventory, extra file, source-digest changes or inconsistent counts fail closed',()=>{
 for(const edit of [
  x=>x.sourceInventorySha256='f'.repeat(64),
  x=>x.sourceMetadataVerified=false,
  x=>x.cases[0].files.pop(),
  x=>x.cases[0].files[0].path='../../etc/passwd',
  x=>x.cases[1].headSha='f'.repeat(40),
  x=>x.changedFileEntries=250,
  x=>x.cases[2].files[0].githubPatchBytes=-1,
  x=>x.truth={labels:[]}
 ]){const x=structuredClone(input());edit(x);
  assert.throws(()=>auditCoreEligibility(x),/C2_CORE_ELIGIBILITY_BLOCKED/);}
});
