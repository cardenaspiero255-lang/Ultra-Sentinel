'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {drillNovelKotlinCandidateBatch}=
 require('../../packages/recovery/novel-kotlin-batch-local-judge.cjs');
const {drillKotlinSourceBatchSandbox}=
 require('../../packages/recovery/two-source-kotlin-sandbox.cjs');
const HEAD='f'.repeat(40),ROOT='apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/';
const blob=s=>{const b=Buffer.from(s);return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');};
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
function suite(count){
 const files=[],proposals=[];
 for(let i=0;i<count;i++){
  const id=i%2===0;
  const path=ROOT+(id?'CompanionResultPolicy':'VoiceRecognitionRequestGate')+i+'.kt';
  const source=id?identity:voice;
  const candidateSource=id?
   source.replace('uidPattern.containsMatchIn(stdout.trim())','uidPattern.matches(stdout.trim())'):
   source.replace('if (nowMillis < started) return false','if (nowMillis < started) { cancel(); return false }');
  files.push({path,source,expectedBlobSha:blob(source)});
  proposals.push({path,rule:id?'REGEX_PREFIX_AS_COMPLETE_VALIDATION':
   'CLOCK_ROLLBACK_WITHOUT_INVALIDATION',candidateSource,
   expectedCandidateBlobSha:blob(candidateSource)});
 }
 return {expectedCommitSha:HEAD,files,proposals};
}
test('two novel Kotlin families pass Hunter Fixer and local structural Judge but not JVM verification',()=>{
 const out=drillNovelKotlinCandidateBatch(suite(2));
 assert.equal(out.status,'LOCAL_BATCH_JUDGE_AND_ROLLBACK_VERIFIED_NEEDS_ORIGINAL_ORACLE');
 assert.equal(out.checkedFiles,2);
 assert.equal(out.localGitRollbackVerified,true);
 assert.equal(out.originalFunctionalOracleVerified,false);
 assert.equal(out.githubSourceAuthenticated,false);
 assert.equal(out.ownerAuthorizationGranted,false);
 assert.equal(out.remoteWrites,false);
 assert.equal(out.mergeAllowed,false);
 assert.deepEqual(out.cases.map(c=>c.rule),[
  'REGEX_PREFIX_AS_COMPLETE_VALIDATION','CLOCK_ROLLBACK_WITHOUT_INVALIDATION'
 ]);
});
test('four Kotlin sources from two families share an atomic disposable Judge and rollback',()=>{
 const out=drillNovelKotlinCandidateBatch(suite(4));
 assert.equal(out.status,'LOCAL_BATCH_JUDGE_AND_ROLLBACK_VERIFIED_NEEDS_ORIGINAL_ORACLE');
 assert.equal(out.checkedFiles,4);
 assert.equal(out.localGitRollbackVerified,true);
 assert.equal(out.functionalRegressionVerified,false);
 assert.equal(out.crossFileCausalityVerified,false);
});
test('direct 3-file sandbox validates exact rollback for unfamiliar Kotlin paths',()=>{
 const files=Array.from({length:3},(_,i)=>{
  const path=ROOT+'Batch'+i+'.kt';
  const before='package example\nclass A'+i+' { fun ok() = false }\n';
  const after=before.replace('false','true');
  return {path,before,after,beforeBlobSha:blob(before),afterBlobSha:blob(after)};
 });
 const out=drillKotlinSourceBatchSandbox({files});
 assert.equal(out.status,'KOTLIN_BATCH_SANDBOX_JUDGE_AND_ROLLBACK_VERIFIED');
 assert.equal(out.checkedFiles,3);
 assert.equal(out.exactTreeRollbackVerified,true);
});
test('forged hashes, duplicate paths and fifth Kotlin file fail closed',()=>{
 const forged=suite(2);forged.proposals[0].expectedCandidateBlobSha='0'.repeat(40);
 assert.match(drillNovelKotlinCandidateBatch(forged).status,/^BLOCKED_/);
 const duplicate=suite(2);duplicate.files[1].path=duplicate.files[0].path;
 assert.match(drillNovelKotlinCandidateBatch(duplicate).status,/^BLOCKED_/);
 const overflow=suite(4);overflow.files.push({...overflow.files[0]});
 assert.match(drillNovelKotlinCandidateBatch(overflow).status,/^BLOCKED_/);
});
test('destructive source replacement cannot become a partially approved batch',()=>{
 const x=suite(3);
 x.proposals[2].candidateSource='class Replacement {}\n';
 x.proposals[2].expectedCandidateBlobSha=blob(x.proposals[2].candidateSource);
 const r=drillNovelKotlinCandidateBatch(x);
 assert.match(r.status,/^BLOCKED_/);
 assert.equal(r.cases.length,0);
 assert.equal(r.mergeAllowed,false);
});
