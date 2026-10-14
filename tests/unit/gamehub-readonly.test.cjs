'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {reviewGameHubSnapshot}=require('../../packages/orchestrator/gamehub-readonly.cjs');
const sha='a'.repeat(40),repo='cardenaspiero255-lang/gamehub-ultra';
test('GameHub read-only review stays advisory and unverified',()=>{
 const r=reviewGameHubSnapshot({repo,headSha:sha,files:[{
  filename:'app/src/main/java/com/example/Engine.kt',status:'added',changes:1,
  patch:'@@ -0,0 +1 @@\n+GlobalScope.launch { work() }\n'
 }]});
 assert.equal(r.envelope.targetRepo,repo);
 assert.equal(r.envelope.headSha,sha);
 assert.equal(r.envelope.evidenceState,'UNVERIFIED');
 assert.notEqual(r.envelope.verdict,'CLEAR');
 assert.equal(r.report.familyHunter.autoCommitAllowed,false);
 assert.equal(r.report.familyHunter.autoMergeAllowed,false);
 assert.deepEqual(r.report.remediations.suggestions,[]);
});
test('malformed or unrelated source is rejected',()=>{
 const good={repo,headSha:sha,files:[]};
 assert.throws(()=>reviewGameHubSnapshot({...good,repo:'attacker/repo'}),/INVALID_GAMEHUB_SNAPSHOT/);
 assert.throws(()=>reviewGameHubSnapshot({...good,headSha:'bad'}),/INVALID_GAMEHUB_SNAPSHOT/);
 assert.throws(()=>reviewGameHubSnapshot({...good,files:[{filename:'x',status:'modified',patch:12}]}),/INVALID_GAMEHUB_SNAPSHOT/);
});
test('missing diff cannot be misrepresented as verified clean',()=>{
 const r=reviewGameHubSnapshot({repo,headSha:sha,files:[{
  filename:'app/src/main/java/com/example/Engine.kt',status:'modified',changes:1,patch:null
 }]});
 assert.equal(r.envelope.verdict,'INCOMPLETE');
 assert.equal(r.envelope.evidenceState,'UNVERIFIED');
});
