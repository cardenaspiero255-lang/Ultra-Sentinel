'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {replaceExactlyOnce,makePoliteCandidate}=require('../../packages/investigation/jarvis-polite-candidate.cjs');

test('anchored candidate construction fails closed on drift or duplicate anchors',()=>{
 assert.equal(replaceExactlyOnce('before ANCHOR after','ANCHOR','replacement'),'before replacement after');
 assert.throws(()=>replaceExactlyOnce('before after','ANCHOR','replacement'),/POLITE_CANDIDATE_ANCHOR/);
 assert.throws(()=>replaceExactlyOnce('ANCHOR twice ANCHOR','ANCHOR','replacement'),/POLITE_CANDIDATE_ANCHOR/);
});
test('candidate generation refuses unverified or tampered JARVIS source bytes',()=>{
 assert.throws(()=>makePoliteCandidate({gate:'fake Kotlin\n',policy:'fake Kotlin\n'}),/POLITE_CANDIDATE_ORIGINAL/);
 assert.throws(()=>makePoliteCandidate({gate:null,policy:null}),/POLITE_CANDIDATE_ORIGINAL/);
});
