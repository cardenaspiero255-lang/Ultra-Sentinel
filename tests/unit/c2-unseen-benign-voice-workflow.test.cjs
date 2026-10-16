'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const yaml=fs.readFileSync(path.resolve(__dirname,'../../.github/workflows/c2-unseen-benign-voice-oracles.yml'),'utf8');
const kt=fs.readFileSync(path.resolve(__dirname,'../oracles/c2-unseen-benign-voice-controls.kt'),'utf8');
test('controls use distinct source SHA from both frozen PRs',()=>{
 for(const x of [
 '53cb89551d6e750d263bc0e25dde9f4d3069144f',
 'df2bd33416d652480e51994784e511fbcb7ede12',
 '84314310e5aee094b558e0f59d33e2779b258be7',
 '739cabd415d931fb7a2816a881df300a07c81559',
 'e7c30a22bd66d8c01752281b53bc5ab61e431beb',
 '38838525845','12019324481'
 ])assert.ok(yaml.includes(x),x);
});
test('benign controls never become artificial truth negatives or enter candidate',()=>{
 assert.ok(kt.includes('negativeFindingLabelsEstablished":0'));
 assert.ok(kt.includes('candidateInspected":false'));
 assert.ok(kt.includes('realDefectsVerified":0'));
 assert.match(yaml,/negativeFindingLabelsEstablished == 0/);
 assert.match(yaml,/candidateInspected == false/);
 assert.ok(yaml.includes("tripleSPlusCertified == false"));
});
test('ASR/TTS oracle has actual negative behavioral checks',()=>{
 for(const text of ['ASR_BACKOFF','ASR_SATURATION','ASR_NO_FALSE_HEALTH_RESET',
 'ASR_ACTUAL_HEALTH_RESET','ASR_NETWORK_NO_REBUILD',
 'TTS_NEWEST_REPLACES','TTS_NO_RESURRECTION','TTS_FAILURE_TERMINAL'])
 assert.ok(kt.includes(text),text);
});
test('workflow requires owner, clean checks and bubblewrap without network',()=>{
 for(const text of ['github.event.repository.id == 1418338512',
 "github.actor_id == '322222186'","github.event.comment.user.id == 322222186",
 '--unshare-all --new-session --clearenv','test "$(git hash-object',
 'npm run check','--ro-bind "$build" /workspace'])
 assert.ok(yaml.includes(text),text);
 assert.doesNotMatch(yaml,/--share-net|gh pr checkout|pull_request_target:|contents: write/);
});
