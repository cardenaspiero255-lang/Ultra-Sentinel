'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {
 makeImmutableCounterfactual,
 compareFrozenCore,
 adjudicateKotlinTriple
}=require('../../packages/quality-gates/c2-pr206-utf16-triple-oracle.cjs');
const {ORIGINAL_PATH,HEAD,BLOB}=require('../../packages/quality-gates/c2-original-speech-206.cjs');
const ORIGINAL=fs.readFileSync(path.resolve(__dirname,'../fixtures/c2-original-speech/UltraSpeechChunker.kt'),'utf8');
const observations=(variant,broken)=>({
 schema:'c2-pr206-utf16-real-kotlin-runtime/v1',
 variant,
 boundary32Broken:broken,boundary800Broken:broken,
 asciiBenign:true,whitespaceBenign:true,shortBenign:true,
 executedOriginalKotlinSource:true,
 countIndependentBenignLabels:0
});
test('RED: derivative patch is exactly one guard plus both corrected substring boundaries, original remains SHA-pinned',()=>{
 const output=makeImmutableCounterfactual(ORIGINAL);
 assert.equal(output.originalBlobSha,BLOB);
 assert.equal(output.originalHeadSha,HEAD);
 assert.equal(output.originalSourcePath,ORIGINAL_PATH);
 assert.equal(output.status,'EXACT_SOURCE_DERIVATIVE_NOT_UPSTREAM_FIX');
 assert.equal(output.changedSites,3);
 assert.ok(output.fixedSource.includes('val safeBoundary ='));
 assert.ok(output.fixedSource.includes('remaining.substring(0, safeBoundary)'));
 assert.ok(output.fixedSource.includes('remaining.substring(safeBoundary)'));
 assert.ok(!output.fixedSource.includes('remaining.substring(0, boundary)'));
 assert.equal(output.counterfactualUpstreamCommitCertified,false);
 assert.equal(output.originalSource,undefined);
});
test('RED: frozen production Core emits the exact original PR206 rule but not on targeted fix',()=>{
 const patch=makeImmutableCounterfactual(ORIGINAL);
 const report=compareFrozenCore(ORIGINAL,patch.fixedSource);
 assert.equal(report.sourceRuleId,'TTS_UTF16_SURROGATE_SPLIT');
 assert.equal(report.originalExactRulePathLineCount,1);
 assert.equal(report.originalLine,26);
 assert.equal(report.counterfactualSameRuleCount,0);
 assert.equal(report.partial,false);
 assert.equal(report.independentSourceBenignRulesScored,0);
});
test('RED: require Kotlin original 32 and 800 defect, corrected 32 and 800, and input controls safe both',()=>{
 const patch=makeImmutableCounterfactual(ORIGINAL);
 const report=adjudicateKotlinTriple(patch,
  observations('original',true),observations('counterfactual',false));
 assert.equal(report.behavioralTransitions,2);
 assert.equal(report.authenticOriginalSource,true);
 assert.equal(report.correctedProductionCodeSource,false);
 assert.equal(report.benignInputControlsPassed,6);
 assert.equal(report.independentBenignSourceOracles,0);
 assert.equal(report.scoredTrueNegatives,0);
 assert.equal(report.scoredFalsePositives,0);
 assert.equal(report.falsePositiveRate,null);
 assert.equal(report.precision,null);
 assert.equal(report.recall,null);
 assert.equal(report.f1,null);
 assert.equal(report.newGoldLabels,0);
 assert.equal(report.sssPlusCertified,false);
});
test('RED: tampered original, missing or forged JVM outcomes are rejected without scoring',()=>{
 assert.throws(()=>makeImmutableCounterfactual(ORIGINAL.replace('remaining.substring(boundary)','remaining.substring(boundary + 1)')),/C2_PR206_TRIPLE_REJECTED/);
 const patch=makeImmutableCounterfactual(ORIGINAL);
 const bad=[
  [observations('original',false),observations('counterfactual',false)],
  [observations('original',true),observations('counterfactual',true)],
  [observations('counterfactual',true),observations('original',false)],
  [observations('original',true),{...observations('counterfactual',false),asciiBenign:false}],
  [{...observations('original',true),countIndependentBenignLabels:3},observations('counterfactual',false)],
  [{...observations('original',true),precision:1},observations('counterfactual',false)]
 ];
 for(const [a,b] of bad)assert.throws(()=>adjudicateKotlinTriple(patch,a,b),/C2_PR206_TRIPLE_REJECTED/);
});
test('RED: CI must execute distinct real Kotlin JVM sources and preserve the development-only boundary',()=>{
 const wf=fs.readFileSync(path.resolve(__dirname,'../../.github/workflows/c2-pr206-utf16-triple-source-oracle.yml'),'utf8');
 assert.match(wf,/kotlinc.*original\/UltraSpeechChunker\.kt/);
 assert.match(wf,/kotlinc.*counterfactual\/UltraSpeechChunker\.kt/);
 assert.match(wf,/bwrap --die-with-parent --unshare-all/);
 assert.match(wf,/actions\/checkout@[a-f0-9]{40}/);
 assert.match(wf,/contents: read/);
 assert.doesNotMatch(wf,/contents: write|continue-on-error: true/);
});
