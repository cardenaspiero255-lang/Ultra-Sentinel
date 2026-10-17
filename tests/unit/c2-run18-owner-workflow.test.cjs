'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const yml=fs.readFileSync(path.join(__dirname,'../../.github/workflows/c2-run18-two-original-source-truths.yml'),'utf8');
const sh=fs.readFileSync(path.join(__dirname,'../../scripts/c2-run18-owner-original-oracles.sh'),'utf8');
test('source seal is owner only on trusted main',()=>{
 for(const s of ["github.ref == 'refs/heads/main'","github.actor_id == '322222186'",
  'github.event.issue.number == 50','ULTRA_SENTINEL_C2_RUN18_MATH_VOICE_TRUTH_V1'])
  assert.ok(yml.includes(s),s);
 assert.doesNotMatch(yml,/^\s+pull_request\s*:/m);
});
test('previous 16 truths, original blobs and production callers are authenticated',()=>{
 for(const s of ['39070029033','12114598638','bc2cd5da189f39bed41c02737b1b73cf5df17bc0f938be9094bcf4e87377f764',
 '6bac3d64f843455c3f95728404ad53b25ece0748f1ed5c0e5439ae5a8cea97d4',
 '063787d48784fd9b579e2c9a4d5ad4bbd7ab9d7a',
 'f661289c8fb9d5ca59687f156923971f4cc4672d',
 '5d271a02aa4227e07a5c352b572f6c14621e80fc',
 'cb23014c91b447bef2eeb7b619503495d31a55da',
 'febd1687ceb26a9f195413021fb0257392c0592b',
 'UltraMathEngine.solve(transcript)','UltraWakeBargeInPolicy.decide(',
 'UltraWakeRecognitionDisposition.STOP_TTS -> return stopActiveUltraSpeech('])
  assert.ok(yml.includes(s),s);
});
test('mandatory networkless JVM, no credentials leaked',()=>{
 assert.match(yml,/C2_OWNER_SANDBOX=1/);
 assert.match(yml,/bubblewrap apparmor/);
 assert.match(yml,/persist-credentials: false/);
 assert.match(sh,/--unshare-all --new-session/);
 assert.match(sh,/env -i PATH=\/usr\/bin:\/bin HOME=\/tmp bwrap/);
});
test('both original controls, mutation signatures and oracle anchoring required',()=>{
 for(const s of ['C2_MATH_NORMAL_CONTROL_PASS',
 'C2_MATH_UNHANDLED_LARGE_DISCRIMINANT_EXCEPTION',
 'C2_MATH_BOUNDED_OVERFLOW_PASS',
 'C2_VOICE_NORMAL_CONTROLS_PASS','C2_VOICE_STOP_PRIORITY_PASS',
 'C2_VOICE_STOP_PRECEDENCE_CONTRACT_FAILED',
 'C2_RUN18_ORIGINAL_MATH_DRIFT','C2_RUN18_ORIGINAL_VOICE_DRIFT'])
  assert.ok(sh.includes(s),s);
});
test('truth-only output leaves precision, recall, F1, benchmark and SSS+ unverified',()=>{
 for(const s of ['neededAdditionalLabelsAtLeast==102',
 'sourcePositiveLabels==9','verifiedScopedNegativeLabels==9',
 'benchmarkScoredLabels==0','tripleSPlusCertified==false',
 'precision==null','recall==null','f1==null'])
  assert.ok(yml.includes(s),s);
 assert.doesNotMatch(yml,/gh pr merge|git push|gradlew train/);
});
