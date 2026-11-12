'use strict';
const fs=require('node:fs'),path=require('node:path');
const [sentinel,work]=process.argv.slice(2);
const manifest=JSON.parse(fs.readFileSync(path.join(work,'interventions.json'),'utf8'));
const first=manifest.files[0];
const result=require(path.join(sentinel,'packages/recovery/phase2-executed-jvm-triplet.cjs'))
 .executeOriginalJvmTriplet({directory:path.join(work,'jars'),
  mainClass:'com.cardenaspiero255.gamehubultra.proof.IndependentBatteryOracleKt',
  caseId:'GENERIC_BATTERY_METAMORPHIC',sourceHeadSha:manifest.head,
  originalBlobSha:first.beforeBlobSha,candidateBlobSha:first.afterBlobSha,
  markers:{originalFailure:'BATTERY_EXTREME_MISMATCH',
   green:['BENIGN_BATTERY_PASS','BATTERY_ORACLE_PASS'],unsafeFailure:'BENIGN_BATTERY_REGRESSION'}});
if(result.status!=='LOCAL_JVM_TRIPLET_EXECUTED_AND_CLASSIFIED')throw Error('METAMORPHIC_JVM_JUDGE_VETO');
console.log(JSON.stringify({status:result.status,artifactSha256:result.artifactsSha256,
 sourceAuthenticatedByJudge:false,novelFamilyVerified:false,remoteWrites:false}));
console.log('GENERIC_METAMORPHIC_ORIGINAL_JVM_RED_GREEN_VETO_PASS');
