'use strict';
/*
 * Adjudication is DEVELOPMENT ONLY: source mechanisms grouped provisionally
 * from real original Kotlin JVM interventions; never creates benchmark truth.
 */
const {createHash}=require('node:crypto');
const REPO='cardenaspiero255-lang/gamehub-ultra';
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fail=()=>{throw Error('C2_CAUSAL_EVIDENCE_OVERLAY_BLOCKED');};
const canonical=[
 [150,251,'NEGATIVE_ONLY_HISTORY_HIGH_CONFIDENCE','4c6912d7ca17df0669f8a0d9667f34d2f2b205a9','37866fd3dbfcd19d9daaf29a5e1e426391c723d4','app/src/main/java/com/cardenaspiero255/gamehubultra/domain/SmartRecommendationExplanation.kt','CONFIDENCE_POLICY'],
 [150,252,'ALL_AUTHORITATIVE_SOURCES_OPPOSE_RECOMMENDATION','4c6912d7ca17df0669f8a0d9667f34d2f2b205a9','37866fd3dbfcd19d9daaf29a5e1e426391c723d4','app/src/main/java/com/cardenaspiero255/gamehubultra/domain/SmartRecommendationExplanation.kt','CONFIDENCE_POLICY'],
 [151,264,'NONFINITE_THERMAL_HEADROOM_ACCEPTED','9ad983576c16c6c34d59283979d83c69ede50dce','adb11032b9b7f62f865228dfa1c27258ca3fa0df','app/src/main/java/com/cardenaspiero255/gamehubultra/domain/AiSessionCoach.kt','NONFINITE_NUMERIC_BOUNDARY'],
 [154,100,'QUADRATIC_DISCRIMINANT_NONFINITE_DOUBLE_UNHANDLED','858c9ce5cb6a7916d63f2348432013e49d02ba79','063787d48784fd9b579e2c9a4d5ad4bbd7ab9d7a','app/src/main/java/com/cardenaspiero255/gamehubultra/ai/UltraMathEngine.kt','NONFINITE_NUMERIC_BOUNDARY'],
 [155,12,'NONFINITE_HIGH_DRAIN_POLICY_THRESHOLD','2289f4e4cda55ddaa50f2016113ded82dc17203c','8696360219231f3f1477d5ad21c93bca2197e281','app/src/main/java/com/cardenaspiero255/gamehubultra/domain/BatteryAwareGamingEngine.kt','NONFINITE_NUMERIC_BOUNDARY']
];
function adjudicateHistoricalMechanismOverlay({ledger,campaign}={}){
 try{
  if(!ledger||ledger.schema!=='c2-historical-23-traceability-ledger/v1'||
   ledger.sourceRepository!==REPO||ledger.historicalIdentities!==23||
   ledger.positives!==11||ledger.negatives!==12||ledger.queueMatchedEmbeddedReceipts!==12||
   ledger.recoveredExternalReceiptLinks!==10||ledger.residualEmbeddedReceipts!==1||
   ledger.unresolvedCausalAssignments!==21||ledger.verifiedIndependentCausalFamilies!==0||
   ledger.newGoldLabels!==0||ledger.holdoutFrozen!==false||
   ledger.nextcloudSourceReleaseAuthorized!==false||
   !Array.isArray(ledger.entries)||ledger.entries.length!==23||
   !/^[a-f0-9]{64}$/.test(ledger.ledgerSha256)||ledger.ledgerSha256!==sha(ledger.entries))fail();
  if(!campaign||campaign.schema!=='c2-original-kotlin-real-causal-campaign/v1'||
   campaign.sourceRepository!==REPO||
   campaign.status!=='TEN_ORIGINAL_KOTLIN_EXECUTIONS_CAUSAL_EFFECTS_CONFIRMED_FAMILY_INDEPENDENCE_PENDING'||
   campaign.originalKotlinJvmVariantExecutions!==10||
   campaign.confirmedRepairLocalEffects!==5||
   campaign.ordinaryBenignControlFailures!==0||
   campaign.historicalRootCauseAssignmentsResolved!==0||
   campaign.historicalRootCauseAssignmentsStillPending!==21||
   campaign.externalGoldLabelsCreated!==0||
   campaign.nextcloudCandidateSourceReleased!==false||
   campaign.detectorPredictionsRead!==false||
   campaign.holdoutFrozen!==false||campaign.sssPlusCertified!==false||
   campaign.precision!==null||campaign.recall!==null||campaign.f1!==null||
   !Array.isArray(campaign.sourceCaseIdentities)||
   !Array.isArray(campaign.provisionalMechanismClusters)||
   campaign.provisionalMechanismClusters.length!==2)fail();
  const {receiptSha256,...rest}=campaign;
  if(!/^[a-f0-9]{64}$/.test(receiptSha256)||sha(rest)!==receiptSha256)fail();
  const expectedCaseIds=canonical.map(x=>x[0]+':'+x[1]);
  if(JSON.stringify(campaign.sourceCaseIdentities)!==JSON.stringify(expectedCaseIds))fail();
  const expectedClusters=[
   {id:'CONFIDENCE_POLICY',members:['150:251','150:252'],localRepairs:2,groupIndependenceCertified:false},
   {id:'NONFINITE_NUMERIC_BOUNDARY',members:['151:264','154:100','155:12'],localRepairs:3,groupIndependenceCertified:false}
  ];
  if(JSON.stringify(campaign.provisionalMechanismClusters)!==JSON.stringify(expectedClusters))fail();
  const seen=new Set();let originallyMissing=0;
  const full=ledger.entries.map(e=>{
   if(!e||e.eligibleForGold!==false||e.causalIndependenceCertified!==false||
    typeof e.identity!=='string'||
    e.identity!==JSON.stringify([e.pr,e.headSha,e.rule,e.path,e.line,e.positive])||
    seen.has(e.identity))fail();
   seen.add(e.identity);
   if(e.originalProvisionalRootCauseGroup==null)originallyMissing++;
   const candidate=canonical.find(x=>x[0]===e.pr&&x[1]===e.line);
   if(!candidate)return Object.freeze({...e,experimentalProvisionalMechanism:null,
    experimentalSourceEffectsConfirmed:0,causalIndependenceCertified:false});
   const [pr,line,rule,head,blob,path,group]=candidate;
   if(e.rule!==rule||e.headSha!==head||e.blobSha!==blob||e.path!==path||
    e.positive!==true||e.originalProvisionalRootCauseGroup!=null)fail();
   return Object.freeze({...e,experimentalProvisionalMechanism:group,
    experimentalSourceEffectsConfirmed:1,causalIndependenceCertified:false});
  });
  if(seen.size!==23||originallyMissing!==21||
   full.filter(x=>x.experimentalProvisionalMechanism!==null).length!==5)fail();
  const report={
   schema:'c2-historical-development-causal-evidence-overlay/v1',
   sourceRepository:REPO,sourceHistoricalLedgerSha256:ledger.ledgerSha256,
   sourceRealJVMReceiptSha256:campaign.receiptSha256,
   historicalIdentitiesPreserved:23,originalWithoutProvisionalMechanism:21,
   newProvisionalAssignmentsSupportedByExecutedJVM:5,
   remainingWithoutProvisionalMechanism:16,
   stillWithoutIndependentCausalCertification:21,
   independentCausalFamiliesCertified:0,externalGoldLabelsCreated:0,
   externalSourceReleasePermitted:false,detectorPredictionsRead:false,
   holdoutFrozen:false,precision:null,recall:null,f1:null,
   sssPlusCertified:false,
   entries:full,
   note:'Five originally ungrouped historical positives now carry two EXPERIMENTAL PROVISIONAL mechanism hypotheses; no certified cause or scoring admission. Sixteen remain without any provisional grouping and twenty-one still lack independent causal certification.'
  };
  return Object.freeze({...report,overlaySha256:sha(report)});
 }catch(e){if(e?.message==='C2_CAUSAL_EVIDENCE_OVERLAY_BLOCKED')throw e;fail();}
}
module.exports={adjudicateHistoricalMechanismOverlay};
