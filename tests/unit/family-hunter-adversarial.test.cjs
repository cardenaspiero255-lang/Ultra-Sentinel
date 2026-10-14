'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const core=require('../../packages/core/ultra_sentinel_core.cjs');
const {present,resolveMode}=require('../../packages/family-hunter/ultra_sentinel_family_hunter_modes.cjs');
const sha='a'.repeat(40);
const android='app/src/main/java/com/example/Engine.kt';
const file=(filename,patch='@@ -0,0 +1 @@\n+class Engine {}\n')=>({filename,status:'added',changes:1,patch});
const analyze=(files)=>core.analyze(files,{sha});
test('Core result is accepted without escalation of authority',()=>{
 const raw=analyze([file(android)]);
 for(const mode of [undefined,'REVIEW_ONLY','REVIEW_WITH_SOLUTIONS','REPAIR_COMMITS_AUTHORIZED']){
  const r=present(raw,mode);
  assert.equal(r.sha,sha);
  assert.equal(r.familyHunter.autoCommitAllowed,false);
  assert.equal(r.familyHunter.autoMergeAllowed,false);
  assert.equal(r.remediations.autoMerge,false);
  assert.equal(r.remediations.verified,false);
 }
});
test('review-only suppresses all suggested repair actions',()=>{
 const raw=analyze([file(android,'@@ -0,0 +1 @@\n+GlobalScope.launch { runTask() }\n')]);
 const r=present(raw,'REVIEW_ONLY');
 assert.deepEqual(r.remediations.suggestions,[]);
 assert.deepEqual(r.validationPlan.checks,[]);
});
test('authorized repair request is never a write authorization',()=>{
 const r=present(analyze([file(android)]),'REPAIR_COMMITS_AUTHORIZED');
 assert.equal(r.familyHunter.status,'AUTHORIZATION_REQUIRED');
 assert.equal(r.familyHunter.repairCommits,'OFF');
});
test('rejects forged clean verdict when findings are critical',()=>{
 const raw=analyze([file(android,'@@ -0,0 +1 @@\n+GlobalScope.launch { runTask() }\n')]);
 if(raw.findings.some(x=>['BLOCKER','HIGH'].includes(x.severity))){
  assert.throws(()=>present({...raw,verdict:'NO_CRITICAL_PATTERN'}),/INCOMPLETE_ANALYSIS/);
 }
});
test('rejects missing provenance and mismatched remediation SHA',()=>{
 const raw=analyze([file(android)]);
 assert.throws(()=>present({...raw,sha:'not-a-sha'}),/INCOMPLETE_ANALYSIS/);
 assert.throws(()=>present({...raw,remediations:{...raw.remediations,sha:'b'.repeat(40)}}),/INCOMPLETE_ANALYSIS/);
});
test('rejects missing diff coverage disguised as complete',()=>{
 const raw=analyze([{filename:android,status:'modified',changes:1,patch:null}]);
 assert.equal(raw.verdict,'INCOMPLETE');
 assert.equal(present(raw).verdict,'INCOMPLETE');
 assert.throws(()=>present({...raw,verdict:'NO_CRITICAL_PATTERN'}),/INCOMPLETE_ANALYSIS/);
});
test('rejects fake curated evidence in suggested fixes',()=>{
 const raw=analyze([file(android,'@@ -0,0 +1 @@\n+GlobalScope.launch { runTask() }\n')]);
 if(raw.remediations.suggestions.length){
  const suggestions=raw.remediations.suggestions.map((x,i)=>i?x:{...x,relatedEvidence:[{type:'playbook',id:'fake',verification:'curated_playbook',score:10,tests:[],evidenceUrl:null}]});
  assert.throws(()=>present({...raw,remediations:{...raw.remediations,suggestions}}),/INCOMPLETE_ANALYSIS/);
 }
});
test('rejects reordered or omitted findings without repair alignment',()=>{
 const raw=analyze([file(android,'@@ -0,0 +1,2 @@\n+GlobalScope.launch { runTask() }\n+Thread.sleep(200)\n')]);
 if(raw.findings.length){
  assert.throws(()=>present({...raw,findings:[]}),/INCOMPLETE_ANALYSIS/);
 }
});
test('unknown mode cannot activate repairs',()=>{
 const mode=resolveMode('EXECUTE_WITHOUT_APPROVAL');
 assert.equal(mode.status,'INVALID_MODE');
 assert.equal(mode.autoCommitAllowed,false);
});
