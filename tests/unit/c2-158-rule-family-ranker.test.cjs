'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const roster=require('../../docs/quality/C2-BULK-PROSPECTIVE-PR-METADATA-20261024.json');
const eight=require('../../docs/quality/C2-EIGHT-INSPECTED-PR-QUARANTINE-20261024.json');
const lawnchair=require('../../docs/quality/C2-LAWNCHAIR7428-OWNER-RELEASED-DISPOSITION-20261024.json');
const bitwarden=require('../../docs/quality/C2-BITWARDEN7499-OWNER-RELEASED-DISPOSITION-20261024.json');
const home=require('../../docs/quality/C2-HA7681-OWNER-RELEASED-DISPOSITION-20261024.json');
const {remainingCandidates,rankObservation,rankAll,ruleCatalog}=require('../../packages/quality-gates/c2-158-rule-family-ranker.cjs');
const base={roster,eight,dispositions:[lawnchair,bitwarden,home]};
const clone=x=>JSON.parse(JSON.stringify(x));
const mk=(c,files,status='MATCHED')=>({repository:c.repository,pr:c.pr,baseSha:c.baseSha,headSha:c.headSha,createdAt:c.createdAt,status,files});
const file=(filename,status='modified')=>({filename,status,sha:'f'.repeat(40),additions:3,deletions:2,changes:5});
test('conserves 158 exact untouched identities and excludes all 11 exposed',()=>{
 const list=remainingCandidates(base);
 assert.equal(list.length,158);
 assert.equal(new Set(list.map(x=>x.repository+'#'+x.pr)).size,158);
 for(const x of [...eight.disclosures,lawnchair.original,bitwarden.candidate,home.candidate])
  assert.ok(!list.some(c=>c.repository===x.repository&&c.pr===x.pr));
 assert.equal(ruleCatalog().length,17);
});
test('an Android voice/service file with independent changed test ranks above dependency-only and no-test changes',()=>{
 const c=remainingCandidates(base)[0];
 const hi=rankObservation(mk(c,[file('app/src/main/kotlin/example/voice/SpeechRecognizerService.kt'),file('app/src/test/kotlin/example/voice/SpeechRecognizerServiceTest.kt')]),c);
 const low=rankObservation(mk(c,[file('gradle/libs.versions.toml'),file('gradle.lockfile')]),c);
 const mid=rankObservation(mk(c,[file('app/src/main/kotlin/example/background/WorkerService.kt')]),c);
 assert.equal(hi.eligibility,'POSSIBLE_GENERIC_RULE_FAMILY_UNVERIFIED');
 assert.equal(hi.changedTestPresent,true);
 assert.ok(hi.possibleRuleIds.includes('SPEECH_REENTRANT_RETRY'));
 assert.equal(low.eligibility,'METADATA_DEPENDENCY_ONLY');
 assert.ok(hi.rankScore>mid.rankScore && mid.rankScore>low.rankScore);
 assert.equal(hi.oracleExecuted,false);
 assert.equal(hi.newGoldLabels,0);
 assert.equal(hi.detectorPredictionsRead,false);
 assert.equal(hi.exactRulePathLineConfirmed,false);
});
test('historically path-specific GameHub-only rules cannot be asserted for unrelated external file names',()=>{
 const c=remainingCandidates(base)[0];
 const x=rankObservation(mk(c,[file('app/src/main/kotlin/other/network/NetworkDiagnosticsEngine.kt')]),c);
 for(const id of ['STALE_FRAME_TIMING_ACCEPTED','CROSS_TRANSPORT_LATENCY_MIX','TTS_UTF16_SURROGATE_SPLIT','REFERENCE_TOPIC_MISMATCH'])
  assert.ok(!x.possibleRuleIds.includes(id));
});
test('workflow update is provisional, never a proved privileged checkout nor a pure dependency upgrade',()=>{
 const c=remainingCandidates(base)[0];
 const x=rankObservation(mk(c,[file('.github/workflows/pr.yml')]),c);
 assert.equal(x.eligibility,'WORKFLOW_SECURITY_RULE_UNVERIFIED');
 assert.ok(x.possibleRuleIds.includes('PRIVILEGED_UNTRUSTED_CHECKOUT'));
 assert.equal(x.changedTestPresent,false);
 assert.equal(x.originalTestsVerified,false);
 assert.equal(x.exactRulePathLineConfirmed,false);
});
test('fail closed on tampered or partially disclosed metadata, missing data cannot mean absence of defects',()=>{
 const c=remainingCandidates(base)[0],f=[file('app/src/main/kotlin/demo/SpeechService.kt')];
 const valid=mk(c,f);
 for(const x of [
  {...valid,headSha:'a'.repeat(40)},
  {...valid,files:[{...f[0],patch:'FAKE_SOURCE'}]},
  {...valid,files:[{...f[0],filename:'../.env'}]},
  {...valid,files:[f[0],f[0]]},
  {...valid,files:[{...f[0],sha:'not-sha'}]},
  {...valid,files:[{...f[0],changes:1}]},
  {...valid,files:[]},
  {...valid,detectorPredictionsRead:false},
  {...valid,status:'UNKNOWN'},
  {...valid,status:'DRIFT'},
 ])assert.throws(()=>rankObservation(x,c),/C2_158_RANKING_BLOCKED/);
 const drift=rankObservation(mk(c,[],'DRIFT'),c);
 assert.equal(drift.eligibility,'NOT_RANKED_GIT_IDENTITY_DRIFT');
 assert.equal(drift.rankScore,null);
});
test('whole pool requires exactly one snapshot per candidate including errors; never invents GOLD',()=>{
 const remaining=remainingCandidates(base);
 const observations=remaining.map(c=>mk(c,[],'API_ERROR'));
 const ranked=rankAll({...base,observations});
 assert.equal(ranked.candidatesExamined,158);
 assert.equal(ranked.ranked,0);
 assert.equal(ranked.unavailable,158);
 assert.equal(ranked.releasedSource,false);
 assert.equal(ranked.truthSealed,false);
 assert.equal(ranked.candidatePredictionsRead,false);
 assert.equal(ranked.newGoldLabels,0);
 assert.equal(ranked.originalOracleExecuted,false);
 assert.equal(ranked.remainingUntouched,158);
 assert.deepEqual(ranked.shortlist,[]);
 const duplicate=clone(observations);duplicate[1]=duplicate[0];
 assert.throws(()=>rankAll({...base,observations:duplicate}),/C2_158_RANKING_BLOCKED/);
 const missing=clone(observations);missing.pop();
 assert.throws(()=>rankAll({...base,observations:missing}),/C2_158_RANKING_BLOCKED/);
});
