'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {huntVoiceBoundaryVariants}=
 require('../../packages/family-hunter/voice-boundary-metamorphic-hunter.cjs');
const ROOT='apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/';
const sha=s=>{const b=Buffer.from(s,'utf8');return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');};
const file=(name,source)=>({path:ROOT+name,source,expectedBlobSha:sha(source)});
const policy=verbs=>[
 'package example',
 'object LlmSafety {',
 ' fun validReadOnlyQuestion(input: String): Boolean {',
 ' val direct = Regex("""^(?:por\\s+favor\\s+)?(?:'+verbs+')\\b""")',
 ' return !direct.containsMatchIn(input)',
 ' }','}',''].join('\n');
const gate=[
 'package example',
 'class VoiceGate {',
 ' fun observe(question: String): Boolean = LlmSafety.validReadOnlyQuestion(question)',
 '}',''
].join('\n').replace('LlmSafety','LocalGgufPolicy');
const original=verbs=>[
 policy(verbs).replace('LlmSafety','LocalGgufPolicy'),
 gate
];
const scan=(files)=>huntVoiceBoundaryVariants({expectedCommitSha:'a'.repeat(40),files});
test('discovers a cross-file metamorphic corpus from Kotlin guard lexemes, not a supplied failing prompt',()=>{
 const [p,g]=original('reinicia|restablece|reiniciar');
 const r=scan([file('Other.kt','class Benign {}\n'),file('Voice.kt',g),file('Policy.kt',p)]);
 assert.equal(r.status,'METAMORPHIC_CASES_REQUIRE_ORIGINAL_KOTLIN_ORACLE');
 assert.equal(r.policyPath,ROOT+'Policy.kt');
 assert.equal(r.gatePath,ROOT+'Voice.kt');
 assert.equal(r.cases.length,9);
 assert.deepEqual(new Set(r.cases.map(x=>x.action)),new Set(['reinicia','restablece','reiniciar']));
 assert.ok(r.cases.some(c=>c.base!==c.variant));
 assert.equal(r.originalKotlinOracleVerified,false);
 assert.equal(r.rootCauseVerified,false);
 assert.equal(r.remoteWrites,false);
});
test('symbol changes in original guard produce new generated probes without hardcoded action vocabulary',()=>{
 const [p,g]=original('archiva|desarchiva');
 const r=scan([file('Voice.kt',g),file('Policy.kt',p)]);
 assert.equal(r.cases.length,6);
 assert.ok(r.cases.some(c=>c.action==='desarchiva'));
 assert.equal(r.cases.some(c=>c.action==='reinicia'),false);
});
test('rejects invented Git blobs and uncontrolled source, never claims absent findings are proofs',()=>{
 const [p,g]=original('reinicia|restablece');
 for(const files of [
  [{...file('Policy.kt',p),expectedBlobSha:'0'.repeat(40)},file('Voice.kt',g)],
  [file('Policy.kt',p),file('Policy.kt',p)],
  [file('../outside.kt',p),file('Voice.kt',g)]
 ]) {
  const r=scan(files);
  assert.match(r.status,/^BLOCKED_/);
  assert.equal(r.cases.length,0);
 }
 const none=scan([file('Plain.kt','class Plain {}\n')]);
 assert.equal(none.status,'NO_CROSS_FILE_VOICE_GUARD_MATCH');
 assert.equal(none.originalKotlinOracleVerified,false);
});
test('rejects getters/proxies as input without running effects',()=>{
 const [p,g]=original('reinicia|restablece');let effects=0;
 const evil=()=>{effects++;throw Error('input executed');};
 const opts={expectedCommitSha:'a'.repeat(40),files:[file('Policy.kt',p),file('Voice.kt',g)]};
 Object.defineProperty(opts.files[0],'source',{get:evil});
 assert.match(huntVoiceBoundaryVariants(opts).status,/^BLOCKED_/);
 assert.match(huntVoiceBoundaryVariants(new Proxy(opts,{get:evil,getPrototypeOf:evil,ownKeys:evil})).status,/^BLOCKED_/);
 assert.equal(effects,0);
});

test('ambiguous cross-file claims and unrecognized Kotlin guard grammars are inconclusive',()=>{
 const [p,g]=original('reinicia|restablece');
 const variants=[
  [file('Policy.kt',p)],
  [file('Voice.kt',g)],
  [file('Policy.kt',p),file('Voice.kt',g),file('SecondGate.kt',g)],
  [file('Policy.kt',p),file('Voice.kt',g),file('SecondPolicy.kt',p)],
  [file('Policy.kt',p.replace('val direct = Regex','val passive = Regex')),file('Voice.kt',g)],
  [file('Policy.kt',p.replace('reinicia|restablece','reinicia|reinicia')),file('Voice.kt',g)],
  [file('Policy.kt',p.replace('reinicia|restablece','reinicia')),file('Voice.kt',g)]
 ];
 for(const files of variants){
  const r=scan(files);
  assert.equal(r.status,'NO_CROSS_FILE_VOICE_GUARD_MATCH');
  assert.equal(r.cases.length,0);
  assert.equal(r.remoteWrites,false);
 }
});
test('invalid source inventory formats fail closed before interpreting any Kotlin declarations',()=>{
 const [p,g]=original('reinicia|restablece');
 const inputs=[
  {expectedCommitSha:'f',files:[file('Policy.kt',p),file('Voice.kt',g)]},
  {expectedCommitSha:'a'.repeat(40),files:[file('Policy.kt',p.replace(/\n/g,'\r\n')),file('Voice.kt',g)]},
  {expectedCommitSha:'a'.repeat(40),files:[{...file('Policy.kt',p),expectedBlobSha:12},file('Voice.kt',g)]},
  {expectedCommitSha:'a'.repeat(40),files:[{...file('Policy.kt',p),source:p+'\0'},file('Voice.kt',g)]},
  {expectedCommitSha:'a'.repeat(40),files:[]},
  {expectedCommitSha:'a'.repeat(40),files:[file('Policy.kt',p),file('Voice.kt',g),null]}
 ];
 for(const input of inputs){
  const r=huntVoiceBoundaryVariants(input);
  assert.match(r.status,/^BLOCKED_/);
  assert.equal(r.cases.length,0);
 }
});
