'use strict';
/* Inert classification of three JVM process outcomes. No caller-provided
 * transcript authenticates its own execution. Only a trusted isolated runner
 * may actually launch JVMs, check Git sources, and use this local policy gate. */
const {types}=require('node:util');
function record(value,keys){
 if(!value||typeof value!=='object'||types.isProxy(value)||Array.isArray(value)||
  Object.getPrototypeOf(value)!==Object.prototype||Reflect.ownKeys(value).length!==keys.length)
  throw Error('UNSAFE_PROCESS_REPORT');
 const result={};
 for(const k of keys){
  const desc=Object.getOwnPropertyDescriptor(value,k);
  if(!desc||!Object.hasOwn(desc,'value'))throw Error('UNSAFE_PROCESS_REPORT');
  result[k]=desc.value;
 }
 return result;
}
function blocked(){return Object.freeze({status:'BLOCKED_ORIGINAL_JVM_TRIPLET',
 originalRed:false,candidateGreen:false,unsafeVeto:false,
 functionalOracleAuthenticatedByThisFunction:false,ownerAuthorizationGranted:false,
 remoteWrites:false,mergeAllowed:false,productionReleaseAllowed:false});}
const line=(s,marker)=>s.split('\n').some(x=>x===marker);
function assessNoteJvmTriplet(input){
 try{
  const values=record(input,['original','candidate','unsafe']),p={};
  for(const k of ['original','candidate','unsafe']){
   const x=record(values[k],['exitCode','stdout','stderr']);
   if(!Number.isSafeInteger(x.exitCode)||x.exitCode<0||x.exitCode>255||
    typeof x.stdout!=='string'||typeof x.stderr!=='string'||
    Buffer.byteLength(x.stdout,'utf8')>65536||Buffer.byteLength(x.stderr,'utf8')>65536)throw Error('UNSAFE_LOG');
   p[k]=x;
  }
  const red=p.original.exitCode!==0&&p.original.stderr.includes('TEMPORARY_NOTE_EXCERPT_PERSISTED')&&
   line(p.original.stdout,'note_excerpt_in_restored_encrypted_history=true');
  const green=p.candidate.exitCode===0&&p.candidate.stderr===''&&
   line(p.candidate.stdout,'NOTE_STORE_ORACLE_PASS')&&
   line(p.candidate.stdout,'consent_and_aes_gcm_controls=PASS')&&
   line(p.candidate.stdout,'visible_note_and_repeat=PASS')&&
   line(p.candidate.stdout,'index_revoked=PASS')&&
   line(p.candidate.stdout,'note_excerpt_in_restored_encrypted_history=false');
  const veto=p.unsafe.exitCode!==0&&p.unsafe.stderr.includes('BENIGN_HISTORY_REGRESSION');
  if(!red||!green||!veto)return blocked();
  return Object.freeze({status:'RUNNER_LOCAL_NOTE_ORACLE_TRIPLET_ACCEPTED',
   originalRed:true,candidateGreen:true,unsafeVeto:true,
   functionalOracleAuthenticatedByThisFunction:false,ownerAuthorizationGranted:false,
   remoteWrites:false,mergeAllowed:false,productionReleaseAllowed:false,
   limitation:'Log classification only; does not attest processes, Git sources, sandbox, '+
    'product contract or authorization. Only a trusted runner may combine executions with local Judge.'});
 }catch{return blocked();}
}
module.exports=Object.freeze({assessNoteJvmTriplet});
