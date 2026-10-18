'use strict';
/**
 * C2 Kotlin upstream review gate.
 *
 * Classify reproduced candidates without misrepresenting their evidence as
 * independently authenticated truth. Public benchmark predictions/patches
 * are known, so these receipts can NEVER mint blind evaluation labels.
 *
 * This is deliberately a PRE-ADMISSION gate. Adding a claim such as
 * detectorApplicabilityVerified=true is not an independent attestation.
 * A separate, owner-sealed source+rule+historical process is still required.
 */
const {UPSTREAM}=require('./c2-kotlin-upstream-candidate-index.cjs');
const {buildEvidenceQueue}=require('./c2-upstream-evidence-queue.cjs');
const HEX40=/^[a-f0-9]{40}$/;
const HEX64=/^[a-f0-9]{64}$/;
const STATUSES=Object.freeze([
 'TRANSITIONS_OBSERVED_PROVENANCE_REVIEW_REQUIRED',
 'INFRA_BLOCKED','REPRODUCTION_MISMATCH','NO_DECLARED_REGRESSION'
]);
const ALLOWED_RECEIPT_FIELDS=new Set([
 'task','status','sourceCommit','newPositiveLabels','newNegativeLabels',
 'candidateTransitions','receiptSha256','sourceCommitClaim','fixedCommitClaim',
 'reason'
]);
const CLAIMS=new Set([
 'rootCauseVerified','independentReviewVerified','detectorApplicabilityVerified',
 'historicalIndependenceVerified','historicalDedupVerified','admittedLabel',
 'tripleSPlusCertified','blindHoldout','benchmarkScoredLabels','precision',
 'recall','f1','canCertify','isGold','positiveLabel','negativeLabel'
]);
function blocked(){throw Error('C2_ACCEPTANCE_REVIEW_REJECTED');}
function reviewCampaign(index,receipts=[],options={}){
 if(!Array.isArray(receipts)||receipts.length>106||
    !options||typeof options!=='object'||Array.isArray(options)||
    Object.keys(options).some(k=>k!=='requireComplete')||
    (options.requireComplete!==undefined&&typeof options.requireComplete!=='boolean'))blocked();
 // Validates independently pinned upstream Git tree, candidate identity,
 // source commit, source index digest and complete 106 task namespace.
 let authenticated;
 try{authenticated=buildEvidenceQueue(index,[]);}catch{blocked();}
 if(authenticated.tasks!==106||authenticated.tripleSPlusCertified!==false)blocked();
 const known=new Set(index.candidates.map(c=>c.upstreamTask));
 const received=new Map();
 const classifications=Object.fromEntries(STATUSES.map(s=>[s,0]));
 for(const r of receipts){
  if(!r||typeof r!=='object'||Array.isArray(r)||
    typeof r.task!=='string'||!known.has(r.task)||received.has(r.task)||
    !STATUSES.includes(r.status)||Object.keys(r).some(k=>!ALLOWED_RECEIPT_FIELDS.has(k)||CLAIMS.has(k))||
    ![undefined,0].includes(r.newPositiveLabels)||
    ![undefined,0].includes(r.newNegativeLabels)||
    (r.sourceCommit!==undefined&&r.sourceCommit!==UPSTREAM.commit)||
    (r.reason!==undefined&&(typeof r.reason!=='string'||r.reason.length>5000)))blocked();
  if(r.status==='TRANSITIONS_OBSERVED_PROVENANCE_REVIEW_REQUIRED'){
   // These are SHA-shaped *claims* emitted by untrusted third-party execution:
   // they are necessary but not sufficient for original provenance attestation.
   if(r.sourceCommit!==UPSTREAM.commit||
      r.newPositiveLabels!==0||r.newNegativeLabels!==0||
      !Number.isSafeInteger(r.candidateTransitions)||
      r.candidateTransitions<1||r.candidateTransitions>20000||
      !HEX40.test(r.sourceCommitClaim||'')||
      !HEX40.test(r.fixedCommitClaim||'')||
      r.fixedCommitClaim===r.sourceCommitClaim||
      !HEX64.test(r.receiptSha256||''))blocked();
  }else if(r.candidateTransitions!==undefined&&r.candidateTransitions!==0)blocked();
  received.set(r.task,r);classifications[r.status]++;
 }
 if(options.requireComplete===true&&received.size!==106)blocked();
 const candidates=index.candidates.map(c=>{
  const r=received.get(c.upstreamTask);
  const originalTests=!r?'SOURCE_PENDING':
   r.status==='TRANSITIONS_OBSERVED_PROVENANCE_REVIEW_REQUIRED'?'TRANSITION_OBSERVED_UNATTESTED':
   r.status==='NO_DECLARED_REGRESSION'?'NO_F2P_DECLARED':r.status;
  return Object.freeze({
   task:c.upstreamTask,repository:c.upstreamRepo,
   originalTests,
   originalSourceProvenanceVerified:false,
   rootCause:'ROOT_CAUSE_UNVERIFIED',
   detector:'DETECTOR_APPLICABILITY_UNVERIFIED',
   historical:'HISTORICAL_INDEPENDENCE_UNVERIFIED',
   blindHoldout:false,admittedLabel:false
  });
 });
 return Object.freeze({
  schema:'ultra-sentinel-c2-upstream-four-gate-candidate-review/v1',
  sourceCommit:UPSTREAM.commit,sourceTasksTreeSha:authenticated.sourceTasksTreeSha,
  tasks:106,receiptsSeen:received.size,missing:106-received.size,
  classifications,originalBehaviorAttestations:0,
  independentlyVerifiedRootCauses:0,detectorRulesValidated:0,
  historicalFingerprintsCompared:0,admitted:0,newLabels:0,
  newPositiveLabels:0,newNegativeLabels:0,
  historicalLabels:23,remaining:97,positiveMinimum:37,
  negativeMinimum:36,diversityMinimum:24,
  blindHoldout:false,precision:null,recall:null,f1:null,
  tripleSPlusCertified:false,
  status:received.size===106?'REVIEW_COMPLETE_ADMISSION_BLOCKED':'REVIEW_PARTIAL_ADMISSION_BLOCKED',
  candidates
 });
}
module.exports={reviewCampaign};
