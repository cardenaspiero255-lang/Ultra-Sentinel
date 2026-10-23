'use strict';
/**
 * Additional developer-only classifications from actual PR212 original JVM evidence.
 * No causal independence, truth-label, or detector prediction is inferred.
 */
const {createHash}=require('node:crypto');
const fail=()=>{throw Error('C2_PR212_OVERLAY_BLOCKED');};
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const SHA64=/^[a-f0-9]{64}$/;
const CASES=Object.freeze([
 {pr:158,line:114,rule:'ADVANCED_SIGNAL_TTL_REFRESH_EXTENSION',
  headSha:'9d8572afedc634ac07dae58a0da326ea62bdc1da',
  blobSha:'0d18a43a8e36ea3edacc2cad72071d96aa31626e',
  group:'ADVANCED_SIGNAL_TTL_REUSE'},
 {pr:158,line:144,rule:'CURRENT_COMPARISON_FRESHNESS_QUALIFIER_NOT_RESPECTED',
  headSha:'9d8572afedc634ac07dae58a0da326ea62bdc1da',
  blobSha:'0b5b315b2c5bb54d8c6a2713f3c7d29085209f4f',
  group:'CURRENT_QUERY_QUALIFIER'},
 {pr:152,line:110,rule:'JSON_SOURCE_ARRAY_EARLY_CLOSING_BRACKET',
  headSha:'104b7dc33e4c0341cec3fca81e3c8fbe3625357f',
  blobSha:'886c104effd553cd60f8222bfb05b8505fe7c4b8',
  group:'JSON_STRING_AWARE_BOUNDARY'},
 {pr:152,line:207,rule:'SUPPORTED_REFRESH_CANDIDATE_STARVED_BY_UNSUPPORTED_PLURALITY',
  headSha:'104b7dc33e4c0341cec3fca81e3c8fbe3625357f',
  blobSha:'549e3b1d619b83e59bc37b31b4860191c25528f1',
  group:'SUPPORTED_REFRESH_CANDIDATE'}
]);
const PAIRS=Object.freeze([
 ['ttl-thermal',['158:114','151:264']],
 ['query-confidence',['158:144','150:251']],
 ['json-confidence',['152:110','150:252']],
 ['refresh-battery',['152:207','155:12']]
]);
function overlayPr212OnHistorical({prior,cross}={}){
 try{
  if(!prior||prior.schema!=='c2-historical-development-causal-evidence-overlay/v1'||
   prior.sourceRepository!=='cardenaspiero255-lang/gamehub-ultra'||
   prior.historicalIdentitiesPreserved!==23||prior.originalWithoutProvisionalMechanism!==21||
   prior.newProvisionalAssignmentsSupportedByExecutedJVM!==5||
   prior.remainingWithoutProvisionalMechanism!==16||
   prior.stillWithoutIndependentCausalCertification!==21||
   prior.independentCausalFamiliesCertified!==0||
   prior.externalGoldLabelsCreated!==0||prior.externalSourceReleasePermitted!==false||
   prior.detectorPredictionsRead!==false||prior.holdoutFrozen!==false||
   prior.precision!==null||prior.recall!==null||prior.f1!==null||prior.sssPlusCertified!==false||
   !SHA64.test(prior.sourceHistoricalLedgerSha256)||!SHA64.test(prior.sourceRealJVMReceiptSha256)||
   !Array.isArray(prior.entries)||prior.entries.length!==23)fail();
  const {overlaySha256:previousHash,...before}=prior;
  if(!SHA64.test(previousHash)||hash(before)!==previousHash)fail();
  if(!cross||cross.schema!=='c2-four-direct-original-kotlin-causal-crosses/v1'||
   cross.status!=='FOUR_TRUE_SHARED_JVM_REPAIR_PAIRS_NONINTERFERING_LOCAL_NO_CAUSAL_FAMILY_INDEPENDENCE'||
   cross.originalSourcePairExperiments!==4||cross.realJointKotlinJvmExecutions!==16||
   cross.scopedNoninterferencePairs!==4||cross.benignControlsFailed!==0||
   cross.totalOriginalSourcePairs!==8||cross.unresolvedGlobalCausalIndependence!==true||
   cross.causalFamiliesIndependentlyCertified!==0||cross.historicalCausalAssignmentsCertifiedClosed!==0||
   cross.externalGoldLabelsCreated!==0||cross.externalCandidateSourceRead!==false||
   cross.detectorPredictionsRead!==false||cross.holdoutFrozen!==false||
   cross.precision!==null||cross.recall!==null||cross.f1!==null||cross.sssPlusCertified!==false||
   !Array.isArray(cross.sourceTrialSha256s)||cross.sourceTrialSha256s.length!==4||
   new Set(cross.sourceTrialSha256s).size!==4||
   cross.sourceTrialSha256s.some(s=>!SHA64.test(s))||
   !Array.isArray(cross.sourcePairResults)||cross.sourcePairResults.length!==4)fail();
  const {evidenceSha256,...crossWithoutHash}=cross;
  if(!SHA64.test(evidenceSha256)||hash(crossWithoutHash)!==evidenceSha256)fail();
  for(let i=0;i<4;i++){
   const actual=cross.sourcePairResults[i],expected=PAIRS[i];
   if(!actual||actual.suite!==expected[0]||
    JSON.stringify(actual.identities)!==JSON.stringify(expected[1])||
    actual.conclusion!=='FOUR_JOINT_JVMS_LOCAL_REPAIR_EFFECTS_ORTHOGONAL_GLOBAL_CAUSE_UNCERTIFIED')fail();
  }
  const visited=new Set();let positives=0,negatives=0,newProvisional=0,previousProvisional=0;
  const full=prior.entries.map(e=>{
   if(!e||typeof e.pr!=='number'||typeof e.line!=='number'||
    typeof e.identity!=='string'||visited.has(e.identity)||
    typeof e.positive!=='boolean'||e.eligibleForGold!==false||
    e.causalIndependenceCertified!==false)fail();
   visited.add(e.identity);
   if(e.positive)positives++;else negatives++;
   if(e.experimentalProvisionalMechanism!==null)previousProvisional++;
   const id=CASES.find(c=>c.pr===e.pr&&c.line===e.line);
   if(!id)return Object.freeze({...e,pr212ProvisionalMechanism:null,pr212SourceCrossEvidenceSha256:null});
   if(!e.positive||e.headSha!==id.headSha||e.blobSha!==id.blobSha||
    e.rule!==id.rule||e.experimentalProvisionalMechanism!==null||
    e.originalProvisionalRootCauseGroup!==null)fail();
   newProvisional++;
   return Object.freeze({...e,pr212ProvisionalMechanism:id.group,
    pr212SourceCrossEvidenceSha256:cross.sourceTrialSha256s[CASES.indexOf(id)],
    pr212CausalIndependenceCertified:false});
  });
  if(visited.size!==23||positives!==11||negatives!==12||
   newProvisional!==4||previousProvisional!==5||
   full.filter(x=>!x.experimentalProvisionalMechanism&&!x.pr212ProvisionalMechanism&&!x.originalProvisionalRootCauseGroup).length!==12)fail();
  const report={
   schema:'c2-pr212-integrated-historical-23-cross-overlay/v1',
   sourceRepository:'cardenaspiero255-lang/gamehub-ultra',
   sourcePreviousOverlaySha256:previousHash,sourcePr212OriginalKotlinEvidenceSha256:evidenceSha256,
   historicalIdentityCount:23,historicalPositives:11,historicalNegatives:12,
   previouslyUngrouped:16,previouslyExperimentallyGrouped:5,
   additionalExperimentallyGroupedPositives:4,remainingUngrouped:12,
   independentCausalAssignmentsStillPending:21,verifiedIndependentCausalFamilies:0,
   newOriginalKotlinJvmsExecutedByThisOverlay:0,
   originalSourceJointJvmsAuthenticatedThroughPr212:16,
   originalTruthLabelsReclassified:0,
   externalGoldLabelsCreated:0,scoredNegatives:0,
   candidateSourceRead:false,detectorPredictionsRead:false,
   externalSourceReleasePermitted:false,holdoutFrozen:false,
   precision:null,recall:null,f1:null,sssPlusCertified:false,
   entries:full,
   limit:'Four provisional mechanism labels are derived from scoped joint-JVM repair noninterference. They do NOT certify independent root causes, detector performance, external GOLD, or blind holdout.'
  };
  return Object.freeze({...report,overlaySha256:hash(report)});
 }catch(e){if(e?.message==='C2_PR212_OVERLAY_BLOCKED')throw e;fail();}
}
module.exports={overlayPr212OnHistorical};
