'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const root='../../docs/quality/';
const roster=require(root+'C2-BULK-PROSPECTIVE-PR-METADATA-20261024.json');
const eight=require(root+'C2-EIGHT-INSPECTED-PR-QUARANTINE-20261024.json');
const dispositions=[
 require(root+'C2-LAWNCHAIR7428-OWNER-RELEASED-DISPOSITION-20261024.json'),
 require(root+'C2-BITWARDEN7499-OWNER-RELEASED-DISPOSITION-20261024.json'),
 require(root+'C2-HA7681-OWNER-RELEASED-DISPOSITION-20261024.json')];
const nextcloud=require(root+'C2-NEXTCLOUD-TALK6940-POSTRELEASE-DISPOSITION-20261024.json');
const excluded=[
 require(root+'C2-NEXTCLOUD-TALK6946-AUTHENTICATED-DISPOSITION-20261024.json'),
 require(root+'C2-NEXTCLOUD6945-POSTSOURCE-20261024.json')];
const {
 remainingCandidates155,rankSourceFreeV3,rankPool155,scoreVersion
}=require('../../packages/quality-gates/c2-155-integrity-first-ranker.cjs');
const opts={roster,eight,dispositions,nextcloud,excluded};
const mk=(c,files,status='MATCHED')=>({repository:c.repository,pr:c.pr,baseSha:c.baseSha,headSha:c.headSha,createdAt:c.createdAt,status,files});
const file=(filename,add=2,del=0)=>({filename,status:'modified',sha:'f'.repeat(40),additions:add,deletions:del,changes:add+del});
test('RED: exact 155 untouched candidates; neither previously exposed PR can reenter',()=>{
 const remain=remainingCandidates155(opts);
 assert.equal(remain.length,155);
 for(const n of [6940,6945,6946])assert.ok(!remain.some(x=>x.repository==='nextcloud/talk-android'&&x.pr===n));
 assert.equal(new Set(remain.map(x=>x.repository.toLowerCase()+'#'+x.pr)).size,155);
 assert.equal(scoreVersion,'c2-integrity-churn-v3');
});
test('RED: changed test file is not a mechanism: no automatic rule or GOLD',()=>{
 const c=remainingCandidates155(opts)[0];
 const a=rankSourceFreeV3(mk(c,[file('app/src/main/java/example/MainActivity.kt',2),file('app/src/test/java/example/MainActivityTest.kt',30)]),c);
 assert.equal(a.rankScore,0);
 assert.equal(a.sourceReadAuthorized,false);
 assert.deepEqual(a.possibleRuleIds,[]);
 assert.equal(a.newGoldLabels,0);
});
test('RED: actual production additions needed for a filename hint; pure deletions never scored',()=>{
 const c=remainingCandidates155(opts)[0];
 const path='app/src/main/java/example/logging/LogRedaction.kt';
 const del=rankSourceFreeV3(mk(c,[file(path,0,1)]),c);
 const add=rankSourceFreeV3(mk(c,[file(path,3,0)]),c);
 assert.equal(del.rankScore,0);
 assert.deepEqual(del.possibleRuleIds,[]);
 assert.ok(add.rankScore>0);
 assert.ok(add.possibleRuleIds.includes('POTENTIAL_PRIVATE_LOG'));
 assert.equal(add.exactRulePathLineConfirmed,false);
});
test('RED: bulky 258-file candidate must be flagged metadata-only and no automatic owner release',()=>{
 const c=remainingCandidates155(opts).find(x=>x.repository==='nextcloud/android'&&x.pr===17870);
 assert.ok(c);
 const files=[file('app/src/main/java/example/LoggerImpl.kt',0,1)];
 for(let i=1;i<258;i++)files.push(file('app/src/main/java/example/helpers/Tiny'+i+'.kt',i%9===0?1:0,1));
 const x=rankSourceFreeV3(mk(c,files),c);
 assert.equal(x.filesChanged,258);
 assert.equal(x.eligibility,'BULK_CHURN_PRE_READ_CAUTION');
 assert.equal(x.rankScore,0);
 assert.equal(x.sourceReadAuthorized,false);
 assert.equal(x.originalOracleExecuted,false);
 assert.equal(x.exactRulePathLineConfirmed,false);
});
test('RED: 155 exact observations and drift preserved unranked; no truth/GOLD',()=>{
 const rem=remainingCandidates155(opts);
 const observations=rem.map(c=>mk(c,[],'API_ERROR'));
 const x=rankPool155({...opts,observations});
 assert.equal(x.candidatesExamined,155);
 assert.equal(x.sourcePreviouslyExposed,14);
 assert.equal(x.remainingUntouched,155);
 assert.equal(x.newGoldLabels,0);
 assert.equal(x.releasedSource,false);
 assert.equal(x.sourceReadAuthorized,false);
 assert.equal(x.truthSealed,false);
 assert.equal(x.detectorPredictionsRead,false);
 assert.deepEqual(x.shortlist,[]);
 assert.throws(()=>rankPool155({...opts,observations:observations.slice(1)}),/C2_155_INTEGRITY_RANK_BLOCKED/);
 assert.throws(()=>rankPool155({...opts,observations:[observations[0],...observations.slice(0,-1)]}),/C2_155_INTEGRITY_RANK_BLOCKED/);
});
test('RED: altered owner-source disposition and untrusted metadata fail closed',()=>{
 const cfg=JSON.parse(JSON.stringify(opts));
 cfg.excluded[0].candidate.headSha='0'.repeat(40);
 assert.throws(()=>remainingCandidates155(cfg),/C2_155_INTEGRITY_RANK_BLOCKED/);
 const c=remainingCandidates155(opts)[0];
 const f=file('app/src/main/java/example/voice/SpeechService.kt',4,0);
 assert.throws(()=>rankSourceFreeV3({...mk(c,[f]),files:[{...f,patch:'LEAK'}]},c),/C2_155_INTEGRITY_RANK_BLOCKED/);
});
