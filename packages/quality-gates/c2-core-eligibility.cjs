'use strict';
const crypto=require('node:crypto');
const {NEW_LOCK}=require('./c2-next-holdout.cjs');
const {BASELINE_LOCK}=require('./c2-source-universe.cjs');
const HEX40=/^[a-f0-9]{40}$/;
const HEX64=/^[a-f0-9]{64}$/;
const SAFE=/^[a-zA-Z0-9_.\/-]{1,350}$/;
const KEYS=['schema','repository','packetDigest','candidateSourceSha','legacyBaselineSha',
 'cases','changedFileEntries','sourceMetadataVerified','sourceBlobBytesMaterialized',
 'engineExecutionPerformed','truthLabelsAdded','benchmarkScoredLabels',
 'precision','recall','f1','tripleSPlusCertified','sourceInventorySha256'];
function fail(){throw Error('C2_CORE_ELIGIBILITY_BLOCKED');}
function exact(x,keys){return !!x&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));}
function eligibleForFrozenCore(file){
 // Verbatim predicate boundary from SHA-frozen Core blob db29f94be1e0afb791a241d26f449695df0eafd0.
 return /^(app\/src\/main\/|supabase\/functions\/|\.github\/(?:workflows|scripts)\/|control-center\/)/.test(file)
 && !/(\.md$|\/test\/|\/tests\/|Test\.(kt|java)$|\.(?:test|spec|benchmark)\.(?:cjs|mjs|js|ts|jsx|tsx)$|(?:^|\/)ultra_sentinel_benchmark\.cjs$)/i.test(file);
}
function auditCoreEligibility(input){
 if(!exact(input,KEYS)||input.schema!=='ultra-sentinel-c2-frozen-source-inventory/v1'||
 input.repository!==NEW_LOCK.repository||
 input.packetDigest!=='f5f2f66b31e5dc768c18be68bef29cbd0f97c8161fda212ce2ae1e64eb664b34'||
 input.candidateSourceSha!==NEW_LOCK.engineSourceSha||
 input.legacyBaselineSha!==BASELINE_LOCK.sha||
 input.changedFileEntries!==241||input.sourceMetadataVerified!==true||
 input.sourceBlobBytesMaterialized!==false||input.engineExecutionPerformed!==false||
 input.truthLabelsAdded!==0||input.benchmarkScoredLabels!==0||
 input.precision!==null||input.recall!==null||input.f1!==null||
 input.tripleSPlusCertified!==false||!HEX64.test(input.sourceInventorySha256)||
 !Array.isArray(input.cases)||input.cases.length!==8)fail();
 const {sourceInventorySha256,...body}=input;
 const calculated=crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');
 if(calculated!==sourceInventorySha256)fail();
 const eligibilityPerPr=[];let eligible=0,excluded=0;
 for(let i=0;i<NEW_LOCK.cases.length;i++){
  const lock=NEW_LOCK.cases[i],item=input.cases[i];
  if(!exact(item,['pr','baseSha','headSha','changedFiles','sourceFileMetadataCount','files'])||
   item.pr!==lock.pr||item.baseSha!==lock.baseSha||item.headSha!==lock.headSha||
   item.changedFiles!==lock.changedFiles||item.sourceFileMetadataCount!==lock.changedFiles||
   !Array.isArray(item.files)||item.files.length!==lock.changedFiles)fail();
  let yes=0,no=0;const seen=new Set();
  for(const f of item.files){
   if(!exact(f,['path','status','headBlobSha','additions','deletions','patchSha256','githubPatchBytes'])||
   typeof f.path!=='string'||!SAFE.test(f.path)||f.path.startsWith('/')||
   f.path.split('/').includes('..')||f.path.includes('//')||seen.has(f.path)||
   !['added','modified','removed'].includes(f.status)||
   !HEX40.test(f.headBlobSha)||!HEX64.test(f.patchSha256)||
   !Number.isSafeInteger(f.additions)||f.additions<0||
   !Number.isSafeInteger(f.deletions)||f.deletions<0||
   !Number.isSafeInteger(f.githubPatchBytes)||f.githubPatchBytes<=0)fail();
   seen.add(f.path);
   if(eligibleForFrozenCore(f.path))yes++;else no++;
  }
  eligible+=yes;excluded+=no;
  eligibilityPerPr.push(Object.freeze({pr:lock.pr,sourceInputFiles:item.files.length,
   frozenCoreEligibleUpperBound:yes,frozenCorePathExcluded:no}));
 }
 if(eligible+excluded!==241)fail();
 const output={
  schema:'ultra-sentinel-c2-frozen-core-eligibility-audit/v1',
  sourceInventorySha256,sourceRepository:NEW_LOCK.repository,
  candidateSourceSha:NEW_LOCK.engineSourceSha,baselineSourceSha:BASELINE_LOCK.sha,
  legacyBaselineCoreBlob:BASELINE_LOCK.coreBlob,
  totalInputFileEntries:241,coreProductionEligibleUpperBound:eligible,
  coreExcludedFileEntries:excluded,eligibilityPerPr,
  fullInputDelivery241Proven:true,
  fullCoreAnalysis241Proven:false,
  status:eligible<241?'BLOCKED_FROZEN_CORE_ANALYZED_COUNT':'NOT_ESTABLISHED_BY_PATH_ELIGIBILITY',
  detectorExecuted:false,benchmarkScoredLabels:0,
  precision:null,recall:null,f1:null,fpNonRegressionVerified:false,
  tripleSPlusCertified:false,
  limitation:'Frozen Core increments analyzed only for selected production files with added source lines; '
    +'separately delivered files cannot be counted as analyzed. This is an eligibility upper bound, '
    +'not verified per-file semantic coverage. No candidate, baseline or truth predictions inspected.'
 };
 return Object.freeze({...output,eligibilityAuditSha256:crypto.createHash('sha256')
  .update(JSON.stringify(output)).digest('hex')});
}
module.exports={auditCoreEligibility,eligibleForFrozenCore};
