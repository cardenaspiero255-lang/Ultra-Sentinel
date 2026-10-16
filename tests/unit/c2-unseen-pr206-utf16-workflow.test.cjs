'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const yaml=fs.readFileSync(path.resolve(__dirname,'../../.github/workflows/c2-unseen-pr206-utf16-oracle.yml'),'utf8');
const oracle=fs.readFileSync(path.resolve(__dirname,'../oracles/c2-unseen-speech-chunker.kt'),'utf8');
test('holdout oracle cannot execute without earlier owner freeze evidence',()=>{
 assert.match(yaml,/38838525845/);
 assert.match(yaml,/12019324481/);
 assert.match(yaml,/6946e730d030f4772eff3ea9e704d7731f99c721/);
 assert.match(yaml,/ULTRA_SENTINEL_C2_UNSEEN_CHUNKER_V1/);
 assert.match(yaml,/github\.event\.comment\.user\.id == 322222186/);
 assert.match(yaml,/github\.event\.repository\.id == 1418338512/);
});
test('only immutable original PR206 Git blob is compiled; no branch checkout or token to JVM',()=>{
 assert.match(yaml,/53cb89551d6e750d263bc0e25dde9f4d3069144f/);
 assert.match(yaml,/6ce74fb027c0d6e3fe6cfe48d3b0b5fc1ba2497a/);
 assert.match(yaml,/git hash-object/);
 assert.match(yaml,/kotlinc[\s\S]*UltraSpeechChunker\.kt/);
 assert.match(yaml,/--unshare-all --new-session --clearenv/);
 assert.match(yaml,/--ro-bind "\$build" \/workspace/);
 assert.doesNotMatch(yaml,/gh pr checkout|pull_request_target:|--share-net|auto.merge/);
});
test('Unicode oracle requires failure on surrogate boundary AND benign controls',()=>{
 assert.match(oracle,/validUtf16/);
 assert.match(oracle,/repeat\(31\)\+"😀"/);
 assert.match(oracle,/repeat\(799\)\+"😀"/);
 assert.match(oracle,/normalChunks\.all/);
 assert.match(oracle,/safeChunks\.all/);
 assert.match(oracle,/candidateInspected":false/);
 assert.match(oracle,/globalPrecision":null/);
 assert.match(yaml,/candidateInspected == false/);
 assert.match(yaml,/controlsPassed == true/);
 assert.match(yaml,/tripleSPlusCertified == false/);
});
