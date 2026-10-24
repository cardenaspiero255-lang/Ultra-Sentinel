'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const roster=require('../../docs/quality/C2-BULK-PROSPECTIVE-PR-METADATA-20261024.json');
const eight=require('../../docs/quality/C2-EIGHT-INSPECTED-PR-QUARANTINE-20261024.json');
const dispositions=[
 require('../../docs/quality/C2-LAWNCHAIR7428-OWNER-RELEASED-DISPOSITION-20261024.json'),
 require('../../docs/quality/C2-BITWARDEN7499-OWNER-RELEASED-DISPOSITION-20261024.json'),
 require('../../docs/quality/C2-HA7681-OWNER-RELEASED-DISPOSITION-20261024.json')
];
const nextcloud=require('../../docs/quality/C2-NEXTCLOUD-TALK6940-POSTRELEASE-DISPOSITION-20261024.json');
const {remainingCandidates157,rankMechanismObservation,rankMechanismPool,SCORING_VERSION}=
 require('../../packages/quality-gates/c2-157-mechanism-first-ranker.cjs');
const base={roster,eight,dispositions,nextcloud};
const obs=(c,files,status='MATCHED')=>({repository:c.repository,pr:c.pr,baseSha:c.baseSha,headSha:c.headSha,createdAt:c.createdAt,status,files});
const file=(filename,status='modified')=>({filename,status,sha:'f'.repeat(40),additions:3,deletions:2,changes:5});
const pick=()=>remainingCandidates157(base)[0];
test('RED 157 identities remain after owner-released #6940; frozen 12 must not re-enter ranking',()=>{
 const rows=remainingCandidates157(base);
 assert.equal(rows.length,157);
 assert.equal(new Set(rows.map(c=>c.repository+'#'+c.pr)).size,157);
 assert.ok(!rows.some(c=>c.repository==='nextcloud/talk-android'&&c.pr===6940));
 assert.equal(nextcloud.counts.remainingSourceUninspected,157);
 assert.equal(SCORING_VERSION,'c2-mechanism-hints-v2');
});
test('RED technical path mechanisms decisively outrank generic Android navigation even with added tests',()=>{
 const c=pick();
 const speech=rankMechanismObservation(obs(c,[file('app/src/main/kotlin/example/speech/SpeechRecognizerService.kt')]),c);
 const navigation=rankMechanismObservation(obs(c,[
  file('app/src/main/java/example/navigation/MainActivity.kt'),
  file('app/src/test/java/example/navigation/MainActivityTest.kt','added')]),c);
 assert.ok(speech.mechanismScore>navigation.mechanismScore);
 assert.ok(speech.rankScore>navigation.rankScore);
 assert.ok(speech.possibleRuleIds.includes('SPEECH_REENTRANT_RETRY'));
 assert.equal(navigation.possibleRuleIds.length,0);
 assert.equal(speech.exactRulePathLineConfirmed,false);
 assert.equal(speech.newGoldLabels,0);
 assert.equal(navigation.changedTestPresent,true);
 assert.equal(navigation.originalTestsVerified,false);
 assert.ok(navigation.testBonus<=1);
});
test('RED concrete Kotlin filename signals map only to existing generic frozen rules; each is a hypothesis',()=>{
 const c=pick();
 const expectations=[
  ['app/src/main/kotlin/com/example/coroutines/CoroutineScopeManager.kt','UNSCOPED_COROUTINE'],
  ['app/src/main/kotlin/com/example/thread/BlockingMainThread.kt','BLOCKING_ANDROID_CALL'],
  ['app/src/main/kotlin/com/example/traversal/RecursiveTraversal.kt','UNBOUNDED_RECURSION'],
  ['app/src/main/kotlin/com/example/logger/SensitiveLogRedaction.kt','POTENTIAL_PRIVATE_LOG'],
  ['app/src/main/kotlin/com/example/poller/InfinitePollingLoop.kt','NON_CANCELLABLE_LOOP'],
  ['app/src/main/kotlin/com/example/security/CredentialTokenStore.kt','POTENTIAL_HARDCODED_SECRET'],
  ['app/src/main/kotlin/com/example/performance/ForcedGarbageCollector.kt','FORCED_GC']
 ];
 for(const [filename,rule] of expectations){
  const q=rankMechanismObservation(obs(c,[file(filename)]),c);
  assert.ok(q.possibleRuleIds.includes(rule),filename);
  assert.ok(q.mechanismScore>=5,filename);
  assert.equal(q.ruleConfirmed,false);
  assert.equal(q.originalFixBenignExecuted,false);
  assert.equal(q.detectorPredictionsRead,false);
  assert.equal(q.truthSealed,false);
 }
});
test('RED privileged workflow path signals outrank generic workflow; workflow names not equal actual exploitable checkout',()=>{
 const c=pick();
 const risk=rankMechanismObservation(obs(c,[file('.github/workflows/untrusted-pull-request-target.yml')]),c);
 const generic=rankMechanismObservation(obs(c,[file('.github/workflows/ci.yml')]),c);
 assert.ok(risk.rankScore>generic.rankScore);
 assert.ok(risk.possibleRuleIds.includes('PRIVILEGED_UNTRUSTED_CHECKOUT'));
 assert.equal(generic.possibleRuleIds.length,0);
 assert.equal(risk.originalFixBenignExecuted,false);
 assert.equal(risk.ruleConfirmed,false);
});
test('RED modified original test may add at most 2 bonus points; newly added test at most 1',()=>{
 const c=pick(),src=file('app/src/main/kotlin/example/voice/SpeechService.kt');
 const alone=rankMechanismObservation(obs(c,[src]),c);
 const newTest=rankMechanismObservation(obs(c,[src,file('app/src/test/kotlin/example/voice/SpeechServiceTest.kt','added')]),c);
 const modified=rankMechanismObservation(obs(c,[src,file('app/src/test/kotlin/example/voice/SpeechServiceTest.kt','modified')]),c);
 assert.ok(newTest.rankScore-alone.rankScore<=1);
 assert.ok(modified.rankScore-alone.rankScore<=2);
 assert.equal(modified.originalTestsVerified,false);
 assert.equal(newTest.originalTestsVerified,false);
});
test('RED no discovery by filename means no invented rule; dependency-only and no-Core get zero score',()=>{
 const c=pick();
 for(const files of [
  [file('app/src/main/kotlin/com/example/activities/MainActivity.kt')],
  [file('app/src/main/kotlin/com/example/viewmodel/ExampleViewModel.kt')],
  [file('gradle.lockfile'),file('gradle/libs.versions.toml')],
  [file('src/com/example/voice/SpeechRecognizer.kt')]
 ]){
  const x=rankMechanismObservation(obs(c,files),c);
  assert.equal(x.rankScore,0);
  assert.deepEqual(x.possibleRuleIds,[]);
 }
});
test('RED drift/incomplete/read failures stay unranked and source/patch injected metadata fails closed',()=>{
 const c=pick();
 const incomplete=rankMechanismObservation(obs(c,[],'INCOMPLETE'),c);
 assert.equal(incomplete.rankScore,null);
 const dr=rankMechanismObservation(obs(c,[],'DRIFT'),c);
 assert.equal(dr.rankScore,null);
 const valid=obs(c,[file('app/src/main/kotlin/example/voice/SpeechService.kt')]);
 for(const payload of [
  {...valid,headSha:'0'.repeat(40)},
  {...valid,files:[{...valid.files[0],patch:'UNTRUSTED CODE'}]},
  {...valid,files:[{...valid.files[0],filename:'../unsafe.kt'}]},
  {...valid,files:[{...valid.files[0],changes:99}]},
  {...valid,files:[valid.files[0],valid.files[0]]},
  {...valid,files:[]},
  {...valid,sourceInspected:false},
 ])assert.throws(()=>rankMechanismObservation(payload,c),/C2_157_MECHANISM_RANK_BLOCKED/);
});
test('RED exact 157-row pool seal, no predictions/truth/GOLD; duplicate and missing snapshots fail',()=>{
 const remaining=remainingCandidates157(base);
 const observations=remaining.map(c=>obs(c,[],'API_ERROR'));
 const report=rankMechanismPool({...base,observations});
 assert.equal(report.candidatesExamined,157);
 assert.equal(report.unavailable,157);
 assert.equal(report.ranked,0);
 assert.equal(report.sourcePreviouslyExposed,12);
 assert.deepEqual(report.shortlist,[]);
 assert.equal(report.candidatePredictionsRead,false);
 assert.equal(report.baselinePredictionsRead,false);
 assert.equal(report.originalOracleExecuted,false);
 assert.equal(report.newGoldLabels,0);
 assert.equal(report.truthSealed,false);
 assert.equal(report.tripleSPlusCertified,false);
 assert.throws(()=>rankMechanismPool({...base,observations:observations.slice(1)}),/C2_157_MECHANISM_RANK_BLOCKED/);
 assert.throws(()=>rankMechanismPool({...base,observations:[observations[0],...observations.slice(0,-1)]}),/C2_157_MECHANISM_RANK_BLOCKED/);
});
