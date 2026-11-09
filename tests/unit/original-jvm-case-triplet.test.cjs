'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {assessOriginalJvmTriplet}=require('../../packages/recovery/original-jvm-case-triplet.cjs');
const note=()=>({
 caseId:'JARVIS_TRANSIENT_NOTE_HISTORY',
 original:{exitCode:1,stdout:'note_excerpt_in_restored_encrypted_history=true\n',
  stderr:'java.lang.IllegalStateException: TEMPORARY_NOTE_EXCERPT_PERSISTED\n'},
 candidate:{exitCode:0,stdout:'consent_and_aes_gcm_controls=PASS\n'+
  'visible_note_and_repeat=PASS\nindex_revoked=PASS\n'+
  'note_excerpt_in_restored_encrypted_history=false\nNOTE_STORE_ORACLE_PASS\n',stderr:''},
 unsafe:{exitCode:1,stdout:'',stderr:'BENIGN_HISTORY_REGRESSION\n'}
});
const bounded=()=>({
 caseId:'JARVIS_BOUNDED_READ_NONPROGRESS',
 original:{exitCode:1,stdout:'',stderr:'java.lang.IllegalStateException: ZERO_PROGRESS_ACCEPTED\n'},
 candidate:{exitCode:0,stdout:'nonprogress_rejected=PASS\n'+
  'benign_bulk_read=PASS\nzero_length_read=PASS\n'+
  'eof_read=PASS\nBOUND_READ_ORACLE_PASS\n',stderr:''},
 unsafe:{exitCode:1,stdout:'nonprogress_rejected=PASS\n',
  stderr:'java.lang.IllegalStateException: BENIGN_POSITIVE_READ_REGRESSION\n'}
});
test('same bounded fail-closed policy classifies independent note and stream JVM cases',()=>{
 for(const sample of [note(),bounded()]){
  const result=assessOriginalJvmTriplet(sample);
  assert.equal(result.status,'LOCAL_JVM_FAMILY_TRIPLET_ACCEPTED');
  assert.equal(result.caseId,sample.caseId);
  assert.equal(result.originalRed,true);
  assert.equal(result.candidateGreen,true);
  assert.equal(result.unsafeVeto,true);
  assert.equal(result.functionalOracleAuthenticatedByThisFunction,false);
  assert.equal(result.causalityVerified,false);
  assert.equal(result.remoteWrites,false);
  assert.equal(result.mergeAllowed,false);
 }
});
test('cross-family outcomes, omitted controls and incorrect veto fail closed',()=>{
 const changed=[
  {...note(),candidate:bounded().candidate},
  {...bounded(),original:note().original},
  {...bounded(),unsafe:note().unsafe},
  {...bounded(),candidate:{...bounded().candidate,stdout:'BOUND_READ_ORACLE_PASS\n'}},
  {...bounded(),candidate:{...bounded().candidate,stdout:bounded().candidate.stdout.replace('benign_bulk_read=PASS','benign_bulk_read=FAIL')}},
  {...bounded(),unsafe:{...bounded().unsafe,exitCode:0}},
  {...bounded(),caseId:'UNKNOWN_CASE'},
  {...note(),caseId:'JARVIS_BOUNDED_READ_NONPROGRESS'},
  {...note(),candidate:{...note().candidate,stderr:'warning'}}
 ];
 for(const sample of changed){
  const result=assessOriginalJvmTriplet(sample);
  assert.match(result.status,/^BLOCKED_/);
  assert.equal(result.remoteWrites,false);
 }
});
test('inputs with accessors or proxy traps are inert and rejected',()=>{
 let effects=0;const trap=()=>{effects++;throw Error('untrusted side effect');};
 const accessor=note();
 Object.defineProperty(accessor.candidate,'stdout',{get:trap});
 assert.match(assessOriginalJvmTriplet(accessor).status,/^BLOCKED_/);
 const proxy=new Proxy(note(),{get:trap,getPrototypeOf:trap,ownKeys:trap});
 assert.match(assessOriginalJvmTriplet(proxy).status,/^BLOCKED_/);
 assert.match(assessOriginalJvmTriplet({...bounded(),authority:true}).status,/^BLOCKED_/);
 assert.equal(effects,0);
});
