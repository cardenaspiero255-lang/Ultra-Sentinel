'use strict';
/*
 * Read-only, bounded GitHub collection for an immutable registered repair.
 * No check names supplied by a PR can weaken assessRegisteredRepairPr.
 * The exact head/base are re-read before returning a review-only verdict.
 * Network provenance still relies on the trusted runner/TLS and token scopes.
 */
const {assessRegisteredRepairPr}=require('./registered-pr-handoff.cjs');
const REPO='cardenaspiero255-lang/gamehub-ultra';
const API='https://api.github.com/repos/'+REPO;
const SHA=/^[a-f0-9]{40}$/;
function block(){throw Error('LIVE_HANDOFF_EVIDENCE_BLOCKED');}
async function read(url,token,fetchImpl){
 let response;
 try{
  response=await fetchImpl(url,{method:'GET',redirect:'error',
   signal:AbortSignal.timeout(12000),headers:{
    Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
    'X-GitHub-Api-Version':'2022-11-28','User-Agent':'Ultra-Sentinel-Live-Handoff'
   }});
  if(response?.status!==200||response.url!==url||
     !/application\/(?:json|[a-z0-9.+-]+\+json)/i.test(
      response.headers?.get?.('content-type')||''))block();
  const body=await response.text();
  if(typeof body!=='string'||Buffer.byteLength(body,'utf8')>4*1024*1024)block();
  return JSON.parse(body);
 }catch{block();}
}
function safePr(pr,plan,number){
 if(!pr||typeof pr!=='object'||Array.isArray(pr)||pr.number!==number||
  pr.head?.sha!==plan.candidateSha||pr.base?.sha!==plan.baseSha||
  pr.head?.repo?.full_name!==REPO||pr.base?.repo?.full_name!==REPO||
  pr.base?.ref!=='main'||pr.changed_files!==2||
  pr.state!=='open'||pr.draft!==false||pr.mergeable!==true)block();
 return pr;
}
async function allCheckRuns(sha,token,fetchImpl){
 const list=[],ids=new Set();
 let count=null;
 for(let page=1;page<=10;page++){
  const url=API+'/commits/'+sha+
   '/check-runs?filter=latest&per_page=100&page='+page;
  const data=await read(url,token,fetchImpl);
  if(!Number.isSafeInteger(data?.total_count)||data.total_count<7||
     data.total_count>1000||!Array.isArray(data.check_runs)||data.check_runs.length>100)block();
  if(count===null)count=data.total_count;
  if(count!==data.total_count||
     data.check_runs.length!==Math.min(100,count-list.length))block();
  for(const check of data.check_runs){
   if(!check||!Number.isSafeInteger(check.id)||check.id<1||
      ids.has(check.id)||check.head_sha!==sha||
      typeof check.name!=='string'||!['queued','in_progress','completed','waiting','requested','pending'].includes(check.status))block();
   ids.add(check.id);
   list.push({name:check.name,head_sha:check.head_sha,
    status:check.status,conclusion:check.conclusion});
  }
  if(list.length===count)return list;
 }
 block();
}
async function assessLiveRegisteredRepairPr({plan,prNumber,token,
 fetchImpl=globalThis.fetch}={}){
 try{
  if(!plan||plan.targetRepo!==REPO||!SHA.test(plan.baseSha||'')||
    !SHA.test(plan.candidateSha||'')||
    !Number.isSafeInteger(prNumber)||prNumber<=0||
    typeof token!=='string'||token.length<16||token.length>2048||
    !/^[\x21-\x7e]+$/.test(token)||typeof fetchImpl!=='function')block();
  const pullUrl=API+'/pulls/'+prNumber;
  const first=safePr(await read(pullUrl,token,fetchImpl),plan,prNumber);
  const files=await read(pullUrl+'/files?per_page=100&page=1',token,fetchImpl);
  if(!Array.isArray(files)||files.length!==2)block();
  const checks=await allCheckRuns(first.head.sha,token,fetchImpl);
  const last=safePr(await read(pullUrl,token,fetchImpl),plan,prNumber);
  if(last.head.sha!==first.head.sha||last.base.sha!==first.base.sha||
     last.updated_at!==first.updated_at||
     last.changed_files!==first.changed_files)block();
  // Assess the complete fetched evidence without admitting production writes.
  return assessRegisteredRepairPr({plan,pr:last,changedFiles:files,checkRuns:checks});
 }catch{block();}
}
module.exports={assessLiveRegisteredRepairPr};
