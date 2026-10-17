'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {auditTask,summarizeTasks}=require('../../packages/quality-gates/c2-upstream-task-triage.cjs');
const {PROJECTS}=require('../../packages/quality-gates/c2-kotlin-upstream-candidate-index.cjs');
function fixture(prefix='detekt_detekt',n='4205',f2p=['com.example.RuleTest.test()']){
 const [repository_owner,repository_name]=PROJECTS[prefix].repository.split('/');
 return {name:prefix+'-'+n,toml:`[metadata.source]\nrepository_owner = "${repository_owner}"\nrepository_name = "${repository_name}"\ncode_change_id = "${n}"\n[verifier]\nimplemented = false\n`,expected:{f2p_tests:f2p,p2p_tests:['com.example.SafeTest.test()'],s2p_tests:[],n2p_tests:[]},tomlGitSha:'a'.repeat(40),expectedGitSha:'b'.repeat(40)};
}
test('source expectations do not become manufactured labels',()=>{
 const r=auditTask(fixture());
 assert.equal(r.f2pTests,1);assert.equal(r.p2pTests,1);
 assert.equal(r.triage,'F2P_DECLARED_NOT_REPRODUCED');
 assert.equal(r.beforeFailedVerified,false);assert.equal(r.afterPassedVerified,false);
 assert.equal(r.positiveLabels,0);assert.equal(r.negativeLabels,0);
});
test('no fail-to-pass tests cannot produce a positive',()=>{
 assert.equal(auditTask(fixture('detekt_detekt','4205',[])).triage,'NO_F2P_NOT_POSITIVE');
});
test('spoofed owner, bad SHA and overlapping tests rejected',()=>{
 for(const mutate of [
  x=>x.toml=x.toml.replace('repository_name = "detekt"','repository_name = "other"'),
  x=>x.tomlGitSha='x'.repeat(40),
  x=>x.expected.p2p_tests=x.expected.f2p_tests,
  x=>x.expected.f2p_tests=[123],
  x=>x.expected.s2p_tests=undefined,
  x=>x.name='other-4205'
 ]){const obj=fixture();mutate(obj);assert.throws(()=>auditTask(obj),/C2_UPSTREAM_TASK_TRIAGE_BLOCKED/)}
});
test('106 tasks preserve nine-repo quotas without granting certification',()=>{
 let i=100;
 const entries=Object.entries(PROJECTS).flatMap(([prefix,{tasks}])=>Array.from({length:tasks},()=>fixture(prefix,String(i++),['T'+i])));
 const s=summarizeTasks(entries);
 assert.equal(s.candidateCount,106);assert.equal(s.f2pDeclaredTasks,106);
 assert.equal(s.verifiedOriginalRegressions,0);assert.equal(s.tripleSPlusCertified,false);
 assert.equal(s.precision,null);assert.equal(s.status,'UPSTREAM_EXPECTATIONS_TRIAGED_NOT_EXECUTED');
 assert.throws(()=>summarizeTasks(entries.slice(1)),/C2_UPSTREAM_TASK_TRIAGE_BLOCKED/);
});
