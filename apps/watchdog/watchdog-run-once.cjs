'use strict';
/* One supervised observation iteration. NOT a daemon nor an alert sender.
 * The caller is responsible for scheduling and forwarding the JSON event
 * stream to a durable alert system. No write access to GitHub/Sentry.
 */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {evaluateChanges}=require('./watchdog-state.cjs');
const {listSentryIssueSample}=require('../../adapters/sentry/sentry-readonly.cjs');
const {readJarvisRepositoryState}=require('../../adapters/jarvis/jarvis-readonly.cjs');
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
function checkedState(filename){
 if(!fs.existsSync(filename))return null;
 const stat=fs.lstatSync(filename);
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
function storeObservation(filename,previous,sentry,jarvis){
 const directory=privateDirectory(filename);
 let lock;
 try{lock=fs.openSync(filename+'.lock',fs.constants.O_WRONLY|fs.constants.O_CREAT|
  fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o600);}
 catch(e){if(e.code==='EEXIST')fail('WATCHDOG_ALREADY_RUNNING_OR_RECOVERY_REQUIRED');throw e;}
 try{
  const state=checkedState(filename);
  // Before new observations, deliver the existing pending outbox again.
  // Caller must explicitly acknowledge it via an external transactional
  // handler; this tool intentionally cannot claim exactly-once delivery.
  if(state?.pendingAlerts.length)fail('PENDING_ALERT_DELIVERY_REQUIRED');
  const last=state?state.checkpoint:previous;
  const result=evaluateChanges(last,sentry,jarvis);
  const saved={schema:'ultra-sentinel-watchdog-checkpoint/v1',
   checkpoint:result.checkpoint,pendingAlerts:result.alerts,
   deliveryAcknowledged:false};
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
function pendingDigest(events){
 if(!Array.isArray(events)||events.length===0)fail('NO_PENDING_ALERTS');
 return crypto.createHash('sha256').update(JSON.stringify(events)).digest('hex');
}
// An external operator must first deliver the alert events. Only then call
// this acknowledgement with the exact pending digest; no self-acknowledgement.
function acknowledgeDelivery(filename,digest){
 if(typeof digest!=='string'||!/^[a-f0-9]{64}$/.test(digest))
  fail('INVALID_DELIVERY_RECEIPT');
 privateDirectory(filename);
 let lock;
 try{lock=fs.openSync(filename+'.lock',fs.constants.O_WRONLY|
  fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o600);}
 catch(e){if(e.code==='EEXIST')fail('WATCHDOG_ALREADY_RUNNING_OR_RECOVERY_REQUIRED');throw e;}
 try{
  const current=checkedState(filename);
  if(!current?.pendingAlerts.length)fail('NO_PENDING_ALERTS');
  if(pendingDigest(current.pendingAlerts)!==digest)
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
 const [sentry,jarvis]=await Promise.all([
  listSentryIssueSample({organization:sentryOrg,projectId:sentryProjectId,
   token:sentryToken,fetchImpl:fetchSentry}),
  readJarvisRepositoryState({token:githubToken,fetchImpl:fetchGitHub})
 ]);
 return storeObservation(stateFile,null,sentry,jarvis);
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
module.exports={observeOnce,storeObservation,checkedState,pendingDigest,acknowledgeDelivery};
