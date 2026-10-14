'use strict';
// On-host setup validation. No network calls and never displays secrets.
// This is a configuration preflight, NOT a 24/7 uptime attestation.
const fs=require('node:fs');
const path=require('node:path');
const {validateEndpoint}=require('./watchdog-deliver.cjs');
const {checkedState}=require('./watchdog-run-once.cjs');
function validateWatchdogConfig(env=process.env){
 const reasons=[];
 const state=env.ULTRA_SENTINEL_WATCHDOG_STATE_FILE;
 if(typeof state!=='string'||!path.isAbsolute(state)||path.basename(state)!=='watchdog.json')
  reasons.push('STATE_PATH_INVALID');
 if(typeof env.ULTRA_SENTINEL_SENTRY_ORG!=='string'||
  !/^[a-z0-9][a-z0-9-]{1,63}$/.test(env.ULTRA_SENTINEL_SENTRY_ORG))
  reasons.push('SENTRY_ORGANIZATION_INVALID');
 if(typeof env.ULTRA_SENTINEL_SENTRY_PROJECT_ID!=='string'||
  !/^[1-9][0-9]{0,18}$/.test(env.ULTRA_SENTINEL_SENTRY_PROJECT_ID))
  reasons.push('SENTRY_PROJECT_INVALID');
 for(const [field,name] of [
  ['ULTRA_SENTINEL_SENTRY_TOKEN','SENTRY_SECRET_MISSING'],
  ['ULTRA_SENTINEL_READONLY_GITHUB_TOKEN','GITHUB_SECRET_MISSING'],
  ['ULTRA_SENTINEL_ALERT_AUTH_TOKEN','ALERT_AUTH_MISSING'],
  ['ULTRA_SENTINEL_ALERT_SIGNING_SECRET','ALERT_HMAC_MISSING']
 ]){
  const val=env[field];
  if(typeof val!=='string'||val.length<20||val.length>2048||
   !/^[\x21-\x7e]+$/.test(val)||val.includes('REPLACE_WITH_'))
   reasons.push(name);
 }
 try{validateEndpoint(env.ULTRA_SENTINEL_ALERT_WEBHOOK_URL);}
 catch{reasons.push('ALERT_DESTINATION_INVALID');}
 if(typeof state==='string'&&path.isAbsolute(state)){
  try{
   const dirname=path.dirname(state),stat=fs.lstatSync(dirname);
   if(!stat.isDirectory()||stat.isSymbolicLink()||
    (stat.mode&0o077)!==0)reasons.push('STATE_DIRECTORY_NOT_PRIVATE');
   else checkedState(state);
  }catch(error){
   if(error.code!=='ENOENT')reasons.push('STATE_INVALID_OR_UNREADABLE');
   else reasons.push('STATE_DIRECTORY_MISSING');
  }
 }
 return Object.freeze({status:reasons.length?'NOT_READY':'CONFIGURATION_COMPLETE_NOT_DEPLOYED',
  reasons:Object.freeze(reasons),secretsDisplayed:false,networkTestPerformed:false,
  deliveryTestPerformed:false,monitor24x7Verified:false});
}
if(require.main===module){
 const report=validateWatchdogConfig();
 process.stdout.write(JSON.stringify(report)+'\n');
 if(report.reasons.length)process.exitCode=1;
}
module.exports={validateWatchdogConfig};
