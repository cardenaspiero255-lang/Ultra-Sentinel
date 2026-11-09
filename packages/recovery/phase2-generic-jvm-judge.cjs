'use strict';
/** An inert, strictly typed multi-case JVM process classifier.
 * Markers and processes are caller-supplied: never a trusted JVM attestation,
 * Kotlin source claim, original oracle signature or authorization. */
const {types}=require('node:util');
const SHA=/^[a-f0-9]{40}$/;
const CASE=/^[A-Z0-9_]{6,80}$/;
const MARK=/^[A-Z0-9_]{4,95}$/;
const error=()=>{throw Error('INVALID_TRIPLET_BATCH');};
function record(v,keys){
 if(!v||typeof v!=='object'||Array.isArray(v)||types.isProxy(v)||
  Object.getPrototypeOf(v)!==Object.prototype||Reflect.ownKeys(v).length!==keys.length)error();
 const o={};for(const key of keys){const d=Object.getOwnPropertyDescriptor(v,key);
  if(!d||!Object.hasOwn(d,'value'))error();o[key]=d.value;}return o;
}
function array(v,lower,upper){
 if(!Array.isArray(v)||types.isProxy(v)||Object.getPrototypeOf(v)!==Array.prototype||
   v.length<lower||v.length>upper||Reflect.ownKeys(v).length!==v.length+1)error();
 return Array.from({length:v.length},(_,i)=>{
  const d=Object.getOwnPropertyDescriptor(v,String(i));
  if(!d||!Object.hasOwn(d,'value'))error();return d.value;
 });
}
const hasSingleLine=(s,line)=>s.split('\n').filter(x=>x===line).length===1;
function blocked(){return Object.freeze({status:'BLOCKED_UNTRUSTED_OR_INCOMPLETE_JVM_TRIPLET',
 originalJvmAuthenticated:false,gitJudgeExecuted:false,causalityVerified:false,
 ownerAuthorizationGranted:false,remoteWrites:false,mergeAllowed:false});}
function adjudicateGenericJvmTriplets(input){
 try{
  const raw=record(input,['cases']),cases=array(raw.cases,1,24).map(c=>record(c,
   ['caseId','sourceHeadSha','originalBlobSha','candidateBlobSha','markers','original','candidate','unsafe']));
  const ids=new Set(),approved=[];
  for(const c of cases){
   if(typeof c.caseId!=='string'||!CASE.test(c.caseId)||ids.has(c.caseId)||
      typeof c.sourceHeadSha!=='string'||!SHA.test(c.sourceHeadSha)||
      typeof c.originalBlobSha!=='string'||!SHA.test(c.originalBlobSha)||
      typeof c.candidateBlobSha!=='string'||!SHA.test(c.candidateBlobSha)||
      c.candidateBlobSha===c.originalBlobSha)error();
   ids.add(c.caseId);
   const m=record(c.markers,['originalFailure','green','unsafeFailure']);
   const good=array(m.green,2,24);
   if(typeof m.originalFailure!=='string'||!MARK.test(m.originalFailure)||
     typeof m.unsafeFailure!=='string'||!MARK.test(m.unsafeFailure)||
     m.originalFailure===m.unsafeFailure||
     !good.every(v=>typeof v==='string'&&MARK.test(v))||
     new Set(good).size!==good.length||
     !good.some(v=>v.startsWith('BENIGN_')&&v.endsWith('_PASS'))||
     !good.some(v=>v.endsWith('_ORACLE_PASS'))||
     good.includes(m.originalFailure)||good.includes(m.unsafeFailure))error();
   const states={};
   for(const phase of ['original','candidate','unsafe']){
    const p=record(c[phase],['exitCode','stdout','stderr']);
    if(!Number.isSafeInteger(p.exitCode)||p.exitCode<0||p.exitCode>255||
       typeof p.stdout!=='string'||typeof p.stderr!=='string'||
       Buffer.byteLength(p.stdout,'utf8')>65536||Buffer.byteLength(p.stderr,'utf8')>65536)error();
    states[phase]=p;
   }
   if(states.original.exitCode===0||!hasSingleLine(states.original.stderr,m.originalFailure)||
      states.candidate.exitCode!==0||states.candidate.stderr!==''||
      !good.every(marker=>hasSingleLine(states.candidate.stdout,marker))||
      states.unsafe.exitCode===0||!hasSingleLine(states.unsafe.stderr,m.unsafeFailure))error();
   approved.push(c.caseId);
  }
  return Object.freeze({status:'INERT_JVM_BATCH_AWAITING_TRUSTED_RUNNER',
   approvedCaseIds:Object.freeze(approved),casesChecked:approved.length,
   originalJvmAuthenticated:false,gitJudgeExecuted:false,causalityVerified:false,
   ownerAuthorizationGranted:false,remoteWrites:false,mergeAllowed:false,
   limitation:'Runner must independently execute and authenticate pinned Kotlin/JVM source, process exits, benign controls, Git Judge and rollback. Caller-declared markers can be forged.'});
 }catch{return blocked();}
}
module.exports=Object.freeze({adjudicateGenericJvmTriplets});
