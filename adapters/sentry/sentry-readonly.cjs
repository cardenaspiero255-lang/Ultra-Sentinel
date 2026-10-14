'use strict';
/* Minimal read-only, privacy-preserving Sentry issue summary.
 * Uses current organization issues API; never imports raw stacktraces, users,
 * breadcrumbs, messages, devices or event attachments.
 */
const ORG=/^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$/;
const PROJECT=/^[1-9][0-9]{0,18}$/;
const API='https://sentry.io/api/0/organizations/';
function fail(reason){throw Error(reason);}
async function listSentryIssueSample({organization,projectId,token,fetchImpl=globalThis.fetch}={}){
 if(typeof organization!=='string'||!ORG.test(organization)||
  typeof projectId!=='string'||!PROJECT.test(projectId)||
  typeof token!=='string'||token.length<16||token.length>2048||
  !/^[\x21-\x7e]+$/.test(token)||typeof fetchImpl!=='function')
   fail('SENTRY_AUTH_OR_TARGET_UNAVAILABLE');
 const url=API+organization+'/issues/?project='+projectId+
  '&query=is%3Aunresolved&statsPeriod=24h&limit=25';
 let response;
 try{
  response=await fetchImpl(url,{method:'GET',redirect:'error',
   signal:AbortSignal.timeout(12000),
   headers:{Authorization:'Bearer '+token,Accept:'application/json',
    'User-Agent':'Ultra-Sentinel-Sentry-ReadOnly'}});
 }catch{fail('SENTRY_TRANSPORT_UNAVAILABLE');}
 if(!response||response.status!==200||response.url&&response.url!==url)
  fail('SENTRY_API_UNAVAILABLE');
 if(!/application\/(?:json|[^;]+\+json)/i.test(response.headers?.get?.('content-type')||''))
  fail('SENTRY_INVALID_CONTENT_TYPE');
 let raw;
 try{raw=await response.text();}catch{fail('SENTRY_INVALID_BODY');}
 if(typeof raw!=='string'||Buffer.byteLength(raw,'utf8')>1024*1024)
  fail('SENTRY_RESPONSE_TOO_LARGE');
 let items;
 try{items=JSON.parse(raw);}catch{fail('SENTRY_INVALID_JSON');}
 if(!Array.isArray(items)||items.length>25)fail('SENTRY_INCOMPLETE_PAGE');
 const seen=new Set(),safe=[];
 for(const x of items){
  if(!x||typeof x!=='object'||Array.isArray(x)||
   typeof x.id!=='string'||!PROJECT.test(x.id)||seen.has(x.id)||
   String(x.project?.id)!==projectId||typeof x.count!=='string'||
   !/^[0-9]{1,12}$/.test(x.count)||
   !['fatal','error','warning','info','debug'].includes(x.level)||
   !['resolved','unresolved','ignored'].includes(x.status)||
   typeof x.lastSeen!=='string'||!Number.isFinite(Date.parse(x.lastSeen)))
   fail('SENTRY_UNTRUSTED_ISSUE');
  seen.add(x.id);
  safe.push(Object.freeze({issueId:x.id,projectId,level:x.level,
   status:x.status,count:x.count,lastSeen:x.lastSeen}));
 }
 return Object.freeze({schema:'ultra-sentinel-sentry-sample/v1',source:'sentry-api-readonly',
  organization,projectId,issues:Object.freeze(safe),
  sampleOnly:true,completeIssueInventory:false,privateEventDataStored:false,
  autoRepair:false,autoMerge:false});
}
module.exports={listSentryIssueSample};
