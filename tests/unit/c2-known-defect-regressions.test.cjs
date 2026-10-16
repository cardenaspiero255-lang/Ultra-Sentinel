'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {semanticCandidates}=require('../../packages/core/c2-semantic-patterns.cjs');
const {analyze}=require('../../packages/core/ultra_sentinel_core.cjs');
const ROOT='app/src/main/java/com/cardenaspiero255/gamehubultra/';
const P205=ROOT+'ai/UltraFrontierV2.kt';
const P206=ROOT+'voice/UltraSpeechChunker.kt';
const P208=ROOT+'voice/ContinuousVoiceController.kt';
const source205=[
 'class UltraFrontierV2ClaimProvenanceGraph {',
 '  fun record(evidence: UltraFrontierV2ClaimEvidence) {',
 '    val normalized = evidence.copy(',
 '      claimId = normalizeClaimId(evidence.claimId),',
 '      normalizedValue = normalize(evidence.normalizedValue),',
 '      sourceId = normalizeSourceId(evidence.sourceId),',
 '    )','  }',
 '  fun snapshot(claimId: String, preferredValue: String) {',
 '    val normalizedPreferred = normalize(preferredValue)',
 '    val supporting = evidence.filter { it.normalizedValue == normalizedPreferred }',
 '    val conflicting = evidence.filter { it.normalizedValue != normalizedPreferred }',
 '  }',
 '  private fun normalizeClaimId(value: String): String = value',
 '  private fun normalize(value: String): String =',
 '    value.trim().lowercase(Locale.ROOT)',
 '}'
];
const source206=[
 'internal object UltraSpeechChunker {',
 '  fun chunk(text: String, maxChars: Int = 800): List<String> {',
 '    var remaining = text.trim()',
 '    val chunks = mutableListOf<String>()',
 '    while (remaining.length > maxChars) {',
 '      val minimumBoundary = maxChars / 3',
 '      val sentenceBoundary = (minimumBoundary..maxChars).lastOrNull { idx -> remaining[idx].isWhitespace() }',
 '      val wordBoundary = (minimumBoundary..maxChars).lastOrNull { idx -> remaining[idx].isWhitespace() }',
 '      val boundary = sentenceBoundary ?: wordBoundary ?: maxChars',
 '      chunks += remaining.substring(0, boundary).trimEnd()',
 '      remaining = remaining.substring(boundary).trimStart()',
 '    }',
 '    return chunks',
 '  }','}'
];
const source208=[
 'internal class ContinuousVoiceController(private val gateway: ContinuousVoiceGateway) {',
 '  fun resumeIfEnabled(): Boolean {',
 '    if (!gateway.hasRecordAudioPermission()) {',
 '      gateway.setEnabled(false)',
 '      runCatching { gateway.stopWakeService() }',
 '      return false',
 '    }',
 '    return true','  }',
 '  fun setEnabled(enabled: Boolean): ContinuousVoiceChange {',
 '    if (!enabled) {',
 '      gateway.setEnabled(false)',
 '      runCatching { gateway.stopWakeService() }',
 '      return ContinuousVoiceChange.DISABLED',
 '    }',
 '    if (!gateway.hasRecordAudioPermission()) {',
 '      return ContinuousVoiceChange.PERMISSION_REQUIRED',
 '    }',
 '    if (!gateway.canRunContinuousVoice()) {',
 '      gateway.setEnabled(false)',
 '      runCatching { gateway.stopWakeService() }',
 '      return ContinuousVoiceChange.SYSTEM_RESTRICTED',
 '    }',
 '    return ContinuousVoiceChange.ENABLED',
 '  }',
 '  private fun startServiceSafely(): Boolean = true',
 '}'
];
function check(path,lines,addedLines){
 const changed=addedLines.map(line=>({line,text:lines[line-1]}));
 const active=new Map(changed.map(row=>[row.line,row.text]));
 return semanticCandidates({path,lines,added:changed,active});
}
function find(path,lines,addedLines,rule){
 return check(path,lines,addedLines).filter(f=>f.rule===rule);
}
function modified(path,lines,addedLines){
 const blocks=[];
 for(const n of addedLines)blocks.push('@@ -'+n+',0 +'+n+',1 @@\n+'+lines[n-1]);
 return {filename:path,status:'modified',additions:addedLines.length,deletions:0,
  changes:addedLines.length,fullSource:lines.join('\n')+'\n',
  patch:blocks.join('\n')+'\n'};
}
test('known #205 mismatch: normalizedValue loses GB/Gb case while claim ids preserve it',()=>{
 const r=find(P205,source205,[4],'CLAIM_VALUE_UNIT_CASE_COLLISION');
 assert.equal(r.length,1);assert.equal(r[0].line,5);
 assert.equal(r[0].severity,'MEDIUM');assert.equal(r[0].confidence,'medium');
});
test('known #206 bug: raw maxChars substring can split a UTF-16 surrogate',()=>{
 const r=find(P206,source206,[10],'TTS_UTF16_SURROGATE_SPLIT');
 assert.equal(r.length,1);assert.equal(r[0].line,10);
});
test('known #208 permission revoked branch returns before disabling persisted state',()=>{
 const r=find(P208,source208,[13,20],'STALE_VOICE_ENABLED_AFTER_MIC_PERMISSION_REVOKED');
 assert.equal(r.length,1);assert.equal(r[0].line,16);
});
test('Core emits same known rules for attested source, no automatic merge',()=>{
 const samples=[
  [P205,source205,[4],'CLAIM_VALUE_UNIT_CASE_COLLISION',5],
  [P206,source206,[10],'TTS_UTF16_SURROGATE_SPLIT',10],
  [P208,source208,[13,20],'STALE_VOICE_ENABLED_AFTER_MIC_PERMISSION_REVOKED',16]
 ];
 for(const [path,lines,added,rule,line] of samples){
  const out=analyze([modified(path,lines,added)],{sha:'f'.repeat(40)});
  const risk=out.findings.filter(x=>x.rule===rule);
  assert.equal(risk.length,1,rule+':'+JSON.stringify(out));
  assert.equal(risk[0].line,line);
  assert.equal(risk[0].status,'NEEDS_VERIFICATION');
  assert.equal(out.coverage.partial,false);
 }
});
test('avoid false positives: source value case preserved or existing claim protection absent',()=>{
 const variants=[
  source205.map(x=>x.includes('normalizedValue = normalize(')?
   '      normalizedValue = normalizeValuePreservingUnits(evidence.normalizedValue),':x),
  source205.map(x=>x.includes('lowercase(Locale.ROOT)')?'    value.trim()':x),
  source205.map(x=>x.includes('normalizedPreferred = normalize(')?
   '    val normalizedPreferred = normalizeValuePreservingUnits(preferredValue)':x),
  source205.map(x=>x.includes('claimId = normalizeClaimId(')?
   '      claimId = normalize(evidence.claimId),':x),
 ];
 for(const lines of variants){
  assert.equal(find(P205,lines,[4],'CLAIM_VALUE_UNIT_CASE_COLLISION').length,0);
 }
});
test('avoid false positives: chunker adjusts to valid Unicode boundary',()=>{
 const guards=[
  source206.map(x=>x.includes('substring(0, boundary)')?
   '      chunks += remaining.substring(0, safeBoundary).trimEnd()':x),
  source206.map(x=>x.includes('val boundary =')?
   '      val boundary = adjustedToCodePointBoundary(maxChars, remaining)':x),
  source206.flatMap(x=>x.includes('chunks += remaining.substring')?
   ['      if (remaining[boundary - 1].isHighSurrogate()) boundary -= 1',x]:[x]),
  source206.map(x=>x.includes('remaining.substring(0, boundary)')?
   '      chunks += remaining.takeCodePoints(maxChars)':x)
 ];
 for(const lines of guards)
  assert.equal(find(P206,lines,[lines.findIndex(x=>x.includes('chunks +='))+1],
   'TTS_UTF16_SURROGATE_SPLIT').length,0);
});
test('avoid false positives: denial branch disables or delegates before returning',()=>{
 const fixed=[
  source208.flatMap(x=>x.trim()==='return ContinuousVoiceChange.PERMISSION_REQUIRED'?
   ['      gateway.setEnabled(false)',x]:[x]),
  source208.flatMap(x=>x.trim()==='return ContinuousVoiceChange.PERMISSION_REQUIRED'?
   ['      runCatching { gateway.stopWakeService() }',x]:[x]),
  source208.map(x=>x.trim()==='return ContinuousVoiceChange.PERMISSION_REQUIRED'?
   '      return disableAfterPermissionRevoked()':x)
 ];
 for(const lines of fixed)
  assert.equal(find(P208,lines,[13,20],'STALE_VOICE_ENABLED_AFTER_MIC_PERMISSION_REVOKED').length,0);
});
test('strict changed executable evidence, attested file, exact family, no comment/strings',()=>{
 const samples=[
  [P205,source205,[4],'CLAIM_VALUE_UNIT_CASE_COLLISION'],
  [P206,source206,[10],'TTS_UTF16_SURROGATE_SPLIT'],
  [P208,source208,[13,20],'STALE_VOICE_ENABLED_AFTER_MIC_PERMISSION_REVOKED']
 ];
 for(const [path,lines,added,rule] of samples){
  assert.equal(find(path,lines,[],rule).length,0,rule+' no additions');
  assert.equal(find(path.replace('/ai/','/unrelated/').replace('/voice/','/unrelated/'),
   lines,added,rule).length,0,rule+' wrong file');
  const inactive=new Map(added.map(n=>[n,'']));
  assert.equal(semanticCandidates({path,lines,
   added:added.map(line=>({line,text:lines[line-1]})),
   active:inactive}).filter(x=>x.rule===rule).length,0,rule+' comment');
  const source=modified(path,lines,added);source.fullSource='// tampered\n'+source.fullSource;
  const out=analyze([source],{sha:'f'.repeat(40)});
  assert.equal(out.coverage.partial,true);
  assert.ok(!out.findings.some(x=>x.rule===rule),rule+' tampered');
 }
});
