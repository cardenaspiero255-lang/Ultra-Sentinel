'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {bindChecksToPr}=require('../../packages/orchestrator/check-pr-provenance.cjs');
const REPO='https://api.github.com/repos/cardenaspiero255-lang/gamehub-ultra';
const head='a'.repeat(40),base='b'.repeat(40),pr=201;
const check=(n=201,sha=head,b=base)=>({id:123,name:'Sentinel Core / full regression suite',
 status:'completed',conclusion:'success',head_sha:head,
 pull_requests:[{number:n,head:{sha,repo:{url:REPO}},
 base:{sha:b,repo:{url:REPO}}}]});
const args=x=>({headSha:head,baseSha:base,pr,raw:{total_count:1,check_runs:[x]}});
test('exact PR, SHA and repository identity required before using commit checks',()=>{
 const result=bindChecksToPr(args(check()));
 assert.equal(result.pr,pr);assert.equal(result.headSha,head);
 assert.equal(result.baseSha,base);assert.equal(result.runs.length,1);
});
test('checks from a different PR sharing the same commit SHA cannot contaminate',()=>{
 assert.throws(()=>bindChecksToPr(args(check(200))),/CROSS_PR_CHECK_CONTAMINATION/);
 assert.throws(()=>bindChecksToPr(args(check(201,'c'.repeat(40)))),/CROSS_PR_CHECK_CONTAMINATION/);
 assert.throws(()=>bindChecksToPr(args(check(201,head,'d'.repeat(40)))),/CROSS_PR_CHECK_CONTAMINATION/);
 assert.throws(()=>bindChecksToPr(args({...check(),pull_requests:[]})),/CROSS_PR_CHECK_CONTAMINATION/);
});
test('unknown identity or truncated check pages fail closed',()=>{
 const spoof=check();spoof.pull_requests[0].base.repo.url='https://api.github.com/repos/fork/copy';
 assert.throws(()=>bindChecksToPr(args(spoof)),/CROSS_PR_CHECK_CONTAMINATION/);
 assert.throws(()=>bindChecksToPr({...args(check()),raw:{total_count:2,check_runs:[check()]}}),/INCOMPLETE_CHECK_PROVENANCE/);
 assert.throws(()=>bindChecksToPr(args({...check(),head_sha:'c'.repeat(40)})),/INCOMPLETE_CHECK_PROVENANCE/);
});
test('duplicate check IDs cannot inflate success',()=>{
 const one=check(),two={...check(),name:'Ultra Sentinel Core — own reviewer'};
 assert.throws(()=>bindChecksToPr({...args(one),raw:{total_count:2,check_runs:[one,two]}}),/INCOMPLETE_CHECK_PROVENANCE/);
});
