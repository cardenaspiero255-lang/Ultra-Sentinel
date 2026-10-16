'use strict';
/**
 * Frozen, TARGET-FILE-ONLY capture for real legacy Core.
 * The original Core cannot hydrate >160KB TS sources from #205/#206.
 * We must not change Core to score the pre-registered holdout.
 *
 * GitHub base...HEAD compare data, not mutable PR-files endpoint, is required:
 * PR #208 has a PR-files blob/patch different from its frozen HEAD source.
 * Never report whole-PR coverage, FP parity, or global 95% metrics.
 */
const {analyze:coreAnalyze}=require('../core/ultra_sentinel_core.cjs');
const {decodePinnedGithubSource}=require('../orchestrator/github-pinned-full-source.cjs');
const {LOCK}=require('./c2-unseen-holdout.cjs');
const {CORE_BLOBS}=require('./c2-unseen-core-capture.cjs');
const TARGETS=Object.freeze([
 {pr:205,path:'app/src/main/java/com/cardenaspiero255/gamehubultra/ai/UltraFrontierV2.kt',
  blobSha:'f0461cd51e00d2d7b2bc4225aeefee400e2e9fa4'},
 {pr:206,path:'app/src/main/java/com/cardenaspiero255/gamehubultra/voice/UltraSpeechChunker.kt',
  blobSha:'6ce74fb027c0d6e3fe6cfe48d3b0b5fc1ba2497a'},
 {pr:208,path:'app/src/main/java/com/cardenaspiero255/gamehubultra/voice/ContinuousVoiceController.kt',
  blobSha:'9298fe614e1ddbad27e2253c02e9415122cfa263'}
].map(x=>Object.freeze(x)));
const SHA=/^[0-9a-f]{40}$/;
const RULE=/^[A-Z][A-Z0-9_]{2,80}$/;
const PATH=/^[A-Za-z0-9_.\/-]{1,240}$/;
function fail(){throw Error('C2_TARGET_SOURCE_UNVERIFIED');}
function patchComplete(f){
 if(!f||typeof f.patch!=='string'||f.patch.length>320000||
  !f.patch.startsWith('@@ ')||!['added','modified'].includes(f.status)||
  !Number.isSafeInteger(f.additions)||f.additions<1||
  !Number.isSafeInteger(f.deletions)||f.deletions<0||
  !Number.isSafeInteger(f.changes)||f.changes!==f.additions+f.deletions)
  return false;
 let plus=0,minus=0,hunks=0,inside=false;
 for(const line of f.patch.split('\n')){
  if(/^@@ -\d+(?:,\d+)? \+\d+(?:,\d+)? @@/.test(line)){hunks++;inside=true;}
  else if(inside&&line.startsWith('+'))plus++;
  else if(inside&&line.startsWith('-'))minus++;
 }
 return hunks>0&&plus===f.additions&&minus===f.deletions;
}
function sanitizeReport(report,pinned){
 if(!report||report.sha!==pinned.headSha||report.coverage?.returned!==1||
  report.coverage.analyzed!==1||report.coverage.partial!==false||
  report.verdict==='INCOMPLETE'||report.omitted!==0||
  !Array.isArray(report.findings)||report.findings.length>40)fail();
 const seen=new Set(),found=[];let nonPositionalFindings=0;
 for(const f of report.findings){
  if(!f||!RULE.test(f.rule||'')||typeof f.path!=='string'||
   !PATH.test(f.path)||f.path.startsWith('/')||
   f.path.split('/').includes('..')||
   !Number.isSafeInteger(f.line)||f.line<0||f.line>1000000||
   Object.hasOwn(f,'positive')||Object.hasOwn(f,'baseline'))fail();
  if(f.line===0){nonPositionalFindings++;continue;}
  const key=JSON.stringify([f.rule,f.path,f.line]);
  if(seen.has(key))fail();seen.add(key);
  found.push(Object.freeze({rule:f.rule,path:f.path,line:f.line}));
 }
 return {nonPositionalFindings,findings:Object.freeze(found)};
}
function capturePinnedTargetDiffs({comparisons,contents}={},
 {decode=decodePinnedGithubSource,analyze=coreAnalyze}={}){
 if(!comparisons||!contents||typeof decode!=='function'||typeof analyze!=='function')
  fail();
 const samples=[];
 for(const t of TARGETS){
  const frozen=LOCK.cases.find(x=>x.pr===t.pr);
  const compare=comparisons[t.pr],source=contents[t.pr];
  if(!frozen||!compare||compare.status!=='ahead'||
   compare.base_commit?.sha!==frozen.baseSha||
   compare.merge_base_commit?.sha!==frozen.baseSha||
   !Array.isArray(compare.commits)||compare.commits.length<1||
   compare.commits.at(-1)?.sha!==frozen.headSha||
   !Array.isArray(compare.files)||compare.files.length!==frozen.changedFiles||
   !source||source.type!=='file'||source.path!==t.path||
   source.sha!==t.blobSha||source.encoding!=='base64')fail();
  const all=new Set();
  for(const file of compare.files){
   if(typeof file?.filename!=='string'||all.has(file.filename))fail();
   all.add(file.filename);
  }
  const picked=compare.files.filter(f=>f.filename===t.path);
  if(picked.length!==1||picked[0].sha!==t.blobSha||
   !patchComplete(picked[0]))fail();
  let fullSource;
  try{fullSource=decode(source,{path:t.path,blobSha:t.blobSha});}catch{fail();}
  if(typeof fullSource!=='string'||!fullSource||fullSource.length>160000)fail();
  const file=picked[0],input={
   filename:t.path,status:file.status,sha:file.sha,
   additions:file.additions,deletions:file.deletions,changes:file.changes,
   patch:file.patch,fullSource
  };
  let report;
  try{report=analyze([input],{sha:frozen.headSha});}catch{fail();}
  const summary=sanitizeReport(report,frozen);
  samples.push(Object.freeze({
   pr:t.pr,headSha:frozen.headSha,baseSha:frozen.baseSha,
   changedFiles:frozen.changedFiles,
   source:'VERIFIED_PINNED_GITHUB_COMPARE_TARGET',partial:false,
   nonPositionalFindings:summary.nonPositionalFindings,
   findings:summary.findings
  }));
 }
 return Object.freeze({
  schema:'ultra-sentinel-c2-unseen-core-capture/v1',
  repository:LOCK.repository,modelSourceSha:LOCK.modelSourceSha,
  coreGitBlobs:CORE_BLOBS,sourceKind:'FROZEN_TARGET_FILE_DIFF',
  wholePrCoverage:false,
  samples:Object.freeze(samples),
  candidateOnly:true,labelsRead:false,baselineRead:false,
  allSamplesComplete:true,globalPrecision:null,globalRecall:null,
  globalF1:null,fpNonRegressionVerified:false,tripleSPlusCertified:false,
  mergeAllowed:false,autoRepair:false
 });
}
module.exports={TARGETS,capturePinnedTargetDiffs};
