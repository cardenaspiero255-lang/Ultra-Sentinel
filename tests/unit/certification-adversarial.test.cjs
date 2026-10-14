'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const root=join(__dirname,'../..');
const read=name=>readFileSync(join(root,name),'utf8');
const {summarizeShadow}=require('../../packages/orchestrator/gamehub-shadow.cjs');
const {stageRepairDraft}=require('../../packages/recovery/repair-draft.cjs');
const sha='a'.repeat(40),repo='cardenaspiero255-lang/gamehub-ultra';
test('cross-repo workflows never execute pull_request_target or grant write permissions',()=>{
 for(const file of ['gamehub-readonly.yml','gamehub-shadow.yml']){
  const yml=read('.github/workflows/'+file);
  assert.doesNotMatch(yml,/pull_request_target\s*:/);
  assert.doesNotMatch(yml,/contents:\s*write/);
  assert.doesNotMatch(yml,/pull-requests:\s*write/);
  assert.match(yml,/permissions:\s*\n\s+contents:\s+read/);
  assert.match(yml,/persist-credentials:\s*false/);
  assert.match(yml,/github\.token/);
 }
});
test('runtime integration modules export no GitHub mutation entry points',()=>{
 for(const name of ['gamehub-live-reader','gamehub-shadow','gamehub-github-evidence']){
  const api=require('../../packages/orchestrator/'+name+'.cjs');
  assert.ok(Object.keys(api).length===1);
  assert.ok(Object.keys(api).every(x=>!/(write|commit|merge|delete|apply|push)/i.test(x)));
 }
});
test('malicious attempts to force a verified verdict or executable repair are inert',()=>{
 const review={pr:201,changedFiles:1,authenticated:true,headStable:true,completeDiff:true,
  mergeAllowed:false,envelope:{targetRepo:repo,headSha:sha,verdict:'CLEAR',evidenceState:'VERIFIED'}};
 const report=summarizeShadow(review,{headSha:sha,runs:[]});
 assert.equal(report.independentAuditVerified,false);
 assert.equal(report.semanticEquivalenceVerified,false);
 const staged=stageRepairDraft({authorization:{schemaVersion:1,repository:repo,actor:'imposter'},
  prNumber:201,expectedHeadSha:sha,changes:[]});
 assert.equal(staged.commitAllowed,false);
 assert.equal(staged.mergeAllowed,false);
});
