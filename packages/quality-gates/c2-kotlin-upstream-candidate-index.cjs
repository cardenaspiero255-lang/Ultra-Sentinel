'use strict';
/**
 * Read-only metadata snapshot of a 106-task upstream Kotlin benchmark at one
 * immutable Git SHA. THIS IS NOT A TRUTH DATASET OR A BLIND HOLDOUT.
 */
const crypto=require('node:crypto');
const UPSTREAM=Object.freeze({
 repository:'Kotlin/kotlin-swe-bench',
 commit:'b9025d86f7ae634901396766bd61f6d4ae6d2165',
 benchmarkLicense:'Apache-2.0'
});
const PROJECTS=Object.freeze({
 'pinterest_ktlint':Object.freeze({repository:'pinterest/ktlint',tasks:43,reportedLicense:'MIT'}),
 'detekt_detekt':Object.freeze({repository:'detekt/detekt',tasks:28,reportedLicense:'Apache-2.0'}),
 'oss-review-toolkit_ort':Object.freeze({repository:'oss-review-toolkit/ort',tasks:12,reportedLicense:'Apache-2.0'}),
 'Hannah-Sten_TeXiFy-IDEA':Object.freeze({repository:'Hannah-Sten/TeXiFy-IDEA',tasks:8,reportedLicense:'MIT'}),
 'ankidroid_Anki-Android':Object.freeze({repository:'ankidroid/Anki-Android',tasks:6,reportedLicense:'GPL-3.0'}),
 'Kotlin_dataframe':Object.freeze({repository:'Kotlin/dataframe',tasks:5,reportedLicense:'Apache-2.0'}),
 'square_okhttp':Object.freeze({repository:'square/okhttp',tasks:2,reportedLicense:'Apache-2.0'}),
 'GradleUp_shadow':Object.freeze({repository:'GradleUp/shadow',tasks:1,reportedLicense:'Apache-2.0'}),
 'linreal_cascade-editor':Object.freeze({repository:'linreal/cascade-editor',tasks:1,reportedLicense:'MIT'})
});
const SHA=/^[0-9a-f]{40}$/;
function sha256(x){return crypto.createHash('sha256').update(x).digest('hex');}
function fail(){throw Error('C2_UPSTREAM_BENCHMARK_CANDIDATES_BLOCKED');}
function metadataOnlyCandidateIndex(raw){
 if(!Buffer.isBuffer(raw)||raw.length<2000||raw.length>1024*1024)fail();
 let items;
 try{items=JSON.parse(raw.toString('utf8'));}catch{fail();}
 if(!Array.isArray(items)||items.length!==106)fail();
 const names=new Set(),sha=new Set(),counts=new Map();
 const candidates=[];
 for(const item of items){
  if(!item||typeof item!=='object'||Array.isArray(item)||
   item.type!=='dir'||typeof item.name!=='string'||
   typeof item.path!=='string'||!SHA.test(item.sha)||
   item.path!=='tasks/'+item.name||
   !/^[A-Za-z0-9_-]+-[1-9][0-9]{0,7}$/.test(item.name)||
   names.has(item.name)||sha.has(item.sha)||item._links?.git===null)fail();
  // Only the exact explicitly enumerated original upstream repositories qualify.
  const found=Object.keys(PROJECTS).find(prefix=>item.name.startsWith(prefix+'-'));
  if(!found||!/^[1-9][0-9]*$/.test(item.name.slice(found.length+1)))fail();
  names.add(item.name);sha.add(item.sha);
  counts.set(found,(counts.get(found)||0)+1);
  candidates.push({
   upstreamTask:item.name,
   upstreamTreeSha:item.sha,
   upstreamRepo:PROJECTS[found].repository,
   originalProjectLicenseReported:PROJECTS[found].reportedLicense,
   upstreamPrNumber:Number(item.name.slice(found.length+1)),
   status:'UPSTREAM_TASK_CANDIDATE_NOT_A_LABEL',
   originalSourceVerified:false,failPassReproduced:false,
   rootCauseIndependent:null,upstreamLicenseVerified:false,
   applicableDetectorRulesVerified:false
  });
 }
 if(names.size!==106||sha.size!==106||counts.size!==9)fail();
 for(const [key,config] of Object.entries(PROJECTS)){
  if(counts.get(key)!==config.tasks)fail();
 }
 candidates.sort((a,b)=>a.upstreamTask.localeCompare(b.upstreamTask,'en'));
 const perRepository=Object.keys(PROJECTS).sort().map(prefix=>({
  repository:PROJECTS[prefix].repository,
  taskCandidates:counts.get(prefix),
  upstreamLicenseReported:PROJECTS[prefix].reportedLicense,
  licenseRecheckRequired:true
 }));
 const packet={
  schema:'ultra-sentinel-c2-external-kotlin-source-candidates/v1',
  sourceRepository:UPSTREAM.repository,sourceCommit:UPSTREAM.commit,
  originalDirectoryListingSha256:sha256(raw),
  upstreamBenchmarkLicense:UPSTREAM.benchmarkLicense,
  repositoryCount:9,candidateCount:106,
  perRepository,candidates,
  groundTruthSourceLabels:0,
  newPositiveLabels:0,newNegativeLabels:0,
  benchmarkScoredLabels:0,
  candidatePredictionsRead:false,baselinePredictionsRead:false,
  priorHistoricalLabelsUnchanged:true,
  sourceBehaviorExecuted:false,blindHoldout:false,
  precision:null,recall:null,f1:null,
  canCertify:false,tripleSPlusCertified:false,
  status:'METADATA_ONLY_106_CANDIDATES_UNVERIFIED',
  limitation:'Read-only immutable 106-task directory roster; human-authored gold patches and regression suites have NOT been run or independently validated; tasks are NOT necessarily detector findings, distinct root causes, or blind holdout. All upstream per-project licenses and applicability must be rechecked.'
 };
 return Object.freeze({...packet,indexSha256:sha256(JSON.stringify(packet))});
}
module.exports={UPSTREAM,PROJECTS,metadataOnlyCandidateIndex};
