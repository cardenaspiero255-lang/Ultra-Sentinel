'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {adjudicatePr153AndRuleScopedNegatives}=require('../../packages/quality-gates/c2-pr153-rule-negative-adjudication.cjs');
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const HEAD='6508cc124076b9dea437ea1efc213d3ce55d7baf';
const negativeRules=[
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
];
function entry(pr,line,rule,positive,group){
 const headSha=pr===153?HEAD:pr.toString(16).padStart(40,'0'),
  blobSha=pr===153?(line===71?'d8708fd6245cea2e8dab4404ef5bfb7e682e1a6f':'18911c26a9afaf051fda0e9ea14cdaccf943a47b'):
   (pr*1000+line).toString(16).padStart(40,'0'),
  path='app/src/main/java/test_'+pr+'_'+line+'.kt';
 return {pr,line,rule,positive,headSha,blobSha,path,
  identity:JSON.stringify([pr,headSha,rule,path,line,positive]),
  eligibleForGold:false,causalIndependenceCertified:false,
  experimentalProvisionalMechanism:group==='experimental'?'CONFIDENCE_POLICY':null,
  pr212ProvisionalMechanism:group==='pr212'?'SUPPORTED_REFRESH_CANDIDATE':null,
  originalProvisionalRootCauseGroup:group==='original'?'state_version_monotonicity':null};
}
function fixture(){
 const positives=[
  entry(150,251,'A',true,'experimental'),entry(150,252,'B',true,'experimental'),
  entry(151,264,'C',true,'experimental'),entry(154,100,'D',true,'experimental'),
  entry(155,12,'E',true,'experimental'),
  entry(158,114,'F',true,'pr212'),entry(158,144,'G',true,'pr212'),
  entry(152,110,'H',true,'pr212'),entry(152,207,'I',true,'pr212'),
  entry(152,41,'J',true,'original'),
  entry(153,71,'PENDING_ADAPTIVE_PROFILE_ROLLBACK_DIVERGENCE',true,null)
 ];
 const nPr=[150,150,151,151,151,153,154,154,155,157,158,158];
 const nLines=[167,250,22,293,185,69,73,22,47,32,50,60];
 const negatives=negativeRules.map((rule,i)=>entry(nPr[i],nLines[i],rule,false,i===4?'original':null));
 const prior={schema:'c2-pr212-integrated-historical-23-cross-overlay/v1',
  sourceRepository:'cardenaspiero255-lang/gamehub-ultra',
  sourcePreviousOverlaySha256:hash('previous-overlay'),
  sourcePr212OriginalKotlinEvidenceSha256:hash('pr212-real-jvm'),
  historicalIdentityCount:23,historicalPositives:11,historicalNegatives:12,
  previouslyUngrouped:16,previouslyExperimentallyGrouped:5,
  additionalExperimentallyGroupedPositives:4,remainingUngrouped:12,
  independentCausalAssignmentsStillPending:21,verifiedIndependentCausalFamilies:0,
  newOriginalKotlinJvmsExecutedByThisOverlay:0,
  originalSourceJointJvmsAuthenticatedThroughPr212:16,originalTruthLabelsReclassified:0,
  externalGoldLabelsCreated:0,scoredNegatives:0,candidateSourceRead:false,
  detectorPredictionsRead:false,externalSourceReleasePermitted:false,
  holdoutFrozen:false,precision:null,recall:null,f1:null,sssPlusCertified:false,
  entries:[...positives,...negatives]};
 prior.overlaySha256=hash(prior);
 const replay={schema:'c2-rollback-153-152-original-cross-verified/v1',
  status:'SIX_REAL_KOTLIN_JVMS_ROLLBACK_LOCAL_EFFECTS_SEPARABLE_CAUSAL_FAMILIES_UNPROVEN',
  originalKotlinJvmExecutions:6,originalJVMContexts:3,
  sources:[
   {id:'153:71',head:HEAD,blob:'d8708fd6245cea2e8dab4404ef5bfb7e682e1a6f'},
   {id:'152:41',head:'104b7dc33e4c0341cec3fca81e3c8fbe3625357f',blob:'ed936aa687b08cf8d964d54f9d88e68bb12344ec'},
   {id:'153:69',head:HEAD,blob:'18911c26a9afaf051fda0e9ea14cdaccf943a47b',
    sourceSha256:'8e136084412a57074f3c3a5ce8d7e209cef8274f79a752b5d1dc957447f7ee15'}
  ],
  adaptiveRepairEffectVerified:true,storeRepairEffectVerified:true,
  negative153Line69Validated:true,benignControlFailures:0,
  originalHistoricalLabelsAltered:false,independentRuntimeInteractionTested:false,
  familiesIndependentlyCertified:0,historicalCausesClosed:0,
  newGoldLabels:0,candidateSourceRead:false,detectorPredictionsRead:false,
  holdoutFrozen:false,precision:null,recall:null,f1:null,sssPlusCertified:false,
  evidenceSha256:'b78aa7d2c8ca975fcc249c7dbb60a9576b0aea4af3dc5f0ba31257c23e090e08',
  matrix:['00','01','10','11'].map(mode=>({mode,adaptiveRepaired:mode[0]==='1',
   storeRepaired:mode[1]==='1',adaptiveCorrect:mode[0]==='1',storeCorrect:mode[1]==='1',
   independentJVMProcesses:true,sharedRuntimeCrossInteractionTested:false}))};
 return {prior,replay};
}
test('RED: PR153:71 gets experimental, uncertified grouping; 12 genuine safe historic controls do not become fake Core TN',()=>{
 const r=adjudicatePr153AndRuleScopedNegatives(fixture());
 assert.equal(r.schema,'c2-pr153-development-mechanism-and-negative-rule-scope/v1');
 assert.equal(r.historicalCount,23);
 assert.equal(r.historicalPositiveCount,11);
 assert.equal(r.historicalNegativeCount,12);
 assert.equal(r.newProvisionalPositiveAssignments,1);
 assert.equal(r.remainingWithoutProvisionalMechanism,11);
 assert.equal(r.originalSafeControlsOutsideActiveRuleVocabulary,12);
 assert.equal(r.implementedRuleCount,17);
 assert.equal(r.ruleSpecificNegativeCasesScored,0);
 assert.equal(r.causalIndependenceAssignmentsStillPending,21);
 assert.equal(r.certifiedIndependentFamilies,0);
 assert.equal(r.newExternalGoldLabels,0);
 assert.equal(r.truthSealed,false);
 assert.equal(r.detectorPredictionsRead,false);
 assert.equal(r.sssPlusCertified,false);
 assert.match(r.outputSha256,/^[0-9a-f]{64}$/);
 assert.equal(r.rows.find(x=>x.pr===153&&x.line===71).pr153ProvisionalMechanism,'ADAPTIVE_PENDING_REPLAY_PROFILE_DIVERGENCE');
 assert.equal(r.rows.find(x=>x.pr===153&&x.line===69).mutantSensitiveBenignControl,true);
});
test('RED: corrupted witness, polarity flipping and unscored negatives masquerading as Core applicability must fail',()=>{
 const mutation=[
  f=>{f.prior.entries[10].positive=false;},
  f=>{f.prior.entries[10].blobSha='f'.repeat(40);f.prior.overlaySha256=hash(Object.fromEntries(Object.entries(f.prior).filter(([k])=>k!=='overlaySha256')))},
  f=>{f.prior.entries[16].rule='BLOCKING_ANDROID_CALL';f.prior.overlaySha256=hash(Object.fromEntries(Object.entries(f.prior).filter(([k])=>k!=='overlaySha256')))},
  f=>{f.prior.externalGoldLabelsCreated=1;},
  f=>{f.replay.evidenceSha256='f'.repeat(64);},
  f=>{f.replay.adaptiveRepairEffectVerified=false;},
  f=>{f.replay.negative153Line69Validated=false;},
  f=>{f.replay.matrix[0].adaptiveCorrect=true;},
  f=>{f.replay.candidateSourceRead=true;}
 ];
 for(const m of mutation){const f=fixture();m(f);assert.throws(()=>adjudicatePr153AndRuleScopedNegatives(f),/C2_PR153_RULE_SCOPE_BLOCKED/)}
});
