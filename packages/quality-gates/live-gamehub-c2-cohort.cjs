'use strict';
/**
 * Read-only, real GitHub C2 cohort acquisition.
 * This captures ONLY sanitized rule/path/line identities and check summaries.
 * It NEVER constructs truth labels or a legacy baseline, never reads secrets
 * from a PR and never declares equivalence or certification.
 */
const {loadGameHubPullRequest}=require('../orchestrator/gamehub-live-reader.cjs');
const {bindChecksToPr}=require('../orchestrator/check-pr-provenance.cjs');
const REPO='cardenaspiero255-lang/gamehub-ultra';
const ROOT='https://api.github.com/repos/'+REPO;
const PRS=Object.freeze([132,158,161,163]);
const SHA=/^[0-9a-f]{40}$/;
const RULE=/^[A-Z][A-Z0-9_]{2,80}$/;
const PATH=/^[A-Za-z0-9_.\/-]{1,240}$/;
const SAFE_CODES=new Set([
 'UNTRUSTED_PR_REPOSITORY','CROSS_PR_CHECK_CONTAMINATION',
 'INCOMPLETE_CHECK_PROVENANCE',
 'INVALID_PR_METADATA','INCOMPLETE_PR_DIFF','GITHUB_API_UNAVAILABLE',
 'GITHUB_INVALID_CONTENT_TYPE','GITHUB_RESPONSE_TOO_LARGE',
 'GITHUB_TOTAL_RESPONSE_TOO_LARGE','GITHUB_INVALID_JSON',
 'GITHUB_INVALID_RESPONSE','GITHUB_REDIRECT_REJECTED',
 'GITHUB_TRANSPORT_UNAVAILABLE','PR_FILES_MISMATCH',
 'PR_PAGINATION_UNBOUNDED','INVALID_PR_FILE_PAGE',
 'STALE_PR_SHA','INCOMPLETE_GITHUB_EVIDENCE','INCOMPLETE_ANALYSIS',
 'INVALID_GAMEHUB_SNAPSHOT','AUTHENTICATION_REQUIRED'
]);
function fail(code){throw Error(code);}
async function githubJson(suffix,token,fetchImpl){
 const url=ROOT+suffix;
 let response;
 try{response=await fetchImpl(url,{method:'GET',redirect:'error',
  signal:AbortSignal.timeout(15000),
  headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
   'X-GitHub-Api-Version':'2022-11-28','User-Agent':'Ultra-Sentinel-C2-ReadOnly'}});}
 catch{fail('GITHUB_TRANSPORT_UNAVAILABLE');}
 if(!response||response.status!==200||response.url&&response.url!==url)
  fail('GITHUB_API_UNAVAILABLE');
 if(!/application\/(?:json|vnd\.github\+json)/i.test(response.headers?.get?.('content-type')||''))
  fail('GITHUB_INVALID_CONTENT_TYPE');
 let body;
 try{body=await response.text();}catch{fail('GITHUB_INVALID_RESPONSE');}
 if(typeof body!=='string'||Buffer.byteLength(body,'utf8')>1024*1024)
  fail('GITHUB_RESPONSE_TOO_LARGE');
 try{return JSON.parse(body);}catch{fail('GITHUB_INVALID_JSON');}
}
function checksEvidence(body,sha){
 if(!body||!Number.isSafeInteger(body.total_count)||body.total_count<1||
  body.total_count>100||!Array.isArray(body.check_runs)||
  body.check_runs.length!==body.total_count)
  fail('INCOMPLETE_CHECKS');
 const seen=new Set();
 let success=0,failed=0,pending=0,skipped=0;
 for(const r of body.check_runs){
  if(!r||!Number.isSafeInteger(r.id)||r.id<1||seen.has(r.id)||
   r.head_sha!==sha||typeof r.name!=='string'||r.name.length>180||
   !['completed','queued','in_progress','waiting','requested','pending'].includes(r.status))
   fail('INCOMPLETE_CHECKS');
  seen.add(r.id);
  if(r.status!=='completed')pending++;
  else if(r.conclusion==='success')success++;
  else if(r.conclusion==='skipped'||r.conclusion==='neutral')skipped++;
  else failed++;
 }
 return Object.freeze({
  total:body.total_count,success,failed,pending,skipped,
  observedState:failed?'BLOCKED_SOURCE_CI':
   pending||skipped?'INCOMPLETE_SOURCE_CI':'OBSERVED_SUCCESS_UNATTESTED'
 });
}
function categorizeCoverageWarnings(warnings){
 if(!Array.isArray(warnings)||warnings.length>25)fail('INCOMPLETE_CANDIDATE_ANALYSIS');
 const summary={missingOrTruncatedPatch:0,fullSourceMismatch:0,
  unknownKotlinJavaContext:0,genericPartial:0,other:0};
 for(const raw of warnings){
  if(typeof raw!=='string'||raw.length>1024)fail('INCOMPLETE_CANDIDATE_ANALYSIS');
  if(raw.startsWith('Parche ausente o truncado:'))summary.missingOrTruncatedPatch++;
  else if(raw.startsWith('Archivo Kotlin/Java completo no coincide con el parche'))
   summary.fullSourceMismatch++;
  else if(raw.startsWith('Estado léxico Kotlin/Java previo al hunk desconocido'))
   summary.unknownKotlinJavaContext++;
  else if(raw.startsWith('Cobertura parcial:'))summary.genericPartial++;
  else summary.other++;
 }
 return Object.freeze(summary);
}
function findingsEvidence(report,head){
 if(!report||report.sha!==head||!report.coverage||
  !Array.isArray(report.findings)||report.findings.length>40||
  !Number.isSafeInteger(report.omitted)||report.omitted<0)
  fail('INCOMPLETE_CANDIDATE_ANALYSIS');
 const seen=new Set(),findings=[];
 let nonPositional=0;
 for(const finding of report.findings){
  if(!finding||!RULE.test(finding.rule||'')||
   !PATH.test(finding.path||'')||finding.path.startsWith('/')||
   finding.path.split('/').includes('..')||
   !Number.isSafeInteger(finding.line)||finding.line<0||
   finding.line>1000000)
   fail('INCOMPLETE_CANDIDATE_ANALYSIS');
  if(finding.line===0){nonPositional++;continue;}
  const key=JSON.stringify([finding.rule,finding.path,finding.line]);
  if(seen.has(key))fail('INCOMPLETE_CANDIDATE_ANALYSIS');
  seen.add(key);
  findings.push(Object.freeze({rule:finding.rule,
   path:finding.path,line:finding.line}));
 }
 return Object.freeze({
  coverage: Object.freeze({
   returned:report.coverage.returned,analyzed:report.coverage.analyzed,
   partial:report.coverage.partial||report.omitted>0||
    nonPositional>0||report.verdict==='INCOMPLETE',
   omitted:report.omitted,nonPositional,
   warningKinds:categorizeCoverageWarnings(report.warnings||[])
  }),
  findings:Object.freeze(findings)
 });
}
async function observeOne(pr,{token,fetchImpl,load}){
 const review=await load(pr,{token,fetchImpl,hydrateSource:true});
 if(review?.state!=='open'||review.authenticated!==true||
  review.headStable!==true||review.completeDiff!==true||
  review.mergeAllowed!==false||review.envelope?.targetRepo!==REPO||
  !SHA.test(review.envelope.headSha||'')||!SHA.test(review.baseSha||'')||
  review.pr!==pr)fail('INVALID_LIVE_REVIEW');
 const head=review.envelope.headSha,base=review.baseSha;
 const candidate=findingsEvidence(review.report,head);
 const rawChecks=await githubJson('/commits/'+head+'/check-runs?per_page=100&page=1',
  token,fetchImpl);
 // SHA equality alone is not provenance: the same commit can be attached
 // to another pull request. Reuse the existing strict check-to-PR binder,
 // which verifies the PR number, HEAD/base SHA and both GitHub repo URLs.
 // Reject missing associations rather than interpreting unbound green CI
 // as proof of this particular PR's health.
 bindChecksToPr({headSha:head,baseSha:base,pr,raw:rawChecks});
 const checks=checksEvidence(rawChecks,head);
 const latest=await githubJson('/pulls/'+pr,token,fetchImpl);
 if(latest?.number!==pr||latest.state!=='open'||
  latest.head?.sha!==head||latest.base?.sha!==base||
  latest.changed_files!==review.changedFiles)
  fail('STALE_PR_SHA');
 // A legitimate-looking PR number and HEAD are not enough: ensure the
 // actual public GitHub repo ID and owner are pinned at the final read.
 // Fail closed on a fork, rename or repository-owner identity mismatch.
 if(latest.base?.repo?.id!==1375408706||
  latest.base.repo.full_name!==REPO||
  latest.base.repo.owner?.id!==322222186||
  latest.head?.repo?.id!==1375408706||
  latest.head.repo.full_name!==REPO||
  latest.head.repo.owner?.id!==322222186)
  fail('UNTRUSTED_PR_REPOSITORY');
 return Object.freeze({
  pr,repository:REPO,headSha:head,baseSha:base,
  changedFiles:review.changedFiles,draft:review.draft===true,
  readerStatus:'AUTHENTICATED_SOURCE_DIFF',
  candidateVerdict:review.report.verdict,
  candidate,checks,
  baselineFindingsCollected:false,independentLabelsCollected:false,
  semanticParityCertified:false
 });
}
async function captureLiveC2Cohort({token,fetchImpl=globalThis.fetch,
 load=loadGameHubPullRequest}={}){
 if(typeof token!=='string'||token.length<8||token.length>2048||
  !/^[\x21-\x7e]+$/.test(token)||typeof fetchImpl!=='function'||
  typeof load!=='function')
  fail('AUTHENTICATION_REQUIRED');
 const samples=[];
 for(const pr of PRS){
  try{
   const result=await observeOne(pr,{token,fetchImpl,load});
   samples.push(result);
  }catch(error){
   const reason=SAFE_CODES.has(error?.message)?error.message:
    error?.message==='INCOMPLETE_CHECKS'?'INCOMPLETE_CHECKS':
    error?.message==='INCOMPLETE_CANDIDATE_ANALYSIS'?'INCOMPLETE_CANDIDATE_ANALYSIS':
    error?.message==='INVALID_LIVE_REVIEW'?'INVALID_LIVE_REVIEW':
    'UNVERIFIED_SOURCE_EVIDENCE';
   samples.push(Object.freeze({pr,repository:REPO,
    status:'BLOCKED_INCOMPLETE_OR_STALE',reason,
    candidateFindingsCollected:false,
    baselineFindingsCollected:false,independentLabelsCollected:false}));
  }
 }
 const incomplete=samples.some(s=>s.status==='BLOCKED_INCOMPLETE_OR_STALE'||
  s.candidate.coverage.partial||s.checks.observedState!=='OBSERVED_SUCCESS_UNATTESTED');
 return Object.freeze({schema:'ultra-sentinel-c2-live-cohort/v1',
  repository:REPO,prs:PRS,samples:Object.freeze(samples),
  captureStatus:incomplete?'INCOMPLETE_NOT_CERTIFIABLE':'CANDIDATE_SNAPSHOT_ONLY',
  independentLabelsVerified:false,baselineComparable:false,
  sourceChecksIndependentlyCertified:false,
  tripleSPlusCertified:false,autoCommit:false,autoMerge:false,
  note:'Live SHA and sanitized candidate findings observed. Missing prior reviewer findings and independently frozen truth labels; observed check summaries do not certify all required protections.'
 });
}
module.exports={captureLiveC2Cohort,findingsEvidence,checksEvidence,categorizeCoverageWarnings,PRS};
