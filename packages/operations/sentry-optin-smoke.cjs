'use strict';
/*
 * Opt-in real Sentry read-only API + encryption-in-memory smoke test.
 * No issue content is emitted or persisted. No checkpoint upload/delivery.
 * This code tests a capability, not continuous monitoring.
 */
const crypto=require('node:crypto');
const {listSentryIssueSample}=require('../../adapters/sentry/sentry-readonly.cjs');
const {sealSentryCheckpoint,openSentryCheckpoint}=
 require('./sentry-sealed-checkpoint.cjs');
function fail(){throw Error('SENTRY_PRIVATE_SMOKE_BLOCKED');}
async function probeSentryPrivateReadiness({organization,projectId,token,
 checkpointKey,fetchImpl=globalThis.fetch}={}){
 // Validate actual token, project and key only via the existing trusted
 // readers/codec. Never copy secrets to any public response or logging.
 if(typeof checkpointKey!=='string'||checkpointKey.length!==43)fail();
 let sample,serialized,roundTrip;
 try{
  sample=await listSentryIssueSample({organization,projectId,token,fetchImpl});
  const fingerprints=sample.issues.map(issue=>
   crypto.createHash('sha256').update(projectId+'/'+issue.issueId).digest('hex').slice(0,24));
  serialized=JSON.stringify({
   schema:'ultra-sentinel-watchdog-checkpoint/v1',
   checkpoint:{version:1,issues:fingerprints,prs:[],gamehub:null},
   pendingAlerts:[],batchSequence:1,deliveryAcknowledged:false
  });
  // This is a volatile in-memory round-trip, not a public artifact.
  const sealed=sealSentryCheckpoint(serialized,checkpointKey);
  roundTrip=openSentryCheckpoint(sealed,checkpointKey);
  if(roundTrip!==serialized)fail();
 }catch{fail();}
 return Object.freeze({
  schema:'ultra-sentinel-sentry-optin-smoke/v1',
  sentryApiReadValidated:true,
  encryptedStateRoundTripValidated:true,
  outputIssueIds:false,outputIssues:false,outputTokens:false,
  publicArtifactCreated:false,checkpointPersisted:false,
  alertDeliveryVerified:false,sentry24x7Deployed:false,
  completeIssueInventoryVerified:false,tripleSPlusCertified:false,
  verdict:'API_AND_ENCRYPTION_SMOKE_ONLY'
 });
}
if(require.main===module){
 probeSentryPrivateReadiness({
  organization:process.env.ULTRA_SENTINEL_SENTRY_ORG,
  projectId:process.env.ULTRA_SENTINEL_SENTRY_PROJECT_ID,
  token:process.env.ULTRA_SENTINEL_SENTRY_READ_TOKEN,
  checkpointKey:process.env.ULTRA_SENTINEL_SENTRY_CHECKPOINT_KEY
 }).then(result=>process.stdout.write(JSON.stringify(result)+'\n'))
 .catch(()=>{
  process.stderr.write('SENTRY_PRIVATE_SMOKE_BLOCKED\n');
  process.exitCode=1;
 });
}
module.exports={probeSentryPrivateReadiness};
