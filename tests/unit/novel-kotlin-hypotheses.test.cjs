'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {scanNovelKotlinHypotheses}=
 require('../../packages/investigation/novel-kotlin-hypotheses.cjs');
const COMMIT='f'.repeat(40);
const TERMUX='apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/CompanionResultPolicy.kt';
const VOICE='apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/VoiceRecognitionRequestGate.kt';
const gitBlob=s=>{const b=Buffer.from(s);return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');};
const fixture=(path,source)=>({path,source,expectedBlobSha:gitBlob(source)});
const identity=String.raw`class TermuxResultTracker {
    private val uidPattern = Regex("^uid=[0-9]+(?:\\([^)]{1,64}\\))?(?:\\s|$)")
    fun check(stdout: String): Boolean {
        val outputIsUidOnly = stdout.length <= 256 &&
            uidPattern.containsMatchIn(stdout.trim())
        return outputIsUidOnly
    }
}
`;
const voice=String.raw`class VoiceRecognitionRequestGate {
    private var startedAtMillis: Long? = null
    fun isPending(nowMillis: Long): Boolean {
        val started = startedAtMillis ?: return false
        if (nowMillis < started) return false
        val elapsed = nowMillis - started
        return elapsed >= 0L && elapsed < MAX_RESULT_AGE_MILLIS
    }
    fun consume(nowMillis: Long): Boolean {
        val accepted = isPending(nowMillis)
        cancel()
        return accepted
    }
    fun cancel() { startedAtMillis = null }
}
`;
test('unregistered identity and monotonic-clock risk families receive distinct advisory IDs',()=>{
 const report=scanNovelKotlinHypotheses({
  expectedCommitSha:COMMIT,files:[fixture(TERMUX,identity),fixture(VOICE,voice)]
 });
 assert.equal(report.status,'UNVERIFIED_RISK_HYPOTHESES');
 assert.deepEqual(report.findings.map(f=>f.rule),[
  'REGEX_PREFIX_AS_COMPLETE_VALIDATION','CLOCK_ROLLBACK_WITHOUT_INVALIDATION'
 ]);
 for(const f of report.findings){
  assert.match(f.familyId,/^[a-f0-9]{24}$/);
  assert.equal(f.status,'HYPOTHESIS_REQUIRES_ORIGINAL_ORACLE');
  assert.equal(f.autofix,false);
  assert.equal(f.byteIntegrityVerified,true);
 }
 assert.equal(report.sourceGitRepositoryAuthenticated,false);
 assert.equal(report.originalFunctionalOracleVerified,false);
 assert.equal(report.coreContractModified,false);
 assert.equal(report.remoteWrites,false);
 assert.equal(report.mergeAllowed,false);
 assert.equal(report.repairHandoffs.length,2);
 assert.ok(report.repairHandoffs.every(x=>x.autofix===false));
});
test('substring search and rollback that revokes state cannot trigger review hypothesis',()=>{
 const innocuous=String.raw`class Searcher {
    private val prefix = Regex("^file")
    fun find(text: String) = prefix.containsMatchIn(text)
}
// val outputIsUidOnly = prefix.containsMatchIn(text.trim())
`;
 const safe=voice.replace('if (nowMillis < started) return false',
  'if (nowMillis < started) { cancel(); return false }');
 const report=scanNovelKotlinHypotheses({
  expectedCommitSha:COMMIT,files:[fixture(TERMUX,innocuous),fixture(VOICE,safe)]
 });
 assert.deepEqual(report.findings,[]);
 assert.equal(report.status,'NO_HYPOTHESES_FOUND_NOT_CERTIFIED');
});
test('tampering, invalid paths, duplicates, overbudget and bogus commit reject all hypotheses',()=>{
 const valid=fixture(TERMUX,identity);
 const variants=[
  {expectedCommitSha:'x',files:[valid]},
  {expectedCommitSha:COMMIT,files:[valid,{...valid}]},
  {expectedCommitSha:COMMIT,files:[{...valid,source:valid.source+'//tamp\n'}]},
  {expectedCommitSha:COMMIT,files:[{...valid,path:'../evil.kt'}]},
  {expectedCommitSha:COMMIT,files:[{...valid,path:'app/src/test/java/Evil.kt'}]},
  {expectedCommitSha:COMMIT,files:[{...valid,source:'x'.repeat(80000)}]},
  {expectedCommitSha:COMMIT,files:[]}
 ];
 for(const v of variants){
  const result=scanNovelKotlinHypotheses(v);
  assert.match(result.status,/^BLOCKED_/);
  assert.deepEqual(result.findings,[]);
  assert.equal(result.executionAllowed,false);
  assert.equal(result.mergeAllowed,false);
 }
});
