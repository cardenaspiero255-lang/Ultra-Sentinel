'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const fs=require('node:fs'),path=require('node:path');
const {linkPinnedNovelOracle}=require('../../packages/investigation/pinned-novel-oracle-link.cjs');
const COMMIT='f2572a8abb0a1ef5b34d971ea8c4dc5acbecf868';
const PATH='apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/CompanionResultPolicy.kt';
const VOICE='apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/VoiceRecognitionRequestGate.kt';
const BLOB='7c6f326cb267b56f4ca6b2d0614753695259da56';
const source=fs.readFileSync(path.join(__dirname,'../fixtures/pinned-jarvis-termux-original.kt'),'utf8');
const sha256=x=>createHash('sha256').update(x).digest('hex');
function example(){
 return {
  source,
  advisory:{status:'PINNED_ORIGINAL_JARVIS_TWO_RISK_FAMILIES_OBSERVED',sourceCommit:COMMIT,
   originalGitBlobPinsChecked:2,
   advisoryFindings:[
    {rule:'REGEX_PREFIX_AS_COMPLETE_VALIDATION',path:PATH,line:10,familyId:'a'.repeat(24),status:'HYPOTHESIS_REQUIRES_ORIGINAL_ORACLE'},
    {rule:'CLOCK_ROLLBACK_WITHOUT_INVALIDATION',path:VOICE,line:20,familyId:'b'.repeat(24),status:'HYPOTHESIS_REQUIRES_ORIGINAL_ORACLE'}],
   kotlinRuntimeOracleValidatedHere:false,originalTermuxOracleAvailableSeparately:true,
   sourceGitRepositoryAuthenticatedBySidecar:false,
   remoteWrites:false,autoRepairAllowed:false,mergeAllowed:false},
  oracle:{schema:'ultra-sentinel-jarvis-novel-original-functional-pilot/v1',
   status:'PINNED_ORIGINAL_KOTLIN_RED_GREEN_AND_LOCAL_ROLLBACK',
   sourceRepo:'cardenaspiero255-lang/JARVIS',sourceCommit:COMMIT,sourceBlob:BLOB,
   originalSourceSha256:sha256(source),
   artifactDigests:{original:{sourceSha256:sha256(source),jarSha256:'a'.repeat(64),oracleLogSha256:'b'.repeat(64)},
    candidate:{sourceSha256:'c'.repeat(64),jarSha256:'d'.repeat(64),oracleLogSha256:'e'.repeat(64)},
    unsafe:{sourceSha256:'f'.repeat(64),jarSha256:'1'.repeat(64),oracleLogSha256:'2'.repeat(64)}},
   originalJVMOracleFailedAsExpected:true,repairedJVMOraclePassed:true,
   unsafeRepairJVMOracleRejected:true,localGitPolicyJudgeApproved:true,
   exactLocalGitRollbackVerified:true,trustedRunnerStillRequired:true,
   autonomousDetectionProven:false,autonomousRepairProven:false,androidE2eProven:false,
   remoteWrites:false,mergeAllowed:false,productionReleaseAllowed:false}
 };
}
test('bind pinned source advisory to original JVM receipt without granting authority',()=>{
 const x=linkPinnedNovelOracle(example());
 assert.equal(x.status,'PINNED_ADVISORY_ORACLE_RECEIPTS_CONSISTENT');
 assert.equal(x.sourceBytesMatched,true);
 assert.equal(x.sameRunnerProvenByThisFunction,false);
 assert.equal(x.autonomousDetectionProven,false);
 assert.equal(x.productionReleaseAllowed,false);
 assert.equal(x.remoteWrites,false);
});
test('never promote falsified bytes to authenticated evidence',()=>{
 const input=example();input.source+='tamper';
 const x=linkPinnedNovelOracle(input);
 assert.equal(x.status,'BLOCKED_LINK_INCONSISTENT');
 assert.equal(x.remoteWrites,false);
 assert.equal(x.autonomousRepairProven,false);
});
test('reject untrusted repository identity, conflicting Git commit and runtime claim',()=>{
 const variants=[
  x=>x.oracle.sourceRepo='other/JARVIS',
  x=>x.advisory.sourceCommit='0'.repeat(40),
  x=>x.oracle.sourceCommit='0'.repeat(40),
  x=>x.oracle.sourceBlob='0'.repeat(40),
  x=>x.advisory.kotlinRuntimeOracleValidatedHere=true,
  x=>x.oracle.androidE2eProven=true,
 ];
 for(const mutate of variants){const input=example();mutate(input);
  const out=linkPinnedNovelOracle(input);assert.equal(out.status,'BLOCKED_LINK_INCONSISTENT');}
});
test('reject missing duplicate or mismatched advisory risk families',()=>{
 for(const mutate of [
  x=>x.advisory.advisoryFindings.pop(),
  x=>x.advisory.advisoryFindings.push(x.advisory.advisoryFindings[0]),
  x=>x.advisory.advisoryFindings[0].rule='UNKNOWN',
  x=>x.advisory.advisoryFindings[0].familyId='bad',
  x=>x.advisory.advisoryFindings[1].path=PATH,
  x=>x.advisory.advisoryFindings[0].status='VERIFIED',
 ]){const input=example();mutate(input);assert.equal(linkPinnedNovelOracle(input).status,'BLOCKED_LINK_INCONSISTENT');}
});
test('reject missing JVM functional veto and malformed JVM receipts',()=>{
 for(const mutate of [
  x=>x.oracle.originalJVMOracleFailedAsExpected=false,
  x=>x.oracle.repairedJVMOraclePassed=false,
  x=>x.oracle.unsafeRepairJVMOracleRejected=false,
  x=>x.oracle.localGitPolicyJudgeApproved=false,
  x=>x.oracle.exactLocalGitRollbackVerified=false,
  x=>x.oracle.artifactDigests.original.sourceSha256='0'.repeat(64),
  x=>x.oracle.artifactDigests.candidate.jarSha256='invalid',
  x=>x.oracle.artifactDigests.unsafe.oracleLogSha256=null,
 ]){const input=example();mutate(input);assert.equal(linkPinnedNovelOracle(input).status,'BLOCKED_LINK_INCONSISTENT');}
});
