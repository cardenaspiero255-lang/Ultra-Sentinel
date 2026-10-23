'use strict';
/**
 * Interprets REAL externally executed original Kotlin JVM trials.
 * No historical causal closure from patch locality alone; no training-to-GOLD promotion.
 */
const {createHash}=require('node:crypto');
const {adjudicateMatrix}=require('./c2-pr150-causal-matrix.cjs');
const {known}=require('./c2-pr185-numeric-orthogonality.cjs');
const {ORIGINALS}=require('./c2-pr151-158-causal-batch.cjs');
const {ORIGINAL_HEAD,EXPECTED_BLOB}=require('./c2-pr150-causal-matrix.cjs');
const SHA=/^[0-9a-f]{64}$/;
const fail=()=>{throw Error('C2_REAL_CAUSAL_CAMPAIGN_BLOCKED');};
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const eq=(v,expected)=>JSON.stringify(v)===JSON.stringify(expected);
function adjudicateRealCampaign({numeric,confidence,thermal}={}){
 try{
  if(!numeric||numeric.schema!=='c2-pr185-numeric-factorial-kotlin-replay/v1'||
   numeric.sourceRepository!=='cardenaspiero255-lang/gamehub-ultra'||
   !Array.isArray(numeric.sources)||numeric.sources.length!==2||
   numeric.sources.some((s,i)=>Object.entries(known[i]).some(([k,v])=>s[k]!==v))||
   !Array.isArray(numeric.variantSha256s)||numeric.variantSha256s.length!==2||
   numeric.variantSha256s.some((h,i)=>!SHA.test(h)||h===known[i].sourceSha256)||
   numeric.variantSha256s[0]===numeric.variantSha256s[1]||
   numeric.originalSourceUnmodified!==true||numeric.originalOperatorPatchScoped!==true||
   numeric.modelPredictionsRead!==false||numeric.baselineRead!==false||
   numeric.repositoryWritePerformed!==false||!Array.isArray(numeric.rows)||
   numeric.rows.length!==4)fail();
  const modes=['00','01','10','11'];
  const logs=new Set(),jars=new Set();
  for(let i=0;i<modes.length;i++){
   const x=numeric.rows[i],m=modes[i],math=m[0]==='1',battery=m[1]==='1';
   if(!x||x.mode!==m||x.mathRepair!==math||x.batteryRepair!==battery||
    x.mathGuardedSuccess!==math||x.batteryPolicyRejectsNonfinite!==battery||
    x.normalMathControlPassed!==true||x.normalBatteryControlPassed!==true||
    x.actualJVMExecution!==true||!SHA.test(x.jarSha256)||!SHA.test(x.logSha256)||
    logs.has(x.logSha256)||jars.has(x.jarSha256))fail();
   logs.add(x.logSha256);jars.add(x.jarSha256);
  }
  if(!confidence||confidence.schema!=='ultra-sentinel-c2-pr150-factorial-causal-adjudication/v1'||
   confidence.originalPr!==150||confidence.originalHeadSha!==ORIGINAL_HEAD||
   confidence.sourceBlobSha!==EXPECTED_BLOB||
   confidence.verdict!=='TWO_SEPARABLE_SOURCE_GUARDS_ONE_CONSERVATIVE_CAUSAL_FAMILY'||
   confidence.causalGuardIndependence!=='SEPARABLE_GUARDS_SHARED_POLICY_FAMILY'||
   confidence.originalDefectPredicates!==2||confidence.negativeControlFailures!==0||
   confidence.independentRootCausesCertified!==false||confidence.corpusNewLabels!==0||
   confidence.precision!==null||confidence.f1!==null||
   confidence.holdoutFrozen!==false||confidence.tripleSPlusCertified!==false)fail();
  const checkConfidence=adjudicateMatrix(confidence.testMatrix);
  if(checkConfidence.verdict!==confidence.verdict)fail();
  const source151=ORIGINALS.find(o=>o.pr===151);
  if(!source151||!thermal||thermal.schema!=='c2-pr151-live-source-thermal-counterfactual/v1'||
   thermal.pr!==151||thermal.headSha!==source151.headSha||
   thermal.sourceGitBlob!==source151.blobSha||
   thermal.exactOneChangeVerified!==true||thermal.sourceOriginalUnmodified!==true||
   !eq(thermal.original,{infinityAlert:true,finiteAlert:true,nanAlert:false})||
   !eq(thermal.patched,{infinityAlert:false,finiteAlert:true,nanAlert:false})||
   thermal.originalJvmExecuted!==true||thermal.patchedJvmExecuted!==true||
   thermal.originalBenignControlsPassed!==true||
   thermal.patchedBenignControlsPassed!==true||
   thermal.detectorPredictionsRead!==false||thermal.sourceReleaseAuthorized!==false||
   thermal.newGoldLabels!==0)fail();
  const digests=['originalLogSha256','patchedLogSha256','originalJarSha256','patchedJarSha256']
   .map(k=>thermal[k]);
  if(digests.some(x=>!SHA.test(x))||new Set(digests).size!==4)fail();
  const inputsSha256={numeric:digest(numeric),confidence:digest(confidence),thermal:digest(thermal)};
  const sourceCaseIdentities=['150:251','150:252','151:264','154:100','155:12'];
  const report={
   schema:'c2-original-kotlin-real-causal-campaign/v1',
   status:'TEN_ORIGINAL_KOTLIN_EXECUTIONS_CAUSAL_EFFECTS_CONFIRMED_FAMILY_INDEPENDENCE_PENDING',
   sourceRepository:'cardenaspiero255-lang/gamehub-ultra',
   originalKotlinJvmVariantExecutions:10,sourceCaseIdentities,
   confirmedRepairLocalEffects:5,
   confidenceRepairEffects:2,thermalRepairEffects:1,numericRepairEffects:2,
   ordinaryBenignControlFailures:0,
   provisionalMechanismClusters:[
    {id:'CONFIDENCE_POLICY',members:['150:251','150:252'],localRepairs:2,
     groupIndependenceCertified:false},
    {id:'NONFINITE_NUMERIC_BOUNDARY',members:['151:264','154:100','155:12'],localRepairs:3,
     groupIndependenceCertified:false}
   ],
   crossModuleGlobalCausalUniquenessDemonstrated:false,
   historicalRootCauseAssignmentsResolved:0,
   historicalRootCauseAssignmentsStillPending:21,
   externalCandidateAvailableForSourceOracle:false,
   externalGoldLabelsCreated:0,nextcloudCandidateSourceReleased:false,
   detectorPredictionsRead:false,trainingCorpusAltered:false,
   scoredBenignNegatives:0,holdoutFrozen:false,
   precision:null,recall:null,f1:null,sssPlusCertified:false,
   inputsSha256,
   caveat:'Ten genuine isolated JVM executions demonstrate five distinct local counterfactual repair effects, not five independent causal families. Provisional similarity grouping is non-scoring; no external holdout used.'
  };
  return Object.freeze({...report,receiptSha256:digest(report)});
 }catch(e){
  if(e.message==='C2_REAL_CAUSAL_CAMPAIGN_BLOCKED')throw e;
  fail();
 }
}
module.exports={adjudicateRealCampaign};
