'use strict';
/**
 * GitHub-only, no-VPS monitor mode. Uses existing JARVIS and GameHub readers,
 * and the existing watchdog snapshot/outbox state machine. The checkpoint
 * contains ONLY public GitHub PR numbers and immutable SHA values.
 * No Sentry issue IDs, user audio, API tokens, network writes or private data.
 *
 * A GITHUB_TOKEN with read-only repository visibility is required. Changes
 * are surfaced as GitHub Actions warning/failure; no promises of live 24/7.
 */
const fs=require('node:fs');
const path=require('node:path');
const {readJarvisRepositoryState}=require('../../adapters/jarvis/jarvis-readonly.cjs');
const {readGameHubLiveSample}=require('./gamehub-live-sample.cjs');
const {storeObservation,checkedState,pendingDigest,acknowledgeDelivery}=require('./watchdog-run-once.cjs');
const STUB=Object.freeze({schema:'ultra-sentinel-sentry-sample/v1',
 projectId:'0',sampleOnly:true,completeIssueInventory:false,
 issues:Object.freeze([])});
function assertPublicOnly(previous){
 if(previous&&(!Array.isArray(previous.checkpoint?.issues)||
  previous.checkpoint.issues.length!==0||previous.pendingAlerts.some(
   x=>x.type==='NEW_SENTRY_ISSUE')))
  throw Error('PRIVATE_OR_INCOMPATIBLE_STATE_FORBIDDEN');
}
async function runGithubOnlyCycle({stateFile,githubToken,bootstrap=false,
 fetchImpl=globalThis.fetch}={}){
 if(typeof stateFile!=='string'||!path.isAbsolute(stateFile)||
  path.basename(stateFile)!=='github-checkpoint.json')
  throw Error('INVALID_PUBLIC_CHECKPOINT_PATH');
 if(typeof githubToken!=='string'||githubToken.length<8||
  githubToken.length>2048||typeof fetchImpl!=='function')
  throw Error('READONLY_GITHUB_TOKEN_REQUIRED');
 // State is never silently reset after a runner disappears, TTL expires
 // or a previous workflow stops running.
 const previous=checkedState(stateFile);
 assertPublicOnly(previous);
 if(bootstrap&&previous)throw Error('BOOTSTRAP_WOULD_DISCARD_PRIOR_STATE');
 if(!bootstrap&&!previous)throw Error('PERSISTED_STATE_REQUIRED_MANUAL_BOOTSTRAP');
 // If an earlier runner died before persisting its acknowledgment, replay
 // the stored alert rather than silently consuming or overwriting it.
 if(previous?.pendingAlerts.length)return Object.freeze({
  schema:'ultra-sentinel-github-only-cycle/v1',
  status:'REPLAY_PERSISTED_ALERTS',alerts:previous.pendingAlerts,
  publicArtifactOnly:true,sentryConnected:false,githubWrites:false,
  deploy24x7:false,source:'github-actions-readonly'
 });
 const [jarvis,gamehub]=await Promise.all([
  readJarvisRepositoryState({token:githubToken,fetchImpl}),
  readGameHubLiveSample({token:githubToken,fetchImpl})
 ]);
 const result=storeObservation(stateFile,null,STUB,jarvis,gamehub);
 // This mode uses its own per-run public-artifact checkpoint. It is only
 // safe to upload when the persisted state remains public-only.
 assertPublicOnly(checkedState(stateFile));
 return Object.freeze({schema:'ultra-sentinel-github-only-cycle/v1',
  status:result.status,alerts:result.alerts,
  publicArtifactOnly:true,sentryConnected:false,githubWrites:false,
  deploy24x7:false,source:'github-actions-readonly'});
}
if(require.main===module){
 const bootstrap=process.env.ULTRA_SENTINEL_SERVERLESS_BOOTSTRAP==='true';
 runGithubOnlyCycle({
  stateFile:process.env.ULTRA_SENTINEL_WATCHDOG_STATE_FILE,
  githubToken:process.env.GITHUB_TOKEN,bootstrap
 }).then(r=>{
  process.stdout.write(JSON.stringify(r)+'\n');
  if(r.alerts.length){
   // GitHub Actions' job status is the notification surface for serverless.
   // Flush the sanitized event to job logs before clearing the outbox.
   for(const alert of r.alerts){
    process.stdout.write('::warning title=Ultra Sentinel GitHub alert::'+
     alert.type.replace(/[^A-Z_]/g,'')+'\n');
   }
   const state=checkedState(process.env.ULTRA_SENTINEL_WATCHDOG_STATE_FILE);
   if(!state||pendingDigest(state.pendingAlerts)!==pendingDigest(r.alerts))
    throw Error('STATE_CHANGED_DURING_ALERT_REPORTING');
   acknowledgeDelivery(process.env.ULTRA_SENTINEL_WATCHDOG_STATE_FILE,
    pendingDigest(r.alerts));
   // No write to GitHub; the failed Action and durable logs surface changes.
   process.exitCode=2;
  }
 }).catch(e=>{
  // Never log token, private response bodies, or raw network exception strings.
  const allowed=new Set(['INVALID_PUBLIC_CHECKPOINT_PATH',
   'READONLY_GITHUB_TOKEN_REQUIRED','PRIVATE_OR_INCOMPATIBLE_STATE_FORBIDDEN',
   'BOOTSTRAP_WOULD_DISCARD_PRIOR_STATE',
   'PERSISTED_STATE_REQUIRED_MANUAL_BOOTSTRAP',
   'PENDING_ALERT_DELIVERY_REQUIRED']);
  process.stderr.write('GITHUB_ONLY_MONITOR_BLOCKED: '+
   (allowed.has(e?.message)?e.message:'UNVERIFIED_READONLY_SOURCE_OR_STATE')+'\n');
  process.exitCode=1;
 });
}
module.exports={runGithubOnlyCycle,assertPublicOnly};
