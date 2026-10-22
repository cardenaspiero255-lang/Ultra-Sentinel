'use strict';
/* GitHub native check-run metadata is evidence of upstream CI activity, NEVER
 * a source-level behavior oracle, causal truth or an independent negative.
 * The owner-only CI caller must pin and authenticate every GitHub API response.
 */
const {createHash}=require('node:crypto');
const {prepareIndependentOracleQuarantine}=require('./c2-independent-oracle-quarantine.cjs');
const HASH40=/^[a-f0-9]{40}$/;
const fail=()=>{throw Error('C2_UPSTREAM_ORIGINAL_CI_BLOCKED');};
const eq=(a,k)=>a!==null&&typeof a==='object'&&!Array.isArray(a)&&
 Object.keys(a).length===k.length&&k.every(x=>Object.hasOwn(a,x));
const conclusion=new Set(['success','failure','neutral','cancelled','skipped','timed_out',
 'action_required','stale','startup_failure',null]);
const status=new Set(['queued','in_progress','completed','waiting','pending','requested']);
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const STATUS_KEYS=['sha','checks','fetchComplete'];
const CHECK_KEYS=['id','name','headSha','status','conclusion','appSlug'];
const ROW_KEYS=['repository','pr','baseSha','headSha','observedPrBaseSha','observedPrHeadSha','base','head'];
const DOC_KEYS=['schema','selectionSha256','snapshots'];
function validateChecks(scope,expected){
 if(!eq(scope,STATUS_KEYS)||scope.sha!==expected||!HASH40.test(scope.sha)||
    scope.fetchComplete!==true||!Array.isArray(scope.checks)||
    scope.checks.length>2000)fail();
 const seen=new Set();
 let testNames=new Map(),nativeNames=new Map();
 let successes=0,errors=0,untested=0;
 const canon=[];
 for(const c of scope.checks){
  if(!eq(c,CHECK_KEYS)||!Number.isSafeInteger(c.id)||c.id<1||
     typeof c.name!=='string'||c.name.length<1||c.name.length>400||
     typeof c.appSlug!=='string'||!/^[a-z0-9][a-z0-9-]{0,100}$/.test(c.appSlug)||
     c.headSha!==expected||!status.has(c.status)||!conclusion.has(c.conclusion)||
     (c.status==='completed'&&c.conclusion===null)||
     (c.status!=='completed'&&c.conclusion!==null)||seen.has(c.id))fail();
  seen.add(c.id);
  const key=c.appSlug+'\u0000'+c.name;
  const isTest=/^(?:test(?:\b|[ (/-])|unit[ /-]?test\b|instrumentation[ /-]?test\b)/i.test(c.name);
  nativeNames.set(key,(nativeNames.get(key)||0)+1);
  if(isTest)testNames.set(key,(testNames.get(key)||0)+1);
  if(c.conclusion==='success')successes++;
  else if(c.conclusion==='skipped')untested++;
  else errors++;
  canon.push([c.id,c.name,c.headSha,c.status,c.conclusion,c.appSlug]);
 }
 canon.sort((a,b)=>a[0]-b[0]);
 return {count:canon.length,successes,errors,untested,nativeNames,testNames,canonical:canon};
}
function assessOriginalUpstreamCi(metadata,doc){
 let locked;
 try{locked=prepareIndependentOracleQuarantine(metadata)}catch{fail();}
 if(!eq(doc,DOC_KEYS)||doc.schema!=='c2-independent-upstream-source-ci-input/v1'||
    doc.selectionSha256!==locked.selectionSha256||
    !Array.isArray(doc.snapshots)||doc.snapshots.length!==4)fail();
 const slots=new Map(metadata.candidates.map(v=>[v.repository.toLowerCase()+'#'+v.pr,v]));
 const seen=new Set(),reports=[];
 let noHeadChecks=0,comparableNativeChecks=0,comparableTestChecks=0;
 let prHeadDriftCount=0,prBaseDriftCount=0;
 for(const v of doc.snapshots){
  if(!eq(v,ROW_KEYS)||typeof v.repository!=='string'||
     !Number.isSafeInteger(v.pr)||v.pr<1||
     !HASH40.test(v.baseSha)||!HASH40.test(v.headSha)||
     !HASH40.test(v.observedPrBaseSha)||!HASH40.test(v.observedPrHeadSha))fail();
  const key=v.repository.toLowerCase()+'#'+v.pr,expected=slots.get(key);
  if(!expected||seen.has(key)||v.repository!==expected.repository||
     v.baseSha!==expected.baseSha||v.headSha!==expected.headSha)fail();
  seen.add(key);
  if(v.observedPrHeadSha!==v.headSha)prHeadDriftCount++;
  if(v.observedPrBaseSha!==v.baseSha)prBaseDriftCount++;
  const base=validateChecks(v.base,v.baseSha);
  const head=validateChecks(v.head,v.headSha);
  const commonNative=[...head.nativeNames].filter(([name])=>base.nativeNames.has(name));
  const commonTest=[...head.testNames].filter(([name])=>base.testNames.has(name));
  if(head.count===0)noHeadChecks++;
  if(commonNative.length>0)comparableNativeChecks++;
  if(commonTest.length>0)comparableTestChecks++;
  let state='NO_COMPARABLE_CHECKS';
  if(head.count===0)state='NO_HEAD_CHECKS';
  else if(commonTest.length)state='TEST_CHECK_METADATA_COMPARABLE_NOT_BEHAVIOR';
  else if(commonNative.length)state='NON_TEST_CHECK_METADATA_COMPARABLE_NOT_BEHAVIOR';
  reports.push(Object.freeze({
   repository:v.repository,pr:v.pr,
   frozenBaseSha:v.baseSha,frozenHeadSha:v.headSha,
   observedLiveBaseSha:v.observedPrBaseSha,observedLiveHeadSha:v.observedPrHeadSha,
   headMovedSincePreselection:v.observedPrHeadSha!==v.headSha,
   baseMovedSincePreselection:v.observedPrBaseSha!==v.baseSha,
   baseCheckCount:base.count,headCheckCount:head.count,
   baseSuccessChecks:base.successes,headSuccessChecks:head.successes,
   headNonSuccessOrIncompleteChecks:head.errors,
   comparableNativeCheckNames:commonNative.length,
   comparableTestCheckNames:commonTest.length,
   checkReportStatus:state,
   sourceBehaviorOraclesExecutedByThisGate:0,
   candidateSourceRead:false,ruleScopeVerified:false,scored:false,
   receiptMetadataDigest:digest({base:base.canonical,head:head.canonical})
  }));
 }
 if(seen.size!==4)fail();
 reports.sort((a,b)=>(a.repository+'#'+a.pr).localeCompare(b.repository+'#'+b.pr));
 return Object.freeze({
  schema:'c2-four-upstream-native-ci-not-causal-receipts/v1',
  status:'UPSTREAM_CI_PROVENANCE_ONLY_ORIGINAL_CAUSAL_TRUTH_MISSING',
  selectionSha256:locked.selectionSha256,
  engineHeadSha:locked.engineHeadSha,
  detectorSourceSha256:locked.detectorSourceSha256,
  candidateSourceRead:false,candidatePredictionsRead:false,baselinePredictionsRead:false,
  gitHubApiAuthenticatedByThisModule:false,
  upstreamCiMetadataPairsAttestedByCaller:reports.length,
  candidates:reports.length,noHeadChecks,prHeadDriftCount,prBaseDriftCount,
  comparableNativeChecks,comparableTestChecks,
  nativeChecksAreCausalOracles:false,ciChecksSufficientForTruth:false,
  evidence:Object.freeze(reports),
  ciMetadataDigest:digest(reports),
  sourceCodeOrPatchesRead:false,
  causesOriginalBehaviorVerified:0,genuineDefectsVerified:0,
  independentBenignVerified:0,originalOraclesAttested:0,
  trainingSeparationAttested:false,baselineAuthenticated:false,
  truthSealed:false,holdoutFrozen:false,
  scoredTrueNegatives:0,scoredFalsePositives:0,newGoldLabels:0,
  precision:null,recall:null,f1:null,falsePositiveRate:null,sssPlusCertified:false
 });
}
module.exports={assessOriginalUpstreamCi};
