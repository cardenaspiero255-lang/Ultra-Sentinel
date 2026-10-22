'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const crypto=require('node:crypto');
const roster=require('../fixtures/c2-upstream-106-task-tree.json');
const {makePrioritizedIntake}=require('../../packages/quality-gates/c2-pr188-label-intake-priority.cjs');
const h=s=>crypto.createHash('sha256').update(s).digest('hex');
test('RED: pinned original 106 tree becomes an actionable, quarantined multi-project intake without gold labels',()=>{
 const before=JSON.stringify(roster),out=makePrioritizedIntake(structuredClone(roster));
 assert.equal(JSON.stringify(roster),before);
 assert.equal(out.sourceRepository,'Kotlin/kotlin-swe-bench');
 assert.equal(out.candidatesTotal,106);
 assert.equal(out.uniqueRepositories,9);
 assert.equal(out.pilot.length,16);
 assert.equal(out.remaining.length,90);
 assert.equal(new Set([...out.pilot,...out.remaining].map(c=>c.task)).size,106);
 assert.equal(out.pilot.filter(x=>x.repository==='detekt/detekt').length,6);
 assert.equal(out.pilot.filter(x=>x.repository==='pinterest/ktlint').length,3);
 assert.equal(new Set(out.pilot.map(x=>x.repository)).size,9);
 assert.ok([...out.pilot,...out.remaining].every(x=>x.groundTruthAdmitted===false&&x.blindHoldoutEligible===false&&x.sourceOriginalVerified===false&&x.reproductionStatus==='PENDING_ORIGINAL_TEST_REPLAY'&&x.causesIndependentlyCertified===false&&x.licenseVerified===false));
 assert.ok(out.pilot.every(x=>x.gates.length===7&&x.gates.every(g=>g.status==='PENDING')));
 assert.equal(out.existingHistoricalLabels,23);
 assert.equal(out.additionalTargetLowerBound,97);
 assert.equal(out.newLabels,0);
 assert.equal(out.independentCausesCertified,0);
 assert.equal(out.tripleSPlusCertified,false);
 assert.equal(out.precision,null);
 assert.equal(out.recall,null);
 assert.equal(out.f1,null);
 assert.equal(out.blindHoldout,false);
 assert.equal(out.publicBenchmarkDisclosure,'REVEALED_NOT_BLIND');
 assert.match(out.planSha256,/^[a-f0-9]{64}$/);
});
test('RED: a deterministically ordered pilot cannot be duplicated, forged or admitted through edited metadata',()=>{
 const baseline=makePrioritizedIntake(structuredClone(roster));
 assert.deepEqual(makePrioritizedIntake(structuredClone(roster)),baseline);
 const mutations=[
  x=>x.entries.pop(),
  x=>x.entries.push({...x.entries[0]}),
  x=>{x.entries[0].sha='0'.repeat(40);},
  x=>{x.entries[0].name='other_project-1234';},
  x=>{x.entries[0].name='detekt_detekt-777777';},
  x=>{x.sourceCommit='0'.repeat(40);},
  x=>{x.tasksTreeSha='0'.repeat(40);},
  x=>{x.entries[0].name='../attack';}
 ];
 for(const mutate of mutations){
  const bad=structuredClone(roster);mutate(bad);
  assert.throws(()=>makePrioritizedIntake(bad),/C2_PR188_PRIORITIZATION_BLOCKED/);
 }
});
