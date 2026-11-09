'use strict';
/**
 * A narrowly-scoped, side-effect-free classifier for two JARVIS JVM runs.
 * It cannot prove provenance or causality by itself: only the isolated CI
 * runner can authenticate Git bytes and execute the actual original Kotlin.
 * A contrastive output is a data-flow observation, not a privacy verdict.
 */
const {snapshotRecord}=require('../investigation/plain-kotlin-payload.cjs');
const COMMON=Object.freeze([
 'note_source_search=PASS',
 'note_visible_in_dialogue=PASS',
 'repeat_visible_in_dialogue=PASS',
 'opt_in_gate=PASS',
 'ordinary_history_roundtrip=PASS',
 'without_note_control=PASS',
 'CROSS_FILE_NOTE_FLOW_ORACLE_PASS'
]);
function outcome(status,accepted=false){
 return Object.freeze({
  status,originalNotePersisted:accepted,candidateNoteSuppressed:accepted,
  originalSourcesAuthenticatedByThisFunction:false,
  originalJvmExecutionAuthenticatedByThisFunction:false,
  causalDefectProven:false,productContractConfirmed:false,
  newFamilyProven:false,ownerAuthorizationGranted:false,
  remoteWrites:false,mergeAllowed:false,productionReleaseAllowed:false,
  limitation:'An inert, fixed-case outcome check; the isolated original-source CI runner must independently pin all three Git blobs and execute JVMs. The product privacy contract remains unresolved.'
 });
}
function validRun(value){
 const p=snapshotRecord(value,['exitCode','stdout','stderr']);
 if(!Number.isSafeInteger(p.exitCode)||p.exitCode<0||p.exitCode>255||
  typeof p.stdout!=='string'||typeof p.stderr!=='string'||
  Buffer.byteLength(p.stdout,'utf8')>16384||
  Buffer.byteLength(p.stderr,'utf8')>16384)return null;
 return p;
}
function uniqueLine(lines,text){
 return lines.filter(line=>line===text).length===1;
}
function inspect(run,expected){
 if(run.exitCode!==0||run.stderr!=='')return false;
 const lines=run.stdout.split('\n');
 if(!COMMON.every(marker=>uniqueLine(lines,marker)))return false;
 for(const marker of ['note_in_snapshot','note_in_encrypted_readback']){
  if(!uniqueLine(lines,marker+'='+expected)||
   lines.some(line=>line===marker+'='+(expected==='true'?'false':'true')))return false;
 }
 return true;
}
function assessOriginalNoteFlowCounterfactual(input){
 try{
  const obj=snapshotRecord(input,['original','candidate']);
  const original=validRun(obj.original),candidate=validRun(obj.candidate);
  if(!original||!candidate||!inspect(original,'true')||!inspect(candidate,'false'))
   return outcome('BLOCKED_NOTE_FLOW_DIFFERENTIAL');
  return outcome('LOCAL_ORIGINAL_NOTE_FLOW_COUNTERFACTUAL_OBSERVED',true);
 }catch{return outcome('BLOCKED_NOTE_FLOW_INPUT');}
}
module.exports=Object.freeze({assessOriginalNoteFlowCounterfactual});
