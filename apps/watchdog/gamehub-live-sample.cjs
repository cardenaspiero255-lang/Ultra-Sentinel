'use strict';
/* GameHub read-only sample: reuses the existing live-PR selector (#38).
 * This is one representative PR, never a complete CI/PR inventory.
 */
const {selectOpenGameHubPr}=require('../../scripts/gamehub-provider-observer.cjs');
const REPO='cardenaspiero255-lang/gamehub-ultra',OWNER_ID=322222186,REPO_ID=1375408706;
const SHA=/^[a-f0-9]{40}$/;
async function readGameHubLiveSample({token,fetchImpl=globalThis.fetch,
 select=selectOpenGameHubPr}={}){
 const selected=await select({token,fetchImpl});
 if(selected===null)return Object.freeze({
  schema:'ultra-sentinel-gamehub-live-sample/v1',repository:REPO,
  selection:null,completePrInventory:false,source:'github-api-readonly',
  autoCommit:false,autoMerge:false
 });
 if(!Number.isSafeInteger(selected)||selected<1||selected>999999999)
  throw Error('GAMEHUB_UNTRUSTED_SELECTION');
 const url='https://api.github.com/repos/'+REPO+'/pulls/'+selected;
 let response;
 try{response=await fetchImpl(url,{method:'GET',redirect:'error',
   signal:AbortSignal.timeout(10000),headers:{Authorization:'Bearer '+token,
    Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',
    'User-Agent':'Ultra-Sentinel-GameHub-Sampled-Reader'}});}
 catch{throw Error('GAMEHUB_TRANSPORT_UNAVAILABLE');}
 if(!response||response.status!==200||response.url&&response.url!==url||
  !/application\/(?:json|vnd\.github\+json)/i.test(response.headers?.get?.('content-type')||''))
  throw Error('GAMEHUB_API_UNAVAILABLE');
 let body;
 try{body=await response.text();}catch{throw Error('GAMEHUB_INVALID_RESPONSE');}
 if(typeof body!=='string'||Buffer.byteLength(body,'utf8')>1048576)
  throw Error('GAMEHUB_RESPONSE_TOO_LARGE');
 let p;try{p=JSON.parse(body);}catch{throw Error('GAMEHUB_INVALID_JSON');}
 if(!p||p.number!==selected||p.state!=='open'||!SHA.test(p.head?.sha||'')||
  p.base?.repo?.id!==REPO_ID||p.base?.repo?.full_name!==REPO||
  p.base?.repo?.owner?.id!==OWNER_ID)
  throw Error('GAMEHUB_UNTRUSTED_PR');
 return Object.freeze({schema:'ultra-sentinel-gamehub-live-sample/v1',
  repository:REPO,selection:Object.freeze({pr:selected,headSha:p.head.sha}),
  source:'github-api-readonly',completePrInventory:false,
  autoCommit:false,autoMerge:false});
}
module.exports={readGameHubLiveSample};
