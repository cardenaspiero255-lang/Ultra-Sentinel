'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {createHash}=require('node:crypto');
const root=join(__dirname,'../..');
const original=readFileSync(join(root,'tests/fixtures/c2-original-speech/UltraSpeechChunker.kt'),'utf8');
const {scanSpeechSource,ORIGINAL_PATH,RULE_ID}=require('../../packages/quality-gates/c2-original-speech-206.cjs');
const sha=source=>createHash('sha1').update('blob '+Buffer.byteLength(source)+'\0'+source).digest('hex');
test('source fixture is byte-for-byte the known upstream #206 Git blob',()=>{
 assert.equal(sha(original),'6ce74fb027c0d6e3fe6cfe48d3b0b5fc1ba2497a');
});
test('actual Sentinel Core reports one exact ruleId/path/line for original #206 code',()=>{
 const result=scanSpeechSource(original);
 assert.equal(result.coverage.partial,false);
 const hits=result.findings.filter(x=>x.rule===RULE_ID);
 assert.equal(hits.length,1,JSON.stringify(result));
 assert.equal(RULE_ID,'TTS_UTF16_SURROGATE_SPLIT');
 assert.equal(hits[0].path,ORIGINAL_PATH);
 assert.equal(hits[0].line,26);
 assert.equal(hits[0].status,'NEEDS_VERIFICATION');
 assert.match(hits[0].evidence,/substring\(0, boundary\)/);
});
test('counterfactual with Unicode-safe boundary has no matching finding',()=>{
 const corrected=original.replace(
  '            chunks += remaining.substring(0, boundary).trimEnd()',
  '            val safeBoundary = if (boundary < remaining.length && boundary > 0 && remaining[boundary - 1].isHighSurrogate() && remaining[boundary].isLowSurrogate()) boundary - 1 else boundary\n'+
  '            chunks += remaining.substring(0, safeBoundary).trimEnd()'
 ).replace('remaining = remaining.substring(boundary).trimStart()','remaining = remaining.substring(safeBoundary).trimStart()');
 assert.notEqual(corrected,original);
 const r=scanSpeechSource(corrected);
 assert.equal(r.findings.filter(x=>x.rule===RULE_ID).length,0);
 assert.equal(r.coverage.partial,false);
});
test('unrelated pathname and tampered source cannot become confirmed original finding',()=>{
 const wrong=scanSpeechSource(original,{path:'docs/src/main/kotlin/UltraSpeechChunker.kt'});
 assert.equal(wrong.findings.some(x=>x.rule===RULE_ID),false);
 const tampered=scanSpeechSource('// attacker\n'+original, {patchSource:original});
 assert.equal(tampered.coverage.partial,true);
 assert.equal(tampered.findings.some(x=>x.rule===RULE_ID),false);
});
test('this original-source probe does not claim certified independent labels or repair',()=>{
 const source=readFileSync(join(root,'packages/quality-gates/c2-original-speech-206.cjs'),'utf8');
 const workflow=readFileSync(join(root,'.github/workflows/c2-original-speech-206.yml'),'utf8');
 assert.match(source,/newLabels:\s*0/);
 assert.match(source,/tripleSPlusCertified:\s*false/);
 assert.match(source,/git[\s\S]*rev-parse HEAD/);
 assert.match(workflow,/persist-credentials:\s*false/);
 assert.match(workflow,/contents:\s*read/);
 assert.doesNotMatch(workflow,/contents:\s*write|continue-on-error:\s*true/);
});
