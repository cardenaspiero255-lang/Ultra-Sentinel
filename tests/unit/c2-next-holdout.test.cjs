'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {NEW_LOCK,freezeNextHoldout}=require('../../packages/quality-gates/c2-next-holdout.cjs');
const PRS=[150,151,152,153,154,155,157,158];
const observed=()=>NEW_LOCK.cases.map(c=>({
 pr:c.pr,headSha:c.headSha,baseSha:c.baseSha,changedFiles:c.changedFiles,
 state:c.state,headRepoId:1375408706,baseRepoId:1375408706,
 headOwnerId:322222186,baseOwnerId:322222186
}));
test('preregister eight real unseen PR identities without model outputs or labels',()=>{
 const r=freezeNextHoldout(observed());
 assert.equal(r.status,'FROZEN_INPUT_ONLY');
 assert.deepEqual(r.cases.map(c=>c.pr),PRS);
 assert.equal(r.engineSourceSha,'547938ed88804e25bbabecf74a3c3d91b74cf1a4');
 assert.match(r.packetDigest,/^[a-f0-9]{64}$/);
 assert.equal(r.labelsVerified,0);
 assert.equal(r.candidateInspected,false);
 assert.equal(r.truthLabelsInspected,false);
 assert.equal(r.baselineInspected,false);
 assert.equal(r.precision,null);assert.equal(r.recall,null);assert.equal(r.f1,null);
 assert.equal(r.fpNonRegressionVerified,false);
 assert.equal(r.tripleSPlusCertified,false);assert.equal(r.canRepair,false);
 assert.deepEqual(r,freezeNextHoldout(observed()));
});
test('reject prior development cases and duplicate or reordered unseen cohort',()=>{
 const known=new Set([73,132,159,161,163,172,205,206,208]);
 assert.equal(PRS.some(pr=>known.has(pr)),false);
 for(const changed of [
  a=>a.reverse(),a=>a.pop(),a=>a.push(a[0]),a=>a[0].pr=208,
  a=>a[0].headSha='f'.repeat(40),
  a=>a[0].baseSha='f'.repeat(40),
  a=>a[0].headOwnerId=100,
  a=>a[0].changedFiles=0,
  a=>a[0].state='open',
  a=>a[0].candidateFindings=[],
  a=>a[0].independentLabels=[],
  a=>a[0].baselineScore=1
 ]){
  const a=observed();changed(a);
  assert.throws(()=>freezeNextHoldout(a),/C2_NEXT_HOLDOUT_UNVERIFIED/);
 }
});
test('sealed model and PR count are immutable and do not promise unearned 95%',()=>{
 assert.equal(NEW_LOCK.cases.length,8);
 assert.equal(NEW_LOCK.schema,'ultra-sentinel-c2-next-holdout-packet/v1');
 assert.equal(NEW_LOCK.repository,'cardenaspiero255-lang/gamehub-ultra');
 assert.equal(NEW_LOCK.engineSourceSha,'547938ed88804e25bbabecf74a3c3d91b74cf1a4');
 const packet=freezeNextHoldout(observed());
 assert.equal(packet.currentFindingsCount,0);
 assert.equal(packet.knownCaseTrainingOverlap,0);
 assert.equal(packet.canMerge,false);
});
