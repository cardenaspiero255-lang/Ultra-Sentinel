'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {createHash}=require('node:crypto');
const {createVoicePolicyNormalizationCandidate,draftPinnedVoiceBoundaryRepair}=
 require('../../packages/investigation/voice-policy-normalization-draft.cjs');
const prefix='package example\nobject LocalGgufPolicy {\n';
const segment=[
 ' fun validReadOnlyQuestion(prompt:String):Boolean {',
 ' val normalized = java.text.Normalizer.normalize(prompt,',
 '  java.text.Normalizer.Form.NFD)',
 '  .replace(Regex("""\\p{M}+"""), "").trim()',
 ' val direct = Regex("""^(?:por\\s+favor\\s+)?(?:reinicia|restablece)\\b""")',
 ' return !direct.containsMatchIn(normalized)',
 ' }',''
].join('\n');
const original=prefix+segment+'}\n';
test('normalizes punctuation only in the source-derived guarded read-only policy, deterministically',()=>{
 const fixed=createVoicePolicyNormalizationCandidate(original);
 assert.equal(typeof fixed,'string');
 assert.ok(fixed.includes('.replace(Regex("""[¿?¡!.,:;]+"""), " ")'));
 assert.ok(fixed.includes('.replace(Regex("""\\s+"""), " ").trim()'));
 assert.equal(createVoicePolicyNormalizationCandidate(original),fixed);
 assert.match(fixed,/validReadOnlyQuestion/);
});
test('ambiguous, absent or already-normalized sources produce no partial patch',()=>{
 assert.equal(createVoicePolicyNormalizationCandidate(original.replace('val direct','val unused')),null);
 assert.equal(createVoicePolicyNormalizationCandidate(original+segment),null);
 assert.equal(createVoicePolicyNormalizationCandidate(original.replace('"), "").trim()', '"), " ").trim()')),null);
 assert.equal(createVoicePolicyNormalizationCandidate(original.replace(/\n/g,'\r\n')),null);
 assert.equal(createVoicePolicyNormalizationCandidate(original+'\0'),null);
});
test('unverified source identity is never treated as authorization',()=>{
 const file={path:'apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/LocalGgufPolicy.kt',
  source:original,expectedBlobSha:'46e9dd8b4d0fe861935bfb5ee5160cd39f3b5a78'};
 const r=draftPinnedVoiceBoundaryRepair({
  expectedCommitSha:'747c14b5d97750a7b2736968e2d516f02448558d',file});
 assert.match(r.status,/^BLOCKED_/);
 assert.equal(r.remoteWrites,false);
 assert.equal(r.mergeAllowed,false);
});
test('hostile getters and proxies are rejected without side effects',()=>{
 let effects=0;const evil=()=>{effects++;throw Error('EFFECT');};
 const input={expectedCommitSha:'a'.repeat(40),file:{}};
 Object.defineProperty(input,'file',{enumerable:true,get:evil});
 assert.match(draftPinnedVoiceBoundaryRepair(input).status,/^BLOCKED_/);
 const proxy=new Proxy({}, {get:evil,getPrototypeOf:evil,ownKeys:evil});
 assert.match(draftPinnedVoiceBoundaryRepair(proxy).status,/^BLOCKED_/);
 assert.equal(effects,0);
});

test('pinned authentic original JARVIS blob produces bounded candidate without granting any privileges',()=>{
 const source=readFileSync(join(__dirname,
  '../fixtures/jarvis-voice-metamorphic/pinned-original-LocalGgufPolicy.kt.txt'),'utf8');
 const bytes=Buffer.from(source,'utf8');
 const blob=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
 assert.equal(blob,'46e9dd8b4d0fe861935bfb5ee5160cd39f3b5a78');
 const draft=draftPinnedVoiceBoundaryRepair({
  expectedCommitSha:'747c14b5d97750a7b2736968e2d516f02448558d',
  file:{
   path:'apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/LocalGgufPolicy.kt',
   source,expectedBlobSha:blob
  }
 });
 assert.equal(draft.status,'VOICE_BOUNDARY_CANDIDATE_REQUIRES_ORIGINAL_JVM_ORACLE');
 assert.ok(draft.candidateSource.includes('.replace(Regex("""[¿?¡!.,:;]+"""), " ")'));
 assert.equal(draft.originalBlobSha,blob);
 assert.notEqual(draft.candidateBlobSha,blob);
 assert.equal(draft.sourceRepositoryAuthenticated,false);
 assert.equal(draft.originalJVMOracleVerified,false);
 assert.equal(draft.generalFixerVerified,false);
 assert.equal(draft.ownerAuthorizationGranted,false);
 assert.equal(draft.remoteWrites,false);
 assert.equal(draft.mergeAllowed,false);
});
