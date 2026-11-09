'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {assessNoteJvmTriplet}=require('../../packages/recovery/original-jvm-note-triplet.cjs');
const original={exitCode:1,stdout:'note_excerpt_in_restored_encrypted_history=true\n',
 stderr:'TEMPORARY_NOTE_EXCERPT_PERSISTED\n'};
const candidate={exitCode:0,stdout:'consent_and_aes_gcm_controls=PASS\n'+
 'visible_note_and_repeat=PASS\nindex_revoked=PASS\n'+
 'note_excerpt_in_restored_encrypted_history=false\nNOTE_STORE_ORACLE_PASS\n',stderr:''};
const unsafe={exitCode:1,stdout:'',stderr:'BENIGN_HISTORY_REGRESSION\n'};
const ok=()=>({original,candidate,unsafe});
test('gates all three independent JVM outcomes in one bounded local decision',()=>{
 const r=assessNoteJvmTriplet(ok());
 assert.equal(r.status,'RUNNER_LOCAL_NOTE_ORACLE_TRIPLET_ACCEPTED');
 assert.equal(r.originalRed,true);assert.equal(r.candidateGreen,true);assert.equal(r.unsafeVeto,true);
 assert.equal(r.functionalOracleAuthenticatedByThisFunction,false);
 assert.equal(r.mergeAllowed,false);assert.equal(r.remoteWrites,false);
});
test('never accepts missing RED, GREEN, controls, or invalid veto',()=>{
 for(const change of [
  p=>p.original={...original,exitCode:0},
  p=>p.original={...original,stderr:'unrelated error'},
  p=>p.candidate={...candidate,exitCode:1},
  p=>p.candidate={...candidate,stdout:'NOTE_STORE_ORACLE_PASS\n'},
  p=>p.candidate={...candidate,stdout:candidate.stdout.replace('false','true')},
  p=>p.unsafe={...unsafe,exitCode:0},
  p=>p.unsafe={...unsafe,stderr:'unrelated error'}
 ]){
  const p=ok();change(p);
  const r=assessNoteJvmTriplet(p);
  assert.match(r.status,/^BLOCKED_/);
  assert.equal(r.remoteWrites,false);
 }
});
test('rejects effectful inputs without calling traps',()=>{
 let effects=0;const evil=()=>{effects++;throw Error('side effect');};
 const a=ok();Object.defineProperty(a.candidate,'stdout',{get:evil});
 assert.match(assessNoteJvmTriplet(a).status,/^BLOCKED_/);
 const p=new Proxy(ok(),{get:evil,getPrototypeOf:evil,ownKeys:evil});
 assert.match(assessNoteJvmTriplet(p).status,/^BLOCKED_/);
 assert.match(assessNoteJvmTriplet({...ok(),extra:'privilege'}).status,/^BLOCKED_/);
 assert.match(assessNoteJvmTriplet({...ok(),original:{...original,stderr:'x'.repeat(65537)}}).status,/^BLOCKED_/);
 assert.equal(effects,0);
});
