'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {observeGameHubProviderEvidence}=require('../../scripts/gamehub-provider-observer.cjs');
const SHA='a'.repeat(40),BASE='b'.repeat(40);
const PR=201,REPO='cardenaspiero255-lang/gamehub-ultra';
const fakeLoad=async()=>({authenticated:true,headStable:true,completeDiff:true,
 source:'github-api-authenticated-readonly',state:'open',pr:PR,baseSha:BASE,
 envelope:{headSha:SHA,targetRepo:REPO},mergeAllowed:false,
 report:{engine:'Ultra Sentinel Core',sha:SHA,verdict:'REVIEW_REQUIRED',
 coverage:{returned:1,analyzed:1,partial:false},omitted:0,
 findings:[{rule:'SPEECH_REENTRANT_RETRY',severity:'HIGH',confidence:'medium',
 origin:'Ultra Sentinel Core',path:'app/src/main/java/voice/Ultra.kt',line:5,
 evidence:'onError() startListening()'}]}});
function mockFetch({reviews=[],checks=[],total=checks.length,changeHead=false,status=200}={}){
 const urls=[];
 const fetchImpl=async(url)=>{
  urls.push(url);
  let data;
  if(url.endsWith('/pulls/'+PR))data={state:'open',head:{sha:changeHead?BASE:SHA},base:{sha:BASE}};
  else if(url.includes('/reviews?'))data=reviews;
  else if(url.includes('/check-runs?'))data={total_count:total,check_runs:checks};
  else throw Error('UNEXPECTED_API_PATH');
  return {status,url,headers:{get:()=> 'application/json'},text:async()=>JSON.stringify(data)};
 };
 return {fetchImpl,urls};
}
const good={app:{slug:'sentry'},head_sha:SHA,status:'completed',conclusion:'success'};
test('RED migration #199: live GameHub provider observer binds all evidence to stable HEAD',async()=>{
 const {fetchImpl,urls}=mockFetch({reviews:[{user:{login:'coderabbitai[bot]'},state:'COMMENTED',commit_id:SHA}],checks:[good]});
 const v=await observeGameHubProviderEvidence(PR,{token:'unit-test-token',fetchImpl,load:fakeLoad});
 assert.equal(v.schema,'ultra-sentinel-provider-observer/v1');
 assert.equal(v.headSha,SHA);
 assert.equal(v.providers.coderabbit,'COMMENT_ONLY_NOT_APPROVED');
 assert.equal(v.providers.sentry,'CHECK_SUCCESS_ADVISORY');
 assert.equal(v.familyCount,1);
 assert.equal(v.familyStatus,'REVIEW_REQUIRED');
 assert.equal(Object.hasOwn(v.providers,'codex'),false);
 assert.equal(v.autoCommitAllowed,false);assert.equal(v.autoMergeAllowed,false);
 assert.ok(urls.every(url=>url.startsWith('https://api.github.com/repos/'+REPO+'/')));
});
test('HEAD switch after fetching review/check evidence fails closed',async()=>{
 const {fetchImpl}=mockFetch({changeHead:true});
 await assert.rejects(()=>observeGameHubProviderEvidence(PR,{token:'unit-test-token',fetchImpl,load:fakeLoad}),/STALE_PR_SHA/);
});
test('incomplete check totals and upstream HTTP errors fail closed',async()=>{
 for(const opts of [{total:2,checks:[good]},{status:503}]){
  const {fetchImpl}=mockFetch(opts);
  await assert.rejects(()=>observeGameHubProviderEvidence(PR,{token:'unit-test-token',fetchImpl,load:fakeLoad}),/GITHUB_/);
 }
});
test('reject changed target, invalid token, and untrusted source',async()=>{
 const {fetchImpl}=mockFetch();
 for(const options of [{token:''},{token:'unit-test-token',load:async()=>({...await fakeLoad(),authenticated:false})},
 {token:'unit-test-token',load:async()=>({...await fakeLoad(),envelope:{headSha:SHA,targetRepo:'attacker/other'}})}]){
  await assert.rejects(()=>observeGameHubProviderEvidence(PR,{...options,fetchImpl,load:options.load||fakeLoad}),/AUTHENTICATION|UNTRUSTED|INVALID_/);
 }
});

test('workflow stays read-only and executes trusted main rather than PR code',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const yaml=fs.readFileSync(path.join(__dirname,'../../.github/workflows/gamehub-provider-observer.yml'),'utf8');
 const lines=yaml.split(String.fromCharCode(10));
 assert.ok(lines.includes('  contents: read'));
 assert.ok(lines.includes('          ref: main'));
 assert.ok(lines.includes('          persist-credentials: false'));
 assert.ok(lines.includes('    branches: [main]'));
 assert.doesNotMatch(yaml,/contents: write|pull-requests: write|pull_request\.head|codex/i);
});
