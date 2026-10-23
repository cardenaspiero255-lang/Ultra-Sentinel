'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {adjudicateRealCampaign}=require('../../packages/quality-gates/c2-real-causal-campaign.cjs');
const hash=n=>n.toString(16).padStart(64,'0');
const numericRows=['00','01','10','11'].map((mode,i)=>({
 mode,mathRepair:i>1,batteryRepair:(i%2)===1,
 mathGuardedSuccess:i>1,batteryPolicyRejectsNonfinite:(i%2)===1,
 normalMathControlPassed:true,normalBatteryControlPassed:true,
 actualJVMExecution:true,jarSha256:hash(100+i),logSha256:hash(200+i)
}));
const confidenceExpect={
 original:{negativeOnlyHistory:'HIGH',opposingExternalEvidence:'HIGH',weakExternalEvidence:'MEDIUM',affirmativeExternalEvidence:'HIGH',positiveHistory:'HIGH',emptyContext:'MEDIUM'},
 historyOnly:{negativeOnlyHistory:'MEDIUM',opposingExternalEvidence:'HIGH',weakExternalEvidence:'MEDIUM',affirmativeExternalEvidence:'HIGH',positiveHistory:'HIGH',emptyContext:'MEDIUM'},
 externalOnly:{negativeOnlyHistory:'HIGH',opposingExternalEvidence:'MEDIUM',weakExternalEvidence:'MEDIUM',affirmativeExternalEvidence:'HIGH',positiveHistory:'HIGH',emptyContext:'MEDIUM'},
 both:{negativeOnlyHistory:'MEDIUM',opposingExternalEvidence:'MEDIUM',weakExternalEvidence:'MEDIUM',affirmativeExternalEvidence:'HIGH',positiveHistory:'HIGH',emptyContext:'MEDIUM'}
};
function fixture(){return {
 numeric:{schema:'c2-pr185-numeric-factorial-kotlin-replay/v1',
  sourceRepository:'cardenaspiero255-lang/gamehub-ultra',
  sources:[
   {id:'154:100',head:'858c9ce5cb6a7916d63f2348432013e49d02ba79',blob:'063787d48784fd9b579e2c9a4d5ad4bbd7ab9d7a',sourceSha256:'f9fbdbd7aabd2dffbadc4b04b31280779bd7359624c081b9e64d532d8c40f65a'},
   {id:'155:12',head:'2289f4e4cda55ddaa50f2016113ded82dc17203c',blob:'8696360219231f3f1477d5ad21c93bca2197e281',sourceSha256:'cd1c9d6a1a6dfb15a67650a3b38aea3611e855b066e4f6217dd7101d6285a67b'}
  ],variantSha256s:[hash(301),hash(302)],
  originalSourceUnmodified:true,originalOperatorPatchScoped:true,
  modelPredictionsRead:false,baselineRead:false,repositoryWritePerformed:false,
  rows:numericRows.map(r=>({...r}))},
 confidence:{schema:'ultra-sentinel-c2-pr150-factorial-causal-adjudication/v1',
  originalPr:150,originalHeadSha:'4c6912d7ca17df0669f8a0d9667f34d2f2b205a9',sourceBlobSha:'37866fd3dbfcd19d9daaf29a5e1e426391c723d4',
  verdict:'TWO_SEPARABLE_SOURCE_GUARDS_ONE_CONSERVATIVE_CAUSAL_FAMILY',
  causalGuardIndependence:'SEPARABLE_GUARDS_SHARED_POLICY_FAMILY',
  originalDefectPredicates:2,negativeControlFailures:0,
  independentRootCausesCertified:false,corpusNewLabels:0,
  testMatrix:structuredClone(confidenceExpect),precision:null,f1:null,
  holdoutFrozen:false,tripleSPlusCertified:false},
 thermal:{schema:'c2-pr151-live-source-thermal-counterfactual/v1',
  pr:151,headSha:'9ad983576c16c6c34d59283979d83c69ede50dce',
  sourceGitBlob:'adb11032b9b7f62f865228dfa1c27258ca3fa0df',
  exactOneChangeVerified:true,sourceOriginalUnmodified:true,
  original:{infinityAlert:true,finiteAlert:true,nanAlert:false},
  patched:{infinityAlert:false,finiteAlert:true,nanAlert:false},
  originalLogSha256:hash(401),patchedLogSha256:hash(402),
  originalJarSha256:hash(403),patchedJarSha256:hash(404),
  originalJvmExecuted:true,patchedJvmExecuted:true,
  originalBenignControlsPassed:true,patchedBenignControlsPassed:true,
  detectorPredictionsRead:false,sourceReleaseAuthorized:false,newGoldLabels:0}
};}
test('RED: require real four-cell numeric, four-cell confidence and two JVM thermal variants with benign controls',()=>{
 const r=adjudicateRealCampaign(fixture());
 assert.equal(r.schema,'c2-original-kotlin-real-causal-campaign/v1');
 assert.equal(r.originalKotlinJvmVariantExecutions,10);
 assert.equal(r.sourceCaseIdentities.length,5);
 assert.equal(r.confirmedRepairLocalEffects,5);
 assert.equal(r.historicalRootCauseAssignmentsResolved,0);
 assert.equal(r.historicalRootCauseAssignmentsStillPending,21);
 assert.equal(r.externalGoldLabelsCreated,0);
 assert.equal(r.nextcloudCandidateSourceReleased,false);
 assert.equal(r.holdoutFrozen,false);
 assert.equal(r.precision,null);
 assert.equal(r.recall,null);
 assert.equal(r.f1,null);
 assert.equal(r.sssPlusCertified,false);
 assert.match(r.receiptSha256,/^[a-f0-9]{64}$/);
});
test('RED: malformed, duplicate, interpolated, fictitious or failing live JVM vectors are blocked',()=>{
 const variants=[
  x=>{x.numeric.rows.pop()},
  x=>{x.numeric.rows[1].logSha256=x.numeric.rows[0].logSha256},
  x=>{x.numeric.rows[2].mathGuardedSuccess=false},
  x=>{x.numeric.rows[0].actualJVMExecution=false},
  x=>{x.numeric.sources[0].blob='a'.repeat(40)},
  x=>{x.confidence.testMatrix.both.negativeOnlyHistory='HIGH'},
  x=>{x.confidence.negativeControlFailures=1},
  x=>{x.thermal.original.infinityAlert=false},
  x=>{x.thermal.patched.finiteAlert=false},
  x=>{x.thermal.originalLogSha256=x.thermal.patchedLogSha256},
  x=>{x.thermal.patchedJvmExecuted=false},
  x=>{x.thermal.detectorPredictionsRead=true},
  x=>{x.thermal.newGoldLabels=1}
 ];
 for(const mutate of variants){const f=fixture();mutate(f);
  assert.throws(()=>adjudicateRealCampaign(f),/C2_REAL_CAUSAL_CAMPAIGN_BLOCKED/);
 }
});
