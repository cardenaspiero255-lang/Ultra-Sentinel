'use strict';
/*
 * Reconciles 12 previously sealed historical Run23 source identities to the
 * EXACT eight original owner-run witness seals. Executable original/mutant
 * oracles belong to those owner runs, not to this revalidation.
 * No same-PR/path/blob rule is accepted as causal independence.
 */
const {createHash}=require('node:crypto');
const sha=x=>createHash('sha256').update(x).digest('hex');
const fail=()=>{throw Error('C2_TWELVE_ORIGINAL_ORACLES_BLOCKED');};
const REPO='cardenaspiero255-lang/gamehub-ultra';
const HEX40=/^[a-f0-9]{40}$/,HEX64=/^[a-f0-9]{64}$/;
const tuple=x=>JSON.stringify([x.pr,x.headSha,x.rule,x.path,x.line,x.positive]);
const caseOf=(pr,line,rule,positive)=>Object.freeze({pr,line,rule,positive});
const STAGES=Object.freeze([
 Object.freeze({key:'pr152-json',run:39057159822,head:'5e1935d0c6af1f6a670f9f7348d0b8b16c394f52',
  workflow:'.github/workflows/c2-pr152-owner-source-truth.yml',
  artifact:12110215750,name:'ultra-sentinel-c2-pr152-owner-source-truth',
  digest:'23429e9483176c03546ac639200e0b2f74194decd645821361f0393b82ee93c7',
  file:'c2-pr152-owner-truth.json',
  schema:'ultra-sentinel-c2-pr152-owner-source-truth-seal/v1',
  total:11,positives:6,negatives:5,
  cases:[caseOf(152,110,'JSON_SOURCE_ARRAY_EARLY_CLOSING_BRACKET',true)]}),
 Object.freeze({key:'pr158-ttl',run:39059101315,head:'89e8ae834c9a48a765e873500b4b2e5c78c9724a',
  workflow:'.github/workflows/c2-pr158-owner-source-truth.yml',
  artifact:12110378858,name:'ultra-sentinel-c2-pr158-owner-source-truth',
  digest:'2c14ea320284efac3539f0811bc9910ce5854bf3391452383734a7eed65d6193',
  file:'c2-pr158-owner-truth.json',
  schema:'ultra-sentinel-c2-pr158-owner-source-truth-seal/v1',
  total:12,positives:7,negatives:5,
  cases:[caseOf(158,114,'ADVANCED_SIGNAL_TTL_REFRESH_EXTENSION',true)]}),
 Object.freeze({key:'run16-negatives',run:39067708985,head:'f7612b326485d86aa698d024d2ecf1931923d7df',
  workflow:'.github/workflows/c2-run16-two-original-negatives.yml',
  artifact:12113662602,name:'ultra-sentinel-c2-run16-two-original-negatives',
  digest:'1a41eba8de90abacade6d0f561aeb4cd2b65411b59ae9d080f7eff9c4ec26988',
  file:'c2-run16-two-negatives-owner-truth.json',
  schema:'ultra-sentinel-c2-run16-two-negatives-owner-seal/v1',
  total:14,positives:7,negatives:7,
  cases:[caseOf(151,22,'ACTIVE_SESSION_ONLY_LATEST_THREE_OBSERVATIONS',false)]}),
 Object.freeze({key:'run17-battery-local',run:39070029033,head:'df5cbcd63e1267c4356f70bf66d5384315c96662',
  workflow:'.github/workflows/c2-run17-original-source-truth.yml',
  artifact:12114598638,name:'ultra-sentinel-c2-run17-original-source-truth',
  digest:'bc2cd5da189f39bed41c02737b1b73cf5df17bc0f938be9094bcf4e87377f764',
  file:'c2-run17-owner-source-truth.json',
  schema:'ultra-sentinel-c2-run17-owner-source-truth-seal/v1',
  total:16,positives:8,negatives:8,
  cases:[caseOf(155,12,'NONFINITE_HIGH_DRAIN_POLICY_THRESHOLD',true),
   caseOf(158,50,'LOCAL_QUERY_NEVER_TOUCHES_RESEARCH_GATEWAY',false)]}),
 Object.freeze({key:'run18-math-voice',run:39071144969,head:'d7518026d6acb506de41e7f224571f6a1fe26214',
  workflow:'.github/workflows/c2-run18-two-original-source-truths.yml',
  artifact:12115670408,name:'ultra-sentinel-c2-run18-two-original-source-truths',
  digest:'aa2d483e887b7b89bb44aca2537744233f9307ebb8f9e24236e2c813ddab5507',
  file:'c2-run18-owner-source-truth.json',
  schema:'ultra-sentinel-c2-run18-owner-source-truth-seal/v1',
  total:18,positives:9,negatives:9,
  cases:[caseOf(154,100,'QUADRATIC_DISCRIMINANT_NONFINITE_DOUBLE_UNHANDLED',true),
   caseOf(150,167,'SPOKEN_STOP_PRIORITY_OVER_EXPLICIT_WAKE_BARGE_IN',false)]}),
 Object.freeze({key:'run21-negatives',run:39075155081,head:'c0072240f85b324acdad3db7b54217d311cdc206',
  workflow:'.github/workflows/c2-run21-original-negative-oracles.yml',
  artifact:12116887077,name:'ultra-sentinel-c2-run21-two-original-source-negatives',
  digest:'163caab401c119a4f907034bcc973064ad1b4c3b207fe92f616b560474e26001',
  file:'c2-run21-owner-source-truth.json',
  schema:'ultra-sentinel-c2-run21-owner-source-truth-seal/v1',
  total:20,positives:9,negatives:11,
  cases:[caseOf(151,293,'SESSION_COACH_BATTERY_INCREASE_NO_FALSE_DROP_ALERT',false),
   caseOf(154,73,'THERMAL_POLICY_REJECTS_UNDERSAMPLED_CONFIGURATION',false)]}),
 Object.freeze({key:'run22-comparison',run:39076132177,head:'0633de8fec9e06c0249dae8e64cf127dba01b7ae',
  workflow:'.github/workflows/c2-run22-original-comparison-freshness.yml',
  artifact:12117067167,name:'ultra-sentinel-c2-run22-original-comparison-freshness-positive',
  digest:'7a77bdc5b53c18c24f87de5c754d094f008639020da1a31fbd67ae5815bf16cc',
  file:'c2-run22-owner-source-truth.json',
  schema:'ultra-sentinel-c2-run22-owner-source-truth-seal/v1',
  total:21,positives:10,negatives:11,
  cases:[caseOf(158,144,'CURRENT_COMPARISON_FRESHNESS_QUALIFIER_NOT_RESPECTED',true)]}),
 Object.freeze({key:'run23-stores',run:39077240648,head:'1c60224e114bb34b75f6268088b86e136fd378c0',
  workflow:'.github/workflows/c2-run23-two-original-store-truths.yml',
  artifact:12117128918,name:'ultra-sentinel-c2-run23-two-store-source-truths',
  digest:'31ea72b3231fe73fb97e815ff70d88f3a5ddeb1d7fd7a3324584de9b7fbe3400',
  file:'c2-run23-owner-source-truth.json',
  schema:'ultra-sentinel-c2-run23-owner-source-truth-seal/v1',
  total:23,positives:11,negatives:12,
  cases:[caseOf(152,41,'STALE_PROPOSAL_VERSION_REPLACES_NEWER_ROLLBACK_STATE',true),
   caseOf(151,185,'SESSION_ID_MISMATCH_REJECTS_FOREIGN_FINISH',false)]})
]);
function reconcileTwelveOracles({prior,stages}={}){
 try{
  if(!prior||prior.schema!=='c2-run23-12-pending-original-causal-adjudication-queue/v1'||
   prior.status!=='TWELVE_HISTORICAL_IDENTITIES_REQUIRING_INDEPENDENT_COUNTERFACTUALS'||
   prior.sourceRepository!==REPO||prior.ownerRun23!==39077240648||
   prior.inheritedOwnerRun179!==39538354430||
   !HEX64.test(prior.originalInventorySha256)||!HEX64.test(prior.predecessorDigestSha256)||
   prior.count!==23||prior.positives!==11||prior.negatives!==12||
   prior.annotatedPrior!==11||prior.pending!==12||
   prior.pendingPositiveIdentities!==6||prior.pendingNegativeIdentities!==6||
   prior.sourceOraclesReexecutedByThisWorkflow!==0||
   prior.independentCounterfactualsExecutedByThisWorkflow!==0||
   prior.independentlyAdjudicatedFromQueue!==0||
   prior.provisionalPositiveFamiliesAfter!==4||
   prior.certifiedIndependentCausesAdded!==0||
   prior.remainingHistoricalCausesUncertified!==21||
   prior.originalHistoricalInventoryUnchanged!==true||prior.newLabels!==0||
   prior.historicalEvidenceAuthenticated!==false||prior.independenceVerified!==false||
   prior.blindHoldout!==false||prior.holdoutFrozen!==false||
   prior.precision!==null||prior.recall!==null||prior.f1!==null||
   prior.sssPlusCertified!==false||prior.autoRepair!==false||
   prior.autoMerge!==false||!Array.isArray(prior.queue)||prior.queue.length!==12||
   !Array.isArray(stages)||stages.length!==8)fail();
  const lookup=new Map();
  for(const q of prior.queue){
   if(!q||!Number.isSafeInteger(q.pr)||!Number.isSafeInteger(q.line)||
    !HEX40.test(q.headSha)||!HEX40.test(q.blobSha)||
    !HEX64.test(q.sealedOriginalEvidenceSha256)||q.hasSealedEvidenceSha256!==true||
    typeof q.rule!=='string'||typeof q.path!=='string'||
    typeof q.positive!=='boolean'||typeof q.identity!=='string'||
    q.identity!==tuple(q)||lookup.has(q.identity)||
    q.conclusion!=='UNVERIFIED_NOT_ADMITTED'||
    q.counterfactualDecision!=='NOT_YET_REPRODUCED_AND_ADJUDICATED'||
    q.independentCauseCertified!==false||q.eligibleForGold!==false||
    q.eligibleForBlindHoldout!==false)fail();
   lookup.set(q.identity,q);
  }
  if(lookup.size!==12)fail();
  const mapped=new Set(),linked=[],seenStage=new Set();
  for(let i=0;i<STAGES.length;i++){
   const stage=STAGES[i],current=stages[i];
   if(!current||current.key!==stage.key||seenStage.has(current.key))fail();
   seenStage.add(stage.key);
   const r=current.receipt;
   if(!r||r.schema!==stage.schema||r.repository!==REPO||
    r.ownerRunId!==stage.run||r.status!=='SOURCE_BEHAVIOR_TRUTH_PARTIAL'||
    r.sourceCIAuthenticated!==true||r.benchmarkCertified!==false||
    r.sourcePositiveLabels!==stage.positives||
    r.verifiedScopedNegativeLabels!==stage.negatives||
    r.benchmarkScoredLabels!==0||r.tripleSPlusCertified!==false||
    r.precision!==null||r.recall!==null||r.f1!==null||
    !Array.isArray(r.labels)||r.labels.length!==stage.total||
    r.labels.filter(x=>x.positive).length!==stage.positives||
    r.labels.filter(x=>!x.positive).length!==stage.negatives)fail();
   const labels=new Map();
   for(const label of r.labels){
    if(!label||typeof label.rule!=='string'||typeof label.path!=='string'||
     !HEX40.test(label.headSha)||!HEX40.test(label.blobSha)||
     typeof label.positive!=='boolean'||!Number.isSafeInteger(label.pr)||
     !Number.isSafeInteger(label.line)||label.line<1)fail();
    const id=tuple(label);
    if(labels.has(id))fail();
    labels.set(id,label);
   }
   for(const c of stage.cases){
    const matching=[...lookup.values()].filter(q=>
     q.pr===c.pr&&q.line===c.line&&q.rule===c.rule&&q.positive===c.positive);
    if(matching.length!==1)fail();
    const q=matching[0],label=labels.get(q.identity);
    if(!label||mapped.has(q.identity)||label.blobSha!==q.blobSha||
     label.evidenceSha256!==q.sealedOriginalEvidenceSha256)fail();
    mapped.add(q.identity);
    linked.push(Object.freeze({
     identity:q.identity,pr:q.pr,headSha:q.headSha,blobSha:q.blobSha,
     rule:q.rule,path:q.path,line:q.line,positive:q.positive,
     originalEvidenceSha256:q.sealedOriginalEvidenceSha256,
     originalOwnerRunId:stage.run,originalOwnerWorkflow:stage.workflow,
     originalOwnerArtifactId:stage.artifact,
     originalOwnerArchiveSha256:stage.digest,
     originalKotlinExecution:'HISTORICAL_OWNER_SOURCE_ORACLE_CI_ATTESTED',
     historicalCounterfactual:'OWNER_ORACLE_SOURCE_SCOPE_ATTESTED',
     causalIndependenceStatus:'REQUIRES_INDEPENDENT_INTERVENTION',
     positiveCausalFingerprint:null,independentlyCertified:false,
     admittedNewCause:false,scoringAdmitted:false,
     note:'Behavior source receipt and original owner CI are authenticated; new counterfactuals and cause independence are NOT attested by this reconciliation.'
    }));
   }
  }
  if(mapped.size!==12||linked.length!==12||
   linked.filter(x=>x.positive).length!==6||
   linked.filter(x=>!x.positive).length!==6)fail();
  linked.sort((a,b)=>a.identity<b.identity?-1:a.identity>b.identity?1:0);
  return Object.freeze({
   schema:'c2-run23-twelve-original-owner-oracle-reconciliation/v1',
   status:'ORIGINAL_OWNER_RECEIPTS_RECONCILED_CAUSAL_INDEPENDENCE_PENDING',
   sourceRepository:REPO,originalOwnerRun23:39077240648,
   inputQueueSha256:sha(JSON.stringify(prior)),
   ownerOriginalOraclesReconciled:12,ownerSourceStagesReconciled:8,
   positiveSourceReceiptsReconciled:6,negativeSourceReceiptsReconciled:6,
   counterfactualJVMExecutionsThisRun:0,causalIndependenceAdjudicationsAdded:0,
   remainingWithoutIndependentCausalAssessment:12,
   entries:linked,sourceLabels:23,sourcePositiveLabels:11,
   sourceNegativeLabels:12,provisionalPositiveFamiliesAfter:4,
   certifiedIndependentCausesAdded:0,remainingHistoricalCausesUncertified:21,
   newLabels:0,historicalEvidenceAuthenticated:false,
   independenceVerified:false,blindHoldout:false,holdoutFrozen:false,
   precision:null,recall:null,f1:null,sssPlusCertified:false,
   autoRepair:false,autoMerge:false,
   limitation:'All 12 are historic source-oracle identities, not independent positive causes or fresh blind samples. Causal root independence remains unverified.'
  });
 }catch(e){
  if(e?.message==='C2_TWELVE_ORIGINAL_ORACLES_BLOCKED')throw e;
  fail();
 }
}
module.exports={STAGES,reconcileTwelveOracles};
