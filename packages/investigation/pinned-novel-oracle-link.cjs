'use strict';
/**
 * Read-only same-run receipt consistency gate for one pinned JARVIS pilot.
 * This module neither runs Kotlin nor authenticates GitHub/host provenance.
 * A trusted CI job must freshly fetch source and execute the JVM original
 * oracle, local Judge, and rollback before it may publish this receipt.
 */
const {createHash}=require('node:crypto');
const COMMIT='f2572a8abb0a1ef5b34d971ea8c4dc5acbecf868';
const BLOB='7c6f326cb267b56f4ca6b2d0614753695259da56';
const TERMUX='apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/CompanionResultPolicy.kt';
const VOICE='apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/VoiceRecognitionRequestGate.kt';
const DIGEST=/^[0-9a-f]{64}$/;
const FAMILY=/^[0-9a-f]{24}$/;
const EXPECTED=new Map([
 [TERMUX,'REGEX_PREFIX_AS_COMPLETE_VALIDATION'],
 [VOICE,'CLOCK_ROLLBACK_WITHOUT_INVALIDATION']
]);
function outcome(status,sha256=null){
 return Object.freeze({
  schema:'ultra-sentinel-pinned-novel-oracle-link/v1',status,
  sourceCommit:COMMIT,sourceBlob:BLOB,
  originalSourceSha256:sha256,
  sourceBytesMatched:status==='PINNED_ADVISORY_ORACLE_RECEIPTS_CONSISTENT',
  sameRunnerProvenByThisFunction:false,
  remoteRepositoryIdentityAuthenticatedByThisFunction:false,
  jvmExecutionPerformedByThisFunction:false,
  autonomousDetectionProven:false,autonomousRepairProven:false,
  ownerAuthorizationVerified:false,remoteWrites:false,
  mergeAllowed:false,productionReleaseAllowed:false,
  limitation:'Requires CI trust, original JVM execution and independent source retrieval. Receipt consistency is not general autonomy or remote repair authorization.'
 });
}
function goodObject(x){return !!x&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;}
function digest(x,algo='sha256'){return createHash(algo).update(x).digest('hex');}
function gitBlob(s){const b=Buffer.from(s,'utf8');return digest(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b]),'sha1');}
function linkPinnedNovelOracle({source,advisory,oracle}={}){
 const bad=()=>outcome('BLOCKED_LINK_INCONSISTENT');
 if(typeof source!=='string'||source.length<100||source.length>10000||
    !source.endsWith('\n')||source.includes('\0')||source.includes('\r')||
    gitBlob(source)!==BLOB||!goodObject(advisory)||!goodObject(oracle))return bad();
 const originalSha=digest(Buffer.from(source,'utf8'));
 if(advisory.status!=='PINNED_ORIGINAL_JARVIS_TWO_RISK_FAMILIES_OBSERVED'||
    advisory.sourceCommit!==COMMIT||advisory.originalGitBlobPinsChecked!==2||
    advisory.kotlinRuntimeOracleValidatedHere!==false||
    advisory.originalTermuxOracleAvailableSeparately!==true||
    advisory.sourceGitRepositoryAuthenticatedBySidecar!==false||
    advisory.remoteWrites!==false||advisory.autoRepairAllowed!==false||
    advisory.mergeAllowed!==false||!Array.isArray(advisory.advisoryFindings)||
    advisory.advisoryFindings.length!==2)return bad();
 const seen=new Set();
 for(const finding of advisory.advisoryFindings){
  if(!goodObject(finding)||!EXPECTED.has(finding.path)||
     finding.rule!==EXPECTED.get(finding.path)||seen.has(finding.path)||
     !Number.isSafeInteger(finding.line)||finding.line<1||finding.line>1500||
     !FAMILY.test(finding.familyId||'')||
     finding.status!=='HYPOTHESIS_REQUIRES_ORIGINAL_ORACLE')return bad();
  seen.add(finding.path);
 }
 if(seen.size!==EXPECTED.size||
    oracle.schema!=='ultra-sentinel-jarvis-novel-original-functional-pilot/v1'||
    oracle.status!=='PINNED_ORIGINAL_KOTLIN_RED_GREEN_AND_LOCAL_ROLLBACK'||
    oracle.sourceRepo!=='cardenaspiero255-lang/JARVIS'||
    oracle.sourceCommit!==COMMIT||oracle.sourceBlob!==BLOB||
    oracle.originalSourceSha256!==originalSha||
    oracle.originalJVMOracleFailedAsExpected!==true||
    oracle.repairedJVMOraclePassed!==true||
    oracle.unsafeRepairJVMOracleRejected!==true||
    oracle.localGitPolicyJudgeApproved!==true||
    oracle.exactLocalGitRollbackVerified!==true||
    oracle.trustedRunnerStillRequired!==true||
    oracle.autonomousDetectionProven!==false||
    oracle.autonomousRepairProven!==false||
    oracle.androidE2eProven!==false||oracle.remoteWrites!==false||
    oracle.mergeAllowed!==false||oracle.productionReleaseAllowed!==false||
    !goodObject(oracle.artifactDigests)||
    Object.keys(oracle.artifactDigests).sort().join(',')!=='candidate,original,unsafe')return bad();
 for(const mode of ['original','candidate','unsafe']){
  const row=oracle.artifactDigests[mode];
  if(!goodObject(row)||Object.keys(row).sort().join(',')!==
     'jarSha256,oracleLogSha256,sourceSha256'||
     !['sourceSha256','jarSha256','oracleLogSha256'].every(k=>DIGEST.test(row[k]||'')))return bad();
 }
 if(oracle.artifactDigests.original.sourceSha256!==originalSha||
    oracle.artifactDigests.original.sourceSha256===oracle.artifactDigests.candidate.sourceSha256||
    oracle.artifactDigests.unsafe.sourceSha256===oracle.artifactDigests.candidate.sourceSha256)return bad();
 return outcome('PINNED_ADVISORY_ORACLE_RECEIPTS_CONSISTENT',originalSha);
}
module.exports={linkPinnedNovelOracle};
