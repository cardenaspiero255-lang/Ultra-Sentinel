'use strict';
/* Authenticated original GameHub development observations, never blind truth.
 * A safe Kotlin oracle outside the 17 frozen Core emitters cannot score TN/FP. */
const {createHash}=require('node:crypto');
const {buildExecutableRuleInventory}=require('./c2-executable-rule-inventory.cjs');
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const fail=()=>{throw Error('C2_PR153_RULE_SCOPE_BLOCKED');};
const H40=/^[a-f0-9]{40}$/,H64=/^[a-f0-9]{64}$/;
const HEAD='6508cc124076b9dea437ea1efc213d3ce55d7baf';
const PR153={positive:{line:71,rule:'PENDING_ADAPTIVE_PROFILE_ROLLBACK_DIVERGENCE',
 blob:'d8708fd6245cea2e8dab4404ef5bfb7e682e1a6f'},
 negative:{line:69,rule:'ADAPTIVE_PROFILE_WRITE_ISOLATED_FROM_EXPLICIT_CALLBACK',
 blob:'18911c26a9afaf051fda0e9ea14cdaccf943a47b'}};
const witness='b78aa7d2c8ca975fcc249c7dbb60a9576b0aea4af3dc5f0ba31257c23e090e08';
const SAFE_RULES=new Set([
 'SPOKEN_STOP_PRIORITY_OVER_EXPLICIT_WAKE_BARGE_IN',
 'WEAK_EXTERNAL_EVIDENCE_DOWNGRADES_CONFIDENCE',
 'ACTIVE_SESSION_ONLY_LATEST_THREE_OBSERVATIONS',
 'SESSION_COACH_BATTERY_INCREASE_NO_FALSE_DROP_ALERT',
 'SESSION_ID_MISMATCH_REJECTS_FOREIGN_FINISH',
 'ADAPTIVE_PROFILE_WRITE_ISOLATED_FROM_EXPLICIT_CALLBACK',
 'THERMAL_POLICY_REJECTS_UNDERSAMPLED_CONFIGURATION',
 'THERMAL_WARNING_WITHOUT_PREVENTIVE_PERMISSION',
 'BATTERY_DRAIN_CROSSES_CHARGING_BOUNDARY',
 'MUTATION_EXECUTES_WITHOUT_TOOL_AUTHORIZATION',
 'LOCAL_QUERY_NEVER_TOUCHES_RESEARCH_GATEWAY',
 'UNBOUNDED_AUDIT_TRAIL_RETENTION'
]);
function adjudicatePr153AndRuleScopedNegatives({prior,replay}={}){
 try{
  if(!prior||prior.schema!=='c2-pr212-integrated-historical-23-cross-overlay/v1'||
   prior.sourceRepository!=='cardenaspiero255-lang/gamehub-ultra'||
   prior.historicalIdentityCount!==23||prior.historicalPositiveCount===0||
   prior.historicalPositives!==11||prior.historicalNegatives!==12||
   prior.previouslyUngrouped!==16||prior.previouslyExperimentallyGrouped!==5||
   prior.additionalExperimentallyGroupedPositives!==4||prior.remainingUngrouped!==12||
   prior.independentCausalAssignmentsStillPending!==21||
   prior.verifiedIndependentCausalFamilies!==0||
   prior.externalGoldLabelsCreated!==0||prior.scoredNegatives!==0||
   prior.detectorPredictionsRead!==false||prior.candidateSourceRead!==false||
   prior.externalSourceReleasePermitted!==false||prior.holdoutFrozen!==false||
   prior.precision!==null||prior.recall!==null||prior.f1!==null||
   prior.sssPlusCertified!==false||!Array.isArray(prior.entries)||prior.entries.length!==23||
   !H64.test(prior.overlaySha256))fail();
  const {overlaySha256,...pre}=prior;
  if(hash(pre)!==overlaySha256)fail();
  if(!replay||replay.schema!=='c2-rollback-153-152-original-cross-verified/v1'||
   replay.status!=='SIX_REAL_KOTLIN_JVMS_ROLLBACK_LOCAL_EFFECTS_SEPARABLE_CAUSAL_FAMILIES_UNPROVEN'||
   replay.originalKotlinJvmExecutions!==6||replay.originalJVMContexts!==3||
   replay.adaptiveRepairEffectVerified!==true||replay.storeRepairEffectVerified!==true||
   replay.negative153Line69Validated!==true||replay.benignControlFailures!==0||
   replay.originalHistoricalLabelsAltered!==false||
   replay.independentRuntimeInteractionTested!==false||
   replay.familiesIndependentlyCertified!==0||replay.historicalCausesClosed!==0||
   replay.newGoldLabels!==0||replay.candidateSourceRead!==false||
   replay.detectorPredictionsRead!==false||replay.holdoutFrozen!==false||
   replay.precision!==null||replay.recall!==null||replay.f1!==null||
   replay.sssPlusCertified!==false||replay.evidenceSha256!==witness||
   !Array.isArray(replay.sources)||replay.sources.length!==3||
   replay.sources[0]?.id!=='153:71'||replay.sources[0]?.head!==HEAD||
   replay.sources[0]?.blob!==PR153.positive.blob||
   replay.sources[1]?.id!=='152:41'||replay.sources[1]?.head!=='104b7dc33e4c0341cec3fca81e3c8fbe3625357f'||
   replay.sources[1]?.blob!=='ed936aa687b08cf8d964d54f9d88e68bb12344ec'||
   replay.sources[2]?.id!=='153:69'||replay.sources[2]?.head!==HEAD||
   replay.sources[2]?.blob!==PR153.negative.blob||
   replay.sources[2]?.sourceSha256!=='8e136084412a57074f3c3a5ce8d7e209cef8274f79a752b5d1dc957447f7ee15'||
   !Array.isArray(replay.matrix)||replay.matrix.length!==4)fail();
  for(let i=0;i<4;i++){
   const m=replay.matrix[i],mode=['00','01','10','11'][i];
   if(m?.mode!==mode||m.adaptiveRepaired!==(mode[0]==='1')||
    m.storeRepaired!==(mode[1]==='1')||
    m.adaptiveCorrect!==(mode[0]==='1')||m.storeCorrect!==(mode[1]==='1')||
    m.independentJVMProcesses!==true||m.sharedRuntimeCrossInteractionTested!==false)fail();
  }
  const inventory=buildExecutableRuleInventory();
  if(inventory.ruleCount!==17||inventory.detectorSourceShaPinned!==true||
   inventory.certifiedRules!==0||inventory.ruleSpecificScoredNegatives!==0||
   inventory.sssPlusCertified!==false)fail();
  const active=new Set(inventory.rules.map(x=>x.rule));
  const seen=new Set();let positives=0,negatives=0,added=0,unclassified=0;
  const negativeFound=new Set();
  const rows=prior.entries.map(e=>{
   if(!e||typeof e.identity!=='string'||seen.has(e.identity)||
    typeof e.pr!=='number'||!Number.isSafeInteger(e.line)||e.line<1||
    typeof e.rule!=='string'||typeof e.path!=='string'||
    !H40.test(e.headSha)||!H40.test(e.blobSha)||
    e.identity!==JSON.stringify([e.pr,e.headSha,e.rule,e.path,e.line,e.positive])||
    typeof e.positive!=='boolean'||e.eligibleForGold!==false||
    e.causalIndependenceCertified!==false)fail();
   seen.add(e.identity);
   const hasGroup=Boolean(e.originalProvisionalRootCauseGroup||
      e.experimentalProvisionalMechanism||e.pr212ProvisionalMechanism);
   if(e.positive){
    positives++;
    if(e.pr===153&&e.line===PR153.positive.line){
     if(e.rule!==PR153.positive.rule||e.headSha!==HEAD||
      e.blobSha!==PR153.positive.blob||hasGroup)fail();
     added++;
     return Object.freeze({...e,pr153ProvisionalMechanism:'ADAPTIVE_PENDING_REPLAY_PROFILE_DIVERGENCE',
      pr153SourceOriginalJvmReceiptSha256:witness,pr153CausalIndependenceCertified:false,
      ruleScopeDisposition:'DEVELOPMENT_REPAIR_EFFECT_ONLY_NOT_A_GOLD_LABEL'});
    }
    if(!hasGroup)fail();
    return Object.freeze({...e,pr153ProvisionalMechanism:null,
     pr153SourceOriginalJvmReceiptSha256:null,ruleScopeDisposition:'DEVELOPMENT_ONLY'});
   }
   negatives++;
   if(!SAFE_RULES.has(e.rule)||negativeFound.has(e.rule)||active.has(e.rule))fail();
   negativeFound.add(e.rule);
   if(!hasGroup)unclassified++;
   if(e.pr===153&&e.line===PR153.negative.line&&
    (e.headSha!==HEAD||e.blobSha!==PR153.negative.blob))fail();
   return Object.freeze({...e,pr153ProvisionalMechanism:null,
    pr153SourceOriginalJvmReceiptSha256:null,
    mutantSensitiveBenignControl:e.pr===153&&e.line===69,
    applicableFrozenCoreRule:false,ruleSpecificNegativeScored:false,
    ruleScopeDisposition:'ORIGINAL_SAFE_ORACLE_OUTSIDE_FROZEN_CORE_RULE_VOCABULARY'});
  });
  if(seen.size!==23||positives!==11||negatives!==12||added!==1||
    unclassified!==11||negativeFound.size!==12)fail();
  const report={
   schema:'c2-pr153-development-mechanism-and-negative-rule-scope/v1',
   sourceHistoricalOverlaySha256:prior.overlaySha256,
   sourceOriginalJvmReplaySha256:witness,
   sourceFrozenRuleInventorySha256:hash(inventory.rules),
   historicalCount:23,historicalPositiveCount:11,historicalNegativeCount:12,
   newProvisionalPositiveAssignments:1,remainingWithoutProvisionalMechanism:11,
   originalSafeControlsOutsideActiveRuleVocabulary:12,implementedRuleCount:17,
   ruleSpecificNegativeCasesScored:0,trueNegativesScored:0,falsePositivesScored:0,
   causalIndependenceAssignmentsStillPending:21,certifiedIndependentFamilies:0,
   newExternalGoldLabels:0,detectorPredictionsRead:false,candidateSourceRead:false,
   sourceReleaseAuthorized:false,truthSealed:false,holdoutFrozen:false,
   precision:null,recall:null,f1:null,falsePositiveRate:null,sssPlusCertified:false,
   rows,
   limitation:'This is development-only source-identity triage. PR153 repair and killed mutant are original Kotlin evidence; no shared-JVM cross-interaction for rollback families, none of the 12 negatives maps to the frozen 17 Core rules, and neither sample class becomes blind truth.'
  };
  return Object.freeze({...report,outputSha256:hash(report)});
 }catch(e){if(e?.message==='C2_PR153_RULE_SCOPE_BLOCKED')throw e;fail();}
}
module.exports={adjudicatePr153AndRuleScopedNegatives};
