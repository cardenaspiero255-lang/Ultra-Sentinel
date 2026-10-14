'use strict';
/**
 * Independent GameHub provider evidence observer. All network access is
 * bounded GET against the allowlisted GitHub REST API; never executes PR code.
 * This is advisory: no approval, commit, merge or token handoff.
 */
const {loadGameHubPullRequest}=require('../packages/orchestrator/gamehub-live-reader.cjs');
const {auditProviders}=require('../adapters/github/ultra_sentinel_review_integrations.cjs');
const REPO='cardenaspiero255-lang/gamehub-ultra';
const ROOT='https://api.github.com/repos/'+REPO;
const SHA=/^[0-9a-f]{40}$/i,MAX_BYTES=8*1024*1024;
function fail(code){throw Error(code);}
async function observeGameHubProviderEvidence(prNumber,{token,fetchImpl=globalThis.fetch,
 load=loadGameHubPullRequest}={}){
 if(!Number.isSafeInteger(prNumber)||prNumber<1||prNumber>2147483647||
    typeof token!=='string'||token.length<8||token.length>2048||
    !/^[\x21-\x7e]+$/.test(token)||typeof fetchImpl!=='function')
   fail('AUTHENTICATION_REQUIRED');
 const review=await load(prNumber,{token,fetchImpl});
 if(!review||review.authenticated!==true||review.headStable!==true||
    review.completeDiff!==true||review.mergeAllowed!==false||
    review.envelope?.targetRepo!==REPO||!SHA.test(review.envelope?.headSha||'')||
    review.pr!==prNumber||review.state!=='open')fail('UNTRUSTED_PR_EVIDENCE');
 const sha=review.envelope.headSha;
 let transferred=0;
 async function getJson(suffix){
  const url=ROOT+suffix;
  let result;
  try{
   result=await fetchImpl(url,{method:'GET',redirect:'error',
    signal:AbortSignal.timeout(15000),headers:{
     Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
     'X-GitHub-Api-Version':'2022-11-28',
     'User-Agent':'Ultra-Sentinel-Provider-Observer'}});
  }catch{fail('GITHUB_TRANSPORT_UNAVAILABLE');}
  if(result?.status!==200||result.url&&result.url!==url)
    fail('GITHUB_API_UNAVAILABLE');
  const type=result.headers?.get?.('content-type')||'';
  if(!/application\/(?:json|vnd\.github\+json)/i.test(type))
    fail('GITHUB_INVALID_CONTENT_TYPE');
  let body;
  try{body=await result.text();}catch{fail('GITHUB_INVALID_RESPONSE');}
  if(typeof body!=='string'||Buffer.byteLength(body,'utf8')>MAX_BYTES)
    fail('GITHUB_RESPONSE_TOO_LARGE');
  transferred+=Buffer.byteLength(body,'utf8');
  if(transferred>MAX_BYTES*4)fail('GITHUB_TOTAL_RESPONSE_TOO_LARGE');
  try{return JSON.parse(body);}catch{fail('GITHUB_INVALID_JSON');}
 }
 const reviews=[];
 for(let page=1;page<=11;page++){
  const part=await getJson('/pulls/'+prNumber+'/reviews?per_page=100&page='+page);
  if(!Array.isArray(part)||part.length>100||
     reviews.length+part.length>1000)fail('GITHUB_REVIEWS_INCOMPLETE');
  reviews.push(...part);
  if(part.length<100)break;
  if(page===11)fail('GITHUB_REVIEWS_INCOMPLETE');
 }
 const checks=[];let total=null;
 for(let page=1;page<=10;page++){
  const body=await getJson('/commits/'+sha+'/check-runs?per_page=100&page='+page);
  if(!body||!Number.isSafeInteger(body.total_count)||
     body.total_count<0||body.total_count>1000||
     !Array.isArray(body.check_runs)||body.check_runs.length>100||
     (total!==null&&body.total_count!==total))fail('GITHUB_CHECKS_INCOMPLETE');
  total=body.total_count;
  checks.push(...body.check_runs);
  if(checks.length>total)fail('GITHUB_CHECKS_INCOMPLETE');
  if(checks.length===total)break;
  if(body.check_runs.length!==100||page===10)fail('GITHUB_CHECKS_INCOMPLETE');
 }
 if(checks.length!==total)fail('GITHUB_CHECKS_INCOMPLETE');
 const latest=await getJson('/pulls/'+prNumber);
 if(latest?.state!=='open'||latest.head?.sha!==sha||
    latest.base?.sha!==review.baseSha)fail('STALE_PR_SHA');
 const advisory=auditProviders({headSha:sha,reviews,checks});
 return Object.freeze({
  schema:'ultra-sentinel-provider-observer/v1',repository:REPO,pr:prNumber,
  headSha:sha,providers:advisory.providers,reviewCount:reviews.length,
  checkCount:checks.length,independentVerified:false,
  autoCommitAllowed:false,autoMergeAllowed:false,
  note:'Advisory only. Evidence never grants GitHub approval or authorization.'});
}
async function main(){
 const raw=process.argv[2]||'201';
 if(!/^[1-9][0-9]{0,8}$/.test(raw))fail('INVALID_PR_NUMBER');
 const report=await observeGameHubProviderEvidence(Number(raw),{
  token:process.env.GITHUB_TOKEN});
 process.stdout.write(JSON.stringify(report)+'\n');
}
if(require.main===module)main().catch(e=>{
 console.error('PROVIDER_OBSERVER_FAILED_CLOSED: '+String(e?.message||e).slice(0,170));
 process.exitCode=1;
});
module.exports={observeGameHubProviderEvidence};
