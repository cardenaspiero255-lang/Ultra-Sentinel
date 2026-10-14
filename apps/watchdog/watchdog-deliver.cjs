'use strict';
/*
 * Delivery of the durable watchdog outbox. Not a generic URL fetcher:
 * endpoint and credential belong to the trusted host operator, never PR data.
 * A 2xx response confirms HTTP acceptance, not human notification delivery.
 * Idempotency is advisory to the receiver; transport is at-least-once.
 */
const {checkedState,pendingDigest,acknowledgeDelivery}=
 require('./watchdog-run-once.cjs');
const {createHash,createHmac}=require('node:crypto');
function fail(code){throw Error(code);}
function validateEndpoint(raw){
 if(typeof raw!=='string'||raw.length>1024||raw.trim()!==raw)fail('INVALID_ALERT_DESTINATION');
 let url;try{url=new URL(raw);}catch{fail('INVALID_ALERT_DESTINATION');}
 if(url.protocol!=='https:'||url.username||url.password||url.port||url.hash||url.search||
  !/^[a-z0-9.-]+$/.test(url.hostname)||!url.hostname.includes('.')||
  url.hostname.endsWith('.local')||url.hostname.endsWith('.internal')||
  url.hostname.endsWith('.localhost')||
  url.hostname==='localhost'||url.hostname.startsWith('127.')||
  /^(?:10|192|172)\.[0-9.]+$/.test(url.hostname)||
  url.hostname.startsWith('.')||url.hostname.endsWith('.')||
  url.pathname.length>500)fail('INVALID_ALERT_DESTINATION');
 const labels=url.hostname.split('.');
 if(labels.some(x=>!x||x.length>63||! /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(x))||
  labels.at(-1).length<2)fail('INVALID_ALERT_DESTINATION');
 return url.toString();
}
function validSecret(s){return typeof s==='string'&&s.length>=20&&s.length<=2048&&
 /^[\x21-\x7e]+$/.test(s);}
async function deliverPending({stateFile,endpoint,token,signingSecret,
 fetchImpl=globalThis.fetch}={}){
 const target=validateEndpoint(endpoint);
 if(!validSecret(token)||!validSecret(signingSecret)||typeof fetchImpl!=='function')
  fail('ALERT_DELIVERY_NOT_CONFIGURED');
 // A checkpoint is needed to prove an outbox exists and was durable.
 const checkpoint=checkedState(stateFile);
 if(!checkpoint)fail('WATCHDOG_CHECKPOINT_MISSING');
 const pending=checkpoint.pendingAlerts;
 if(pending.length===0)return Object.freeze({status:'NO_PENDING_ALERTS',deliveryAccepted:false});
 const digest=pendingDigest(pending);
 const key=createHash('sha256').update('ultra-sentinel-alerts/v1:'+digest).digest('hex');
 const payload=JSON.stringify({schema:'ultra-sentinel-alert-envelope/v1',batchId:key,
  alertCount:pending.length,alerts:pending});
 const signature=createHmac('sha256',signingSecret).update(payload).digest('hex');
 let result;
 try{
  result=await fetchImpl(target,{method:'POST',redirect:'error',
   signal:AbortSignal.timeout(12000),headers:{
    'Authorization':'Bearer '+token,'Content-Type':'application/json',
    'X-Ultra-Sentinel-Signature':'sha256='+signature,
    'Idempotency-Key':key,
    'User-Agent':'Ultra-Sentinel-Watchdog-Delivery'},
   body:payload});
 }catch{fail('ALERT_TRANSPORT_UNAVAILABLE');}
 if(!result||![200,201,202,204].includes(result.status)||
   result.url&&result.url!==target)fail('ALERT_NOT_ACCEPTED');
 // Never advance checkpoint prior to verified HTTP acknowledgement.
 const confirmation=acknowledgeDelivery(stateFile,digest);
 return Object.freeze({status:'HTTP_DELIVERY_ACCEPTED',
  batchId:key,acceptedCount:pending.length,
  acknowledgement:confirmation.status,deliveryAccepted:true,
  endUserDeliveryUnverified:true,monitor24x7Deployed:false});
}
if(require.main===module){
 deliverPending({
  stateFile:process.env.ULTRA_SENTINEL_WATCHDOG_STATE_FILE,
  endpoint:process.env.ULTRA_SENTINEL_ALERT_WEBHOOK_URL,
  token:process.env.ULTRA_SENTINEL_ALERT_AUTH_TOKEN,
  signingSecret:process.env.ULTRA_SENTINEL_ALERT_SIGNING_SECRET
 }).then(report=>process.stdout.write(JSON.stringify(report)+'\n')).catch(()=>{
  process.stderr.write('WATCHDOG_ALERT_DELIVERY_BLOCKED\n');
  process.exitCode=1;
 });
}
module.exports={deliverPending,validateEndpoint};
