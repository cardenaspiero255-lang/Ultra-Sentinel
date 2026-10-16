'use strict';
/**
 * Read-only first unblinding on three frozen *original GitHub PR diffs*.
 * Only PR metadata and Core rule/path/line identities leave this module.
 * No truth labels, legacy baseline or source bodies are consulted here.
 */
const {LOCK}=require('./c2-unseen-holdout.cjs');
const {loadGameHubPullRequest}=require('../orchestrator/gamehub-live-reader.cjs');
const CORE_BLOBS=Object.freeze({
 core:'db29f94be1e0afb791a241d26f449695df0eafd0',
 semantic:'b8b6e79c1c544a9c22ea5aa0ea857881a0e1b6d9'
});
const PRS=Object.freeze([205,206,208]);
const RULE=/^[A-Z][A-Z0-9_]{2,80}$/;
const PATH=/^[A-Za-z0-9_.\/-]{1,240}$/;
function fail(reason='UNVERIFIED_SOURCE'){throw Error('C2_UNSEEN_CORE_CAPTURE_BLOCKED'+(reason?'_'+reason:''));}
const LOADER_ERRORS=new Set(['INCOMPLETE_ANALYSIS','INCOMPLETE_GITHUB_EVIDENCE',
 'INCOMPLETE_PR_DIFF','INVALID_PR_FILE_PAGE','PR_FILES_MISMATCH','INVALID_GAMEHUB_SNAPSHOT',
 'UNVERIFIED_PINNED_SOURCE','GITHUB_API_UNAVAILABLE','GITHUB_RATE_LIMITED',
 'GITHUB_RESPONSE_TOO_LARGE','GITHUB_TOTAL_RESPONSE_TOO_LARGE','STALE_PR_SHA',
 'GITHUB_INVALID_JSON','GITHUB_INVALID_RESPONSE','GITHUB_TRANSPORT_UNAVAILABLE']);
function copyFindings(raw){
 if(!Array.isArray(raw)||raw.length>40)fail();
 const seen=new Set(),found=[];let nonPositional=0;
 for(const f of raw){
  if(!f||typeof f!=='object'||Array.isArray(f)||
   !RULE.test(f.rule||'')||typeof f.path!=='string'||!PATH.test(f.path)||
   f.path.startsWith('/')||f.path.split('/').includes('..')||
   !Number.isSafeInteger(f.line)||f.line<0||f.line>1000000||
   Object.hasOwn(f,'positive')||Object.hasOwn(f,'baseline')||
   Object.hasOwn(f,'label'))fail();
  if(f.line===0){nonPositional++;continue;}
  const id=JSON.stringify([f.rule,f.path,f.line]);
  if(seen.has(id))fail();
  seen.add(id);
  found.push(Object.freeze({rule:f.rule,path:f.path,line:f.line}));
 }
 return Object.freeze({findings:Object.freeze(found),nonPositional});
}
async function captureUnseenCoreHoldout({token,load=loadGameHubPullRequest,
 fetchImpl=globalThis.fetch}={}){
 if(typeof token!=='string'||token.length<8||token.length>2048||
  !/^[\x21-\x7e]+$/.test(token)||typeof load!=='function')fail();
 const samples=[];
 for(const pr of PRS){
  const pinned=LOCK.cases.find(c=>c.pr===pr);
  if(!pinned)fail();
  let review;
  try{review=await load(pr,{token,fetchImpl,hydrateSource:true});}
  catch(e){fail('PR'+pr+'_'+(LOADER_ERRORS.has(e?.message)?e.message:'UNVERIFIED_SOURCE'));}
  if(review?.report?.coverage?.partial===true)fail('PR'+pr+'_PARTIAL_COVERAGE');
  if(review?.report?.omitted>0)fail('PR'+pr+'_TRUNCATED_FINDINGS');
  if(!review||review.pr!==pr||review.state!==pinned.state||
   review.authenticated!==true||review.headStable!==true||
   review.completeDiff!==true||review.mergeAllowed!==false||
   review.changedFiles!==pinned.changedFiles||
   review.baseSha!==pinned.baseSha||
   review.envelope?.targetRepo!==LOCK.repository||
   review.envelope?.headSha!==pinned.headSha||
   review.report?.sha!==pinned.headSha||
   review.report?.verdict==='INCOMPLETE'||
   !review.report?.coverage||
   review.report.coverage.partial!==false||
   review.report.coverage.returned!==pinned.changedFiles||
   !Number.isSafeInteger(review.report.coverage.analyzed)||
   review.report.coverage.analyzed<0||
   review.report.coverage.analyzed>pinned.changedFiles||
   review.report.omitted!==0)fail('PR'+pr+'_INCOMPLETE_REVIEW');
  const summary=copyFindings(review.report.findings);
  samples.push(Object.freeze({pr,headSha:pinned.headSha,baseSha:pinned.baseSha,
   changedFiles:pinned.changedFiles,source:'AUTHENTICATED_IMMUTABLE_GITHUB_DIFF',
   partial:false,nonPositionalFindings:summary.nonPositional,
   findings:summary.findings}));
 }
 return Object.freeze({
  schema:'ultra-sentinel-c2-unseen-core-capture/v1',
  repository:LOCK.repository,modelSourceSha:LOCK.modelSourceSha,
  coreGitBlobs:CORE_BLOBS,sourceKind:'FROZEN_ORIGINAL_PR_DIFF',
  samples:Object.freeze(samples),
  candidateOnly:true,labelsRead:false,baselineRead:false,
  allSamplesComplete:true,globalPrecision:null,globalRecall:null,
  globalF1:null,fpNonRegressionVerified:false,tripleSPlusCertified:false,
  mergeAllowed:false,autoRepair:false
 });
}
module.exports={CORE_BLOBS,PRS,captureUnseenCoreHoldout};
