'use strict';
/*
 * C2 replays 7 pending original Kotlin identities. It does not assign distinct
 * causal roots, emit new source labels, score detector output or thaw holdout.
 * Paths / hashes refer to previously owner-pinned GameHub Git blobs.
 */
const {createHash}=require('node:crypto');
const sha=s=>createHash('sha256').update(s).digest('hex');
const H40=/^[a-f0-9]{40}$/,H64=/^[a-f0-9]{64}$/;
const fail=()=>{throw Error('C2_PR183_BLOCKED');};
const src=(alias,head,blob,path,digest=null)=>Object.freeze({alias,head,blob,path,digest});
const seven=(suite,pr,line,positive)=>Object.freeze({suite,pr,line,positive});
const SUITES=Object.freeze([
 Object.freeze({id:'json',script:'scripts/c2-pr152-owner-oracle.sh',
  cases:[seven('json',152,110,true)],sources:[
   src('UltraResearchJsonCodec.kt','104b7dc33e4c0341cec3fca81e3c8fbe3625357f','886c104effd553cd60f8222bfb05b8505fe7c4b8','app/src/main/java/com/cardenaspiero255/gamehubultra/ai/UltraResearchJsonCodec.kt','642d4f0a991bdcbe78c1be408fe49de9b04b72255f345fa59a8f7054cd72b4d2')
  ],witnesses:[{pr:152,line:110,file:'witness.json',original:'original.log',variant:'counterfactual.log',
   input:'UltraResearchJsonCodec.kt',oracle:'c2-pr152-json-oracle.kt',variantType:'repair',
   flags:{originalFailure:true,positiveControlPassed:true,counterfactualPassed:true,candidateRead:false,baselineRead:false}}]}),
 Object.freeze({id:'presentation',script:'scripts/c2-run16-owner-negative-oracles.sh',
  cases:[seven('presentation',151,22,false)],sources:[
   src('151.kt','9ad983576c16c6c34d59283979d83c69ede50dce','f623999ecd31f6961bc48f34d834674494b7d1db','app/src/main/java/com/cardenaspiero255/gamehubultra/ui/components/SessionCoachPresentation.kt','635d678a15f914e2fc3fb84a05839cf2eef8187c4221a5c8f3e4c3128157ea7e'),
   src('153.kt','6508cc124076b9dea437ea1efc213d3ce55d7baf','18911c26a9afaf051fda0e9ea14cdaccf943a47b','app/src/main/java/com/cardenaspiero255/gamehubultra/data/GameStateOwnershipContracts.kt','8e136084412a57074f3c3a5ce8d7e209cef8274f79a752b5d1dc957447f7ee15')
  ],witnesses:[{pr:151,line:22,file:'151-witness.json',original:'151-original.log',variant:'151-mutant.log',
   input:'151.kt',oracle:'c2-run16-presentation-oracle.kt',variantType:'mutant',
   flags:{originalPassed:true,controlsPassed:true,mutantKilled:true,candidateInspected:false,baselineInspected:false}}]}),
 Object.freeze({id:'battery-local',script:'scripts/c2-run17-owner-original-oracles.sh',
  cases:[seven('battery-local',155,12,true),seven('battery-local',158,50,false)],sources:[
   src('155.kt','2289f4e4cda55ddaa50f2016113ded82dc17203c','8696360219231f3f1477d5ad21c93bca2197e281','app/src/main/java/com/cardenaspiero255/gamehubultra/domain/BatteryAwareGamingEngine.kt','cd1c9d6a1a6dfb15a67650a3b38aea3611e855b066e4f6217dd7101d6285a67b'),
   src('158.kt','9d8572afedc634ac07dae58a0da326ea62bdc1da','e1423d747bdeeb556c4633febcfc9455e1f3cef6','app/src/main/java/com/cardenaspiero255/gamehubultra/ai/UltraQueryExecutionCoordinator.kt','921bf26b622392d06021ada2635a2a44d226c45c379156322ceb08892ed85430')
  ],witnesses:[
   {pr:155,line:12,file:'155-witness.json',original:'155-original.log',variant:'155-counterfactual.log',
    input:'155.kt',oracle:'c2-run17-battery-oracle.kt',variantType:'repair',
    flags:{originalControlPassed:true,behaviorObserved:true,mutationSensitive:true,candidateRead:false,baselineRead:false}},
   {pr:158,line:50,file:'158-witness.json',original:'158-original.log',variant:'158-mutant.log',
    input:'158.kt',oracle:'c2-run17-query-oracle.kt',variantType:'mutant',
    flags:{originalControlPassed:true,behaviorObserved:true,mutationSensitive:true,candidateRead:false,baselineRead:false}}
  ]}),
 Object.freeze({id:'thermal-session',script:'scripts/c2-run21-original-negative-oracles.sh',
  cases:[seven('thermal-session',151,293,false),seven('thermal-session',154,73,false)],sources:[
   src('151.kt','9ad983576c16c6c34d59283979d83c69ede50dce','adb11032b9b7f62f865228dfa1c27258ca3fa0df','app/src/main/java/com/cardenaspiero255/gamehubultra/domain/AiSessionCoach.kt'),
   src('154.kt','858c9ce5cb6a7916d63f2348432013e49d02ba79','3ecb3b3893d8f710dd7f5203f8378bc784841baf','app/src/main/java/com/cardenaspiero255/gamehubultra/domain/ThermalPredictionEngine.kt')
  ],witnesses:[
   {pr:151,line:293,file:'151-witness.json',original:'151-original.log',variant:'151-mutant.log',
    input:'151.kt',oracle:'c2-run21-session-battery-oracle.kt',variantType:'mutant',
    flags:{normalControlPassed:true,behaviorWitnessed:true,sensitivityProven:true,candidateRead:false,baselineRead:false}},
   {pr:154,line:73,file:'154-witness.json',original:'154-original.log',variant:'154-mutant.log',
    input:'154.kt',oracle:'c2-run21-thermal-policy-oracle.kt',variantType:'mutant',
    flags:{normalControlPassed:true,behaviorWitnessed:true,sensitivityProven:true,candidateRead:false,baselineRead:false}}
  ]}),
 Object.freeze({id:'comparison',script:'scripts/c2-run22-original-comparison-oracle.sh',
  cases:[seven('comparison',158,144,true)],sources:[
   src('158.kt','9d8572afedc634ac07dae58a0da326ea62bdc1da','0b5b315b2c5bb54d8c6a2713f3c7d29085209f4f','app/src/main/java/com/cardenaspiero255/gamehubultra/ai/UltraGeneralQueryRouter.kt')
  ],witnesses:[{pr:158,line:144,file:'158-witness.json',original:'158-original.log',variant:'158-counterfactual.log',
   input:'158.kt',oracle:'c2-run22-current-comparison-oracle.kt',variantType:'repair',
   flags:{normalControlPassed:true,originalDefectReproduced:true,correctedBehaviorPassed:true,candidateRead:false,baselineRead:false}}]})
]);
const SEVEN=Object.freeze(SUITES.flatMap(s=>s.cases));
const targetKey=x=>x.pr+':'+x.line+':'+x.positive;
function completeTwelve({previous,newProbes}={}){
 try{
  if(!previous||previous.schema!=='c2-pr182-three-positive-two-negative-original-jvm-probes/v2'||
   previous.status!=='THREE_POSITIVES_TWO_NEGATIVES_SOURCE_REPLAYED_CAUSAL_INDEPENDENCE_PENDING'||
   previous.sourceLabels!==23||previous.sourcePositiveLabels!==11||previous.sourceNegativeLabels!==12||
   previous.originalReceipts!==12||previous.positiveOriginalReceipts!==6||
   previous.negativeOriginalReceipts!==6||previous.retestedPositive!==3||
   previous.pendingPositive!==3||previous.retestedNegative!==2||previous.pendingNegative!==4||
   previous.certifiedIndependentCausesAdded!==0||previous.newLabels!==0||
   previous.sssPlusCertified!==false||previous.independenceVerified!==false||
   previous.historicalEvidenceAuthenticated!==false||previous.holdoutFrozen!==false||
   previous.precision!==null||previous.recall!==null||previous.f1!==null||
   !Array.isArray(previous.entryReviews)||previous.entryReviews.length!==12||
   !Array.isArray(newProbes)||newProbes.length!==7)fail();
  const oldMap=new Map();
  let oldP=0,oldN=0;
  for(const e of previous.entryReviews){
   if(!e||typeof e.identity!=='string'||!Number.isInteger(e.pr)||!Number.isInteger(e.line)||
    !H40.test(e.headSha)||!H40.test(e.blobSha)||typeof e.positive!=='boolean'||
    e.independentRootCauseCertified!==false||e.eligibleForGold!==false||
    e.eligibleForBlindHoldout!==false||e.causalFingerprint!==null||
    typeof e.rule!=='string'||oldMap.has(targetKey(e))||
    typeof e.originalSourceReplayed!=='boolean')fail();
   const expected=SEVEN.some(c=>targetKey(c)===targetKey(e));
   if(e.originalSourceReplayed===expected)fail();
   if(e.originalSourceReplayed){
    if(!H64.test(e.sourceReplayLogSha256)||!H64.test(e.adversarialControlLogSha256)||
     e.causalIndependenceStatus!==(e.positive?
      'CONTRAFACTUAL_REPRODUCED_FAMILY_NOT_YET_DISTINCT':
      'ORIGINAL_NEGATIVE_AND_MUTANT_REPLAYED_NO_POSITIVE_CAUSE'))fail();
    e.positive?oldP++:oldN++;
   }else if(e.sourceReplayLogSha256!==null||e.adversarialControlLogSha256!==null||
     e.causalIndependenceStatus!=='ORIGINAL_OWNER_RECEIPT_ONLY_NEW_CAUSAL_TRIAL_PENDING')fail();
   oldMap.set(targetKey(e),e);
  }
  if(oldMap.size!==12||oldP!==3||oldN!==2||
   [...oldMap.values()].filter(e=>e.positive).length!==6)fail();
  const proofs=new Map();
  for(const n of newProbes){
   if(!n||!SEVEN.some(c=>targetKey(c)===targetKey(n)&&c.suite===n.suite)||
     proofs.has(targetKey(n))||!oldMap.has(targetKey(n))||
     n.identity!==oldMap.get(targetKey(n)).identity||
     n.originalHeadSha!==oldMap.get(targetKey(n)).headSha||
     n.originalBlobSha!==oldMap.get(targetKey(n)).blobSha||
     !H64.test(n.originalLogSha256)||!H64.test(n.variantLogSha256)||
     n.originalLogSha256===n.variantLogSha256||
     n.originalControlPassed!==true||n.mutantOrRepairSensitive!==true||
     n.unmodifiedOriginalSource!==true||n.sourceBehaviorOnly!==true||
     n.candidatePredictionsRead!==false||n.baselinePredictionsRead!==false)fail();
   proofs.set(targetKey(n),n);
  }
  if(proofs.size!==7)fail();
  const entryReviews=[...oldMap.values()].map(e=>{
   const newProof=proofs.get(targetKey(e));
   if(!newProof)return Object.freeze({...e});
   return Object.freeze({...e,
     originalSourceReplayed:true,sourceReplayLogSha256:newProof.originalLogSha256,
     adversarialControlLogSha256:newProof.variantLogSha256,
     repairLogSha256:e.positive?newProof.variantLogSha256:null,
     causalIndependenceStatus:e.positive?
      'CONTRAFACTUAL_REPRODUCED_FAMILY_NOT_YET_DISTINCT':
      'ORIGINAL_NEGATIVE_AND_MUTANT_REPLAYED_NO_POSITIVE_CAUSE',
     causalFingerprint:null,independentRootCauseCertified:false,
     eligibleForGold:false,eligibleForBlindHoldout:false});
  }).sort((a,b)=>a.identity<b.identity?-1:a.identity>b.identity?1:0);
  return Object.freeze({
   schema:'c2-pr183-twelve-original-kotlin-replays-not-causally-certified/v1',
   status:'TWELVE_ORIGINAL_SOURCES_REPLAYED_CAUSAL_FAMILY_INDEPENDENCE_PENDING',
   predecessorReportSha256:sha(JSON.stringify(previous)),
   sourceLabels:23,sourcePositiveLabels:11,sourceNegativeLabels:12,
   originalReceipts:12,retestedPositive:6,retestedNegative:6,
   remainingWithoutSourceReplay:0,entryReviews,
   provisionalPositiveFamiliesBefore:4,causalFamilyIndependenceVerified:false,
   certifiedIndependentCausesAdded:0,newLabels:0,
   sssPlusCertified:false,holdoutFrozen:false,blindHoldout:false,
   precision:null,recall:null,f1:null,
   candidatePredictionsRead:false,baselinePredictionsRead:false,
   conclusion:'All twelve historical behaviors have original Kotlin source replays, but source behavior does not certify independent positive causal families, new GOLD labels, metrics, or SSS+.'
  });
 }catch(e){if(e?.message==='C2_PR183_BLOCKED')throw e;fail();}
}
module.exports={SEVEN,SUITES,completeTwelve};
