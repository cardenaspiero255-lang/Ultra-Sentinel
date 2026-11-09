'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {assessOriginalNoteFlowCounterfactual}=
 require('../../packages/recovery/original-note-flow-counterfactual.cjs');
const base=[
 'note_source_search=PASS','note_visible_in_dialogue=PASS',
 'repeat_visible_in_dialogue=PASS','opt_in_gate=PASS',
 'ordinary_history_roundtrip=PASS','without_note_control=PASS',
 'CROSS_FILE_NOTE_FLOW_ORACLE_PASS'
];
function run(persisted){
 return Object.freeze({exitCode:0,stderr:'',
  stdout:[...base,'note_in_snapshot='+persisted,
   'note_in_encrypted_readback='+persisted].join('\n')+'\n'});
}
function pair(){return {original:run('true'),candidate:run('false')};}
test('accepts observed source-dialogue-storage differential without conferring causal authority',()=>{
 const r=assessOriginalNoteFlowCounterfactual(pair());
 assert.equal(r.status,'LOCAL_ORIGINAL_NOTE_FLOW_COUNTERFACTUAL_OBSERVED');
 assert.equal(r.originalNotePersisted,true);
 assert.equal(r.candidateNoteSuppressed,true);
 assert.equal(r.originalSourcesAuthenticatedByThisFunction,false);
 assert.equal(r.causalDefectProven,false);
 assert.equal(r.productContractConfirmed,false);
 assert.equal(r.remoteWrites,false);
 assert.equal(r.mergeAllowed,false);
});
test('both outputs must prove benign and no-note control, not merely flip the marker',()=>{
 for(const mutate of [
  x=>{x.original={...x.original,stdout:x.original.stdout.replace('note_source_search=PASS','note_source_search=FAIL')};},
  x=>{x.candidate={...x.candidate,stdout:x.candidate.stdout.replace('ordinary_history_roundtrip=PASS','')};},
  x=>{x.original={...x.original,stdout:x.original.stdout.replace('without_note_control=PASS','')};},
  x=>{x.candidate={...x.candidate,stdout:x.candidate.stdout.replace('note_visible_in_dialogue=PASS','')};},
  x=>{x.original={...x.original,exitCode:1};},
  x=>{x.candidate={...x.candidate,stdout:x.candidate.stdout.replace('note_in_snapshot=false','note_in_snapshot=true')};},
  x=>{x.original={...x.original,stdout:x.original.stdout.replace('note_in_encrypted_readback=true','note_in_encrypted_readback=false')};},
  x=>{x.candidate={...x.candidate,stderr:'warning'};}
 ]){
  const data=pair();mutate(data);
  const r=assessOriginalNoteFlowCounterfactual(data);
  assert.match(r.status,/^BLOCKED_/);
  assert.equal(r.mergeAllowed,false);
 }
});
test('crossed outcomes, extra authority and hostile getters fail closed',()=>{
 for(const data of [
  {original:run('false'),candidate:run('true')},
  {...pair(),isAuthorized:true},
  {...pair(),original:{...run('true'),untrusted:true}}
 ])assert.match(assessOriginalNoteFlowCounterfactual(data).status,/^BLOCKED_/);
 let invoked=0;const evil=()=>{invoked++;throw Error('UNTRUSTED_EFFECT');};
 const input=pair();
 input.candidate={...input.candidate}; // the sample fixture itself is frozen
 Object.defineProperty(input.candidate,'stdout',{enumerable:true,get:evil});
 assert.match(assessOriginalNoteFlowCounterfactual(input).status,/^BLOCKED_/);
 const proxy=new Proxy(pair(),{get:evil,getPrototypeOf:evil,ownKeys:evil});
 assert.match(assessOriginalNoteFlowCounterfactual(proxy).status,/^BLOCKED_/);
 assert.equal(invoked,0);
});
