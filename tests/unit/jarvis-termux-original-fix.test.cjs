'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {makeTermuxCandidate,verifyOriginalAndCandidate,PATH,PIN}=
 require('../../packages/recovery/jarvis-termux-original-fix.cjs');
const original=String.raw`package com.cardenaspiero255.jarvis.core

class TermuxResultTracker {
    private val uidPattern = Regex("^uid=[0-9]+(?:\\([^)]{1,64}\\))?(?:\\s|$)")
    fun accept(stdout: String): Boolean =
        uidPattern.containsMatchIn(stdout.trim())
}
`.replaceAll('\\`','`');
const sha=s=>createHash('sha256').update(s).digest('hex');
test('candidate preserves source and changes only bounded full-output validation',()=>{
 const v=makeTermuxCandidate(original);
 assert.match(v.candidate,/uidPattern\.matches\(stdout\.trim\(\)\)/);
 assert.match(v.candidate,/groups=/);
 assert.match(v.candidate,/context=/);
 assert.match(v.unsafe,/uidPattern\.matches\(stdout\.trim\(\)\)/);
 assert.doesNotMatch(v.unsafe,/groups=/);
 assert.equal(v.candidate.split('\n')[0],original.split('\n')[0]);
 assert.equal(v.sourceSha256,sha(original));
 assert.equal(v.candidateSha256,sha(v.candidate));
 assert.equal(v.unsafeSha256,sha(v.unsafe));
});
test('untrusted source drift or duplicate matches block candidate',()=>{
 for(const invalid of [
  original.replace('uidPattern.containsMatchIn','uidPattern.find'),
  original.replace('(?:\\\\s|$)','(?:\\\\S|$)'),
  original.replace('uidPattern.containsMatchIn(stdout.trim())','uidPattern.containsMatchIn(stdout.trim())\n        uidPattern.containsMatchIn(stdout.trim())'),
  'hello\n'
 ])assert.throws(()=>makeTermuxCandidate(invalid),/TERMUX_/);
});
test('fixed original pin is checked separately from local consistency',()=>{
 assert.equal(PATH,'apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/CompanionResultPolicy.kt');
 assert.equal(PIN.commit,'f2572a8abb0a1ef5b34d971ea8c4dc5acbecf868');
 assert.equal(PIN.blob,'7c6f326cb267b56f4ca6b2d0614753695259da56');
 assert.equal(verifyOriginalAndCandidate({original:'fake',candidate:'fake'}),false);
});
