'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const request=require('../../docs/quality/C2-NEXTCLOUD6945-SOURCE-REQUEST-20261024.json');
const {authorizeMetadata}=require('../../packages/quality-gates/c2-nextcloud6945-source-release.cjs');
const snapshot=()=>({
 request:JSON.parse(JSON.stringify(request)),
 pr:{number:6945,created_at:request.candidate.createdAt,
  base:{sha:request.candidate.baseSha,repo:{full_name:'nextcloud/talk-android'}},
  head:{sha:request.candidate.headSha}},
 files:JSON.parse(JSON.stringify(request.pathScope)),
 owner:{actorId:322222186,repositoryId:1418338512,ref:'refs/heads/main',
  eventName:'push',mainSha:'a'.repeat(40)}
});
test('source-free one blob permission cannot mint GOLD or interpret filename',()=>{
 const a=authorizeMetadata(snapshot());
 assert.equal(a.candidate.pr,6945);
 assert.equal(a.changedFiles,1);
 assert.equal(a.sourceReadPermitted,true);
 assert.equal(a.exactRuleMatched,false);
 assert.equal(a.detectorPredictionsRead,false);
 assert.equal(a.originalFixBenignExecuted,false);
 assert.equal(a.newGoldLabels,0);
 assert.equal(a.truthSealed,false);
});
test('all forged identities, fields and source patches fail closed',()=>{
 for(const f of [
  i=>i.request.previouslyExposed=12,
  i=>i.request.candidate.pr=6946,
  i=>i.request.rankScore=9,
  i=>i.request.newGoldLabels=1,
  i=>i.owner.actorId=1,
  i=>i.owner.ref='refs/heads/feature',
  i=>i.files[0].patch='RAW SOURCE',
  i=>i.files[0].sha='0'.repeat(40),
  i=>i.files[0].filename='bad/../evil',
  i=>i.files=[],
  i=>i.pr.base.sha='0'.repeat(40),
  i=>i.pr.created_at='2020-01-01T00:00:00Z'
 ]){const i=snapshot();f(i);assert.throws(()=>authorizeMetadata(i),/C2_6945_METADATA_BLOCKED/);}
});
test('preseal is the exact ranking V2 cohort and closed/merged PR SHA snapshot',()=>{
 assert.equal(request.candidate.pr,6945);
 assert.equal(request.previouslyExposed,13);
 assert.equal(request.sourceRankingRunId,40143252243);
 assert.equal(request.rankScore,8);
 assert.equal(request.pathScope[0].filename,'app/src/main/java/com/nextcloud/talk/api/LoggingHttpInterceptor.kt');
 assert.equal(request.exactRuleId,null);
});
