'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),crypto=require('node:crypto');
const {assessNumericOrthogonality}=require('../../packages/quality-gates/c2-pr185-numeric-orthogonality.cjs');
const h=s=>crypto.createHash('sha256').update(s).digest('hex');
const fingerprints=[
 {id:'154:100',head:'858c9ce5cb6a7916d63f2348432013e49d02ba79',
  blob:'063787d48784fd9b579e2c9a4d5ad4bbd7ab9d7a',sourceSha256:'f9fbdbd7aabd2dffbadc4b04b31280779bd7359624c081b9e64d532d8c40f65a'},
 {id:'155:12',head:'2289f4e4cda55ddaa50f2016113ded82dc17203c',
  blob:'8696360219231f3f1477d5ad21c93bca2197e281',sourceSha256:'cd1c9d6a1a6dfb15a67650a3b38aea3611e855b066e4f6217dd7101d6285a67b'}
];
function data(){
 const prior={schema:'c2-pr184-all-twelve-causal-mechanism-triage-v1',
 status:'BEHAVIOR_TWELVE_OF_TWELVE_MECHANISM_HYPOTHESES_NOT_INDEPENDENTLY_CERTIFIED',
 sourceIdentitiesReviewed:12,sourceReplaysAuthenticated:12,
 sourceHistoricalCount:23,sourcePositiveLabels:11,sourceNegativeLabels:12,
 provisionalMechanismCandidateBuckets:5,independentlyDistinctRootCausesAccredited:0,
 familiesCertifiedFromThisAdjudication:0,newLabels:0,positivePredictionsScored:0,
 causalIndependenceVerified:false,blindHoldout:false,holdoutFrozen:false,
 sssPlusCertified:false,precision:null,recall:null,f1:null,
 positiveHypotheses:fingerprints.map(x=>({pr:Number(x.id.split(':')[0]),line:Number(x.id.split(':')[1]),
 sharedHypothesisKey:'NONFINITE_NUMERIC_BOUNDARY_SHARED_HYPOTHESIS',
 independentlyCertified:false})),negativeControls:[]};
 const experiment={schema:'c2-pr185-numeric-factorial-kotlin-replay/v1',
 sourceRepository:'cardenaspiero255-lang/gamehub-ultra',sources:structuredClone(fingerprints),
 variantSha256s:[h('mathvariant'),h('batteryvariant')],originalSourceUnmodified:true,
 rows:[0,1,2,3].map(i=>({mathRepair:!!(i&2),batteryRepair:!!(i&1),
  normalMathControlPassed:true,normalBatteryControlPassed:true,
  mathGuardedSuccess:!!(i&2),batteryPolicyRejectsNonfinite:!!(i&1),
  actualJVMExecution:true,jarSha256:h('jar'+i),logSha256:h('log'+i)})),
 originalOperatorPatchScoped:true,modelPredictionsRead:false,baselineRead:false,
 repositoryWritePerformed:false};
 return {prior,experiment};
}
test('RED: 2x2 full factorial proves scoped intervention effect, not numeric family independence',()=>{
 const d=data(),before=JSON.stringify(d),o=assessNumericOrthogonality(structuredClone(d));
 a.equal(JSON.stringify(d),before);
 a.equal(o.status,'ORTHOGONAL_EFFECTS_DEMONSTRATED_NUMERIC_FAMILY_INDEPENDENCE_UNRESOLVED');
 a.equal(o.fourCombinationsExecuted,4);
 a.deepEqual(o.effectMatrix.map(r=>[r.mathRepair,r.batteryRepair,r.mathGuardedSuccess,r.batteryPolicyRejectsNonfinite]),[
  [false,false,false,false],[false,true,false,true],[true,false,true,false],[true,true,true,true]
 ]);
 a.equal(o.mathRepairHasNoObservedEffectOnBatteryOutcome,true);
 a.equal(o.batteryRepairHasNoObservedEffectOnMathOutcome,true);
 a.equal(o.causesIndependentlyCertified,0);
 a.equal(o.numericMechanismSharedHypothesisStillOpen,true);
 a.equal(o.allHistoricalIndependentCausesCertified,false);
 a.equal(o.newLabels,0);a.equal(o.sssPlusCertified,false);
 a.equal(o.precision,null);a.equal(o.recall,null);a.equal(o.f1,null);
});
test('RED: forged outcomes, repeated binary configuration, bogus original blob or certification block',()=>{
 const attempts=[
 x=>{x.prior.sssPlusCertified=true;},x=>{x.prior.independentlyDistinctRootCausesAccredited=1;},
 x=>{x.prior.positiveHypotheses[1].sharedHypothesisKey='DIFFERENT';},
 x=>{x.experiment.rows.pop();},x=>{x.experiment.rows[0].mathRepair=true;},
 x=>{x.experiment.rows[0].mathGuardedSuccess=true;},
 x=>{x.experiment.rows[1].batteryPolicyRejectsNonfinite=false;},
 x=>{x.experiment.rows[2].mathGuardedSuccess=false;},
 x=>{x.experiment.rows[3].normalBatteryControlPassed=false;},
 x=>{x.experiment.rows[0].jarSha256='x';},
 x=>{x.experiment.rows[1].logSha256=x.experiment.rows[0].logSha256;},
 x=>{x.experiment.sources[0].blob='0'.repeat(40);},
 x=>{x.experiment.sources[1].head='0'.repeat(40);},
 x=>{x.experiment.variantSha256s[0]=x.experiment.sources[0].sourceSha256;},
 x=>{x.experiment.modelPredictionsRead=true;},x=>{x.experiment.repositoryWritePerformed=true;},
 x=>{x.experiment.rows[0].actualJVMExecution=false;}
 ];
 for(const mutate of attempts){const d=data();mutate(d);
  a.throws(()=>assessNumericOrthogonality(d),/C2_PR185_NUMERIC_INTERVENTION_BLOCKED/);}
});
