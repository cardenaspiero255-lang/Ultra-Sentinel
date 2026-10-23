'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {adjudicateHistoricalMechanismOverlay}=require('../../packages/quality-gates/c2-causal-evidence-overlay.cjs');
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const source=[
 [150,251,'NEGATIVE_ONLY_HISTORY_HIGH_CONFIDENCE','4c6912d7ca17df0669f8a0d9667f34d2f2b205a9','37866fd3dbfcd19d9daaf29a5e1e426391c723d4','app/src/main/java/com/cardenaspiero255/gamehubultra/domain/SmartRecommendationExplanation.kt'],
 [150,252,'ALL_AUTHORITATIVE_SOURCES_OPPOSE_RECOMMENDATION','4c6912d7ca17df0669f8a0d9667f34d2f2b205a9','37866fd3dbfcd19d9daaf29a5e1e426391c723d4','app/src/main/java/com/cardenaspiero255/gamehubultra/domain/SmartRecommendationExplanation.kt'],
 [151,264,'NONFINITE_THERMAL_HEADROOM_ACCEPTED','9ad983576c16c6c34d59283979d83c69ede50dce','adb11032b9b7f62f865228dfa1c27258ca3fa0df','app/src/main/java/com/cardenaspiero255/gamehubultra/domain/AiSessionCoach.kt'],
 [154,100,'QUADRATIC_DISCRIMINANT_NONFINITE_DOUBLE_UNHANDLED','858c9ce5cb6a7916d63f2348432013e49d02ba79','063787d48784fd9b579e2c9a4d5ad4bbd7ab9d7a','app/src/main/java/com/cardenaspiero255/gamehubultra/ai/UltraMathEngine.kt'],
 [155,12,'NONFINITE_HIGH_DRAIN_POLICY_THRESHOLD','2289f4e4cda55ddaa50f2016113ded82dc17203c','8696360219231f3f1477d5ad21c93bca2197e281','app/src/main/java/com/cardenaspiero255/gamehubultra/domain/BatteryAwareGamingEngine.kt']
];
function fixture(){
 const entries=source.map(([pr,line,rule,headSha,blobSha,path])=>({
  pr,line,rule,headSha,blobSha,path,positive:true,
  identity:JSON.stringify([pr,headSha,rule,path,line,true]),
  originalProvisionalRootCauseGroup:null,eligibleForGold:false,
  causalIndependenceCertified:false
 }));
 for(let i=0;i<18;i++){
  const pr=200+i,headSha=(400+i).toString(16).padStart(40,'0'),
   blobSha=(500+i).toString(16).padStart(40,'0'),path='app/source'+i+'.kt',
   rule='HISTORICAL_'+i,line=20+i,positive:i<6;
  entries.push({pr,line,rule,headSha,blobSha,path,positive,
   identity:JSON.stringify([pr,headSha,rule,path,line,positive]),
   originalProvisionalRootCauseGroup:i<2?'existing_provisional_'+i:null,
   eligibleForGold:false,causalIndependenceCertified:false});
 }
 entries.sort((a,b)=>a.identity.localeCompare(b.identity));
 const ledger={schema:'c2-historical-23-traceability-ledger/v1',
  sourceRepository:'cardenaspiero255-lang/gamehub-ultra',
  historicalIdentities:23,positives:11,negatives:12,
  queueMatchedEmbeddedReceipts:12,recoveredExternalReceiptLinks:10,
  residualEmbeddedReceipts:1,unresolvedCausalAssignments:21,
  verifiedIndependentCausalFamilies:0,newGoldLabels:0,holdoutFrozen:false,
  nextcloudSourceReleaseAuthorized:false,entries};
 ledger.ledgerSha256=sha(entries);
 const campaign={schema:'c2-original-kotlin-real-causal-campaign/v1',
  status:'TEN_ORIGINAL_KOTLIN_EXECUTIONS_CAUSAL_EFFECTS_CONFIRMED_FAMILY_INDEPENDENCE_PENDING',
  originalKotlinJvmVariantExecutions:10,
  sourceRepository:'cardenaspiero255-lang/gamehub-ultra',
  sourceCaseIdentities:['150:251','150:252','151:264','154:100','155:12'],
  confirmedRepairLocalEffects:5,ordinaryBenignControlFailures:0,
  provisionalMechanismClusters:[
   {id:'CONFIDENCE_POLICY',members:['150:251','150:252'],localRepairs:2,groupIndependenceCertified:false},
   {id:'NONFINITE_NUMERIC_BOUNDARY',members:['151:264','154:100','155:12'],localRepairs:3,groupIndependenceCertified:false}
  ],
  historicalRootCauseAssignmentsResolved:0,historicalRootCauseAssignmentsStillPending:21,
  externalGoldLabelsCreated:0,nextcloudCandidateSourceReleased:false,
  detectorPredictionsRead:false,holdoutFrozen:false,sssPlusCertified:false,
  precision:null,recall:null,f1:null
 };
 campaign.receiptSha256=sha(campaign);
 return {ledger,campaign};
}
test('RED: real causal receipt adds five provisional group assignments, never certifies a family or GOLD',()=>{
 const summary=adjudicateHistoricalMechanismOverlay(fixture());
 assert.equal(summary.schema,'c2-historical-development-causal-evidence-overlay/v1');
 assert.equal(summary.historicalIdentitiesPreserved,23);
 assert.equal(summary.originalWithoutProvisionalMechanism,21);
 assert.equal(summary.newProvisionalAssignmentsSupportedByExecutedJVM,5);
 assert.equal(summary.remainingWithoutProvisionalMechanism,16);
 assert.equal(summary.stillWithoutIndependentCausalCertification,21);
 assert.equal(summary.independentCausalFamiliesCertified,0);
 assert.equal(summary.externalGoldLabelsCreated,0);
 assert.equal(summary.externalSourceReleasePermitted,false);
 assert.equal(summary.detectorPredictionsRead,false);
 assert.equal(summary.holdoutFrozen,false);
 assert.equal(summary.precision,null);
 assert.equal(summary.f1,null);
 assert.equal(summary.sssPlusCertified,false);
 assert.equal(summary.entries.length,23);
 assert.match(summary.overlaySha256,/^[0-9a-f]{64}$/);
});
test('RED: reject altered JVM evidence, wrong source SHA, duplicate, benign promotion or invented independent cause',()=>{
 const bad=[
  x=>x.ledger.entries[0].blobSha='a'.repeat(40),
  x=>x.ledger.entries[0].rule='WRONG_RULE',
  x=>x.ledger.entries.push(x.ledger.entries[0]),
  x=>x.campaign.confirmedRepairLocalEffects=4,
  x=>x.campaign.originalKotlinJvmVariantExecutions=0,
  x=>x.campaign.provisionalMechanismClusters[0].groupIndependenceCertified=true,
  x=>x.campaign.sourceCaseIdentities.push('153:71'),
  x=>x.campaign.detectorPredictionsRead=true,
  x=>x.ledger.nextcloudSourceReleaseAuthorized=true,
  x=>x.ledger.entries[5].eligibleForGold=true
 ];
 for(const mutate of bad){const f=fixture();mutate(f);
  assert.throws(()=>adjudicateHistoricalMechanismOverlay(f),/C2_CAUSAL_EVIDENCE_OVERLAY_BLOCKED/);
 }
});
