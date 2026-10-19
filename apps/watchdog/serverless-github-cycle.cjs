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
function failPrivate(){throw Error('PRIVATE_OR_INCOMPATIBLE_STATE_FORBIDDEN');}
function exactShape(value,keys){
 return value!==null&&typeof value==='object'&&!Array.isArray(value)&&
  Object.keys(value).length===keys.length&&
  keys.every(key=>Object.hasOwn(value,key));
}
function assertPublicOnly(previous){
 if(previous===null)return;
 // Workflow artifacts in public repositories can be downloaded by anyone.
 // The generic watchdog validator deliberately allows additional fields for
 // backward compatibility, so serverless must apply a STRICT allowlist
 // before exposing any artifact to GitHub Actions.
 if(!exactShape(previous,['schema','checkpoint','pendingAlerts',
     'batchSequence','deliveryAcknowledged'])||
   previous.schema!=='ultra-sentinel-watchdog-checkpoint/v1'||
   previous.deliveryAcknowledged!==false||
   !Number.isSafeInteger(previous.batchSequence)||previous.batchSequence<1||
   !exactShape(previous.checkpoint,['version','issues','prs','gamehub'])||
   previous.checkpoint.version!==1||
   !Array.isArray(previous.checkpoint.issues)||
   previous.checkpoint.issues.length!==0||
   !Array.isArray(previous.checkpoint.prs)||
   previous.checkpoint.prs.some(pr=>!exactShape(pr,['pr','headSha']))||
   (previous.checkpoint.gamehub!==null&&
    !exactShape(previous.checkpoint.gamehub,['pr','headSha']))||
   !Array.isArray(previous.pendingAlerts)||previous.pendingAlerts.some(
    alert=>alert.type==='NEW_SENTRY_ISSUE'||
     !['JARVIS_PR_OPENED','JARVIS_PR_HEAD_CHANGED',
       'JARVIS_PR_NO_LONGER_OPEN_IN_SNAPSHOT',
       'GAMEHUB_PR_SAMPLE_SELECTED','GAMEHUB_PR_SAMPLE_CHANGED',
       'GAMEHUB_PR_HEAD_CHANGED','GAMEHUB_SAMPLE_NOW_IDLE']
       .includes(alert.type)))failPrivate();
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
   // GitHub Actions warnings and durable logs report changes. A genuine
   // alert is not a failed monitor execution; checkpoint is acknowledged.
   // Nonzero exits remain reserved for evidence or infrastructure failures.
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
