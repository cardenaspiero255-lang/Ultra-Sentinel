'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {loadGameHubPullRequest}=require('../../packages/orchestrator/gamehub-live-reader.cjs');
const repo='cardenaspiero255-lang/gamehub-ultra',sha='a'.repeat(40),base='b'.repeat(40);
const key='testcredential'.repeat(3);
const api='https://api.github.com/repos/'+repo;
const file=i=>({filename:'.github/scripts/sample'+i+'.cjs',status:'added',changes:1,additions:1,deletions:0,patch:'@@ -0,0 +1 @@\n+const safe=true;\n'});
const pr=(count,head=sha)=>({number:201,base:{repo:{full_name:repo,id:1375408706},sha:base},head:{sha:head},changed_files:count,state:'open',draft:true});
function mock({first=pr(1),second=first,pages=[[file(0)]],status=200,wrongType=false,redirect=false}={}){
 const calls=[];
 const fetchImpl=async(url,options)=>{
  calls.push({url,options});
  const path=url.slice(api.length);
  const body=path==='/pulls/201'?(calls.filter(x=>x.url===url).length===1?first:second):
   pages[Number(new URL(url).searchParams.get('page'))-1]??[];
  return {status,url:redirect?'https://other.example/':url,
   headers:{get:()=>wrongType?'text/html':'application/json'},
   text:async()=>JSON.stringify(body)};
 };
 return {calls,fetchImpl};
}
test('authenticated collector binds stable GameHub SHA; cannot approve',async()=>{
 const m=mock(),r=await loadGameHubPullRequest(201,{token:key,fetchImpl:m.fetchImpl});
 assert.equal(r.authenticated,true);assert.equal(r.headStable,true);assert.equal(r.completeDiff,true);
 assert.equal(r.mergeAllowed,false);assert.equal(r.envelope.evidenceState,'UNVERIFIED');
 assert.equal(r.envelope.headSha,sha);assert.equal(m.calls.length,3);
 for(const c of m.calls){assert.equal(c.options.method,'GET');assert.equal(c.options.redirect,'error');assert.ok(c.url.startsWith(api+'/pulls/201'));}
});
test('no credential, untrusted repo or redirect blocks',async()=>{
 await assert.rejects(()=>loadGameHubPullRequest(201,{fetchImpl:mock().fetchImpl}),/AUTHENTICATION_REQUIRED/);
 await assert.rejects(()=>loadGameHubPullRequest(201,{token:key,fetchImpl:mock({redirect:true}).fetchImpl}),/GITHUB_REDIRECT_REJECTED/);
 const p=pr(1);p.base.repo.full_name='other/fork';
 await assert.rejects(()=>loadGameHubPullRequest(201,{token:key,fetchImpl:mock({first:p}).fetchImpl}),/INVALID_PR_METADATA/);
});
test('SHA race, pagination gaps, duplicate names block',async()=>{
 await assert.rejects(()=>loadGameHubPullRequest(201,{token:key,fetchImpl:mock({second:pr(1,'c'.repeat(40))}).fetchImpl}),/STALE_PR_SHA/);
 await assert.rejects(()=>loadGameHubPullRequest(201,{token:key,fetchImpl:mock({first:pr(2)}).fetchImpl}),/PR_FILES_MISMATCH/);
 await assert.rejects(()=>loadGameHubPullRequest(201,{token:key,fetchImpl:mock({first:pr(2),pages:[[file(0),file(0)]]}).fetchImpl}),/INVALID_PR_FILE_PAGE/);
});
test('truncated patch and HTTP errors block',async()=>{
 const bad=file(0);bad.additions=2;bad.changes=2;
 await assert.rejects(()=>loadGameHubPullRequest(201,{token:key,fetchImpl:mock({pages:[[bad]]}).fetchImpl}),/INCOMPLETE_PR_DIFF/);
 await assert.rejects(()=>loadGameHubPullRequest(201,{token:key,fetchImpl:mock({status:429}).fetchImpl}),/GITHUB_RATE_LIMITED/);
 await assert.rejects(()=>loadGameHubPullRequest(201,{token:key,fetchImpl:mock({wrongType:true}).fetchImpl}),/GITHUB_INVALID_CONTENT_TYPE/);
});
test('100-file pagination includes verified empty terminal page',async()=>{
 const m=mock({first:pr(100),pages:[Array.from({length:100},(_,i)=>file(i)),[]]});
 const r=await loadGameHubPullRequest(201,{token:key,fetchImpl:m.fetchImpl});
 assert.equal(r.changedFiles,100);assert.equal(m.calls.length,4);
});

test('all denied, throttled and failing API statuses block read-only ingestion',async()=>{
 for(const status of [401,403,404,429,500,503]){
  await assert.rejects(()=>loadGameHubPullRequest(201,{token:key,fetchImpl:mock({status}).fetchImpl}),status===429?/GITHUB_RATE_LIMITED/:/GITHUB_API_UNAVAILABLE/);
 }
});
test('changed PR base, file count and malformed patch block',async()=>{
 const moved=pr(1);moved.base.sha='c'.repeat(40);
 await assert.rejects(()=>loadGameHubPullRequest(201,{token:key,fetchImpl:mock({second:moved}).fetchImpl}),/STALE_PR_SHA/);
 const unknown=file(0);delete unknown.patch;
 await assert.rejects(()=>loadGameHubPullRequest(201,{token:key,fetchImpl:mock({pages:[[unknown]]}).fetchImpl}),/INCOMPLETE_PR_DIFF/);
 const invalid=pr(301);
 await assert.rejects(()=>loadGameHubPullRequest(201,{token:key,fetchImpl:mock({first:invalid}).fetchImpl}),/INVALID_PR_METADATA/);
});

test('runtime URL-safe punctuation is accepted but whitespace and header breaks are rejected',async()=>{
 const good=key+'~-/=.';
 const result=await loadGameHubPullRequest(201,{token:good,fetchImpl:mock().fetchImpl});
 assert.equal(result.authenticated,true);
 for(const bad of [key+'\n',key+'\r',key+' ',key+'\t'])
  await assert.rejects(()=>loadGameHubPullRequest(201,{token:bad,fetchImpl:mock().fetchImpl}),/AUTHENTICATION_REQUIRED/);
});

test('installation quota exhaustion fails closed after one GET, with no automatic retry',async()=>{
 const calls=[];
 const fetchImpl=async(url,opts)=>{
  calls.push({url,method:opts.method});
  return {status:403,url,headers:{get:name=>name==='x-ratelimit-remaining'?'0':null},
   text:async()=>JSON.stringify({message:'rate limit with private data'})};
 };
 await assert.rejects(loadGameHubPullRequest(201,{token:key,fetchImpl}),/GITHUB_RATE_LIMITED/);
 assert.equal(calls.length,1);assert.equal(calls[0].method,'GET');
});
