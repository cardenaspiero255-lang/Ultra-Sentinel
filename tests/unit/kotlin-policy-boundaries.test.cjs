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
 fun remainingMillis(nowMillis: Long): Long {
  val began = startedAt ?: return 0L
  if (nowMillis < began || nowMillis < 0L) return 0L
  return 20000L - (nowMillis - began)
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
  'GGUF_OPERATIONAL_INTENT_BOUNDARY_GAP',
  'PREVIEW_REMAINING_REVIVAL_AFTER_CLOCK_ROLLBACK',
  'PREVIEW_TIME_REVIVAL_AFTER_CLOCK_ROLLBACK'
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

test('partial preview fix still leaves remainingMillis rollback reactivation risk',()=>{
 const x=input();
 x.files[2]=file('HandsFreePreviewPolicy.kt',preview.replace(
  'if (nowMillis < began || nowMillis < 0L) return false',
  'if (nowMillis < began || nowMillis < 0L) { stop(); return false }'));
 const out=scanKotlinPolicyBoundaries(x);
 assert.equal(out.findings.some(f=>f.rule==='PREVIEW_TIME_REVIVAL_AFTER_CLOCK_ROLLBACK'),false);
 assert.equal(out.findings.some(f=>f.rule==='PREVIEW_REMAINING_REVIVAL_AFTER_CLOCK_ROLLBACK'),true);
});

test('existing generic prompt protection is not mislabeled as an unguarded voice policy',()=>{
 const x=input();
 x.files[1]=file('LocalGgufPolicy.kt',policy.replace('ejecuta|borra','reinicia|ejecuta|borra'));
 const out=scanKotlinPolicyBoundaries(x);
 assert.equal(out.findings.some(f=>f.rule==='GGUF_OPERATIONAL_INTENT_BOUNDARY_GAP'),false);
});

test('policy-only addition of validReadOnlyQuestion must not hide an unsafe voice caller',()=>{
 const x=input();
 const policyOnly=policy.replace(/\n}\n$/,
  '\n fun validReadOnlyQuestion(question: String): Boolean {\n'+
  '  return !Regex("(?:reinicia|reiniciar|restablece)").containsMatchIn(question)\n'+
  ' }\n}\n');
 assert.notEqual(policyOnly,policy,'test fixture must contain the policy-only patch');
 x.files[1]=file('LocalGgufPolicy.kt',policyOnly);
 const out=scanKotlinPolicyBoundaries(x);
 assert.equal(out.status,'UNVERIFIED_POLICY_BOUNDARY_HYPOTHESES');
 assert.equal(out.findings.filter(f=>f.rule==='GGUF_OPERATIONAL_INTENT_BOUNDARY_GAP').length,1);
 assert.equal(out.findings.find(f=>f.rule==='GGUF_OPERATIONAL_INTENT_BOUNDARY_GAP').path,x.files[0].path);
 assert.equal(out.originalFunctionalOracleVerified,false);
 assert.equal(out.mergeAllowed,false);
});

test('unrelated operational words in the policy cannot hide the generic validation gap',()=>{
 const x=input();
 const patched=policy.replace(/\n}\n$/,
  '\n private val explanationExample = "reinicia"\n}\n');
 assert.notEqual(patched,policy);
 x.files[1]=file('LocalGgufPolicy.kt',patched);
 const out=scanKotlinPolicyBoundaries(x);
 assert.equal(out.findings.some(f=>f.rule==='GGUF_OPERATIONAL_INTENT_BOUNDARY_GAP'),true);
});

test('a defined stronger function alone does not complete a cross-file read-only contract',()=>{
 const x=input();
 x.files[1]=file('LocalGgufPolicy.kt',policy.replace(/\n}\n$/,
  '\n fun validReadOnlyQuestion(question: String): Boolean = validPrompt(question)\n}\n'));
 const out=scanKotlinPolicyBoundaries(x);
 assert.equal(out.findings.some(f=>f.rule==='GGUF_OPERATIONAL_INTENT_BOUNDARY_GAP'),true);
});
