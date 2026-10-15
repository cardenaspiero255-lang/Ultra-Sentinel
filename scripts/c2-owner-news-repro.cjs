#!/usr/bin/env node
'use strict';
/** Isolated regression witness against original immutable GameHub #73 source. */
const {SOURCE,verifyPinnedSource} = require('./c2-owner-wikipedia-repro.cjs');
const {pathToFileURL}=require('node:url');
const QUERY='Ultra, noticias sobre inteligencia artificial';
const independent=[
 {title:'Avance IA A',url:'https://publisher-a.invalid/news-a',domain:'publisher-a.invalid',seendate:'20261015T120000Z'},
 {title:'Avance IA B',url:'https://publisher-b.invalid/news-b',domain:'publisher-b.invalid',seendate:'20261015T120000Z'}
];
const sameDomain=[
 {...independent[0]},
 {...independent[1],url:'https://publisher-a.invalid/news-b',domain:'publisher-a.invalid'}
];
const disguisedSameDomain=[
 {...independent[0]},
 {...independent[1],url:'https://publisher-a.invalid/news-b',domain:'publisher-b.invalid'}
];
function gdeltFixture(articles){
 return async input=>{
  const url=new URL(String(input));
  if(url.origin!=='https://api.gdeltproject.org'||
   url.pathname!=='/api/v2/doc/doc'||url.searchParams.get('mode')!=='ArtList')
   throw Error('UNEXPECTED_NEWS_REQUEST');
  return {ok:true,async json(){return {articles};}};
 };
}
async function evaluate(route,articles){
 return await route(QUERY,{fetcher:gdeltFixture(articles),env:()=>undefined},'','CURRENT_DATA');
}
async function inspectNewsDiversity(route){
 if(typeof route!=='function')throw Error('MISSING_REAL_SOURCE_ROUTER');
 const positive=await evaluate(route,independent);
 const negative=await evaluate(route,sameDomain);
 if(positive?.abstained===true||positive?.independentSourceCount!==2||
  negative?.abstained!==true)throw Error('NEWS_ORACLE_CONTROLS_FAILED');
 const attack=await evaluate(route,disguisedSameDomain);
 const mismatch=attack?.abstained!==true&&
  attack?.independentSourceCount===1&&
  typeof attack.displayText==='string'&&
  attack.displayText.startsWith('Noticias verificadas');
 return Object.freeze({
  schema:'ultra-sentinel-c2-owner-news-witness/v1',
  repository:SOURCE.repository,pr:SOURCE.pr,headSha:SOURCE.headSha,
  blobSha:SOURCE.blobSha,path:SOURCE.path,
  controls:Object.freeze({independentHostsAccepted:true,sameHostRejected:true}),
  candidateDefect:Object.freeze({
   rule:'NEWS_DOMAIN_DIVERSITY_INCONSISTENT',line:241,
   expected:'ABSTAIN_IF_DISTINCT_URL_HOSTS_LT_2',
   observed:mismatch?'VERIFIED_NEWS_WITH_ONE_URL_HOST':'NOT_OBSERVED',
   reproduced:mismatch}),
  sampleKind:'REAL_PINNED_SOURCE_WITH_DETERMINISTIC_FIXTURE',
  externalTruthCertified:false,independentHumanReview:false,
  precisionRecallComputed:false,tripleSPlusCertified:false,mergeAllowed:false
 });
}
async function main(){
 try{
  const file=process.argv[2];
  verifyPinnedSource(file);
  const source=await import(pathToFileURL(file).href);
  const report=await inspectNewsDiversity(source.routeResearchQuery);
  process.stdout.write(JSON.stringify(report)+'\n');
 }catch(error){
  const codes=new Set(['UNEXPECTED_NEWS_REQUEST','MISSING_REAL_SOURCE_ROUTER',
   'NEWS_ORACLE_CONTROLS_FAILED','ABSOLUTE_SOURCE_REQUIRED',
   'UNSAFE_SOURCE','PINNED_BLOB_MISMATCH']);
  process.stderr.write('C2_NEWS_ORACLE_BLOCKED: '+
   (codes.has(error?.message)?error.message:'UNVERIFIED_EXECUTION')+'\n');
  process.exitCode=2;
 }
}
if(require.main===module)main();
module.exports={QUERY,gdeltFixture,inspectNewsDiversity,independent,sameDomain,disguisedSameDomain};
