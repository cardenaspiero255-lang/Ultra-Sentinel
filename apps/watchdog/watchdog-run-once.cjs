'use strict';
/* One supervised observation iteration. NOT a daemon nor an alert sender.
 * The caller is responsible for scheduling and forwarding the JSON event
 * stream to a durable alert system. No write access to GitHub/Sentry.
 */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {evaluateChanges,validateCheckpoint}=require('./watchdog-state.cjs');
const {listSentryIssueSample}=require('../../adapters/sentry/sentry-readonly.cjs');
const {readJarvisRepositoryState}=require('../../adapters/jarvis/jarvis-readonly.cjs');
const {readGameHubLiveSample}=require('./gamehub-live-sample.cjs');
const {auditScheduledHeartbeat}=require('../../packages/operations/scheduled-heartbeat-audit.cjs');
const HEARTBEAT_VERDICTS=['INSUFFICIENT_SCHEDULE_EVIDENCE','SCHEDULE_OVERDUE',
 'SCHEDULE_GAP','SCHEDULE_FAILURE_NEEDS_LOG_REVIEW','STALE_WORKFLOW_SHA',
 'SCHEDULE_EVIDENCE_UNAVAILABLE','PUNCTUALITY_OBSERVED_NOT_24X7'];
function fail(reason){throw Error(reason);}
function privateDirectory(filename){
 if(typeof filename!=='string'||!path.isAbsolute(filename)||
  filename.endsWith(path.sep)||path.basename(filename)==='.'||
  path.basename(filename)==='..')fail('STATE_PATH_NOT_ABSOLUTE');
 const directory=path.dirname(filename);
 if(!fs.existsSync(directory))fail('STATE_DIRECTORY_UNAVAILABLE');
 const info=fs.lstatSync(directory);
 if(!info.isDirectory()||info.isSymbolicLink()||(info.mode&0o077)!==0)
  fail('STATE_DIRECTORY_UNSAFE');
 return directory;
}
function validateAlertRecord(alert){
 if(!alert||typeof alert!=='object'||Array.isArray(alert))fail('STATE_ALERT_UNTRUSTED');
 const types=['NEW_SENTRY_ISSUE','JARVIS_PR_OPENED','JARVIS_PR_HEAD_CHANGED',
  'JARVIS_PR_NO_LONGER_OPEN_IN_SNAPSHOT',
  'GAMEHUB_PR_SAMPLE_SELECTED','GAMEHUB_PR_SAMPLE_CHANGED',
  'GAMEHUB_PR_HEAD_CHANGED','GAMEHUB_SAMPLE_NOW_IDLE','SCHEDULE_HEARTBEAT'];
 if(!types.includes(alert.type))fail('STATE_ALERT_UNTRUSTED');
 let fields;
 if(alert.type==='SCHEDULE_HEARTBEAT'){
  fields=['type','verdict','latestRunId'];
  if(!HEARTBEAT_VERDICTS.includes(alert.verdict)||
   alert.verdict==='PUNCTUALITY_OBSERVED_NOT_24X7'||
   !(alert.latestRunId===null||(Number.isSafeInteger(alert.latestRunId)&&alert.latestRunId>0)))
   fail('STATE_ALERT_UNTRUSTED');
 }else if(alert.type==='NEW_SENTRY_ISSUE'){
  fields=['type','fingerprint'];
  if(typeof alert.fingerprint!=='string'||! /^[a-f0-9]{24}$/.test(alert.fingerprint))
   fail('STATE_ALERT_UNTRUSTED');
 }else if(alert.type==='JARVIS_PR_HEAD_CHANGED'||
  alert.type==='GAMEHUB_PR_SAMPLE_SELECTED'||
  alert.type==='GAMEHUB_PR_SAMPLE_CHANGED'||
  alert.type==='GAMEHUB_PR_HEAD_CHANGED'){
  fields=['type','pr','headSha'];
  if(typeof alert.headSha!=='string'||! /^[a-f0-9]{40}$/.test(alert.headSha))
   fail('STATE_ALERT_UNTRUSTED');
 }else if(alert.type==='GAMEHUB_SAMPLE_NOW_IDLE')fields=['type'];
 else fields=['type','pr'];
 if(!['NEW_SENTRY_ISSUE','GAMEHUB_SAMPLE_NOW_IDLE','SCHEDULE_HEARTBEAT'].includes(alert.type)&&
  (!Number.isSafeInteger(alert.pr)||alert.pr<=0))
  fail('STATE_ALERT_UNTRUSTED');
 if(Object.keys(alert).length!==fields.length||
  Object.keys(alert).some(k=>!fields.includes(k)))fail('STATE_ALERT_UNTRUSTED');
}
function checkedState(filename){
 privateDirectory(filename);
 let stat;
 try{stat=fs.lstatSync(filename);}
 catch(e){if(e.code==='ENOENT')return null;throw e;}
 if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||
   (stat.mode&0o077)!==0||stat.size>65536)fail('STATE_FILE_UNSAFE');
 let raw;
 try{raw=JSON.parse(fs.readFileSync(filename,'utf8'));}
 catch{fail('STATE_CORRUPTED');}
 if(!raw||raw.schema!=='ultra-sentinel-watchdog-checkpoint/v1'||
  !raw.checkpoint||raw.deliveryAcknowledged!==false)
  fail('STATE_SCHEMA_MISMATCH');
 // An unacknowledged event stream cannot silently be discarded on restart.
 if(!Array.isArray(raw.pendingAlerts)||raw.pendingAlerts.length>40)
  fail('STATE_PENDING_EVENTS_UNVERIFIED');
 validateCheckpoint(raw.checkpoint);
 if(raw.heartbeat!==undefined&&(!raw.heartbeat||
  Object.keys(raw.heartbeat).length!==1||
  !HEARTBEAT_VERDICTS.includes(raw.heartbeat.lastVerdict)))fail('STATE_HEARTBEAT_INVALID');
 if(raw.heartbeat!==undefined&&raw.pendingAlerts.some(alert=>alert?.type!=='SCHEDULE_HEARTBEAT'))
  fail('STATE_HEARTBEAT_INVALID');
 if(raw.batchSequence!==undefined&&
  (!Number.isSafeInteger(raw.batchSequence)||raw.batchSequence<0))
  fail('STATE_SEQUENCE_INVALID');
 for(const alert of raw.pendingAlerts)validateAlertRecord(alert);
 return raw;
}
function writeAtomic(filename,data){
 const dirname=privateDirectory(filename);
 const temporary=filename+'.tmp-'+crypto.randomBytes(12).toString('hex');
 let fd;
 try{
  fd=fs.openSync(temporary,fs.constants.O_WRONLY|fs.constants.O_CREAT|
   fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o600);
  fs.writeSync(fd,JSON.stringify(data)+'\n');fs.fsyncSync(fd);
  fs.closeSync(fd);fd=null;
  fs.renameSync(temporary,filename);
  const parent=fs.openSync(dirname,fs.constants.O_RDONLY);
  try{fs.fsyncSync(parent);}finally{fs.closeSync(parent);}
 }finally{
  if(fd!==undefined&&fd!==null)fs.closeSync(fd);
  if(fs.existsSync(temporary))fs.unlinkSync(temporary);
 }
}
function storeObservation(filename,previous,sentry,jarvis,gamehub=null){
 const directory=privateDirectory(filename);
 let lock;
 try{lock=fs.openSync(filename+'.lock',fs.constants.O_WRONLY|fs.constants.O_CREAT|
  fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o600);}
 catch(e){if(e.code==='EEXIST')fail('WATCHDOG_ALREADY_RUNNING_OR_RECOVERY_REQUIRED');throw e;}
 try{
  const state=checkedState(filename);
  if(state?.heartbeat!==undefined)fail('STATE_FILE_RESERVED_FOR_HEARTBEAT');
  // Before new observations, deliver the existing pending outbox again.
  // Caller must explicitly acknowledge it via an external transactional
  // handler; this tool intentionally cannot claim exactly-once delivery.
  if(state?.pendingAlerts.length)fail('PENDING_ALERT_DELIVERY_REQUIRED');
  const last=state?state.checkpoint:previous;
  const result=evaluateChanges(last,sentry,jarvis,gamehub);
  // Distinguish separate incidents with identical alert contents while
  // preserving one stable idempotency key for every retry of the same batch.
  const batchSequence=(state?.batchSequence??0)+1;
  if(!Number.isSafeInteger(batchSequence))fail('STATE_SEQUENCE_EXHAUSTED');
  const saved={schema:'ultra-sentinel-watchdog-checkpoint/v1',
   checkpoint:result.checkpoint,pendingAlerts:result.alerts,
   batchSequence,deliveryAcknowledged:false};
  writeAtomic(filename,saved);
  return Object.freeze({status:result.status,alerts:result.alerts,
   monitor24x7Deployed:false,alertDeliveryConfigured:false});
 }finally{
  fs.closeSync(lock);
  fs.unlinkSync(filename+'.lock');
  const parent=fs.openSync(directory,fs.constants.O_RDONLY);
  try{fs.fsyncSync(parent);}finally{fs.closeSync(parent);}
 }
}
// Uses a dedicated checkpoint. Alert transitions are written atomically before
// any delivery attempt; a pending batch is never replaced by a later sample.
function storeHeartbeatAudit(filename,input){
 const directory=privateDirectory(filename);
 let lock;
 try{lock=fs.openSync(filename+'.lock',fs.constants.O_WRONLY|fs.constants.O_CREAT|
  fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o600);}
 catch(e){if(e.code==='EEXIST')fail('WATCHDOG_ALREADY_RUNNING_OR_RECOVERY_REQUIRED');throw e;}
 try{
  const state=checkedState(filename);
  if(state&&state.heartbeat===undefined)fail('STATE_FILE_NOT_HEARTBEAT');
  if(state?.pendingAlerts.length)fail('PENDING_ALERT_DELIVERY_REQUIRED');
  let audit;
  try{audit=auditScheduledHeartbeat(input);}
  catch{audit={verdict:'SCHEDULE_EVIDENCE_UNAVAILABLE',latestRunId:null};}
  const healthy=audit.verdict==='PUNCTUALITY_OBSERVED_NOT_24X7';
  const changed=state?.heartbeat.lastVerdict!==audit.verdict;
  const alerts=!healthy&&changed?[{type:'SCHEDULE_HEARTBEAT',
   verdict:audit.verdict,latestRunId:audit.latestRunId}]:[];
  const batchSequence=(state?.batchSequence??0)+1;
  if(!Number.isSafeInteger(batchSequence))fail('STATE_SEQUENCE_EXHAUSTED');
  writeAtomic(filename,{schema:'ultra-sentinel-watchdog-checkpoint/v1',
   checkpoint:{version:1,issues:[],prs:[],gamehub:null},pendingAlerts:alerts,
   batchSequence,deliveryAcknowledged:false,heartbeat:{lastVerdict:audit.verdict}});
  return Object.freeze({status:alerts.length?'HEARTBEAT_ALERT_PENDING':
   healthy?'HEARTBEAT_HEALTHY':'HEARTBEAT_UNCHANGED',verdict:audit.verdict,
   sourceAuthenticityVerified:false,deliveryAccepted:false});
 }finally{
  fs.closeSync(lock);fs.unlinkSync(filename+'.lock');
  const parent=fs.openSync(directory,fs.constants.O_RDONLY);
  try{fs.fsyncSync(parent);}finally{fs.closeSync(parent);}
 }
}
function pendingDigest(events){
 if(!Array.isArray(events)||events.length===0)fail('NO_PENDING_ALERTS');
 return crypto.createHash('sha256').update(JSON.stringify(events)).digest('hex');
}
// An external operator must first deliver the alert events. Only then call
// this acknowledgement with the exact pending digest; no self-acknowledgement.
function acknowledgeDelivery(filename,digest,expectedSequence){
 if(typeof digest!=='string'||!/^[a-f0-9]{64}$/.test(digest))
  fail('INVALID_DELIVERY_RECEIPT');
 if(expectedSequence!==undefined&&(!Number.isSafeInteger(expectedSequence)||expectedSequence<0))
  fail('INVALID_DELIVERY_RECEIPT');
 privateDirectory(filename);
 let lock;
 try{lock=fs.openSync(filename+'.lock',fs.constants.O_WRONLY|
  fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o600);}
 catch(e){if(e.code==='EEXIST')fail('WATCHDOG_ALREADY_RUNNING_OR_RECOVERY_REQUIRED');throw e;}
 try{
  const current=checkedState(filename);
  if(!current?.pendingAlerts.length)fail('NO_PENDING_ALERTS');
  if(pendingDigest(current.pendingAlerts)!==digest||
    (expectedSequence!==undefined&&(current.batchSequence??0)!==expectedSequence))
   fail('DELIVERY_RECEIPT_MISMATCH');
  writeAtomic(filename,{...current,pendingAlerts:[],deliveryAcknowledged:false});
  return Object.freeze({status:'DELIVERY_ACKNOWLEDGED',pending:0});
 }finally{
  fs.closeSync(lock);fs.unlinkSync(filename+'.lock');
 }
}
async function observeOnce({stateFile,sentryOrg,sentryProjectId,sentryToken,githubToken,
 fetchSentry=globalThis.fetch,fetchGitHub=globalThis.fetch}={}){
 privateDirectory(stateFile);
 // Recheck pending alerts BEFORE network calls, so they cannot be overwritten.
 const existing=checkedState(stateFile);
 if(existing?.pendingAlerts.length)fail('PENDING_ALERT_DELIVERY_REQUIRED');
 const [sentry,jarvis,gamehub]=await Promise.all([
  listSentryIssueSample({organization:sentryOrg,projectId:sentryProjectId,
   token:sentryToken,fetchImpl:fetchSentry}),
  readJarvisRepositoryState({token:githubToken,fetchImpl:fetchGitHub}),
  readGameHubLiveSample({token:githubToken,fetchImpl:fetchGitHub})
 ]);
 return storeObservation(stateFile,null,sentry,jarvis,gamehub);
}
if(require.main===module){
 observeOnce({
  stateFile:process.env.ULTRA_SENTINEL_WATCHDOG_STATE_FILE,
  sentryOrg:process.env.ULTRA_SENTINEL_SENTRY_ORG,
  sentryProjectId:process.env.ULTRA_SENTINEL_SENTRY_PROJECT_ID,
  sentryToken:process.env.ULTRA_SENTINEL_SENTRY_TOKEN,
  githubToken:process.env.ULTRA_SENTINEL_READONLY_GITHUB_TOKEN
 }).then(result=>{
  process.stdout.write(JSON.stringify(result)+'\n');
 }).catch(error=>{
  const allowed=new Set(['STATE_PATH_NOT_ABSOLUTE','STATE_DIRECTORY_UNAVAILABLE',
   'STATE_DIRECTORY_UNSAFE','STATE_FILE_UNSAFE','STATE_CORRUPTED',
   'STATE_SCHEMA_MISMATCH','STATE_PENDING_EVENTS_UNVERIFIED',
   'PENDING_ALERT_DELIVERY_REQUIRED','WATCHDOG_ALREADY_RUNNING_OR_RECOVERY_REQUIRED']);
  process.stderr.write('WATCHDOG_BLOCKED: '+
   (allowed.has(error?.message)?error.message:'INCOMPLETE_EXTERNAL_EVIDENCE')+'\n');
  process.exitCode=1;
 });
}
module.exports={observeOnce,storeObservation,storeHeartbeatAudit,checkedState,pendingDigest,acknowledgeDelivery};
