'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {createTransientNoteCandidate,draftPinnedJarvisNoteCandidate}=
 require('../../packages/investigation/jarvis-note-transient-draft.cjs');
const blobSha=s=>{const b=Buffer.from(s,'utf8');return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');};
const anchors=[
 '    private val turns = mutableListOf<String>()',
 '        turns.add("Tú: $sanitized".take(400))',
 '        turns.add("JARVIS: $answer".take(400))',
 '        lastAnswer = answer',
 '    fun history(): List<String> = turns.toList()',
 '        val lines = turns.takeLast(24).toMutableList()',
 '                turns.add(bounded)',
 '        lastAnswer = turns.lastOrNull { it.startsWith("JARVIS: ") }\n            ?.removePrefix("JARVIS: ")',
 '        turns.clear()\n        lastAnswer = null'
];
const fixture=()=>anchors.join('\n')+'\n';
test('generates an exact bounded candidate for each original dialogue anchor',()=>{
 const source=fixture();
 const output=createTransientNoteCandidate(source);
 assert.equal(typeof output,'string');
 assert.notEqual(output,source);
 assert.match(output,/private data class Turn\(val text: String, val persistent: Boolean\)/);
 assert.match(output,/lastAnswerEphemeral = transientAnswer/);
 assert.match(output,/turns\.filter \{ it\.persistent \}/);
 assert.match(output,/fun history\(\): List<String> = turns\.map \{ it\.text \}/);
 assert.match(output,/turns\.add\(Turn\(bounded, true\)\)/);
 assert.match(output,/lastAnswerEphemeral = false/);
 assert.ok(output.endsWith('\n'));
 assert.equal(createTransientNoteCandidate(source),output);
});
test('never generates a partial candidate when an anchor is absent, repeated, or patched',()=>{
 const source=fixture();
 assert.equal(createTransientNoteCandidate(source.replace(anchors[5],'// missing')),null);
 assert.equal(createTransientNoteCandidate(source+anchors[2]+'\n'),null);
 assert.equal(createTransientNoteCandidate(source.replace(anchors[0],'    private val turns = mutableListOf<Turn>()')),null);
 assert.equal(createTransientNoteCandidate(source.replace(/\n/g,'\r\n')),null);
 assert.equal(createTransientNoteCandidate(source+'\0'),null);
});
test('forged source identity cannot claim provenance or authorization',()=>{
 const source=fixture(),valid={expectedCommitSha:'747c14b5d97750a7b2736968e2d516f02448558d',
  file:{path:'apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/LocalDialogue.kt',
   source,expectedBlobSha:blobSha(source)}};
 assert.match(draftPinnedJarvisNoteCandidate(valid).status,/^BLOCKED_/);
 for(const changed of [
  {...valid,expectedCommitSha:'a'.repeat(40)},
  {...valid,file:{...valid.file,expectedBlobSha:'a'.repeat(40)}},
  {...valid,file:{...valid.file,path:'apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/Other.kt'}}
 ]) {
  const result=draftPinnedJarvisNoteCandidate(changed);
  assert.match(result.status,/^BLOCKED_/);
  assert.equal(result.remoteWrites,false);
  assert.equal(result.mergeAllowed,false);
 }
});
test('hostile getters and proxies are rejected without invoking side effects',()=>{
 let effects=0;
 const evil=()=>{effects++;throw Error('side effect');};
 for(const key of ['file','expectedCommitSha']){
  const input={expectedCommitSha:'a'.repeat(40),file:{}};
  Object.defineProperty(input,key,{enumerable:true,get:evil});
  assert.match(draftPinnedJarvisNoteCandidate(input).status,/^BLOCKED_/);
 }
 const proxy=new Proxy({}, {get:evil,getPrototypeOf:evil,ownKeys:evil});
 assert.match(draftPinnedJarvisNoteCandidate(proxy).status,/^BLOCKED_/);
 assert.equal(effects,0);
});
