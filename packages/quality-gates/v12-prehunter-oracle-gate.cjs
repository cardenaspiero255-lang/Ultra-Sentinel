'use strict';
// V12 source-independent ordering gate. This module does NOT run Hunter,
// open a previous prediction, execute an oracle, or grant repair authority.
// The host adapter MUST derive git.isAncestor and file Git blob hashes from
// actual authenticated Git objects; never accept an external signed boolean.
const SHA=/^[a-f0-9]{40}$/;
const ENGINE='689583c23277807345edb715d8c2d277a3d4bda7';
const BLOB='430b4e928527b20fe305d63f3efb85909f1dfa06';
const fail=m=>{throw Error('V12_PREHUNTER_'+m);};
const LEAKAGE=/(?:^|_)(?:findings?|predictions?|expectedDefect|defectLabel|oracleResults?|truth|verdict|repair|groundTruth)(?:$|_)/i;
function forbidLabels(o){
 if(!o||typeof o!=='object')return;
 for(const [key,v] of Object.entries(o)){
  if(LEAKAGE.test(key)&&key!=='predictionsReadBeforeCommit')fail('FUNCTIONAL_LEAKAGE');
  if(v&&typeof v==='object')forbidLabels(v);
 }
}
function validateOracleBeforeHunter({freeze,exclusions,cohort,oracle,start,git}={}){
 if(!freeze||freeze.schema!=='ultra-sentinel-block26-v12-oracle-before-hunter/v1'||
  freeze.engineCommitSha!==ENGINE||freeze.engineBlobSha!==BLOB)
  fail('FROZEN_ENGINE');
 if(freeze.historicalExcludedRepositories!==185||freeze.historicalExcludedBlobs!==729||
  freeze.oracleBeforeHunterRequired!==true||
  freeze.oracleCannotSeeHunterPredictions!==true||
  freeze.noHunterRetune!==true||freeze.historicalCohortsNeverReused!==true||
  freeze.minIndependentRepositories!==2||freeze.minExpectedProbeableMethods!==3||
  freeze.initialMetadataQueried!==false||freeze.initialHunterExecuted!==false||
  freeze.initialOracleExecuted!==false||freeze.block26Closed!==false)
  fail('FROZEN_POLICY');
 if(!exclusions||!Array.isArray(exclusions.repositories)||exclusions.repositories.length!==185||
  !Array.isArray(exclusions.blobShas)||exclusions.blobShas.length!==729||
  new Set(exclusions.repositories.map(x=>x.toLowerCase())).size!==185||
  new Set(exclusions.blobShas).size!==729||
  exclusions.blobShas.some(x=>!SHA.test(x)))
  fail('EXCLUSIONS');
 const repoSet=new Set(exclusions.repositories.map(x=>x.toLowerCase()));
 const blobSet=new Set(exclusions.blobShas);
 if(!cohort||cohort.schema!=='ultra-sentinel-v12-prospective-original-cohort/v1'||
  !SHA.test(cohort.metadataCommitSha)||!Array.isArray(cohort.selected)||
  cohort.selected.length<2||cohort.selected.length>12||
  cohort.hunterExecuted!==false||cohort.oracleExecuted!==false||
  cohort.allSourceBodiesNew!==true)
  fail('COHORT');
 if(!oracle||oracle.schema!=='ultra-sentinel-v12-original-independent-oracle-precommit/v1'||
  !SHA.test(oracle.commitSha)||!SHA.test(oracle.blobSha)||
  !/^tests\/fixtures\/phase2-block26-v12\/oracle\/[A-Za-z0-9_-]+\.kt$/.test(oracle.path)||
  oracle.sourceReadOnly!==true||oracle.contractAuthenticated!==true||
  oracle.hunterExecutedBeforeCommit!==false||oracle.predictionsReadBeforeCommit!==false||
  oracle.oracleExecutedBeforeCommit!==false||oracle.oracleIndependentOfHunter!==true||
  oracle.noPredictionsMounted!==true||oracle.defectTruthUnrevealed!==true)
  fail('ORACLE_PRECOMMIT_MISSING');
 if(!start||!SHA.test(start.protocolCommitSha)||!SHA.test(start.hunterHeadCommitSha)||
  start.hunterRunStarted!==false||start.oracleExecutableMountedWithHunter!==false||
  !git||typeof git.isAncestor!=='function'||
  !SHA.test(git.committedOracleBlob)||!SHA.test(git.workingOracleBlob)||
  git.committedOracleBlob!==oracle.blobSha||git.workingOracleBlob!==oracle.blobSha)
  fail('UNAUTHENTICATED_ORACLE');
 // Enforce three distinct Git ancestry edges. Timestamps or attestations
 // supplied in the JSON are not a substitute for these Git checks.
 const order=[start.protocolCommitSha,cohort.metadataCommitSha,
  oracle.commitSha,start.hunterHeadCommitSha];
 if(new Set(order).size!==4||
  order.slice(0,3).some((sha,i)=>git.isAncestor(sha,order[i+1])!==true))
  fail('NOT_PROSPECTIVE');
 forbidLabels(cohort.selected);
 forbidLabels(oracle);
 const seenRepos=new Set(),seenBlobs=new Set();let methods=0,last=0;
 for(const item of cohort.selected){
  if(!item||!Number.isSafeInteger(item.rank)||item.rank<=last)
   fail('COHORT_RANK');
  last=item.rank;
  const source=item.source;
  if(!source||!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(source.repository||'')||
   !SHA.test(source.commitSha)||!SHA.test(source.treeSha)||
   !Array.isArray(source.files)||source.files.length<1||source.files.length>12)
   fail('SOURCE');
  const id=source.repository.toLowerCase();
  if(repoSet.has(id))fail('EXPOSED_REPOSITORY');
  if(seenRepos.has(id))fail('DUPLICATE_REPOSITORY');
  seenRepos.add(id);
  let bytes=0;
  for(const f of source.files){
   if(!f||!/^(?:src\/main\/)(?:[^/]+\/)*[^/]+\.kt$/.test(f.path)||
    !SHA.test(f.blobSha)||!Number.isSafeInteger(f.sizeBytes)||f.sizeBytes<1)
    fail('SOURCE');
   if(blobSet.has(f.blobSha))fail('EXPOSED_BLOB');
   if(seenBlobs.has(f.blobSha))fail('DUPLICATE_BLOB');
   seenBlobs.add(f.blobSha);bytes+=f.sizeBytes;
  }
  if(bytes!==source.totalBytes||bytes>196608)fail('SOURCE');
  if(!Number.isSafeInteger(item.staticProbeableMethods)||item.staticProbeableMethods<0||
   item.staticProbeableMethods>100)fail('STATIC_EVIDENCE');
  methods+=item.staticProbeableMethods;
 }
 if(methods<3||cohort.selected.filter(x=>x.staticProbeableMethods>0).length<2)
  fail('STATIC_QUORUM');
 return Object.freeze({
  schema:'ultra-sentinel-v12-oracle-before-hunter-admission/v1',
  permitFrozenHunterStart:true,selectedOriginalRepositories:seenRepos.size,
  expectedProbeableMethods:methods,frozenEngineCommitSha:ENGINE,
  oracleCommittedAt:oracle.commitSha,oracleExecuted:false,
  confirmedNewDefects:null,block26Closed:false,block27Allowed:false,
  originalPredictionsSealed:false,requiresIndependentAdjudication:true
 });
}
module.exports=Object.freeze({validateOracleBeforeHunter});
