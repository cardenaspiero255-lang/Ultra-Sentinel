'use strict';
// Owner-authorized original Kotlin behavior receipts. Does not read detector predictions.
const crypto=require('node:crypto');
const {NEW_LOCK}=require('./c2-next-holdout.cjs');
const P='f5f2f66b31e5dc768c18be68bef29cbd0f97c8161fda212ce2ae1e64eb664b34';
const PREV17='6bac3d64f843455c3f95728404ad53b25ece0748f1ed5c0e5439ae5a8cea97d4';
const REPO='cardenaspiero255-lang/gamehub-ultra';
const HEX40=/^[0-9a-f]{40}$/;
const HEX64=/^[0-9a-f]{64}$/;
const CASES=Object.freeze([
 Object.freeze({pr:151,headSha:NEW_LOCK.cases[1].headSha,
  blobSha:'adb11032b9b7f62f865228dfa1c27258ca3fa0df',
  path:'app/src/main/java/com/cardenaspiero255/gamehubultra/domain/AiSessionCoach.kt',
  line:293,rule:'SESSION_COACH_BATTERY_INCREASE_NO_FALSE_DROP_ALERT',positive:false}),
 Object.freeze({pr:154,headSha:NEW_LOCK.cases[4].headSha,
  blobSha:'3ecb3b3893d8f710dd7f5203f8378bc784841baf',
  path:'app/src/main/java/com/cardenaspiero255/gamehubultra/domain/ThermalPredictionEngine.kt',
  line:73,rule:'THERMAL_POLICY_REJECTS_UNDERSAMPLED_CONFIGURATION',positive:false})
]);
const WKEYS=['schema','pr','headSha','blobSha','sourceSha256','oracleSha256',
 'originalLogSha256','counterfactualLogSha256','normalControlPassed',
 'behaviorWitnessed','sensitivityProven','originalCallsitePinned','candidateRead','baselineRead'];
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const identity=x=>JSON.stringify([x.pr,x.rule,x.path,x.line]);
const exact=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
function fail(){throw Error('C2_RUN21_ORIGINAL_TRUTH_BLOCKED');}
function presealRun21({prior,witnesses}={}){
 if(!prior||prior.schema!=='ultra-sentinel-c2-run18-owner-source-truth-seal/v1'||
  prior.status!=='SOURCE_BEHAVIOR_TRUTH_PARTIAL'||
  prior.repository!==REPO||prior.packetDigest!==P||
  prior.previousTruthDigest!==PREV17||
  prior.ownerRunId!==39071144969||
  prior.sourceCIAuthenticated!==true||prior.benchmarkCertified!==false||
  prior.sourcePositiveLabels!==9||prior.verifiedScopedNegativeLabels!==9||
  prior.neededAdditionalLabelsAtLeast!==102||prior.benchmarkScoredLabels!==0||
  prior.precision!==null||prior.recall!==null||prior.f1!==null||
  prior.tripleSPlusCertified!==false||prior.fpNonRegressionVerified!==false||
  prior.candidatePredictionsRead!==false||prior.baselinePredictionsRead!==false||
  prior.canMerge!==false||prior.verdict!=='TRUTH_CORPUS_INCOMPLETE'||
  !Array.isArray(prior.labels)||prior.labels.length!==18||
  !HEX64.test(prior.presealDigest)||!HEX64.test(prior.witnessDigest))fail();
 const priorDigest=hash(JSON.stringify({
  schema:'ultra-sentinel-c2-run18-two-truths-preseal/v1',
  previous:PREV17,labels:prior.labels
 }));
 if(prior.presealDigest!==priorDigest)fail();
 const ids=new Set(),proofs=new Set(),positives=[];
 for(const label of prior.labels){
  if(!label||!Number.isInteger(label.pr)||!Number.isInteger(label.line)||
    label.line<=0||typeof label.rule!=='string'||!label.rule||
    typeof label.path!=='string'||!label.path||
    !HEX40.test(label.headSha)||!HEX40.test(label.blobSha)||
    typeof label.positive!=='boolean'||
    (label.evidenceSha256!=null&&!HEX64.test(label.evidenceSha256))||
    !NEW_LOCK.cases.some(c=>c.pr===label.pr&&c.headSha===label.headSha)||
    ids.has(identity(label))||
    (label.evidenceSha256!=null&&proofs.has(label.evidenceSha256)))fail();
  ids.add(identity(label));if(label.evidenceSha256)proofs.add(label.evidenceSha256);
  positives.push(label.positive);
 }
 if(positives.filter(Boolean).length!==9||positives.filter(x=>!x).length!==9)fail();
 if(!Array.isArray(witnesses)||witnesses.length!==2)fail();
 const added=[];
 for(let i=0;i<CASES.length;i++){
  const c=CASES[i],w=witnesses[i];
  if(!exact(w,WKEYS)||w.schema!=='ultra-sentinel-c2-run21-original-negative-witness/v1'||
    w.pr!==c.pr||w.headSha!==c.headSha||w.blobSha!==c.blobSha||
    !HEX64.test(w.sourceSha256)||!HEX64.test(w.oracleSha256)||
    !HEX64.test(w.originalLogSha256)||!HEX64.test(w.counterfactualLogSha256)||
    w.normalControlPassed!==true||w.behaviorWitnessed!==true||
    w.sensitivityProven!==true||w.originalCallsitePinned!==true||
    w.candidateRead!==false||w.baselineRead!==false||
    ids.has(identity(c)))fail();
  const evidenceSha256=hash(JSON.stringify(w));
  if(proofs.has(evidenceSha256))fail();
  proofs.add(evidenceSha256);ids.add(identity(c));
  added.push(Object.freeze({...c,evidenceSha256}));
 }
 const labels=Object.freeze([...added,...prior.labels.map(x=>Object.freeze({...x}))]);
 const presealDigest=hash(JSON.stringify({
  schema:'ultra-sentinel-c2-run21-two-scoped-negatives-preseal/v1',
  previous:prior.presealDigest,labels
 }));
 return Object.freeze({
  schema:'ultra-sentinel-c2-run21-two-scoped-negatives-preseal/v1',
  status:'OWNER_CI_ATTESTATION_REQUIRED',
  repository:REPO,packetDigest:P,
  previousTruthDigest:prior.presealDigest,previousOwnerRun:39071144969,
  labels,sourcePositiveLabels:9,verifiedScopedNegativeLabels:11,
  neededAdditionalLabelsAtLeast:100,
  minimumAdditionalPositiveLabels:39,
  minimumAdditionalNegativeLabels:37,
  remainingDiversitySlots:24,
  benchmarkScoredLabels:0,
  precision:null,recall:null,f1:null,
  fpNonRegressionVerified:false,candidatePredictionsRead:false,
  baselinePredictionsRead:false,blindHoldoutCertified:false,
  tripleSPlusCertified:false,canMerge:false,canRepair:false,
  presealDigest
 });
}
module.exports={CASES,presealRun21};
