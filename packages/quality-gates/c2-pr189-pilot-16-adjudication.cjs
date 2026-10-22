'use strict';
/*
 * Evidence adjudication over *previous real executions*, not a fake new
 * reproduction run. Public Kotlin benchmark cases cannot become blind labels.
 */
const {createHash}=require('node:crypto');
const roster=require('../../tests/fixtures/c2-upstream-106-task-tree.json');
const {makePrioritizedIntake}=require('./c2-pr188-label-intake-priority.cjs');
const expectedPlan=makePrioritizedIntake(roster);
const PILOT=Object.freeze(expectedPlan.pilot.map(c=>Object.freeze({task:c.task,repository:c.repository,treeSha:c.taskTreeSha})));
const RETRIES=Object.freeze(['detekt_detekt-4628','detekt_detekt-4728','detekt_detekt-4733',
 'detekt_detekt-4738','pinterest_ktlint-2029','pinterest_ktlint-2091']);
const SOURCE_BASE=Object.freeze({
 'detekt_detekt-4205':'ea00969fca38ea4d5f41baddcc819a585936a2b4',
 'detekt_detekt-4249':'6e203211aee34495f50c812807d8c195a563f2c4',
 'detekt_detekt-4628':'ea6737f422e1b104898a693d5b7646cacf2c069d',
 'detekt_detekt-4728':'683e696375fa5e99fec7e8677c46b0925436454d',
 'detekt_detekt-4733':'146a13e22940bee5562c3a5c6f94e3627ab859c5',
 'detekt_detekt-4738':'bd922af416fb3e28e4d5220ac693e1ae1a721bee',
 'pinterest_ktlint-2029':'8398538e1267dbe507256ae2a46185d5a4f177e0',
 'pinterest_ktlint-2091':'4b8e514c41f4db3954a96024fa0d3f3c15f7c53f',
 'GradleUp_shadow-1313':'b9d4a93656f1ba66929195e2e244bbd1edcc589c'
});
const H40=/^[a-f0-9]{40}$/,H64=/^[a-f0-9]{64}$/;
const STATUSES=Object.freeze([
 'TRANSITIONS_OBSERVED_PROVENANCE_REVIEW_REQUIRED','INFRA_BLOCKED',
 'REPRODUCTION_MISMATCH','NO_DECLARED_REGRESSION'
]);
const PREVIOUS_DEVELOPMENT_CASES=new Set([
 'detekt_detekt-4205','detekt_detekt-4249','GradleUp_shadow-1313'
]);
const RULES=Object.freeze({
 'detekt_detekt-4205':'ForbiddenMethodCall overridden-descriptor method resolution',
 'detekt_detekt-4249':'UnusedPrivateMember operator in containment binding',
 'detekt_detekt-4628':'UnnecessaryAbstractClass primary-constructor properties',
 'detekt_detekt-4728':'OutdatedDocumentation class without primary constructor',
 'detekt_detekt-4733':'VarCouldBeVal generic receiver descriptor resolution',
 'detekt_detekt-4738':'UnnecessaryInnerClass function-type variable references',
 'pinterest_ktlint-2029':'Ktlint rule identifier error message wording',
 'pinterest_ktlint-2091':'Ktlint CLI format option user guidance',
 'GradleUp_shadow-1313':'Shadow relocation exemption for Kotlin builtins paths'
});
const fail=()=>{throw Error('C2_PR189_PILOT_BLOCKED');};
const keyset=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).every(k=>keys.includes(k));
function checkAttempt(source,task){
 if(!source||!keyset(source,['receipt','proof','proofDigest','artifactDigest'])||
  !H64.test(source.artifactDigest||''))fail();
 const r=source.receipt;
 if(!r||!keyset(r,['task','sourceCommit','status','newPositiveLabels','newNegativeLabels',
  'reason','candidateTransitions','receiptSha256','sourceCommitClaim','fixedCommitClaim'])||
  r.task!==task||r.sourceCommit!=='b9025d86f7ae634901396766bd61f6d4ae6d2165'||
  !STATUSES.includes(r.status)||r.newPositiveLabels!==0||r.newNegativeLabels!==0)fail();
 if(r.status!=='TRANSITIONS_OBSERVED_PROVENANCE_REVIEW_REQUIRED'){
  if(source.proof!==null||source.proofDigest!==null||
   r.candidateTransitions!==undefined||r.receiptSha256!==undefined||
   r.sourceCommitClaim!==undefined||r.fixedCommitClaim!==undefined||
   (r.reason!==undefined&&(typeof r.reason!=='string'||r.reason.length>4000)))fail();
  return;
 }
 const p=source.proof;
 if(!Object.hasOwn(SOURCE_BASE,task)||!p||typeof p!=='object'||
  p.schema!=='ultra-sentinel-c2-upstream-junit-evidence/v1'||
  p.task!==task||p.status!==r.status||
  p.declaredBeforeCommit!==r.sourceCommitClaim||p.declaredAfterCommit!==r.fixedCommitClaim||
  r.sourceCommitClaim!==SOURCE_BASE[task]||
  !H40.test(r.fixedCommitClaim||'')||r.fixedCommitClaim===r.sourceCommitClaim||
  !Number.isSafeInteger(p.verifiedFailToPassCount)||
  p.verifiedFailToPassCount<1||p.verifiedFailToPassCount>100||
  !Number.isSafeInteger(p.verifiedNewOrSkippedToPassCount)||
  p.verifiedNewOrSkippedToPassCount<0||p.verifiedNewOrSkippedToPassCount>100||
  r.candidateTransitions!==p.verifiedFailToPassCount+p.verifiedNewOrSkippedToPassCount||
  !H64.test(source.proofDigest||'')||r.receiptSha256!==source.proofDigest||
  p.sourceCommitProvenanceVerified!==false||p.rawJUnitAuthenticityVerified!==false||
  p.rootCauseVerified!==false||p.independentReviewVerified!==false||
  p.detectorApplicabilityVerified!==false||
  p.newPositiveLabels!==0||p.newNegativeLabels!==0||
  p.benchmarkScoredLabels!==0||p.tripleSPlusCertified!==false)fail();
}
function adjudicatePilot({original,retry}={}){
 try{
  if(!keyset(original,PILOT.map(x=>x.task))||
   Object.keys(original).length!==16||!keyset(retry,RETRIES)||
   Object.keys(retry).length!==6||PILOT.length!==16||
   expectedPlan.remaining.length!==90)fail();
  const seenProofs=new Set();
  const records=PILOT.map(({task,repository,treeSha},i)=>{
   const a=original[task];checkAttempt(a,task);
   let selected=a,selectedEvidenceRun='original';
   if(RETRIES.includes(task)){
    const r=retry[task];checkAttempt(r,task);
    if(r.receipt.status!=='TRANSITIONS_OBSERVED_PROVENANCE_REVIEW_REQUIRED'||
     a.receipt.status==='TRANSITIONS_OBSERVED_PROVENANCE_REVIEW_REQUIRED')fail();
    selected=r;selectedEvidenceRun='retry';
   }
   if(selected.receipt.status==='TRANSITIONS_OBSERVED_PROVENANCE_REVIEW_REQUIRED'){
    if(seenProofs.has(selected.proofDigest))fail();
    seenProofs.add(selected.proofDigest);
   }
   const status=selected.receipt.status;
   return Object.freeze({
    order:i+1,task,repository,sourceTreeSha:treeSha,
    originalStatus:a.receipt.status,status,selectedEvidenceRun,
    sourceOriginalPrBaseShaClaim:selected.receipt.sourceCommitClaim||null,
    originalBeforeAfterTransitionCount:selected.receipt.candidateTransitions||0,
    originalReproductionEvidenceSha256:selected.proofDigest,
    archiveDigestSha256Claim:selected.artifactDigest,
    rootCauseMechanismHypothesis:RULES[task]||null,
    previouslyDocumentedInDevelopmentReview:PREVIOUS_DEVELOPMENT_CASES.has(task),
    groundTruthAdmitted:false,causalIndependent:false,
    sourceCheckoutAuthenticated:false,detectorApplicabilityVerified:false,
    originalTestJUnitIntegrityIndependentlyVerified:false,
    historicalRootCauseDedupVerified:false,licenseVerified:false,
    positiveLabel:false,negativeLabel:false,blindHoldoutEligible:false,
    nextGate:status==='TRANSITIONS_OBSERVED_PROVENANCE_REVIEW_REQUIRED'?
      'VERIFY_UPSTREAM_BASE_SOURCE_AND_CAUSAL_RULE_APPLICABILITY_HISTORICAL_DEDUP':
      status==='NO_DECLARED_REGRESSION'?'NEED_INDEPENDENT_NEGATIVE_MUTATION_SENSITIVE_ORACLE':
      status==='INFRA_BLOCKED'?'RETRY_ORIGINAL_BUILD_AND_ORACLE_ISOLATION':
      'RECONCILE_MISSING_OR_CONTRADICTORY_ORIGINAL_TEST'
   });
  });
  const classifications=Object.fromEntries(STATUSES.map(status=>[
   status,records.filter(x=>x.status===status).length
  ]));
  const fingerprint=new Set(records.map(x=>x.task));
  if(fingerprint.size!==16||
   classifications.TRANSITIONS_OBSERVED_PROVENANCE_REVIEW_REQUIRED!==9||
   classifications.INFRA_BLOCKED!==2||
   classifications.REPRODUCTION_MISMATCH!==1||
   classifications.NO_DECLARED_REGRESSION!==4||
   records.filter(x=>x.selectedEvidenceRun==='retry').length!==6)fail();
  const packet={
   schema:'c2-pr189-sixteen-original-upstream-evidence-triage/v1',
   status:'NINE_REPRODUCED_UPSTREAM_TRANSITIONS_NOT_ADMITTED_AS_CAUSAL_GOLD',
   sourceRepository:'Kotlin/kotlin-swe-bench',
   sourceCommit:'b9025d86f7ae634901396766bd61f6d4ae6d2165',
   sourceTreeSha:'7e6c0a3c10c8f082b8f7a9c5efbcc51c360356a9',
   originalRunId:39168947905,retryRunId:39214460564,
   totalCandidates:16,originalReproductionsAccountedFor:16,selectedRepeatRuns:6,
   otherCandidatesUntouched:90,repositoryCount:9,
   previouslyReviewedDevelopmentCandidates:records.filter(x=>x.previouslyDocumentedInDevelopmentReview).length,
   newlyReproducedAfterHistoricalRetry:records.filter(x=>x.selectedEvidenceRun==='retry').length,
   classifications,records,unknownCausalLabelsToAdmit:9,
   exactDuplicateTaskIdentities:0,
   historicalRootCauseDedupVerified:false,
   historicalLabels:23,additionalTargetLowerBound:97,
   independentlyVerifiedCausalFamiliesAdded:0,newPositiveLabels:0,newNegativeLabels:0,
   blindHoldout:false,tripleSPlusCertified:false,
   precision:null,recall:null,f1:null,
   finding:'Observed original Kotlin regression transitions are not a detector rule, an independent causal family, a verified negative oracle, or a blind gold label. No known source case is auto-admitted.'
  };
  return Object.freeze({...packet,reportSha256:createHash('sha256').update(JSON.stringify(packet)).digest('hex')});
 }catch(e){if(e?.message==='C2_PR189_PILOT_BLOCKED')throw e;fail();}
}
module.exports={PILOT,RETRIES,SOURCE_BASE,RULES,STATUSES,adjudicatePilot};
