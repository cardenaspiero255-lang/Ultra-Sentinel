'use strict';
/*
 * Uniform, inert log classifier for two original JVM Kotlin families.
 * It does NOT execute or authenticate a JVM, inspect Git, assert causality,
 * prove a product contract, grant write permissions or replace the Judge.
 * A trusted isolated runner must produce the three processes for one case,
 * bind them to the same original Git source and independently perform Judge
 * plus rollback. Caller-provided data alone is never a signed proof.
 */
const {snapshotRecord}=require('../investigation/plain-kotlin-payload.cjs');
const CASES=Object.freeze({
 JARVIS_TRANSIENT_NOTE_HISTORY:Object.freeze({
  originalStderr:'TEMPORARY_NOTE_EXCERPT_PERSISTED',
  originalStdout:Object.freeze(['note_excerpt_in_restored_encrypted_history=true']),
  candidateStdout:Object.freeze([
   'consent_and_aes_gcm_controls=PASS',
   'visible_note_and_repeat=PASS',
   'index_revoked=PASS',
   'note_excerpt_in_restored_encrypted_history=false',
   'NOTE_STORE_ORACLE_PASS'
  ]),
  unsafeStderr:'BENIGN_HISTORY_REGRESSION'
 }),
 JARVIS_BOUNDED_READ_NONPROGRESS:Object.freeze({
  originalStderr:'ZERO_PROGRESS_ACCEPTED',
  originalStdout:Object.freeze([]),
  candidateStdout:Object.freeze([
   'nonprogress_rejected=PASS',
   'benign_bulk_read=PASS',
   'zero_length_read=PASS',
   'eof_read=PASS',
   'BOUND_READ_ORACLE_PASS'
  ]),
  unsafeStderr:'BENIGN_POSITIVE_READ_REGRESSION'
 })
});
function blocked(){
 return Object.freeze({status:'BLOCKED_ORIGINAL_JVM_FAMILY_TRIPLET',
  caseId:null,originalRed:false,candidateGreen:false,unsafeVeto:false,
  functionalOracleAuthenticatedByThisFunction:false,causalityVerified:false,
  ownerAuthorizationGranted:false,remoteWrites:false,mergeAllowed:false,
  productionReleaseAllowed:false});
}
function hasLine(output,line){return output.split('\n').some(s=>s===line);}
function assessOriginalJvmTriplet(input){
 try{
  const o=snapshotRecord(input,['caseId','original','candidate','unsafe']);
  const spec=typeof o.caseId==='string'&&Object.hasOwn(CASES,o.caseId)?CASES[o.caseId]:null;
  if(!spec) return blocked();
  const processes={};
  for(const key of ['original','candidate','unsafe']){
   const p=snapshotRecord(o[key],['exitCode','stdout','stderr']);
   if(!Number.isSafeInteger(p.exitCode)||p.exitCode<0||p.exitCode>255||
    typeof p.stdout!=='string'||typeof p.stderr!=='string'||
    Buffer.byteLength(p.stdout,'utf8')>65536||
    Buffer.byteLength(p.stderr,'utf8')>65536) return blocked();
   processes[key]=p;
  }
  const original=processes.original,candidate=processes.candidate,unsafe=processes.unsafe;
  const red=original.exitCode!==0&&original.stderr.includes(spec.originalStderr)&&
   spec.originalStdout.every(marker=>hasLine(original.stdout,marker));
  const green=candidate.exitCode===0&&candidate.stderr===''&&
   spec.candidateStdout.every(marker=>hasLine(candidate.stdout,marker));
  const veto=unsafe.exitCode!==0&&unsafe.stderr.includes(spec.unsafeStderr);
  if(!red||!green||!veto)return blocked();
  return Object.freeze({status:'LOCAL_JVM_FAMILY_TRIPLET_ACCEPTED',
   caseId:o.caseId,originalRed:true,candidateGreen:true,unsafeVeto:true,
   functionalOracleAuthenticatedByThisFunction:false,causalityVerified:false,
   ownerAuthorizationGranted:false,remoteWrites:false,mergeAllowed:false,
   productionReleaseAllowed:false,
   limitation:'Inert fixed-case transcript check only. A trusted isolated runner '+
    'must bind process identity, Git sources and candidate bytes, perform the '+
    'Git Judge and verify exact rollback before asserting local functional evidence.'});
 }catch{return blocked();}
}
module.exports=Object.freeze({assessOriginalJvmTriplet});
