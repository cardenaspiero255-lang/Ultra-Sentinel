'use strict';
const fs=require('node:fs'),path=require('node:path');
const [sentinel,work,head]=process.argv.slice(2);
const manifest=JSON.parse(fs.readFileSync(path.join(work,'interventions.json'),'utf8'));
if(manifest.head!==head)throw Error('TRIPLET_HEAD_MISMATCH');
const first=manifest.files[0];
const result=require(path.join(sentinel,'packages/recovery/phase2-executed-jvm-triplet.cjs'))
 .executeOriginalJvmTriplet({directory:path.join(work,'triplet'),
  mainClass:'com.cardenaspiero255.gamehubultra.session.IndependentTelemetryOracleKt',
  caseId:'INTEGER_NARROWING_TELEMETRY',sourceHeadSha:head,
  originalBlobSha:first.beforeBlobSha,candidateBlobSha:first.afterBlobSha,
  markers:{originalFailure:'EXTREME_TELEMETRY_MISMATCH',
   green:['BENIGN_TELEMETRY_PASS','THREE_SOURCE_TELEMETRY_ORACLE_PASS'],
   unsafeFailure:'BENIGN_TELEMETRY_REGRESSION'}});
if(result.status!=='LOCAL_JVM_TRIPLET_EXECUTED_AND_CLASSIFIED'||
 result.jvmProcessesExecutedLocally!==true||result.originalSourceAuthenticated!==false||
 result.gitJudgeExecuted!==false||result.remoteWrites!==false||result.mergeAllowed!==false)
 throw Error('EXECUTED_JVM_TRIPLET_VETO');
console.log(JSON.stringify({status:result.status,artifactsSha256:result.artifactsSha256,
 sourceAuthenticatedByBridge:false,gitPolicyVerifiedSeparately:true,
 ownerAuthorizationGranted:false,remoteWrites:false,mergeAllowed:false}));
