'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {scanKotlinPolicyBoundaries}=
 require('../../packages/investigation/kotlin-policy-boundaries.cjs');
const C='f2572a8abb0a1ef5b34d971ea8c4dc5acbecf868';
const P='apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/';
const blob=s=>{const v=Buffer.from(s);return createHash('sha1').update('blob '+v.length+'\0').update(v).digest('hex');};
const gate=String.raw`class OfflineVoiceQuestionGate {
 fun observe(question: String): Boolean {
  if (!LocalGgufPolicy.validPrompt(question)) return false
  return true
 }
}
`;
const policy=String.raw`object LocalGgufPolicy {
 fun validPrompt(prompt: String): Boolean {
  return !Regex("(?:ejecuta|borra|elimina|instala|autoriza)").containsMatchIn(prompt)
 }
}
`;
const preview=String.raw`class PreviewTimeGate {
 private var startedAt: Long? = null
 fun isActiveAt(nowMillis: Long): Boolean {
  val began = startedAt ?: return false
  if (nowMillis < began || nowMillis < 0L) return false
  return nowMillis - began < 20000L
 }
 fun stop() { startedAt = null }
}
`;
const file=(name,source)=>({path:P+name,source,expectedBlobSha:blob(source)});
function input(){return {expectedCommitSha:C,files:[
 file('OfflineVoiceQuestionGate.kt',gate),
 file('LocalGgufPolicy.kt',policy),
 file('HandsFreePreviewPolicy.kt',preview)]};}
test('new Kotlin boundary detector surfaces policy mismatch and reversible preview clock',()=>{
 const out=scanKotlinPolicyBoundaries(input());
 assert.equal(out.status,'UNVERIFIED_POLICY_BOUNDARY_HYPOTHESES');
 assert.deepEqual(out.findings.map(f=>f.rule).sort(),[
  'GGUF_OPERATIONAL_INTENT_BOUNDARY_GAP','PREVIEW_TIME_REVIVAL_AFTER_CLOCK_ROLLBACK'
 ]);
 assert.ok(out.findings.every(f=>f.status==='HYPOTHESIS_REQUIRES_ORIGINAL_ORACLE'&&!f.autofix));
 assert.equal(out.originalFunctionalOracleVerified,false);
 assert.equal(out.remoteWrites,false);
 assert.equal(out.coreContractModified,false);
});
test('a completed shared safe contract is not reported as an unresolved cross-file boundary',()=>{
 const x=input();
 x.files[0]=file('OfflineVoiceQuestionGate.kt',gate.replace('validPrompt(question)','validReadOnlyQuestion(question)'));
 x.files[1]=file('LocalGgufPolicy.kt',policy.replace('fun validPrompt(prompt:', 'fun validReadOnlyQuestion(prompt:'));
 const out=scanKotlinPolicyBoundaries(x);
 assert.equal(out.findings.some(f=>f.rule==='GGUF_OPERATIONAL_INTENT_BOUNDARY_GAP'),false);
});
test('tampering, path escape, duplicates, unknown commits and files budget fail closed',()=>{
 for(const change of [
  x=>x.files[0].source+='tampered\n',
  x=>x.files[0].path='../secrets.kt',
  x=>x.files.push({...x.files[0]}),
  x=>x.expectedCommitSha='notasha',
  x=>x.files=[],
  x=>x.files[1].expectedBlobSha='f'.repeat(40),
  x=>x.files[1].source='x'.repeat(80000)
 ]){const x=input();change(x);const out=scanKotlinPolicyBoundaries(x);
  assert.match(out.status,/^BLOCKED_/);assert.equal(out.findings.length,0);
  assert.equal(out.remoteWrites,false);
 }
});
test('comments alone never authorize a security finding',()=>{
 const fake=file('OfflineVoiceQuestionGate.kt','// LocalGgufPolicy.validPrompt(question)\n'.repeat(3));
 const out=scanKotlinPolicyBoundaries({expectedCommitSha:C,files:[fake,input().files[1]]});
 assert.deepEqual(out.findings,[]);
});
