'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {planNovelKotlinCandidates}=
 require('../../packages/investigation/novel-kotlin-candidate-intake.cjs');
const HEAD='f2572a8abb0a1ef5b34d971ea8c4dc5acbecf868';
const TERMUX='apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/CompanionResultPolicy.kt';
const VOICE='apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/VoiceRecognitionRequestGate.kt';
const sha=s=>{const b=Buffer.from(s);return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');};
const termux=String.raw`class TermuxResultTracker {
    private val uidPattern = Regex("^uid=[0-9]+")
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
        return nowMillis - started < 180000L
    }
    fun consume(nowMillis: Long): Boolean {
        val accepted = isPending(nowMillis)
        cancel()
        return accepted
    }
    fun cancel() { startedAtMillis = null }
}
`;
const input=()=>({
 expectedCommitSha:HEAD,
 files:[{path:TERMUX,source:termux,expectedBlobSha:sha(termux)},
        {path:VOICE,source:voice,expectedBlobSha:sha(voice)}],
 proposals:[
  {path:TERMUX,rule:'REGEX_PREFIX_AS_COMPLETE_VALIDATION',
   candidateSource:termux.replace('uidPattern.containsMatchIn(stdout.trim())','uidPattern.matches(stdout.trim())'),
   expectedCandidateBlobSha:sha(termux.replace('uidPattern.containsMatchIn(stdout.trim())','uidPattern.matches(stdout.trim())'))},
  {path:VOICE,rule:'CLOCK_ROLLBACK_WITHOUT_INVALIDATION',
   candidateSource:voice.replace('if (nowMillis < started) return false','if (nowMillis < started) { cancel(); return false }'),
   expectedCandidateBlobSha:sha(voice.replace('if (nowMillis < started) return false','if (nowMillis < started) { cancel(); return false }'))}
 ]});
test('non-predefined candidate bytes can address two independent Kotlin advisory families',()=>{
 const result=planNovelKotlinCandidates(input());
 assert.equal(result.status,'CANDIDATES_REQUIRE_TRUSTED_ORIGINAL_ORACLE');
 assert.deepEqual(result.candidates.map(x=>x.rule),[
  'REGEX_PREFIX_AS_COMPLETE_VALIDATION','CLOCK_ROLLBACK_WITHOUT_INVALIDATION']);
 assert.equal(result.candidates.length,2);
 assert.ok(result.candidates.every(x=>x.originalBlobMatched&&x.candidateBlobMatched&&x.targetStaticRiskGone));
 assert.ok(result.candidates.every(x=>x.autofix===false&&x.originalOracleVerified===false));
 assert.equal(result.authenticatedSourceProvenance,false);
 assert.equal(result.ownerAuthorizationGranted,false);
 assert.equal(result.remoteWrites,false);
 assert.equal(result.causalityVerified,false);
});
test('source or proposal for a new unrelated Kotlin path does not require an existing pair registry',()=>{
 const t=input(); t.files=[t.files[0]];t.proposals=[t.proposals[0]];
 const report=planNovelKotlinCandidates(t);
 assert.equal(report.candidates.length,1);
 assert.equal(report.status,'CANDIDATES_REQUIRE_TRUSTED_ORIGINAL_ORACLE');
});
test('scanner disappearance is not functional correctness, even for a destructive candidate',()=>{
 const t=input(),p=t.proposals[0];
 p.candidateSource=termux.replace('uidPattern.containsMatchIn(stdout.trim())','true');
 p.expectedCandidateBlobSha=sha(p.candidateSource);
 const result=planNovelKotlinCandidates(t);
 assert.equal(result.status,'CANDIDATES_REQUIRE_TRUSTED_ORIGINAL_ORACLE');
 assert.equal(result.originalFunctionalOracleVerified,false);
 assert.equal(result.productionReleaseAllowed,false);
});
test('reject forged bytes, duplicate proposals, missing findings and unchanged source',()=>{
 const variants=[
  x=>x.files[0].source+='//tampered\n',
  x=>x.proposals[0].expectedCandidateBlobSha='0'.repeat(40),
  x=>x.proposals.push({...x.proposals[0]}),
  x=>x.proposals[0].rule='UNSCOPED_COROUTINE',
  x=>x.proposals[0].candidateSource=termux,
  x=>x.proposals[0].path='../../private.kt',
  x=>x.files.push({...x.files[0]}),
  x=>x.expectedCommitSha='bad',
  x=>x.proposals[1].candidateSource='x'.repeat(100000),
 ];
 for(const mutate of variants){
  const x=input();mutate(x);
  const out=planNovelKotlinCandidates(x);
  assert.match(out.status,/^BLOCKED_/);
  assert.equal(out.candidates.length,0);
  assert.equal(out.remoteWrites,false);
 }
});
test('reject false success for a candidate that still exhibits its original risk pattern',()=>{
 const t=input(),p=t.proposals[0];
 p.candidateSource=termux.replace('outputIsUidOnly','stillOutputIsUidOnly');
 p.expectedCandidateBlobSha=sha(p.candidateSource);
 const out=planNovelKotlinCandidates(t);
 assert.equal(out.status,'BLOCKED_TARGET_RISK_REMAINS');
 assert.equal(out.candidates.length,0);
});
test('rejects getters and proxies in candidate inputs without invoking them',()=>{
 let invoked=0;
 for(const place of ['root','file','proposal','array']){
  const x=input();
  if(place==='root')Object.defineProperty(x,'expectedCommitSha',{enumerable:true,get(){invoked++;return HEAD;}});
  if(place==='file')Object.defineProperty(x.files[0],'source',{enumerable:true,get(){invoked++;return termux;}});
  if(place==='proposal')Object.defineProperty(x.proposals[0],'candidateSource',{enumerable:true,get(){invoked++;return termux;}});
  if(place==='array')Object.defineProperty(x.files,'0',{get(){invoked++;return input().files[0];}});
  assert.match(planNovelKotlinCandidates(x).status,/^BLOCKED_/);
 }
 assert.equal(invoked,0);
 let traps=0;const x=input();x.files[0]=new Proxy(x.files[0],{ownKeys(){traps++;throw Error('trap');}});
 assert.match(planNovelKotlinCandidates(x).status,/^BLOCKED_/);assert.equal(traps,0);
 const y=input();y.proposals=new Proxy(y.proposals,{get(){traps++;throw Error('trap');}});
 assert.match(planNovelKotlinCandidates(y).status,/^BLOCKED_/);assert.equal(traps,0);
});
test('rejects non-string identifiers without invoking coercion',()=>{
 let coerced=0;
 const suspicious={toString(){coerced++;return HEAD;}};
 for(const mutate of [
  x=>{x.expectedCommitSha=suspicious;},
  x=>{x.files[0].expectedBlobSha=suspicious;},
  x=>{x.proposals[0].rule=suspicious;},
  x=>{x.proposals[0].expectedCandidateBlobSha=suspicious;},
 ]){
  const x=input();mutate(x);
  assert.equal(planNovelKotlinCandidates(x).status,'BLOCKED_INPUT_CONTRACT');
 }
 assert.equal(coerced,0);
});
