'use strict';
/* Trusted read-only evidence producer for existing GameHub preflight (#37).
 * All inputs from PR author/PR JSON are DATA, never authority. Call only with
 * operator-supplied requiredChecks. Fail closed on incomplete inventories.
 */
const {approvedPath,REPO}=require('../../adapters/gamehub/ultra_sentinel_repair_authorization.cjs');
const API='https://api.github.com/repos/'+REPO,REPO_ID=1375408706,OWNER_ID=322222186;
const SHA=/^[a-f0-9]{40}$/;
function fail(code){throw Error(code);}
function validToken(s){return typeof s==='string'&&s.length>=16&&s.length<=2048&&
 /^[\x21-\x7e]+$/.test(s);}
function checkRequired(required){
 if(!Array.isArray(required)||!required.length||required.length>100||
  required.some(s=>typeof s!=='string'||!s.trim()||s.length>160)||
  new Set(required).size!==required.length)fail('INVALID_OPERATOR_REQUIRED_CHECKS');
}
function checkMeta(p,n){
 if(!p||p.number!==n||p.state!=='open'||p.draft!==false||
  p.base?.repo?.full_name!==REPO||p.base?.repo?.id!==REPO_ID||
  p.base?.repo?.owner?.id!==OWNER_ID||
  p.head?.repo?.full_name!==REPO||p.head?.repo?.id!==REPO_ID||
  !SHA.test(p.head?.sha||'')||!SHA.test(p.base?.sha||'')||
  !Number.isSafeInteger(p.changed_files)||p.changed_files<1||p.changed_files>50)
  fail('UNTRUSTED_GAMEHUB_PR_METADATA');
 return {headSha:p.head.sha,baseSha:p.base.sha,count:p.changed_files};
}
async function loadGameHubRepairPreflight(prNumber,{
 token,requiredChecks,fetchImpl=globalThis.fetch
}={}){
 if(!Number.isSafeInteger(prNumber)||prNumber<1||prNumber>999999999||
  !validToken(token)||typeof fetchImpl!=='function')
  fail('INVALID_OPERATOR_GITHUB_ACCESS');
 checkRequired(requiredChecks);
 let totalBytes=0;
 async function getJson(suffix){
  const url=API+suffix;let response;
  try{response=await fetchImpl(url,{method:'GET',redirect:'error',
   signal:AbortSignal.timeout(12000),headers:{
    Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
    'X-GitHub-Api-Version':'2022-11-28','User-Agent':'Ultra-Sentinel-Repair-Preflight'}});}
  catch{fail('GITHUB_PREFLIGHT_TRANSPORT_UNAVAILABLE');}
  if(!response||response.status!==200||response.url&&response.url!==url||
   !/application\/(?:json|vnd\.github\+json)/i.test(response.headers?.get?.('content-type')||''))
   fail('GITHUB_PREFLIGHT_API_UNAVAILABLE');
  let raw;try{raw=await response.text();}catch{fail('GITHUB_PREFLIGHT_BODY_INVALID');}
  if(typeof raw!=='string'||Buffer.byteLength(raw,'utf8')>2*1024*1024)
   fail('GITHUB_PREFLIGHT_RESPONSE_UNBOUNDED');
  totalBytes+=Buffer.byteLength(raw,'utf8');
  if(totalBytes>8*1024*1024)fail('GITHUB_PREFLIGHT_TOTAL_UNBOUNDED');
  try{return JSON.parse(raw);}catch{fail('GITHUB_PREFLIGHT_INVALID_JSON');}
 }
 const meta=checkMeta(await getJson('/pulls/'+prNumber),prNumber);
 const files=await getJson('/pulls/'+prNumber+'/files?per_page=100&page=1');
 if(!Array.isArray(files)||files.length!==meta.count||files.length>50)
  fail('INCOMPLETE_REPAIR_FILES');
 const names=new Set();
 for(const file of files){
  if(!file||file.status!=='modified'||!approvedPath(file.filename)||
   names.has(file.filename)||typeof file.patch!=='string'||!file.patch.startsWith('@@ ')||
   !Number.isSafeInteger(file.changes)||file.changes<1||
   file.patch.length>200000)fail('UNSAFE_OR_INCOMPLETE_REPAIR_FILE');
  names.add(file.filename);
 }
 const payload=await getJson('/commits/'+meta.headSha+'/check-runs?per_page=100&page=1');
 if(!payload||!Number.isSafeInteger(payload.total_count)||
  payload.total_count<1||payload.total_count>100||
  !Array.isArray(payload.check_runs)||payload.check_runs.length!==payload.total_count)
  fail('INCOMPLETE_REPAIR_CHECKS');
 const checks=[],seen=new Set();
 for(const check of payload.check_runs){
  if(!check||typeof check.name!=='string'||!check.name.trim()||
   seen.has(check.name)||check.head_sha!==meta.headSha||
   check.status!=='completed'||check.conclusion!=='success')
   fail('FAILED_OR_STALE_REPAIR_CHECK');
  seen.add(check.name);
  checks.push({name:check.name,sha:meta.headSha,
   status:'completed',conclusion:'success'});
 }

 // Classic commit status contexts are a second, independent GitHub API surface.
 const classic=await getJson('/commits/'+meta.headSha+'/status');
 if(!classic||!Array.isArray(classic.statuses)||classic.statuses.length>=100)
  fail('INCOMPLETE_CLASSIC_STATUSES');
 const contexts=new Set();
 for(const context of classic.statuses){
  if(!context||typeof context.context!=='string'||!context.context.trim()||
   contexts.has(context.context)||context.state!=='success')
   fail('FAILED_OR_STALE_CLASSIC_STATUS');
  contexts.add(context.context);
  // Normalize successful classic statuses for the existing preflight #37.
  // A name reported on BOTH surfaces is counted once after both succeeded.
  if(!seen.has(context.context)){
   checks.push({name:context.context,sha:meta.headSha,
    status:'completed',conclusion:'success'});
   seen.add(context.context);
  }
 }
 // Required names can be reported either as Checks API runs or as classic
 // commit status contexts. A valid classic status is not an absent check.
 if(requiredChecks.some(name=>!seen.has(name)&&!contexts.has(name)))
  fail('REQUIRED_REPAIR_CHECK_MISSING');
 const reviews=await getJson('/pulls/'+prNumber+'/reviews?per_page=100&page=1');
 if(!Array.isArray(reviews)||reviews.length>=100||
  reviews.some(r=>!r||!['APPROVED','COMMENTED','DISMISSED','PENDING','CHANGES_REQUESTED'].includes(r.state)))
  fail('INCOMPLETE_REPAIR_REVIEWS');
 if(reviews.some(r=>r.state==='CHANGES_REQUESTED'||r.state==='PENDING'))
  fail('BLOCKING_REPAIR_REVIEW');
 // Final re-read proves that files/checks were bound to one immutable HEAD.
 const last=checkMeta(await getJson('/pulls/'+prNumber),prNumber);
 if(last.headSha!==meta.headSha||last.baseSha!==meta.baseSha||last.count!==meta.count)
  fail('STALE_REPAIR_HEAD');
 return Object.freeze({repository:REPO,headRepo:REPO,number:prNumber,
  headSha:meta.headSha,draft:false,changedFiles:files.length,
  files:Object.freeze([...names]),checks:Object.freeze(checks),
  checkInventoryComplete:true,requiredChecks:Object.freeze([...requiredChecks]),
  now:Date.now(),source:'trusted-github-api-readonly',remoteWrites:false,
  reviewInventoryComplete:true,classicStatusInventoryComplete:true});
}
module.exports={loadGameHubRepairPreflight};
