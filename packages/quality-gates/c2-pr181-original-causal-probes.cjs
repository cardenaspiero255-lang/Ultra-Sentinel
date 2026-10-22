'use strict';
/* C2 original Kotlin adversarial replays, NOT causal family certification.
 * CI authenticates the immutable prior Run180 artifact before invoking this.
 * Strong positive/negative controls only establish bounded source behavior;
 * a PR number, file, hash or passing counterfactual never certifies independence.
 */
const crypto=require('node:crypto');
const {STAGES}=require('./c2-twelve-original-oracle-reconciliation.cjs');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const SHA40=/^[a-f0-9]{40}$/,SHA64=/^[a-f0-9]{64}$/;
const fail=()=>{throw Error('C2_PR181_CAUSAL_PROBES_BLOCKED');};
const REPO='cardenaspiero255-lang/gamehub-ultra';
const TUPLE=x=>JSON.stringify([x.pr,x.headSha,x.rule,x.path,x.line,x.positive]);
const top3=['152:41','158:114','154:100'];
const negative2=['151:185','150:167'];
function adjudicateOriginalProbes({source,trials,negativeTrials}={}){
 try{
  if(!source||source.schema!=='c2-run23-twelve-original-owner-oracle-reconciliation/v1'||
    source.status!=='ORIGINAL_OWNER_RECEIPTS_RECONCILED_CAUSAL_INDEPENDENCE_PENDING'||
    source.sourceRepository!==REPO||source.originalOwnerRun23!==39077240648||
    !SHA64.test(source.inputQueueSha256)||
    source.ownerOriginalOraclesReconciled!==12||source.ownerSourceStagesReconciled!==8||
    source.positiveSourceReceiptsReconciled!==6||source.negativeSourceReceiptsReconciled!==6||
    source.counterfactualJVMExecutionsThisRun!==0||
    source.causalIndependenceAdjudicationsAdded!==0||
    source.remainingWithoutIndependentCausalAssessment!==12||
    source.sourceLabels!==23||source.sourcePositiveLabels!==11||
    source.sourceNegativeLabels!==12||source.provisionalPositiveFamiliesAfter!==4||
    source.certifiedIndependentCausesAdded!==0||
    source.remainingHistoricalCausesUncertified!==21||
    source.newLabels!==0||source.historicalEvidenceAuthenticated!==false||
    source.independenceVerified!==false||source.blindHoldout!==false||
    source.holdoutFrozen!==false||source.precision!==null||
    source.recall!==null||source.f1!==null||source.sssPlusCertified!==false||
    source.autoRepair!==false||source.autoMerge!==false||
    !Array.isArray(source.entries)||source.entries.length!==12||
    !Array.isArray(trials)||trials.length!==3||
    !Array.isArray(negativeTrials)||negativeTrials.length!==2)fail();
  const original=new Map(),expected=new Set();
  for(const stage of STAGES)for(const c of stage.cases)expected.add(c.pr+':'+c.line+':'+c.rule+':'+c.positive);
  for(const e of source.entries){
   if(!e||!Number.isInteger(e.pr)||!Number.isInteger(e.line)||e.line<1||
    !SHA40.test(e.headSha)||!SHA40.test(e.blobSha)||
    !SHA64.test(e.originalEvidenceSha256)||!SHA64.test(e.originalOwnerArchiveSha256)||
    typeof e.rule!=='string'||typeof e.path!=='string'||
    !e.path.startsWith('app/')||typeof e.positive!=='boolean'||
    e.identity!==TUPLE(e)||original.has(e.identity)||
    !expected.delete(e.pr+':'+e.line+':'+e.rule+':'+e.positive)||
    e.originalKotlinExecution!=='HISTORICAL_OWNER_SOURCE_ORACLE_CI_ATTESTED'||
    e.causalIndependenceStatus!=='REQUIRES_INDEPENDENT_INTERVENTION'||
    e.independentlyCertified!==false||e.admittedNewCause!==false||
    e.scoringAdmitted!==false)fail();
   const stage=STAGES.find(s=>s.cases.some(c=>c.pr===e.pr&&c.line===e.line&&
     c.rule===e.rule&&c.positive===e.positive));
   if(!stage||stage.run!==e.originalOwnerRunId||
    stage.workflow!==e.originalOwnerWorkflow||stage.artifact!==e.originalOwnerArtifactId||
    stage.digest!==e.originalOwnerArchiveSha256)fail();
   original.set(e.identity,e);
  }
  if(original.size!==12||expected.size!==0||
   [...original.values()].filter(x=>x.positive).length!==6)fail();
  const trialMap=new Map();
  for(const t of trials){
   if(!t||typeof t.identity!=='string'||trialMap.has(t.identity)||
    !original.has(t.identity)||
    !top3.some(id=>{const e=original.get(t.identity);return id===e.pr+':'+e.line;})||
    t.originalHeadSha!==original.get(t.identity).headSha||
    t.originalBlobSha!==original.get(t.identity).blobSha||
    !SHA64.test(t.originalLogSha256)||!SHA64.test(t.firstRepairLogSha256)||
    !SHA64.test(t.adversarialControlLogSha256)||
    new Set([t.originalLogSha256,t.firstRepairLogSha256,t.adversarialControlLogSha256]).size!==3||
    t.originalSourceUnmodified!==true||t.originalFailureReproduced!==true||
    t.firstRepairPassed!==true||t.adversarialControlPassed!==true||
    t.sourceBehaviorScoped!==true||t.candidatePredictionsRead!==false||
    t.baselinePredictionsRead!==false)fail();
   trialMap.set(t.identity,t);
  }
  if(trialMap.size!==3||top3.some(key=>![...trialMap.keys()].some(identity=>{
    const e=original.get(identity);return e.pr+':'+e.line===key;
  })))fail();
  const negativeMap=new Map();
  for(const n of negativeTrials){
   if(!n||typeof n.identity!=='string'||!original.has(n.identity)||
    negativeMap.has(n.identity)||
    !negative2.some(id=>{const e=original.get(n.identity);return id===e.pr+':'+e.line;})||
    original.get(n.identity).positive!==false||
    n.originalHeadSha!==original.get(n.identity).headSha||
    n.originalBlobSha!==original.get(n.identity).blobSha||
    !SHA64.test(n.originalLogSha256)||!SHA64.test(n.mutantLogSha256)||
    n.originalLogSha256===n.mutantLogSha256||
    n.originalSourceUnmodified!==true||
    n.originalSafeControlPassed!==true||n.mutantKilled!==true||
    n.sourceBehaviorScoped!==true||n.candidatePredictionsRead!==false||
    n.baselinePredictionsRead!==false)fail();
   negativeMap.set(n.identity,n);
  }
  if(negativeMap.size!==2||negative2.some(key=>![...negativeMap.keys()].some(identity=>{
    const e=original.get(identity);return e.pr+':'+e.line===key;
  })))fail();
  const entryReviews=[...original.values()].map(e=>{
   const trial=trialMap.get(e.identity),negative=negativeMap.get(e.identity);
   const retested=!!trial||!!negative;
   return Object.freeze({
    identity:e.identity,pr:e.pr,line:e.line,rule:e.rule,
    headSha:e.headSha,blobSha:e.blobSha,positive:e.positive,
    originalOwnerRunId:e.originalOwnerRunId,
    originalEvidenceSha256:e.originalEvidenceSha256,
    originalSourceReplayed:retested,
    sourceReplayLogSha256:trial?.originalLogSha256||negative?.originalLogSha256||null,
    repairLogSha256:trial?.firstRepairLogSha256||null,
    adversarialControlLogSha256:trial?.adversarialControlLogSha256||negative?.mutantLogSha256||null,
    causalIndependenceStatus:trial?
     'CONTRAFACTUAL_REPRODUCED_FAMILY_NOT_YET_DISTINCT':negative?
     'ORIGINAL_NEGATIVE_AND_MUTANT_REPLAYED_NO_POSITIVE_CAUSE':
     'ORIGINAL_OWNER_RECEIPT_ONLY_NEW_CAUSAL_TRIAL_PENDING',
    causalFingerprint:null,independentRootCauseCertified:false,
    eligibleForGold:false,eligibleForBlindHoldout:false,
    samePRAndPathNeverProvesIndependence:true
   });
  }).sort((a,b)=>a.identity<b.identity?-1:a.identity>b.identity?1:0);
  return Object.freeze({
   schema:'c2-pr182-three-positive-two-negative-original-jvm-probes/v2',
   status:'THREE_POSITIVES_TWO_NEGATIVES_SOURCE_REPLAYED_CAUSAL_INDEPENDENCE_PENDING',
   originalOwnerRun23:39077240648,previousReconciliationSha256:hash(JSON.stringify(source)),
   originalReceipts:12,positiveOriginalReceipts:6,negativeOriginalReceipts:6,
   retestedPositive:3,pendingPositive:3,retestedNegative:2,pendingNegative:4,
   entryReviews,sourceLabels:23,sourcePositiveLabels:11,sourceNegativeLabels:12,
   provisionalPositiveFamiliesAfter:4,certifiedIndependentCausesAdded:0,
   remainingHistoricalCausesUncertified:21,newLabels:0,
   historicalEvidenceAuthenticated:false,independenceVerified:false,
   blindHoldout:false,holdoutFrozen:false,precision:null,recall:null,f1:null,
   sssPlusCertified:false,autoRepair:false,autoMerge:false,
   conclusion:'Three positive source interventions and two mutation-sensitive original negatives were replayed. They are NOT independently certified causes. The other four negatives and three positives remain owner-receipt-only. SSS+ remains NOT_CERTIFIED.'
  });
 }catch(e){if(e?.message==='C2_PR181_CAUSAL_PROBES_BLOCKED')throw e;fail();}
}
module.exports={adjudicateOriginalProbes};
