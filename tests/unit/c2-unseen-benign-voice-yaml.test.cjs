'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const raw=fs.readFileSync(path.resolve(__dirname,'../../.github/workflows/c2-unseen-benign-voice-oracles.yml'),'utf8');
test('Heredoc content preserves YAML literal-block indentation for three source entries',()=>{
 const lines=raw.split('\n');
 const i=lines.findIndex(x=>x.includes("<<'C2_PINNED_INPUTS'"));
 assert.ok(i>=0,'missing source manifest');
 assert.match(lines[i],/^ {10}cat /);
 for(let n=i+1;n<i+5;n++)assert.match(lines[n],/^ {10}\S/,'unindented YAML heredoc line '+n);
 assert.equal(lines[i+4].trim(),'C2_PINNED_INPUTS');
 assert.match(lines[i+5],/^ {10}while /);
});
test('Workflow remains isolated owner-only with verified source blobs',()=>{
 assert.match(raw,/github\.event\.comment\.user\.id == 322222186/);
 assert.match(raw,/--unshare-all --new-session --clearenv/);
 assert.match(raw,/git hash-object/);
 assert.match(raw,/candidateInspected == false/);
 assert.match(raw,/negativeFindingLabelsEstablished == 0/);
});
