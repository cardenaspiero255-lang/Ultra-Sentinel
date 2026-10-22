'use strict';
/* Source-scoped experiment, never a proof of independent causal families. */
const crypto=require('node:crypto'),hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const fail=()=>{throw Error('C2_PR185_NUMERIC_INTERVENTION_BLOCKED');};
const known=Object.freeze([
 {id:'154:100',head:'858c9ce5cb6a7916d63f2348432013e49d02ba79',blob:'063787d48784fd9b579e2c9a4d5ad4bbd7ab9d7a',sourceSha256:'f9fbdbd7aabd2dffbadc4b04b31280779bd7359624c081b9e64d532d8c40f65a'},
 {id:'155:12',head:'2289f4e4cda55ddaa50f2016113ded82dc17203c',blob:'8696360219231f3f1477d5ad21c93bca2197e281',sourceSha256:'cd1c9d6a1a6dfb15a67650a3b38aea3611e855b066e4f6217dd7101d6285a67b'}
]);
const hex64=/^[0-9a-f]{64}$/;
function assessNumericOrthogonality({prior,experiment}={}){
 try{
  if(!prior||prior.schema!=='c2-pr184-all-twelve-causal-mechanism-triage-v1'||
   prior.status!=='BEHAVIOR_TWELVE_OF_TWELVE_MECHANISM_HYPOTHESES_NOT_INDEPENDENTLY_CERTIFIED'||
   prior.sourceIdentitiesReviewed!==12||prior.sourceReplaysAuthenticated!==12||
   prior.sourceHistoricalCount!==23||prior.sourcePositiveLabels!==11||prior.sourceNegativeLabels!==12||
   prior.provisionalMechanismCandidateBuckets!==5||
   prior.independentlyDistinctRootCausesAccredited!==0||prior.familiesCertifiedFromThisAdjudication!==0||
   prior.newLabels!==0||prior.positivePredictionsScored!==0||
   prior.causalIndependenceVerified!==false||prior.blindHoldout!==false||
   prior.holdoutFrozen!==false||prior.sssPlusCertified!==false||
   prior.precision!==null||prior.recall!==null||prior.f1!==null||
   !Array.isArray(prior.positiveHypotheses))fail();
  for(const k of known){
   const [pr,line]=k.id.split(':').map(Number);
   const match=prior.positiveHypotheses.filter(x=>x.pr===pr&&x.line===line);
   if(match.length!==1||match[0].sharedHypothesisKey!=='NONFINITE_NUMERIC_BOUNDARY_SHARED_HYPOTHESIS'||
    match[0].independentlyCertified!==false)fail();
  }
  if(!experiment||experiment.schema!=='c2-pr185-numeric-factorial-kotlin-replay/v1'||
   experiment.sourceRepository!=='cardenaspiero255-lang/gamehub-ultra'||
   !Array.isArray(experiment.sources)||experiment.sources.length!==2||
   experiment.sources.some((x,i)=>Object.keys(known[i]).some(k=>x[k]!==known[i][k]))||
   !Array.isArray(experiment.variantSha256s)||experiment.variantSha256s.length!==2||
   experiment.variantSha256s.some((x,i)=>!hex64.test(x)||x===known[i].sourceSha256)||
   experiment.variantSha256s[0]===experiment.variantSha256s[1]||
   experiment.originalSourceUnmodified!==true||experiment.originalOperatorPatchScoped!==true||
   experiment.modelPredictionsRead!==false||experiment.baselineRead!==false||
   experiment.repositoryWritePerformed!==false||
   !Array.isArray(experiment.rows)||experiment.rows.length!==4)fail();
  const expected=[[false,false],[false,true],[true,false],[true,true]];
  const logs=new Set(),jars=new Set(),matrix=[];
  for(let i=0;i<4;i++){
   const r=experiment.rows[i],pair=expected[i];
   if(!r||r.mathRepair!==pair[0]||r.batteryRepair!==pair[1]||
    r.mathGuardedSuccess!==pair[0]||r.batteryPolicyRejectsNonfinite!==pair[1]||
    r.normalMathControlPassed!==true||r.normalBatteryControlPassed!==true||
    r.actualJVMExecution!==true||!hex64.test(r.jarSha256)||!hex64.test(r.logSha256)||
    logs.has(r.logSha256)||jars.has(r.jarSha256))fail();
   logs.add(r.logSha256);jars.add(r.jarSha256);
   matrix.push(Object.freeze({...r}));
  }
  return Object.freeze({
   schema:'c2-pr185-numeric-factorial-independence-boundary/v1',
   status:'ORTHOGONAL_EFFECTS_DEMONSTRATED_NUMERIC_FAMILY_INDEPENDENCE_UNRESOLVED',
   predecessorClassificationSha256:hash(JSON.stringify(prior)),
   experimentSha256:hash(JSON.stringify(experiment)),
   fourCombinationsExecuted:4,effectMatrix:matrix,
   mathRepairHasNoObservedEffectOnBatteryOutcome:true,
   batteryRepairHasNoObservedEffectOnMathOutcome:true,
   orthogonalSourceLevelCausalEffectsObserved:true,
   numericMechanismSharedHypothesisStillOpen:true,
   causesIndependentlyCertified:0,allHistoricalIndependentCausesCertified:false,
   sourceLabels:23,newLabels:0,blindHoldout:false,holdoutFrozen:false,
   precision:null,recall:null,f1:null,sssPlusCertified:false,
   limitation:'Factorial repairs demonstrate independent local effects on two APIs, NOT independent root-cause family membership; shared numeric-boundary category remains provisional.'
  });
 }catch(e){if(e?.message==='C2_PR185_NUMERIC_INTERVENTION_BLOCKED')throw e;fail();}
}
module.exports={assessNumericOrthogonality,known};
