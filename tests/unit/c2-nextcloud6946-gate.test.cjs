'use strict';
const test=require('node:test'), assert=require('node:assert/strict');
const manifest=require('../../docs/quality/C2-NEXTCLOUD-TALK6946-PREAUTHORIZED-SOURCE-20261024.json');
const {authorizeMetadata}=require('../../packages/quality-gates/c2-nextcloud6946-gate.cjs');
const input=()=>({
 request:JSON.parse(JSON.stringify(manifest)),
 pr:{number:6946,created_at:manifest.candidate.createdAt,base:{sha:manifest.candidate.baseSha,repo:{full_name:'nextcloud/talk-android'}},head:{sha:manifest.candidate.headSha}},
 files:JSON.parse(JSON.stringify(manifest.pathScope)),
 owner:{actorId:322222186,repositoryId:1418338512,ref:'refs/heads/main',eventName:'push',mainSha:'a'.repeat(40)}
});
test('exact source-free 16-blob tuple allows owner read but never labels',()=>{
 const r=authorizeMetadata(input());
 assert.equal(r.sourceReadPermitted,true);
 assert.equal(r.changedFiles,16);
 assert.equal(r.exactRuleMatched,false);
 assert.equal(r.originalFixBenignExecuted,false);
 assert.equal(r.newGoldLabels,0);
 assert.equal(r.detectorPredictionsRead,false);
 assert.equal(r.truthSealed,false);
});
test('reject tampered scope, source fields and unauthorized actor',()=>{
 for(const fn of [
 x=>x.files[0].sha='b'.repeat(40),
 x=>x.files.pop(),
 x=>x.files[0].patch='must never inspect',
 x=>x.request.candidate.headSha='b'.repeat(40),
 x=>x.request.rankScore=10,
 x=>x.request.newGoldLabels=1,
 x=>x.owner.actorId=1,
 x=>x.owner.ref='refs/heads/dev',
 x=>x.pr.head.sha='b'.repeat(40),
 x=>x.pr.created_at='2026-01-01T00:00:00Z'
 ]){
  const i=input();fn(i);assert.throws(()=>authorizeMetadata(i),/C2_6946_METADATA_BLOCKED/);
 }
});
