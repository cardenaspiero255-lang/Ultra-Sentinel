#!/usr/bin/env node
'use strict';
/**
 * Owner-only, reproducible C2 witness. Runs original PR #73 source at a
 * pinned Git blob in a Node permission sandbox. Does not infer external truth.
 * Network responses in the actual experiment are fully deterministic fixtures.
 */
const fs=require('node:fs');
const crypto=require('node:crypto');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const SOURCE=Object.freeze({
 repository:'cardenaspiero255-lang/gamehub-ultra',
 pr:73,
 headSha:'194908b7dfa9d882afbc4d7eeaa3781b3e84e9e8',
 blobSha:'b54e76f263b818597186530f31e44e1060d7f49d',
 path:'supabase/functions/ultra-research/research.ts'
});
function gitBlobSha(bytes){
 if(!Buffer.isBuffer(bytes))throw Error('INVALID_SOURCE_BYTES');
 return crypto.createHash('sha1')
  .update(Buffer.from('blob '+bytes.length+'\0','utf8'))
  .update(bytes).digest('hex');
}
function verifyPinnedSource(filename){
 if(typeof filename!=='string'||!path.isAbsolute(filename))
  throw Error('ABSOLUTE_SOURCE_REQUIRED');
 const stat=fs.lstatSync(filename);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||
  stat.size<1000||stat.size>64000)throw Error('UNSAFE_SOURCE');
 const bytes=fs.readFileSync(filename);
 if(gitBlobSha(bytes)!==SOURCE.blobSha)throw Error('PINNED_BLOB_MISMATCH');
 return true;
}
const QUESTION='Ultra, ¿por qué el cielo es azul?';
const RELEVANT=Object.freeze({
 title:'Dispersión de Rayleigh',
 extract:'La dispersión de Rayleigh explica por qué el cielo aparece azul: '+
 'las moléculas de la atmósfera dispersan la luz de longitud de onda corta '+
 'con más intensidad que la luz roja, produciendo el tono azul visible.'
});
const UNRELATED=Object.freeze({
 title:'Cielo azul (álbum de estudio)',
 extract:'Cielo azul es un álbum de estudio musical publicado por un grupo de '+
 'intérpretes. El disco incluye canciones originales, créditos de producción, '+
 'instrumentación, fechas de conciertos y reseñas de su lanzamiento.'
});
const OTHER=Object.freeze({
 title:'Historia de la alfarería',
 extract:'La alfarería es el oficio de fabricar objetos de cerámica mediante '+
 'el modelado de arcilla y su cocción. Este artículo detalla las técnicas '+
 'artesanales y las tradiciones culturales a través de los siglos.'
});
function fixtureFetcher(page){
 return async input=>{
  const url=new URL(String(input));
  if(!['es.wikipedia.org','en.wikipedia.org'].includes(url.hostname)||
   url.pathname!=='/w/api.php'||url.searchParams.get('generator')!=='search')
   throw Error('UNEXPECTED_SOURCE_REQUEST');
  return {
   ok:true,
   async json(){return {query:{pages:{'123':{
    index:1,title:page.title,extract:page.extract,
    fullurl:'https://es.wikipedia.org/wiki/Referencia_de_prueba'
   }}}};}
  };
 };
}
async function ask(route,page){
 return await route(QUESTION,{fetcher:fixtureFetcher(page),
  env:()=>undefined},'','GENERAL_KNOWLEDGE');
}
async function inspectWikipediaReference(route){
 if(typeof route!=='function')throw Error('MISSING_ACTUAL_QUERY_ROUTER');
 const valid=await ask(route,RELEVANT);
 const other=await ask(route,OTHER);
 if(valid?.abstained===true||valid?.trustedReference!==true||
  other?.abstained!==true)throw Error('ORACLE_CONTROLS_FAILED');
 const unrelated=await ask(route,UNRELATED);
 const trustedWithoutRelevance=unrelated?.abstained!==true&&
  unrelated?.trustedReference===true;
 return Object.freeze({
  schema:'ultra-sentinel-c2-owner-witness/v1',
  repository:SOURCE.repository,pr:SOURCE.pr,headSha:SOURCE.headSha,
  blobSha:SOURCE.blobSha,path:SOURCE.path,
  controls:Object.freeze({relevantAccepted:true,unrelatedTopicRejected:true}),
  candidateDefect:Object.freeze({
   rule:'REFERENCE_TOPIC_MISMATCH',line:779,
   expected:'ABSTAIN_ON_UNRELATED_ARTICLE',
   observed:trustedWithoutRelevance?'UNRELATED_ARTICLE_MARKED_TRUSTED':
    'UNRELATED_ARTICLE_NOT_TRUSTED',
   reproduced:trustedWithoutRelevance
  }),
  sampleKind:'REAL_PINNED_SOURCE_WITH_DETERMINISTIC_FIXTURE',
  independentHumanReview:false,externalTruthCertified:false,
  precisionRecallComputed:false,tripleSPlusCertified:false,
  mergeAllowed:false
 });
}
async function main(){
 try{
  const filename=process.argv[2];
  verifyPinnedSource(filename);
  const mod=await import(pathToFileURL(filename).href);
  const result=await inspectWikipediaReference(mod.routeResearchQuery);
  process.stdout.write(JSON.stringify(result)+'\n');
 }catch(error){
  const allow=new Set(['ABSOLUTE_SOURCE_REQUIRED','UNSAFE_SOURCE',
   'PINNED_BLOB_MISMATCH','MISSING_ACTUAL_QUERY_ROUTER',
   'ORACLE_CONTROLS_FAILED','UNEXPECTED_SOURCE_REQUEST']);
  process.stderr.write('C2_OWNER_ORACLE_BLOCKED: '+
   (allow.has(error?.message)?error.message:'UNVERIFIED_EXECUTION')+'\n');
  process.exitCode=2;
 }
}
if(require.main===module)main();
module.exports={SOURCE,gitBlobSha,verifyPinnedSource,
 inspectWikipediaReference,fixtureFetcher,QUESTION,RELEVANT,UNRELATED,OTHER};
