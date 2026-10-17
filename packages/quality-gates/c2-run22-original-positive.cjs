'use strict';
// Bounded historical source-positive append; no detector or benchmark access.
const crypto=require('node:crypto');
const {NEW_LOCK}=require('./c2-next-holdout.cjs');
const P='f5f2f66b31e5dc768c18be68bef29cbd0f97c8161fda212ce2ae1e64eb664b34';
const HEX40=/^[a-f0-9]{40}$/;
const HEX64=/^[a-f0-9]{64}$/;
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const id=x=>JSON.stringify([x.pr,x.rule,x.path,x.line]);
const LABEL=Object.freeze({
 pr:158,headSha:NEW_LOCK.cases[7].headSha,
 blobSha:'0b5b315b2c5bb54d8c6a2713f3c7d29085209f4f',
 path:'app/src/main/java/com/cardenaspiero255/gamehubultra/ai/UltraGeneralQueryRouter.kt',
 line:144,rule:'CURRENT_COMPARISON_FRESHNESS_QUALIFIER_NOT_RESPECTED',positive:true
});
const WKEYS=['schema','pr','headSha','blobSha','sourceSha256','oracleSha256',
 'originalLogSha256','counterfactualLogSha256','normalControlPassed',
 'originalDefectReproduced','correctedBehaviorPassed','originalCallerPinned',
 'candidateRead','baselineRead'];
const exact=(o,k)=>o&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).length===k.length&&k.every(v=>Object.hasOwn(o,v));
function fail(){throw Error('C2_RUN22_ORIGINAL_POSITIVE_BLOCKED');}
function presealRun22({prior,witness}={}){
 if(!prior||prior.schema!=='ultra-sentinel-c2-run21-owner-source-truth-seal/v1'||
  prior.status!=='SOURCE_BEHAVIOR_TRUTH_PARTIAL'||
  prior.repository!==NEW_LOCK.repository||prior.packetDigest!==P||
  prior.ownerRunId!==39075155081||prior.sourceCIAuthenticated!==true||
  prior.benchmarkCertified!==false||prior.sourcePositiveLabels!==9||
  prior.verifiedScopedNegativeLabels!==11||prior.neededAdditionalLabelsAtLeast!==100||
  prior.benchmarkScoredLabels!==0||prior.precision!==null||
  prior.recall!==null||prior.f1!==null||prior.canMerge!==false||
  prior.blindHoldoutCertified!==false||prior.tripleSPlusCertified!==false||
  prior.candidatePredictionsRead!==false||prior.baselinePredictionsRead!==false||
  prior.verdict!=='TRUTH_CORPUS_INCOMPLETE'||!HEX64.test(prior.presealDigest)||
  !HEX64.test(prior.previousTruthDigest)||!HEX64.test(prior.witnessDigest)||
  !Array.isArray(prior.labels)||prior.labels.length!==20)fail();
 const expectedPrevious=hash(JSON.stringify({
  schema:'ultra-sentinel-c2-run21-two-scoped-negatives-preseal/v1',
  previous:prior.previousTruthDigest,labels:prior.labels}));
 if(prior.presealDigest!==expectedPrevious)fail();
 const identities=new Set(),proofs=new Set();
 let positives=0,negatives=0;
 for(const v of prior.labels){
  if(!v||!Number.isInteger(v.pr)||!Number.isInteger(v.line)||v.line<1||
   typeof v.rule!=='string'||!v.rule||
   typeof v.path!=='string'||!v.path||!HEX40.test(v.headSha)||
   !HEX40.test(v.blobSha)||typeof v.positive!=='boolean'||
   !NEW_LOCK.cases.some(x=>x.pr===v.pr&&x.headSha===v.headSha)||
   identities.has(id(v))||
   (v.evidenceSha256!=null&&
    (!HEX64.test(v.evidenceSha256)||proofs.has(v.evidenceSha256))))fail();
  identities.add(id(v));
  if(v.evidenceSha256)proofs.add(v.evidenceSha256);
  if(v.positive)positives++;else negatives++;
 }
 if(positives!==9||negatives!==11||identities.has(id(LABEL))||
   !exact(witness,WKEYS)||
   witness.schema!=='ultra-sentinel-c2-run22-original-positive-witness/v1'||
   witness.pr!==LABEL.pr||witness.headSha!==LABEL.headSha||
   witness.blobSha!==LABEL.blobSha||
   !HEX64.test(witness.sourceSha256)||!HEX64.test(witness.oracleSha256)||
   !HEX64.test(witness.originalLogSha256)||
   !HEX64.test(witness.counterfactualLogSha256)||
   witness.normalControlPassed!==true||
   witness.originalDefectReproduced!==true||
   witness.correctedBehaviorPassed!==true||
   witness.originalCallerPinned!==true||
   witness.candidateRead!==false||witness.baselineRead!==false)fail();
 const evidenceSha256=hash(JSON.stringify(witness));
 if(proofs.has(evidenceSha256))fail();
 const labels=Object.freeze([Object.freeze({...LABEL,evidenceSha256}),
  ...prior.labels.map(x=>Object.freeze({...x}))]);
 const presealDigest=hash(JSON.stringify({
  schema:'ultra-sentinel-c2-run22-one-original-positive-preseal/v1',
  previous:prior.presealDigest,labels}));
 return Object.freeze({
  schema:'ultra-sentinel-c2-run22-one-original-positive-preseal/v1',
  status:'OWNER_CI_ATTESTATION_REQUIRED',
  repository:NEW_LOCK.repository,packetDigest:P,
  previousTruthDigest:prior.presealDigest,
  previousOwnerRun:39075155081,
  labels,sourcePositiveLabels:10,verifiedScopedNegativeLabels:11,
  neededAdditionalLabelsAtLeast:99,
  minimumAdditionalPositiveLabels:38,
  minimumAdditionalNegativeLabels:37,
  remainingDiversitySlots:24,benchmarkScoredLabels:0,
  precision:null,recall:null,f1:null,
  fpNonRegressionVerified:false,candidatePredictionsRead:false,
  baselinePredictionsRead:false,blindHoldoutCertified:false,
  tripleSPlusCertified:false,canMerge:false,canRepair:false,presealDigest
 });
}
module.exports={LABEL,presealRun22};
