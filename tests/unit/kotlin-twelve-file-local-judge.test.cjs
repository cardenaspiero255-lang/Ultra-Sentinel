'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {planNovelKotlinCandidates}=
 require('../../packages/investigation/novel-kotlin-candidate-intake.cjs');
const {drillNovelKotlinCandidateBatch}=
 require('../../packages/recovery/novel-kotlin-batch-local-judge.cjs');
const HEAD='f2572a8abb0a1ef5b34d971ea8c4dc5acbecf868';
const blob=s=>{const b=Buffer.from(s,'utf8');return createHash('sha1')
 .update('blob '+b.length+'\0').update(b).digest('hex');};
function input(count=12){
 const cases=Array.from({length:count},(_,i)=>{
  const n=String(i+1).padStart(2,'0');
  const path='app/src/main/kotlin/families/Clock'+n+'.kt';
  const source=[
   'package families',
   'class Clock'+n+' {',
   ' private var startedAtMillis: Long? = null',
   ' fun isPending(nowMillis: Long): Boolean {',
   '  val started = startedAtMillis ?: return false',
   '  if (nowMillis < started) return false',
   '  return nowMillis - started < 180000L',
   ' }',
   ' fun consume(nowMillis: Long): Boolean { val accepted = isPending(nowMillis); cancel(); return accepted }',
   ' fun cancel() { startedAtMillis = null }',
   '}',''
  ].join('\n');
  const candidateSource=source.replace('if (nowMillis < started) return false',
   'if (nowMillis < started) { cancel(); return false }');
  return {file:{path,source,expectedBlobSha:blob(source)},
   proposal:{path,rule:'CLOCK_ROLLBACK_WITHOUT_INVALIDATION',
    candidateSource,expectedCandidateBlobSha:blob(candidateSource)}};
 });
 return {expectedCommitSha:HEAD,files:cases.map(x=>x.file),
  proposals:cases.map(x=>x.proposal)};
}
test('12 distinct unregistered Kotlin findings pass bounded Hunter Fixer local Git Judge and exact rollback',()=>{
 const args=input(),staged=planNovelKotlinCandidates(args);
 assert.equal(staged.status,'CANDIDATES_REQUIRE_TRUSTED_ORIGINAL_ORACLE');
 assert.equal(staged.candidates.length,12);
 const result=drillNovelKotlinCandidateBatch(args);
 assert.equal(result.status,'LOCAL_BATCH_JUDGE_AND_ROLLBACK_VERIFIED_NEEDS_ORIGINAL_ORACLE');
 assert.equal(result.checkedFiles,12);
 assert.equal(result.localGitRollbackVerified,true);
 assert.equal(result.originalFunctionalOracleVerified,false);
 assert.equal(result.crossFileCausalityVerified,false);
 assert.equal(result.remoteWrites,false);
 assert.equal(result.mergeAllowed,false);
});
test('13 Kotlin sources exceed the declared experiment bound and fail closed',()=>{
 const args=input(13);
 assert.match(planNovelKotlinCandidates(args).status,/^BLOCKED_/);
 const actual=drillNovelKotlinCandidateBatch(args);
 assert.match(actual.status,/^BLOCKED_/);
 assert.equal(actual.checkedFiles,0);
 assert.equal(actual.remoteWrites,false);
});
test('forged candidate blobs or overlapping paths veto the full 12-file batch',()=>{
 for(const mutate of [
  args=>args.proposals[8].expectedCandidateBlobSha='0'.repeat(40),
  args=>args.proposals[8].path=args.proposals[2].path,
  args=>args.files[8].expectedBlobSha='f'.repeat(40)
 ]){
  const args=input();mutate(args);
  const actual=drillNovelKotlinCandidateBatch(args);
  assert.match(actual.status,/^BLOCKED_/);
  assert.equal(actual.checkedFiles,0);
  assert.equal(actual.mergeAllowed,false);
 }
});
