'use strict';
/*
 * Narrow, read-only owner-source screening adapter. Scans only a Kotlin
 * implementation owned by Ultra Sentinel, excluding historic third-party
 * JARVIS/GameHub fixtures, security reports and untrusted remote payloads.
 *
 * A scanned Git blob is an integrity assertion, not proof of GitHub identity.
 * No reported hypothesis can close Phase 1 without a newly permitted,
 * independently executed original Kotlin/JVM oracle and causal demonstration.
 */
const {snapshotRecord}=require('./plain-kotlin-payload.cjs');
const {scanNovelKotlinHypotheses,blobSha}=
 require('./novel-kotlin-hypotheses.cjs');

const REPO='cardenaspiero255-lang/Ultra-Sentinel';
const OWNER_SOURCE='packages/kotlin-semantic/C2OptionalKotlinSemantic.kt';
const SHA=/^[a-f0-9]{40}$/;

function outcome(status,findings=[],blob=null){
 return Object.freeze({
  schema:'ultra-sentinel-phase1-owned-kotlin-screen/v1',
  status,repository:REPO,sourcePath:OWNER_SOURCE,
  checkedFiles:blob===null?0:1,
  originalBlobSha:blob,
  findings:Object.freeze(findings),
  localSourceBytesVerified:blob!==null,
  originalRemoteRepositoryAuthenticated:false,
  originalJVMOracleVerified:false,
  causalDefectProven:false,novelDefectProven:false,
  fixerCandidateGenerated:false,judgeVetoVerified:false,
  localGitRollbackVerified:false,phaseOneClosed:false,
  ownerAuthorizationGranted:false,remoteWrites:false,
  mergeAllowed:false,productionReleaseAllowed:false,
  limitation:'This is an advisory scan of one approved owner-owned Kotlin module. A clean scan does not prove absence of defects. A matching Git hash does not verify remote source provenance, independent Kotlin execution, novelty or causality.'
 });
}
function screenOwnerKotlinSource(options={}){
 try{
  const x=snapshotRecord(options,
   ['repository','commit','path','source','expectedBlobSha']);
  if(x.repository!==REPO||x.path!==OWNER_SOURCE||
   typeof x.commit!=='string'||!SHA.test(x.commit)||
   typeof x.expectedBlobSha!=='string'||!SHA.test(x.expectedBlobSha)||
   typeof x.source!=='string'||blobSha(x.source)!==x.expectedBlobSha)
   return outcome('BLOCKED_UNTRUSTED_OWNER_KOTLIN_SOURCE');
  const scan=scanNovelKotlinHypotheses({
   expectedCommitSha:x.commit,files:[{
    path:x.path,source:x.source,expectedBlobSha:x.expectedBlobSha
   }]
  });
  if(scan.status.startsWith('BLOCKED_')||scan.filesScanned!==1||
   scan.sourceByteIntegrityVerified!==true||
   scan.sourceGitRepositoryAuthenticated!==false)
   return outcome('BLOCKED_UNTRUSTED_KOTLIN_HUNTER_SCAN');
  if(scan.findings.length===0)
   return outcome('NO_ELIGIBLE_KOTLIN_HYPOTHESIS_NOT_CERTIFIED',[],x.expectedBlobSha);
  return outcome('UNVERIFIED_KOTLIN_HYPOTHESIS_REQUIRES_ORIGINAL_ORACLE',
   scan.findings.slice(),x.expectedBlobSha);
 }catch{
  return outcome('BLOCKED_UNSAFE_SOURCE_PAYLOAD');
 }
}
module.exports=Object.freeze({screenOwnerKotlinSource});
