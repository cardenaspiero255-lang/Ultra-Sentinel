'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {blobSha}=require('../../packages/investigation/novel-kotlin-hypotheses.cjs');
const {makeTermuxCandidate}=require('../../packages/recovery/jarvis-termux-original-fix.cjs');
const {drillNovelKotlinCandidateBatch}=
 require('../../packages/recovery/novel-kotlin-batch-local-judge.cjs');
const HEAD='f2572a8abb0a1ef5b34d971ea8c4dc5acbecf868';
const DIR='apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/';
const original=fs.readFileSync(path.join(__dirname,'../fixtures/pinned-jarvis-termux-original.kt'),'utf8');
const safe=makeTermuxCandidate(original);
const voice=[
 'class VoiceRecognitionRequestGate {',
 ' private var startedAtMillis: Long? = null',
 ' fun isPending(nowMillis: Long): Boolean {',
 '  val started = startedAtMillis ?: return false',
 '  if (nowMillis < started) return false',
 '  return nowMillis - started < 180000L',
 ' }',
 ' fun consume(nowMillis: Long): Boolean { val accepted = isPending(nowMillis); cancel(); return accepted }',
 ' fun cancel() { startedAtMillis = null }','}',''
].join('\n');
const voiceFixed=voice.replace('if (nowMillis < started) return false',
 'if (nowMillis < started) { cancel(); return false }');
const mk=(p,s,c,rule)=>({file:{path:p,source:s,expectedBlobSha:blobSha(s)},
 proposal:{path:p,rule,candidateSource:c,expectedCandidateBlobSha:blobSha(c)}});
function inputs(termuxRepair=safe.candidate){
 const cases=[
  mk(DIR+'CompanionResultPolicy.kt',original,termuxRepair,
   'REGEX_PREFIX_AS_COMPLETE_VALIDATION'),
  mk(DIR+'VoiceRecognitionRequestGate.kt',voice,voiceFixed,
   'CLOCK_ROLLBACK_WITHOUT_INVALIDATION')
 ];
 return {expectedCommitSha:HEAD,files:cases.map(x=>x.file),
  proposals:cases.map(x=>x.proposal)};
}
test('RED: original-source Termux multiline safe fix plus independent voice candidate stage and rollback as one batch',()=>{
 const result=drillNovelKotlinCandidateBatch(inputs());
 assert.equal(result.status,'LOCAL_BATCH_JUDGE_AND_ROLLBACK_VERIFIED_NEEDS_ORIGINAL_ORACLE');
 assert.equal(result.checkedFiles,2);
 assert.equal(result.localGitRollbackVerified,true);
 assert.equal(result.originalFunctionalOracleVerified,false);
 assert.equal(result.mergeAllowed,false);
});
test('RED: a scanner-clean but functionally unsafe candidate is still only a local hypothesis',()=>{
 const result=drillNovelKotlinCandidateBatch(inputs(safe.unsafe));
 assert.equal(result.status,'LOCAL_BATCH_JUDGE_AND_ROLLBACK_VERIFIED_NEEDS_ORIGINAL_ORACLE');
 assert.equal(result.originalFunctionalOracleVerified,false);
 assert.equal(result.remoteWrites,false);
});
test('mass deletion never qualifies as a bounded Kotlin candidate',()=>{
 const replaced=original.replace(/class TermuxResultTracker[\s\S]*?(?=enum class OwnDroidLockState)/,
  'class TermuxResultTracker { fun receive() = false }\n\n');
 const result=drillNovelKotlinCandidateBatch(inputs(replaced));
 assert.match(result.status,/^BLOCKED_/);
 assert.equal(result.mergeAllowed,false);
});
