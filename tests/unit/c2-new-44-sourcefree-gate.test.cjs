'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const manifest=require('../../docs/quality/C2-44-NEW-EXTERNAL-PRESEAL-20261024.json');
const roster=require('../../docs/quality/C2-BULK-PROSPECTIVE-PR-METADATA-20261024.json');
const {remainingCandidates155}=require('../../packages/quality-gates/c2-155-integrity-first-ranker.cjs');
const {
 auditExpandedPreseal,assessNewExternalBatch
}=require('../../packages/quality-gates/c2-new-44-sourcefree-gate.cjs');
const old={roster,
 eight:require('../../docs/quality/C2-EIGHT-INSPECTED-PR-QUARANTINE-20261024.json'),
 dispositions:[
  require('../../docs/quality/C2-LAWNCHAIR7428-OWNER-RELEASED-DISPOSITION-20261024.json'),
  require('../../docs/quality/C2-BITWARDEN7499-OWNER-RELEASED-DISPOSITION-20261024.json'),
  require('../../docs/quality/C2-HA7681-OWNER-RELEASED-DISPOSITION-20261024.json')],
 nextcloud:require('../../docs/quality/C2-NEXTCLOUD-TALK6940-POSTRELEASE-DISPOSITION-20261024.json'),
 excluded:[
  require('../../docs/quality/C2-NEXTCLOUD-TALK6946-AUTHENTICATED-DISPOSITION-20261024.json'),
  require('../../docs/quality/C2-NEXTCLOUD6945-POSTSOURCE-20261024.json')]
};
const clone=x=>JSON.parse(JSON.stringify(x));
const row=(c,status='API_ERROR',files=[])=>({...c,status,files});
const path=(name,add=3,del=1)=>({filename:name,status:'modified',sha:'b'.repeat(40),additions:add,deletions:del,changes:add+del});
test('RED: freeze 44 previously unseen identities from 11 NEW repos; keep 155 old untouched',()=>{
 const m=auditExpandedPreseal(manifest,old);
 assert.equal(m.newCandidates,44);
 assert.equal(m.totalUniqueOriginalPlusNew,213);
 assert.equal(m.untouchedCombined,199);
 assert.equal(m.oldPreviouslyExposed,14);
 assert.equal(m.independentCausesCertified,0);
 assert.equal(m.sourceReadAuthorized,false);
 assert.equal(m.newGoldLabels,0);
 assert.equal(new Set(manifest.candidates.map(c=>c.repository.toLowerCase())).size,11);
});
test('RED: all 44 cases processed in parallel report, source-free; no permission or GOLD',()=>{
 const a=assessNewExternalBatch(manifest,old,manifest.candidates.map(x=>row(x)));
 assert.equal(a.candidatesExamined,44);
 assert.equal(a.apiUnavailable,44);
 assert.equal(a.sourceReadAuthorized,false);
 assert.equal(a.originalOracleExecuted,false);
 assert.equal(a.truthSealed,false);
 assert.equal(a.newGoldLabels,0);
 assert.equal(a.detectorPredictionsRead,false);
 assert.equal(a.candidatePredictionsRead,false);
 assert.deepEqual(a.shortlist,[]);
});
test('RED: meaningful Android filename is STILL only a heuristic, no rule match or auto release',()=>{
 const all=manifest.candidates.map(x=>row(x));
 all[0]=row(manifest.candidates[0],'MATCHED',[path('app/src/main/java/example/coroutines/CoroutineScopeManager.kt')]);
 const a=assessNewExternalBatch(manifest,old,all);
 assert.equal(a.matchedCandidates,1);
 assert.equal(a.apiUnavailable,43);
 assert.equal(a.sourceReadAuthorized,false);
 assert.equal(a.ownerGateRequiredCount,1);
 assert.equal(a.newGoldLabels,0);
 assert.equal(a.truthSealed,false);
 assert.equal(a.shortlist[0].candidate.pr,manifest.candidates[0].pr);
 assert.equal(a.shortlist[0].exactRulePathLineConfirmed,false);
});
test('RED: reject any injected source, extra old candidate, forged dates and bad blob metadata',()=>{
 const cases=[
  c=>c.newCandidateCount=45,
  c=>c.candidates[0].headSha='0'.repeat(40),
  c=>c.candidates[0].repository='cardenaspiero255-lang/Ultra-Sentinel',
  c=>{c.candidates[0].repository=roster.candidates[0].repository;c.candidates[0].pr=roster.candidates[0].pr;},
  c=>c.candidates[0].createdAt='2020-01-01T00:00:00Z',
  c=>c.candidates[0].patch='source',
  c=>c.sourceInspected=true,
  c=>c.newGoldLabels=111
 ];
 cases.forEach((mutate,caseIndex)=>{const i=clone(manifest);mutate(i);
  assert.throws(()=>auditExpandedPreseal(i,old),/C2_44_NEW_EXTERNAL_BLOCKED/, 'invalid candidate case '+caseIndex);
 });
 const bad=manifest.candidates.map(x=>row(x));
 bad[0].files=[{...path('app/src/main/java/example/Logger.kt'),patch:'RAW'}];bad[0].status='MATCHED';
 assert.throws(()=>assessNewExternalBatch(manifest,old,bad),/C2_44_NEW_EXTERNAL_BLOCKED/);
});
test('RED: no duplicates, missing observations, or metadata identity drift promoted as comparable',()=>{
 const rows=manifest.candidates.map(x=>row(x));
 rows[0].headSha='0'.repeat(40);
 assert.throws(()=>assessNewExternalBatch(manifest,old,rows),/C2_44_NEW_EXTERNAL_BLOCKED/);
 const missing=manifest.candidates.map(x=>row(x)).slice(1);
 assert.throws(()=>assessNewExternalBatch(manifest,old,missing),/C2_44_NEW_EXTERNAL_BLOCKED/);
 const bad=manifest.candidates.map(x=>row(x));
 bad[1]=bad[0];
 assert.throws(()=>assessNewExternalBatch(manifest,old,bad),/C2_44_NEW_EXTERNAL_BLOCKED/);
});
