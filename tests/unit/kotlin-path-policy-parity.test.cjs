'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {planNovelKotlinCandidates}=require('../../packages/investigation/novel-kotlin-candidate-intake.cjs');
const {drillNovelKotlinCandidateBatch}=require('../../packages/recovery/novel-kotlin-batch-local-judge.cjs');
const {drillKotlinSourceBatchSandbox}=require('../../packages/recovery/two-source-kotlin-sandbox.cjs');
const HEAD='e'.repeat(40);
const ROOT='apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/';
const gitBlob=s=>{const bytes=Buffer.from(s,'utf8');
 return createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');};
const identity=[
 'class TermuxResultTracker {',
 ' private val uidPattern = Regex("^uid=[0-9]+")',
 ' fun check(stdout: String): Boolean {',
 '  val outputIsUidOnly = stdout.length <= 256 &&',
 '   uidPattern.containsMatchIn(stdout.trim())',
 '  return outputIsUidOnly',' }','}',''
].join('\n');
const voice=[
 'class VoiceRecognitionRequestGate {',
 ' private var startedAtMillis: Long? = null',
 ' fun isPending(nowMillis: Long): Boolean {',
 '  val started = startedAtMillis ?: return false',
 '  if (nowMillis < started) return false',
 '  return nowMillis - started < 180000L',
 ' }',
 ' fun consume(nowMillis: Long): Boolean {',
 '  val accepted = isPending(nowMillis)',
 '  cancel()','  return accepted',' }',
 ' fun cancel() { startedAtMillis = null }','}',''
].join('\n');
function one(path,kind='identity'){
 const source=kind==='identity'?identity:voice;
 const candidateSource=kind==='identity'
  ?source.replace('uidPattern.containsMatchIn(stdout.trim())','uidPattern.matches(stdout.trim())')
  :source.replace('if (nowMillis < started) return false',
   'if (nowMillis < started) { cancel(); return false }');
 const rule=kind==='identity'?'REGEX_PREFIX_AS_COMPLETE_VALIDATION':
  'CLOCK_ROLLBACK_WITHOUT_INVALIDATION';
 return {file:{path,source,expectedBlobSha:gitBlob(source)},
  proposal:{path,rule,candidateSource,expectedCandidateBlobSha:gitBlob(candidateSource)}};
}
function batch(cases){
 return {expectedCommitSha:HEAD,files:cases.map(x=>x.file),
  proposals:cases.map(x=>x.proposal)};
}
test('RED: a valid module Kotlin path admitted by intake completes local Git Judge',()=>{
 const sample=batch([one('feature/src/main/kotlin/Check.kt')]);
 assert.equal(planNovelKotlinCandidates(sample).status,
  'CANDIDATES_REQUIRE_TRUSTED_ORIGINAL_ORACLE');
 const out=drillNovelKotlinCandidateBatch(sample);
 assert.equal(out.status,'LOCAL_BATCH_JUDGE_AND_ROLLBACK_VERIFIED_NEEDS_ORIGINAL_ORACLE');
 assert.equal(out.checkedFiles,1);
 assert.equal(out.localGitRollbackVerified,true);
 assert.equal(out.remoteWrites,false);
 assert.equal(out.originalFunctionalOracleVerified,false);
});
test('RED: a nested JARVIS core Kotlin path passes the same bounded sandbox policy',()=>{
 const sample=batch([one(ROOT+'nested/VoiceRecognitionRequestGate.kt','voice')]);
 assert.equal(planNovelKotlinCandidates(sample).status,
  'CANDIDATES_REQUIRE_TRUSTED_ORIGINAL_ORACLE');
 const out=drillNovelKotlinCandidateBatch(sample);
 assert.equal(out.status,'LOCAL_BATCH_JUDGE_AND_ROLLBACK_VERIFIED_NEEDS_ORIGINAL_ORACLE');
 assert.equal(out.checkedFiles,1);
 assert.equal(out.mergeAllowed,false);
});
test('RED: a mixed module and nested JARVIS two-file batch rolls back atomically',()=>{
 const sample=batch([one('feature/src/main/kotlin/Check.kt'),
  one(ROOT+'nested/VoiceRecognitionRequestGate.kt','voice')]);
 assert.equal(planNovelKotlinCandidates(sample).candidates.length,2);
 const out=drillNovelKotlinCandidateBatch(sample);
 assert.equal(out.status,'LOCAL_BATCH_JUDGE_AND_ROLLBACK_VERIFIED_NEEDS_ORIGINAL_ORACLE');
 assert.equal(out.checkedFiles,2);
 assert.equal(out.localGitRollbackVerified,true);
 assert.equal(out.crossFileCausalityVerified,false);
});
test('forbidden test sources and traversal cannot broaden the permitted Git paths',()=>{
 const bad=['feature/src/test/kotlin/Test.kt','feature/src/main/kotlin/../Escape.kt',
  'feature/src/main/kotlin//Wrong.kt','../../Bad.kt',
  ROOT+'../Secret.kt','feature/src/main/kotlin/other.txt'];
 for(const path of bad){
  const input=batch([one(path)]);
  assert.match(planNovelKotlinCandidates(input).status,/^BLOCKED_/);
  const result=drillNovelKotlinCandidateBatch(input);
  assert.match(result.status,/^BLOCKED_/);
  assert.equal(result.remoteWrites,false);
  assert.equal(result.mergeAllowed,false);
 }
});
