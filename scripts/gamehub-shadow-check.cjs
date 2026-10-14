'use strict';
const {loadGameHubPullRequest}=require('../packages/orchestrator/gamehub-live-reader.cjs');
const {summarizeShadow}=require('../packages/orchestrator/gamehub-shadow.cjs');
const {bindChecksToPr}=require('../packages/orchestrator/check-pr-provenance.cjs');
const {resolveGameHubTarget,requireOpenSource}=require('../packages/orchestrator/gamehub-target.cjs');
const REPO='cardenaspiero255-lang/gamehub-ultra';
async function getChecks(sha,baseSha,pr,token){
 const url='https://api.github.com/repos/'+REPO+'/commits/'+sha+'/check-runs?per_page=100&page=1';
 const response=await fetch(url,{method:'GET',redirect:'error',
  signal:AbortSignal.timeout(15000),headers:{Authorization:'Bearer '+token,
   Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',
   'User-Agent':'Ultra-Sentinel-Shadow'}});
 if(response.status!==200||response.url!==url||
  !/application\/(?:json|vnd\.github\+json)/i.test(response.headers.get('content-type')||''))
  throw Error('GITHUB_CHECKS_UNAVAILABLE');
 const body=await response.text();
 if(Buffer.byteLength(body,'utf8')>8*1024*1024)throw Error('GITHUB_CHECKS_TOO_LARGE');
 let payload;
 try{payload=JSON.parse(body);}catch{throw Error('GITHUB_CHECKS_INVALID_JSON');}
 if(!Number.isSafeInteger(payload?.total_count)||payload.total_count>100||
  !Array.isArray(payload.check_runs)||payload.check_runs.length!==payload.total_count)
  throw Error('GITHUB_CHECKS_INCOMPLETE');
 return bindChecksToPr({headSha:sha,baseSha,pr,raw:payload});
}
async function main(){
 const token=process.env.GITHUB_TOKEN;
 const selected=await resolveGameHubTarget(process.argv[2]||'auto',{token});
 if(selected===null){
  process.stdout.write(JSON.stringify({schema:'ultra-sentinel-shadow/v1',
   status:'IDLE_NO_OPEN_PR',semanticEquivalenceVerified:false,
   autoRepair:false,autoMerge:false})+'\n');
  return;
 }
 const reviewed=requireOpenSource(await loadGameHubPullRequest(selected,{token}));
 const checks=await getChecks(reviewed.envelope.headSha,reviewed.baseSha,reviewed.pr,token);
 const result=summarizeShadow(reviewed,checks);
 process.stdout.write(JSON.stringify(result)+'\n');
}
if(require.main===module)main().catch(()=>{
 console.error('SHADOW_FAILED_CLOSED: GitHub evidence incomplete or unavailable');
 process.exitCode=1;
});
