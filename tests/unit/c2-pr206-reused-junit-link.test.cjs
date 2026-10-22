'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {verifyJUnitLink}=require('../../packages/quality-gates/c2-pr206-reused-junit-link.cjs');
const C='com.cardenaspiero255.gamehubultra.voice.C2OriginalSpeechChunkerOracleTest';
const xml=[
'<?xml version="1.0" encoding="UTF-8"?>',
'<testsuite name="'+C+'" tests="4" skipped="0" failures="0" errors="0" timestamp="2026-10-22T17:59:37" hostname="runnervm8k3b6" time="0.188">',
'  <properties/>',
'  <testcase name="whitespaceBeforeEmojiAvoidsSurrogateSplit()" classname="'+C+'" time="0.144"/>',
'  <testcase name="asciiControlHasNoSplitSurrogate()" classname="'+C+'" time="0.001"/>',
'  <testcase name="smallTextControlRemainsUnchanged()" classname="'+C+'" time="0.024"/>',
'  <testcase name="originalEmojiAtHardBoundarySplitsSurrogatePair()" classname="'+C+'" time="0.017"/>',
'  <system-out><![CDATA[]]></system-out>',
'  <system-err><![CDATA[]]></system-err>',
'</testsuite>',''].join('\n');
const head='53cb89551d6e750d263bc0e25dde9f4d3069144f';
const blob='6ce74fb027c0d6e3fe6cfe48d3b0b5fc1ba2497a';
const path='app/src/main/java/com/cardenaspiero255/gamehubultra/voice/UltraSpeechChunker.kt';
const run={id:39827001646,head_sha:'e34330964d519c194f6b56a886a48567435fba99',
 path:'.github/workflows/c2-pr206-utf16-triple-source-oracle.yml',
 event:'pull_request',head_branch:'audit/c2-pr206-utf16-real-triple-20261022',
 status:'completed',conclusion:'success',actor:{id:322222186},
 repository:{id:1418338512}};
const artifact={id:12447597134,name:'c2-pr206-original-fixed-real-kotlin-core-unscored',
 digest:'sha256:5deccbf951d42fbe9b8f236911ebd6e005d466cf424d9701d69ad265f4f43030',
 expired:false,workflow_run:{id:39827001646,repository_id:1418338512}};
const joined={
 schema:'c2-pr206-original-counterfactual-jvm-joined-core/v1',
 observedSource:blob,derivedSource:'d977d119170c6f3563532d4219c1966b6e2d755f',
 core:{sourceRuleId:'TTS_UTF16_SURROGATE_SPLIT',originalPath:path,originalLine:26,
 originalExactRulePathLineCount:1,counterfactualSameRuleCount:0,partial:false},
 behavior:{originalHeadSha:head,originalSourceBlobSha:blob,originalSourcePath:path,
 originalRuleLine:26,sourceVersionsExecuted:2,behavioralTransitions:2,benignInputControlsPassed:6},
 realUpstreamFixProven:false,independentBenignSourceLabels:0,admittedGoldLabels:0,
 falsePositiveRate:null,precision:null,recall:null,f1:null,sssPlusCertified:false
};
const core={headSha:head,sourceBlobSha:blob,sourcePath:path,ruleId:'TTS_UTF16_SURROGATE_SPLIT',
 line:26,originalSourceAndDiffVerified:true,knownPublicRegression:true,newLabels:0};
const good=()=>({run:structuredClone(run),artifact:structuredClone(artifact),xml:Buffer.from(xml,'utf8'),
 joined:structuredClone(joined),core:structuredClone(core)});
test('RED: original four JUnit bytes and historical GitHub identities link to current Kotlin/core evidence, but no score',()=>{
 const r=verifyJUnitLink(good());
 assert.equal(r.junitSha256,'ed3b6a82f9e2ffbf11d8fc54bd5512206fe471e4dd5590b2c105e5b061e72936');
 assert.equal(r.junitTests,4);assert.equal(r.originalGameHubHeadSha,head);
 assert.equal(r.originalGameHubBlobSha,blob);
 assert.equal(r.originalArchiveAuthenticated,true);
 assert.equal(r.originalSourceWitnessLinkedToCurrentCore,true);
 assert.equal(r.independentBenignLabels,0);
 assert.equal(r.scoredFalsePositiveRate,null);
 assert.equal(r.newGoldLabels,0);
});
test('RED: JUnit bytes, 4-case oracle or missing source identity cannot be forged',()=>{
 for(const modify of [
 x=>{x.xml=Buffer.from(x.xml.toString('utf8').replace('tests="4"','tests="5"'))},
 x=>{x.xml=Buffer.concat([x.xml,Buffer.from(' ')]);},
 x=>{x.joined.behavior.originalSourceBlobSha='f'.repeat(40);},
 x=>{x.joined.core.originalExactRulePathLineCount=0;},
 x=>{x.core.sourcePath='other.kt';},
 x=>{x.joined.falsePositiveRate=0;},
 x=>{x.run.head_sha='a'.repeat(40);},
 x=>{x.artifact.digest='sha256:'+'a'.repeat(64);},
 x=>{x.artifact.workflow_run.repository_id=0;},
 x=>{x.run.conclusion='failure';},
 x=>{x.artifact.expired=true;},
 ]){const d=good();modify(d);assert.throws(()=>verifyJUnitLink(d),/C2_REUSED_JUNIT_LINK_BLOCKED/);}
});
