'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {analyze}=require('../../packages/core/ultra_sentinel_core.cjs');
const {planRepair,planSupervisedCrossFileInvestigation}=require('../../packages/recovery/supervised-repair.cjs');
const sha='a'.repeat(40),newSha='b'.repeat(40);
function file(path){return {filename:path,status:'added',changes:1,
 patch:'@@ -0,0 +1 @@\n+GlobalScope.launch { work() }\n'};}
const first='app/src/main/java/voice/A.kt',second='app/src/main/java/voice/B.kt';
const a=()=>analyze([file(first)],{sha});
function tamper(analysis,suggestions){
 return {...analysis,remediations:{...analysis.remediations,suggestions}};
}
test('proposal path cannot be redirected away from its actual Core finding',()=>{
 const actual=a(),s=actual.remediations.suggestions[0];
 const forged=tamper(actual,[{...s,path:'app/src/main/java/voice/Evil.kt'}]);
 assert.equal(planRepair({analysis:forged}).status,'BLOCKED_EVIDENCE');
});
test('proposal severity, rule and line must bind exactly to the finding',()=>{
 const actual=a(),s=actual.remediations.suggestions[0];
 for(const bad of [{...s,line:s.line+1},{...s,rule:'FAKE_RULE'},
   {...s,severity:'LOW'}]){
  assert.equal(planRepair({analysis:tamper(actual,[bad])}).status,'BLOCKED_EVIDENCE');
 }
});
test('missing, reordered or duplicate repair suggestions fail closed',()=>{
 const actual=analyze([file(first),file(second)],{sha});
 assert.equal(actual.findings.length,2);
 const suggestions=actual.remediations.suggestions;
 assert.equal(planRepair({analysis:tamper(actual,[])}).status,'BLOCKED_EVIDENCE');
 assert.equal(planRepair({analysis:tamper(actual,[suggestions[1],suggestions[0]])}).status,'BLOCKED_EVIDENCE');
 assert.equal(planRepair({analysis:tamper(actual,[suggestions[0],suggestions[0]])}).status,'BLOCKED_EVIDENCE');
});
test('honest Core proposals remain review-only even with a claimed owner approval',()=>{
 const actual=a();
 const result=planRepair({analysis:actual,mode:'REPAIR_COMMITS_AUTHORIZED',
 authorization:{kind:'EXPLICIT_HUMAN_APPROVAL',sha}});
 assert.equal(result.status,'AWAITING_SEPARATE_EXECUTOR');
 assert.equal(result.commitAllowed,false);assert.equal(result.mergeAllowed,false);
});
test('multi-file investigation does not expose forged repair steps',()=>{
 const original=analyze([file(first)],{sha});
 const candidate=analyze([file(first),file(second)],{sha:newSha});
 const forged=tamper(candidate,candidate.remediations.suggestions.map((s,i)=>
  i===0?{...s,path:'app/src/main/java/voice/Unrelated.kt'}:s));
 const response=planSupervisedCrossFileInvestigation({beforeCore:original,afterCore:forged});
 assert.equal(response.status,'BLOCKED_REPAIR_PLAN');
 assert.deepEqual(response.repairSteps,[]);
 assert.equal(response.commitAllowed,false);
});
