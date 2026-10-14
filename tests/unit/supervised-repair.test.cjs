'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {analyze}=require('../../packages/core/ultra_sentinel_core.cjs');
const {planRepair}=require('../../packages/recovery/supervised-repair.cjs');
const sha='a'.repeat(40);
const file={filename:'app/src/main/java/com/example/Engine.kt',status:'added',changes:1,patch:'@@ -0,0 +1 @@\n+GlobalScope.launch { work() }\n'};
test('review and repair modes never gain GitHub write privileges',()=>{
 const analysis=analyze([file],{sha});
 for(const mode of ['REVIEW_ONLY','REVIEW_WITH_SOLUTIONS','REPAIR_COMMITS_AUTHORIZED']){
  const r=planRepair({analysis,mode,authorization:{kind:'EXPLICIT_HUMAN_APPROVAL',sha}});
  assert.equal(r.commitAllowed,false);
  assert.equal(r.mergeAllowed,false);
 }
});
test('authorization cannot override SHA mismatch',()=>{
 const analysis=analyze([file],{sha});
 const r=planRepair({analysis,mode:'REPAIR_COMMITS_AUTHORIZED',authorization:{kind:'EXPLICIT_HUMAN_APPROVAL',sha:'b'.repeat(40)}});
 assert.equal(r.status,'HUMAN_REVIEW_REQUIRED');
});
test('incomplete evidence blocks even with human approval',()=>{
 const analysis=analyze([{...file,patch:null}],{sha});
 const r=planRepair({analysis,mode:'REPAIR_COMMITS_AUTHORIZED',authorization:{kind:'EXPLICIT_HUMAN_APPROVAL',sha}});
 assert.equal(r.status,'BLOCKED_INCOMPLETE');
 assert.equal(r.commitAllowed,false);
});
test('forged autofix is rejected',()=>{
 const analysis=analyze([file],{sha});
 const suggestions=analysis.remediations.suggestions.map(s=>({...s,autofix:true}));
 const r=planRepair({analysis:{...analysis,remediations:{...analysis.remediations,suggestions}}});
 assert.equal(r.status,'BLOCKED_EVIDENCE');
});
test('explicit approval only produces a non-executable plan',()=>{
 const analysis=analyze([file],{sha});
 const r=planRepair({analysis,mode:'REPAIR_COMMITS_AUTHORIZED',authorization:{kind:'EXPLICIT_HUMAN_APPROVAL',sha}});
 assert.equal(r.status,'AWAITING_SEPARATE_EXECUTOR');
 assert.equal(r.commitAllowed,false);
 assert.ok(Object.isFrozen(r.steps));
});
