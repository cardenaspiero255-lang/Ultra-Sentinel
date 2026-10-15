'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {QUERY,inspectNewsDiversity}=require('../../scripts/c2-owner-news-repro.cjs');
const fakeRoute=async(query,deps)=>{
 assert.equal(query,QUERY);
 const response=await deps.fetcher('https://api.gdeltproject.org/api/v2/doc/doc?mode=ArtList');
 const articles=(await response.json()).articles;
 const reported=new Set(articles.map(x=>x.domain));
 if(reported.size<2)return {abstained:true};
 const urls=new Set(articles.map(x=>new URL(x.url).hostname));
 return {independentSourceCount:urls.size,displayText:'Noticias verificadas sobre el tema',
  authoritative:false};
};
test('news witness exposes actual-host diversity mismatch without certifying',async()=>{
 const r=await inspectNewsDiversity(fakeRoute);
 assert.equal(r.pr,73);
 assert.equal(r.candidateDefect.reproduced,true);
 assert.equal(r.candidateDefect.observed,'VERIFIED_NEWS_WITH_ONE_URL_HOST');
 assert.deepEqual(r.controls,{independentHostsAccepted:true,sameHostRejected:true});
 for(const k of ['externalTruthCertified','independentHumanReview',
  'precisionRecallComputed','tripleSPlusCertified','mergeAllowed'])
  assert.equal(r[k],false);
});
test('if source rejects spoofed domains, no defect is recorded',async()=>{
 const good=async(query,deps)=>{
  const r=await fakeRoute(query,deps);
  return r.independentSourceCount===1?{abstained:true}:r;
 };
 const r=await inspectNewsDiversity(good);
 assert.equal(r.candidateDefect.reproduced,false);
});
test('failed control and absent production route reject evidence',async()=>{
 await assert.rejects(inspectNewsDiversity(null),/MISSING_REAL_SOURCE_ROUTER/);
 await assert.rejects(inspectNewsDiversity(async()=>({abstained:false,independentSourceCount:3})),
  /NEWS_ORACLE_CONTROLS_FAILED/);
});
