'use strict';
/*
 * Strict metadata-only lineage precommit for a single external original-source
 * pilot. Proves only limited SHA/repository non-identity, NOT causal/training
 * independence. Never permits candidate source unblinding or truth scoring.
 */
const {createHash}=require('node:crypto');
const {prepareIndependentOracleQuarantine}=require('./c2-independent-oracle-quarantine.cjs');
const {NEW_LOCK}=require('./c2-next-holdout.cjs');
const fail=()=>{throw Error('C2_EXTERNAL_LINEAGE_PILOT_BLOCKED');};
const hex40=/^[0-9a-f]{40}$/;
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const HIST_REPO='cardenaspiero255-lang/gamehub-ultra';
const DISCLOSED=new Set([
 HIST_REPO,'cardenaspiero255-lang/ultra-sentinel',
 'tasks/tasks','ankidroid/anki-android',
 'detekt/detekt','pinterest/ktlint','ktlint/ktlint',
 'gradleup/shadow','kotlin/kotlin-swe-bench'
]);
const PILOT=Object.freeze({
 repository:'nextcloud/talk-android',pr:6938,
 baseSha:'8dcc62a077802446b93108df5ff76a6a390be3d3',
 headSha:'26892c801d4e7fbd12fbef7dfb04e0e1ded71c34',
 createdAt:'2026-10-22T09:54:39Z'
});
function prepareSourceFreePilot(metadata){
 let locked;
 try{locked=prepareIndependentOracleQuarantine(metadata)}catch{fail()}
 if(!locked||locked.candidateCount!==4||
  locked.originalOraclesAttested!==0||locked.truthSealed!==false||
  locked.candidatePredictionsRead!==false||locked.sourceBlobsPinned!==true||
  NEW_LOCK.repository!==HIST_REPO||NEW_LOCK.cases.length!==8||
  !metadata||!Array.isArray(metadata.candidates))fail();
 const rows=metadata.candidates;
 const training=new Set();
 for(const c of NEW_LOCK.cases){
  if(!hex40.test(c.baseSha)||!hex40.test(c.headSha))fail();
  training.add(c.baseSha);training.add(c.headSha);
 }
 let shaOverlap=0,repoOverlap=0;
 for(const c of rows){
  if(training.has(c.headSha)||training.has(c.baseSha))shaOverlap++;
  if(DISCLOSED.has(c.repository.toLowerCase()))repoOverlap++;
 }
 if(shaOverlap||repoOverlap)fail();
 const selected=rows.find(x=>x.repository===PILOT.repository&&x.pr===PILOT.pr);
 if(!selected||Object.keys(PILOT).some(k=>PILOT[k]!==selected[k]))fail();
 const pilot=Object.freeze({...PILOT,preselectedFromOriginalFour:true});
 const commitment=hash({
  schema:'c2-source-free-external-original-pilot-commitment/v1',
  fourSelection:locked.selectionSha256,
  detectorSourceSha256:locked.detectorSourceSha256,
  selected:PILOT,
  knownDevCommitShas:[...training].sort(),
  excludedRepositories:[...DISCLOSED].sort()
 });
 return Object.freeze({
  schema:'c2-external-lineage-source-free-pilot/v1',
  status:'EXACT_IDENTITY_DISJOINT_CAUSAL_LINEAGE_UNATTESTED',
  pilot,originalCandidates:4,knownHistoricalDevelopmentPrs:8,
  historicalSourceIdentities:23,historical23AuthenticatedByThisModule:false,
  publishedKotlinCandidateIndependenceCertified:false,
  trainingCommitShaOverlap:shaOverlap,trainingRepositoryOverlap:repoOverlap,
  trainingSourceLineageCertified:false,causalFamilyExclusionCertified:false,
  sourceCodeReleasePermitted:false,originalSourceOraclesExecuted:0,
  candidateSourceRead:false,candidatePredictionsRead:false,
  baselinePredictionsRead:false,
  newGoldLabels:0,verifiedPositiveLabels:0,verifiedNegativeLabels:0,
  truthSealed:false,holdoutFrozen:false,
  precision:null,recall:null,f1:null,falsePositiveRate:null,
  sssPlusCertified:false,selectionSha256:locked.selectionSha256,
  commitmentSha256:commitment,
  blockingConditions:Object.freeze([
   'AUTHENTICATE_FULL_23_DEVELOPMENT_RECEIPTS_AND_SOURCE_LINEAGE',
   'RESOLVE_OR_EXPLICITLY_QUARANTINE_OVERLAPPING_CAUSAL_FAMILIES',
   'AUTHENTICATE_PUBLIC_KOTLIN_AND_TASKS_DEVELOPMENT_EXCLUSIONS',
   'INDEPENDENT_ORIGINAL_SOURCE_ORACLE_NOT_YET_RUN'
  ])
 });
}
module.exports={prepareSourceFreePilot};
