'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createApiBudget,rateLimitedResponse}=require('../../packages/orchestrator/github-api-budget.cjs');
const sha='a'.repeat(40),p='/contents/app/src/main/Voice.kt?ref='+sha;
test('shared immutable reads dedupe concurrent work and enforce pinned SHA',async()=>{
 const b=createApiBudget({maxRequests:3});let calls=0;
 const work=()=>new Promise(resolve=>setImmediate(()=>resolve(++calls)));
 const [a,c]=await Promise.all([b.run(p,work,{immutable:true}),b.run(p,work,{immutable:true})]);
 assert.equal(a,1);assert.equal(c,1);assert.equal(calls,1);assert.equal(b.snapshot().cacheHits,1);
 await assert.rejects(b.run('/contents/app/src/main/Voice.kt?ref=main',work,{immutable:true}),/INVALID_API_REQUEST/);
});
test('volatile PR GET never uses cache or skips final SHA recheck',async()=>{
 const b=createApiBudget({maxRequests:2});let seq=0;
 assert.equal(await b.run('/pulls/163',()=>++seq),1);
 assert.equal(await b.run('/pulls/163',()=>++seq),2);
 await assert.rejects(b.run('/pulls/163',()=>++seq),/GITHUB_API_BUDGET_EXHAUSTED/);
 assert.equal(b.snapshot().used,2);
});
test('rate limit 429 and 403 exhausted are classified without revealing raw headers',()=>{
 const wrap=(status,remaining,retry)=>({status,headers:{get:n=>({
  'x-ratelimit-remaining':remaining,'retry-after':retry})[n]??null}});
 assert.equal(rateLimitedResponse(wrap(429,'17',null)),true);
 assert.equal(rateLimitedResponse(wrap(403,'0',null)),true);
 assert.equal(rateLimitedResponse(wrap(403,'1','60')),true);
 assert.equal(rateLimitedResponse(wrap(403,'1',null)),false);
 assert.equal(rateLimitedResponse(wrap(401,'0','60')),false);
});
test('rate-limit failure locks budget against new reads',async()=>{
 const b=createApiBudget();let count=0;
 await assert.rejects(b.run('/pulls/163',()=>{count++;throw Error('GITHUB_RATE_LIMITED');}),/GITHUB_RATE_LIMITED/);
 await assert.rejects(b.run('/pulls/163',()=>{count++;}),/GITHUB_RATE_LIMITED/);
 assert.equal(count,1);assert.equal(b.snapshot().blocked,true);
});
test('failed immutable fetch is never cached as verified data',async()=>{
 const b=createApiBudget();let count=0;
 await assert.rejects(b.run(p,()=>{count++;throw Error('GITHUB_API_UNAVAILABLE');},{immutable:true}),/GITHUB_API_UNAVAILABLE/);
 await b.run(p,()=>{count++;return 'fresh';},{immutable:true});
 assert.equal(count,2);
});
test('untrusted and mutable cache keys fail closed; snapshots contain no credentials',async()=>{
 const b=createApiBudget({maxRequests:1,maxMemoized:1});
 for(const path of ['/contents/foo?ref=main','/contents/../secrets?ref='+sha,
                    '/contents/a?ref='+sha+'#evil'])
  await assert.rejects(b.run(path,()=>1,{immutable:true}),/INVALID_API_REQUEST/);
 await b.run('/pulls/12',()=>1);
 assert.equal(b.snapshot().remaining,0);
 assert.equal(JSON.stringify(b.snapshot()).includes('token'),false);
});
