'use strict';
const crypto=require('node:crypto');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const fail=()=>{throw Error('C2_PR186_CAUSAL_EVIDENCE_BLOCKED');};
const H64=/^[0-9a-f]{64}$/,H40=/^[0-9a-f]{40}$/;
const head152='104b7dc33e4c0341cec3fca81e3c8fbe3625357f';
const head158='9d8572afedc634ac07dae58a0da326ea62bdc1da';
const src=(alias,head,blob,sourceSha256,path)=>Object.freeze({alias,head,blob,sourceSha256,path});
const CASES=Object.freeze([
 Object.freeze({
  suite:'json',pr:152,line:110,key:'JSON_ARRAY_TERMINATION_HYPOTHESIS',
  intervention:'Scope scanner to sourceIds bracket matching outside JSON strings; reject greedily including another array.',
  sources:[src('original.kt',head152,'886c104effd553cd60f8222bfb05b8505fe7c4b8',
   '642d4f0a991bdcbe78c1be408fe49de9b04b72255f345fa59a8f7054cd72b4d2',
   'app/src/main/java/com/cardenaspiero255/gamehubultra/ai/UltraResearchJsonCodec.kt')]
 }),
 Object.freeze({
  suite:'rollback',pr:152,line:41,key:'ROLLBACK_VERSION_MONOTONICITY_HYPOTHESIS',
  intervention:'Reject stale versions per package; reject global alpha-version guard that blocks an independent beta.',
  sources:[src('original.kt',head152,'ed936aa687b08cf8d964d54f9d88e68bb12344ec',
   'f06604f1bdd7bba80d060adac49d99d9edfb38234e47a91d2f861af3997435da',
   'app/src/main/java/com/cardenaspiero255/gamehubultra/data/AiProfileProposalStore.kt')]
 }),
 Object.freeze({
  suite:'thermal',pr:158,line:114,key:'ADVANCED_SIGNAL_OBSERVATION_AGE_HYPOTHESIS',
  intervention:'Preserve observed-at timestamp across context refreshes; reject clearing still-fresh idle signals.',
  sources:[
   src('original.kt',head158,'0d18a43a8e36ea3edacc2cad72071d96aa31626e',
    '99a229e357823d65d7b04b642c9cf1ba312a35d0308da635ee38c425c8576591',
    'app/src/main/java/com/cardenaspiero255/gamehubultra/ai/UltraFrontierWorldState.kt'),
   src('battery.kt',head158,'8696360219231f3f1477d5ad21c93bca2197e281',
    'cd1c9d6a1a6dfb15a67650a3b38aea3611e855b066e4f6217dd7101d6285a67b',
    'app/src/main/java/com/cardenaspiero255/gamehubultra/domain/BatteryAwareGamingEngine.kt')]
 }),
 Object.freeze({
  suite:'query',pr:158,line:144,key:'FRESHNESS_QUALIFIER_PARSING_HYPOTHESIS',
  intervention:'Require fresh research only for current-qualified comparisons; reject blanket fresh research for stable comparisons.',
  sources:[src('original.kt',head158,'0b5b315b2c5bb54d8c6a2713f3c7d29085209f4f',null,
   'app/src/main/java/com/cardenaspiero255/gamehubultra/ai/UltraGeneralQueryRouter.kt')]
 })
]);
function manifest(suite){
 const entry=CASES.find(x=>x.suite===suite);
 if(!entry)fail();
 return entry.sources.map(x=>[
  x.alias,x.head,x.blob,x.sourceSha256||'-',x.path
 ].join('|')).join('\n')+'\n';
}
function adjudicateFour({parent,receipts}={}){
 try{
  if(!parent||parent.schema!=='c2-pr184-all-twelve-causal-mechanism-triage-v1'||
   parent.status!=='BEHAVIOR_TWELVE_OF_TWELVE_MECHANISM_HYPOTHESES_NOT_INDEPENDENTLY_CERTIFIED'||
   parent.sourceIdentitiesReviewed!==12||parent.sourceReplaysAuthenticated!==12||
   parent.sourceHistoricalCount!==23||parent.sourcePositiveLabels!==11||parent.sourceNegativeLabels!==12||
   parent.provisionalMechanismCandidateBuckets!==5||
   parent.independentlyDistinctRootCausesAccredited!==0||
   parent.familiesCertifiedFromThisAdjudication!==0||parent.positivePredictionsScored!==0||
   parent.newLabels!==0||parent.causalIndependenceVerified!==false||
   parent.blindHoldout!==false||parent.holdoutFrozen!==false||parent.sssPlusCertified!==false||
   parent.precision!==null||parent.recall!==null||parent.f1!==null||
   !Array.isArray(parent.positiveHypotheses)||!Array.isArray(receipts)||receipts.length!==4)fail();
  const seen=new Set(),out=[];
  for(const receipt of receipts){
   const c=CASES.find(c=>c.suite===receipt?.suite);
   if(!c||seen.has(c.suite)||receipt.schema!=='c2-pr186-discriminative-original-kotlin-source/v1'||
    receipt.identityKey!==c.pr+':'+c.line||receipt.mechanismHypothesisKey!==c.key||
    receipt.originalGitBlobVerified!==true||!H64.test(receipt.sourceOriginalSha256)||
    (c.sources[0].sourceSha256&&receipt.sourceOriginalSha256!==c.sources[0].sourceSha256)||
    receipt.normalControlPassedOnRepair!==true||receipt.wrongFixKilled!==true||
    receipt.originalDefectObserved!==true||receipt.sourceBehaviorOnly!==true||
    receipt.detectorPredictionsRead!==false||receipt.newGoldLabels!==0||
    receipt.certifiedIndependentCauseAdded!==false)fail();
   const parts=['sourceOriginalSha256','repairedSha256','wrongFixSha256',
    'originalFailureLogSha256','repairSuccessLogSha256','adversarialWrongFixFailureLogSha256'];
   const hashes=parts.map(p=>receipt[p]);
   const codeHashes=hashes.slice(0,3),logs=hashes.slice(3);
   // The original and an intentionally wrong repair may fail with identical
   // output bytes. This is valid when the *source variants* are distinct and
   // success output differs from the observed failures.
   if(hashes.some(x=>!H64.test(x))||new Set(codeHashes).size!==3||
    logs.some(x=>codeHashes.includes(x))||
    logs[1]===logs[0]||logs[1]===logs[2])fail();
   const corresponding=parent.positiveHypotheses.filter(x=>
    x.pr===c.pr&&x.line===c.line&&x.sharedHypothesisKey===c.key&&
    x.independentlyCertified===false);
   if(corresponding.length!==1)fail();
   seen.add(c.suite);
   out.push(Object.freeze({
    suite:c.suite,pr:c.pr,line:c.line,mechanismHypothesisKey:c.key,
    boundedIntervention:c.intervention,sourceOriginalSha256:receipt.sourceOriginalSha256,
    originalFailureLogSha256:receipt.originalFailureLogSha256,
    repairSuccessLogSha256:receipt.repairSuccessLogSha256,
    adversarialWrongFixFailureLogSha256:receipt.adversarialWrongFixFailureLogSha256,
    originalFailed:true,scopedRepairPassed:true,overbroadRepairRejected:true,
    independentRootCauseCertified:false,eligibleForGold:false,detectorPredictionsScored:false
   }));
  }
  if(seen.size!==4)fail();
  out.sort((a,b)=>a.suite.localeCompare(b.suite));
  return Object.freeze({
   schema:'c2-pr186-four-orthogonal-source-discriminators/v1',
   status:'FOUR_SOURCE_INTERVENTIONS_DISCRIMINATED_CAUSAL_FAMILY_INDEPENDENCE_NOT_CERTIFIED',
   parentCausalClassificationSha256:sha(JSON.stringify(parent)),
   replayedDifferentialMechanisms:4,verifiedSourceInterventions:12,
   allWrongFixesRejected:true,cases:out,sourceLabels:23,
   provisionalPositiveMechanismBuckets:5,certifiedIndependentCausesAdded:0,
   newLabels:0,causalFamilyIndependenceVerified:false,blindHoldout:false,
   holdoutFrozen:false,sssPlusCertified:false,precision:null,recall:null,f1:null,
   limitation:'Four scoped source mechanisms distinguish targeted from overbroad repairs; absence of detector-level counterfactual transfer, contamination-free independent labels and family taxonomy blocks root-cause independence certification.'
  });
 }catch(e){if(e?.message==='C2_PR186_CAUSAL_EVIDENCE_BLOCKED')throw e;fail();}
}
module.exports={CASES,manifest,adjudicateFour};
