'use strict';
/* Deterministic local evidence Judge. Caller-supplied logs are untrusted;
 * successful parsing does not authenticate an external JVM or GitHub run. */
const {blobSha}=require('../investigation/novel-kotlin-hypotheses.cjs');
const {draftBoundedReadProgressRepair}=
 require('../investigation/bounded-read-progress-repair.cjs');
const {snapshotRecord}=require('../investigation/novel-kotlin-candidate-intake.cjs');
const {drillOneSourceKotlinSandbox}=require('./two-source-kotlin-sandbox.cjs');
function makeUnsafeReadProgressControl(candidate){
 if(typeof candidate!=='string'||candidate.length>60000)throw Error('UNSAFE_CONTROL_INVALID');
 const pattern=/\bif\s*\(\s*([A-Za-z_]\w*)\s*==\s*0\s*\|\|\s*\1\s*>\s*([A-Za-z_]\w*)\s*\|\|\s*\1\s*<\s*-1\s*\)/g;
 const found=[...candidate.matchAll(pattern)];
 if(found.length!==1)throw Error('UNSAFE_CONTROL_INVALID');
 return candidate.replace(pattern,'if (true)');
}
function outcome(status,accepted=false,rollback=false){
 return Object.freeze({status,functionalCandidateAccepted:accepted,
  unsafeCandidateRejected:accepted,exactTreeRollbackVerified:rollback,
  originalJVMExecutionAuthenticated:false,sourceRepositoryAuthenticated:false,
  ownerAuthorizationGranted:false,remoteWrites:false,mergeAllowed:false,
  productionReleaseAllowed:false});
}
function exactLine(text,marker){
 return typeof text==='string'&&text.length<=30000&&
  text.split(/\r?\n/).filter(line=>line===marker).length===1;
}
function judgeReadProgressEvidence(options={}){
 try{
  const input=snapshotRecord(options,['expectedCommitSha','file','candidateSource','unsafeSource','results'],false);
  const {expectedCommitSha,candidateSource,unsafeSource}=input;
  const file=snapshotRecord(input.file,['path','source','expectedBlobSha']);
  const rows=snapshotRecord(input.results,['original','candidate','unsafe']);
  const resultFields=['oracleExit','oracleLog','junitExit','junitLog'];
  const results={original:snapshotRecord(rows.original,resultFields,false),
   candidate:snapshotRecord(rows.candidate,resultFields,false),
   unsafe:snapshotRecord(rows.unsafe,resultFields,false)};
  if(Object.values(results).some(row=>!Number.isSafeInteger(row.oracleExit)||
   !Number.isSafeInteger(row.junitExit)||typeof row.oracleLog!=='string'||typeof row.junitLog!=='string'))
   return outcome('FUNCTIONAL_JUDGE_VETO');
  const draft=draftBoundedReadProgressRepair({expectedCommitSha,file});
  if(draft.status!=='CANDIDATE_REQUIRES_TRUSTED_ORIGINAL_ORACLE'||
   candidateSource!==draft.candidateSource||
   unsafeSource!==makeUnsafeReadProgressControl(candidateSource)||
   !results||Object.keys(results).sort().join(',')!=='candidate,original,unsafe')
   return outcome('FUNCTIONAL_JUDGE_VETO');
  const {original,candidate,unsafe}=results;
  const junitOk=x=>x?.junitExit===0&&exactLine(x.junitLog,'OK (6 tests)')&&
   !x.junitLog.includes('FAILURES!!!');
  if(!original||!candidate||!unsafe||
   !Number.isSafeInteger(original.oracleExit)||original.oracleExit===0||
   !exactLine(original.oracleLog,'ZERO_PROGRESS_ACCEPTED')||
   original.oracleLog.includes('READ_PROGRESS_ORACLE_PASS')||!junitOk(original)||
   candidate.oracleExit!==0||candidate.oracleLog.trim()!=='READ_PROGRESS_ORACLE_PASS'||
   !junitOk(candidate)||
   !Number.isSafeInteger(unsafe.oracleExit)||unsafe.oracleExit===0||
   !exactLine(unsafe.oracleLog,'BENIGN_READ_REJECTED')||
   unsafe.oracleLog.includes('READ_PROGRESS_ORACLE_PASS')||
   !Number.isSafeInteger(unsafe.junitExit)||unsafe.junitExit===0||
   !exactLine(unsafe.junitLog,'FAILURES!!!'))
   return outcome('FUNCTIONAL_JUDGE_VETO');
  const run=after=>drillOneSourceKotlinSandbox({file:{path:file.path,
   before:file.source,after,beforeBlobSha:file.expectedBlobSha,
   afterBlobSha:blobSha(after)}});
  const good=run(candidateSource),bad=run(unsafeSource);
  if(good.status!=='ONE_SOURCE_SANDBOX_JUDGE_AND_ROLLBACK_VERIFIED'||
   bad.status!=='ONE_SOURCE_SANDBOX_JUDGE_AND_ROLLBACK_VERIFIED'||
   !good.exactTreeRollbackVerified||!bad.exactTreeRollbackVerified)
   return outcome('FUNCTIONAL_JUDGE_VETO');
  return outcome('LOCAL_FUNCTIONAL_JUDGE_ACCEPTED_NOT_AUTHENTICATED',true,true);
 }catch{return outcome('FUNCTIONAL_JUDGE_VETO');}
}
module.exports={makeUnsafeReadProgressControl,judgeReadProgressEvidence};
