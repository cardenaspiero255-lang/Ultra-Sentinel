'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const request=require('../../docs/quality/C2-NEXTCLOUD-TALK6940-PREAUTHORIZED-SOURCE-20261024.json');
const roster=require('../../docs/quality/C2-BULK-PROSPECTIVE-PR-METADATA-20261024.json');
const eight=require('../../docs/quality/C2-EIGHT-INSPECTED-PR-QUARANTINE-20261024.json');
const prior=[
 require('../../docs/quality/C2-LAWNCHAIR7428-OWNER-RELEASED-DISPOSITION-20261024.json').original,
 require('../../docs/quality/C2-BITWARDEN7499-OWNER-RELEASED-DISPOSITION-20261024.json').candidate,
 require('../../docs/quality/C2-HA7681-OWNER-RELEASED-DISPOSITION-20261024.json').candidate
];
const {validateRankedOwnerSourceRelease}=require('../../packages/quality-gates/c2-ranked-owner-source-release.cjs');
const api={number:6940,created_at:request.candidate.createdAt,head:{sha:request.candidate.headSha},base:{sha:request.candidate.baseSha,repo:{full_name:request.candidate.repository}},state:'open'};
const event={actorId:322222186,repositoryId:1418338512,eventName:'push',ref:'refs/heads/main',commit:'a'.repeat(40)};
const clone=x=>JSON.parse(JSON.stringify(x));

test('first ranked unexposed PR source READ permitted for exact original owner push only, GOLD always zero',()=>{
 const x=validateRankedOwnerSourceRelease({request,roster,eight,prior,api,event,files:request.pathScope});
 assert.equal(x.permission,'OWNER_ONLY_SINGLE_SOURCE_READ');
 assert.equal(x.sourceReadPermitted,true);
 assert.equal(x.ruleMatched,false);
 assert.equal(x.originalOracleExecuted,false);
 assert.equal(x.fixedOracleExecuted,false);
 assert.equal(x.benignOracleExecuted,false);
 assert.equal(x.newGoldLabels,0);
 assert.equal(x.truthSealed,false);
 assert.equal(x.detectorPredictionsRead,false);
 assert.match(x.requestSha256,/^[a-f0-9]{64}$/);
});
test('metadata tampering, exposures, and forged privilege are all denied',()=>{
 const cases=[
  x=>x.event.actorId=45,x=>x.event.repositoryId=1,
  x=>x.event.ref='refs/heads/dev',x=>x.event.eventName='pull_request',
  x=>x.event.commit='bad',x=>x.api.head.sha='a'.repeat(40),
  x=>x.api.base.sha='b'.repeat(40),x=>x.api.created_at='2020-01-01T00:00:00Z',
  x=>x.api.state='draft',x=>x.request.rankScore=14,
  x=>x.request.candidate.pr=6949,x=>x.request.exactRuleId='UNSCOPED_COROUTINE',
  x=>x.request.newGoldLabels=1,x=>x.request.detectorPredictionsRead=true,
  x=>x.request.pathScope[1].sha='0'.repeat(40),
  x=>x.files[1].sha='0'.repeat(40),x=>x.files.pop(),
  x=>x.files[0].patch='source leakage',
  x=>x.files[0].filename='../evil',
  x=>x.prior.push(request.candidate),
  x=>x.eight.disclosures.push({repository:'nextcloud/talk-android',pr:6940,reason:'EXPOSED'})
 ];
 for(let i=0;i<cases.length;i++){
  const x=clone({request,roster,eight,prior,api,event,files:request.pathScope});
  cases[i](x);
  assert.throws(()=>validateRankedOwnerSourceRelease(x),/C2_RANKED_OWNER_RELEASE_BLOCKED/,String(i));
 }
});
