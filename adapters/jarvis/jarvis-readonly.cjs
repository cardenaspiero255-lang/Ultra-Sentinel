'use strict';
/* Read-only GitHub status boundary for the real JARVIS repository.
 * Never reads PR source, user voice, secrets, CI artifacts or runs PR code.
 */
const REPO='cardenaspiero255-lang/JARVIS',REPO_ID=1349889592,OWNER_ID=322222186;
const API='https://api.github.com/repos/'+REPO;
const SHA=/^[a-f0-9]{40}$/;
function fail(reason){throw Error(reason);}
async function readJarvisRepositoryState({token,fetchImpl=globalThis.fetch}={}){
 if(typeof token!=='string'||token.length<8||token.length>2048||
  !/^[\x21-\x7e]+$/.test(token)||typeof fetchImpl!=='function')
  fail('JARVIS_TOKEN_REQUIRED');
 async function getJson(suffix){
  const url=API+suffix;
  let response;
  try{response=await fetchImpl(url,{method:'GET',redirect:'error',
   signal:AbortSignal.timeout(15000),
   headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
    'X-GitHub-Api-Version':'2022-11-28','User-Agent':'Ultra-Sentinel-JARVIS-ReadOnly'}});}
  catch{fail('JARVIS_GITHUB_TRANSPORT_UNAVAILABLE');}
  if(!response||response.status!==200||response.url&&response.url!==url)
   fail('JARVIS_GITHUB_API_UNAVAILABLE');
  const ct=response.headers?.get?.('content-type')||'';
  if(!/application\/(?:json|vnd\.github\+json)/i.test(ct))fail('JARVIS_INVALID_CONTENT_TYPE');
  let body;
  try{body=await response.text();}catch{fail('JARVIS_INVALID_RESPONSE');}
  if(typeof body!=='string'||Buffer.byteLength(body,'utf8')>1024*1024)
   fail('JARVIS_RESPONSE_TOO_LARGE');
  try{return JSON.parse(body);}catch{fail('JARVIS_INVALID_JSON');}
 }
 const meta=await getJson('');
 if(!meta||meta.id!==REPO_ID||meta.full_name!==REPO||meta.owner?.id!==OWNER_ID||
  meta.default_branch!=='main'||meta.archived===true)
  fail('JARVIS_REPO_IDENTITY_MISMATCH');
 const pulls=await getJson('/pulls?state=open&per_page=30&page=1');
 if(!Array.isArray(pulls)||pulls.length>=30)fail('JARVIS_PR_INVENTORY_INCOMPLETE');
 const seen=new Set(),heads=[];
 for(const item of pulls){
  if(!item||!Number.isSafeInteger(item.number)||item.number<=0||
   seen.has(item.number)||item.state!=='open'||!SHA.test(item.head?.sha||'')||
   item.base?.repo?.id!==REPO_ID)fail('JARVIS_UNTRUSTED_PR_METADATA');
  seen.add(item.number);
  heads.push(Object.freeze({pr:item.number,headSha:item.head.sha,draft:item.draft===true}));
 }
 return Object.freeze({schema:'ultra-sentinel-jarvis-readonly/v1',repository:REPO,
  repositoryId:REPO_ID,branch:'main',openPrs:Object.freeze(heads),
  source:'github-api-readonly',remoteWrites:false,monitor24x7Deployed:false,
  autoCommit:false,autoMerge:false});
}
module.exports={readJarvisRepositoryState};
