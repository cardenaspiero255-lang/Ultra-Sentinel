'use strict';
/** Per-run, read-only API budget. Cache only SHA-pinned immutable requests. */
const SHA=/^[a-f0-9]{40}$/;
function fail(code){throw Error(code);}
function createApiBudget({maxRequests=320,maxMemoized=300}={}){
 if(!Number.isSafeInteger(maxRequests)||maxRequests<1||maxRequests>1024||
    !Number.isSafeInteger(maxMemoized)||maxMemoized<0||maxMemoized>1000)fail('INVALID_API_BUDGET');
 let used=0,blocked=false,cacheHits=0;
 const memo=new Map();
 function recordLimit(){blocked=true;}
 function isPinned(path){
  if(typeof path!=='string'||path.length>600||!path.startsWith('/contents/')||
   path.includes('..')||path.includes('#'))return false;
  const marker=path.lastIndexOf('?ref=');
  return marker>0&&SHA.test(path.slice(marker+5));
 }
 async function run(path,operation,{immutable=false}={}){
  if(typeof path!=='string'||path.length>600||!path.startsWith('/')||
     (path.includes('..')&&!/^\/compare\/[a-f0-9]{40}\.\.\.[a-f0-9]{40}$/.test(path))||typeof operation!=='function'||(immutable&&!isPinned(path)))
    fail('INVALID_API_REQUEST');
  if(blocked)fail('GITHUB_RATE_LIMITED');
  if(immutable&&memo.has(path)){
   cacheHits++;
   return memo.get(path);
  }
  if(used>=maxRequests)fail('GITHUB_API_BUDGET_EXHAUSTED');
  used++;
  const pending=Promise.resolve().then(operation).catch(e=>{
   if(immutable)memo.delete(path);
   if(e?.message==='GITHUB_RATE_LIMITED')blocked=true;
   throw e;
  });
  if(immutable&&memo.size<maxMemoized)memo.set(path,pending);
  return pending;
 }
 function snapshot(){return Object.freeze({used,cacheHits,blocked,
  remaining:maxRequests-used,memoized:memo.size,readOnly:true,
  crossRunnerCache:false,autoRetry:false,autoMerge:false});}
 return Object.freeze({run,recordLimit,snapshot});
}
function rateLimitedResponse(response){
 if(response?.status===429)return true;
 if(response?.status!==403)return false;
 const header=key=>response.headers?.get?.(key);
 return header('x-ratelimit-remaining')==='0'||
  (typeof header('retry-after')==='string'&&/^\d+$/.test(header('retry-after')));
}
module.exports={createApiBudget,rateLimitedResponse};
