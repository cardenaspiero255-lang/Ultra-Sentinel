'use strict';
const crypto=require('node:crypto');
const P='f5f2f66b31e5dc768c18be68bef29cbd0f97c8161fda212ce2ae1e64eb664b34';
const PREV='6bac3d64f843455c3f95728404ad53b25ece0748f1ed5c0e5439ae5a8cea97d4';
const REPO='cardenaspiero255-lang/gamehub-ultra';
const CASES=Object.freeze([
 Object.freeze({pr:154,headSha:'858c9ce5cb6a7916d63f2348432013e49d02ba79',
 blobSha:'063787d48784fd9b579e2c9a4d5ad4bbd7ab9d7a',
 sourceSha256:'f9fbdbd7aabd2dffbadc4b04b31280779bd7359624c081b9e64d532d8c40f65a',
 path:'app/src/main/java/com/cardenaspiero255/gamehubultra/ai/UltraMathEngine.kt',
 line:100,rule:'QUADRATIC_DISCRIMINANT_NONFINITE_DOUBLE_UNHANDLED',positive:true}),
 Object.freeze({pr:150,headSha:'4c6912d7ca17df0669f8a0d9667f34d2f2b205a9',
 blobSha:'f661289c8fb9d5ca59687f156923971f4cc4672d',
 sourceSha256:'b3147996af60bb304f65c400ca535ee07ad828921d0df870f9117d19422f49dc',
 path:'app/src/main/java/com/cardenaspiero255/gamehubultra/voice/UltraWakePlaybackGuard.kt',
 line:167,rule:'SPOKEN_STOP_PRIORITY_OVER_EXPLICIT_WAKE_BARGE_IN',positive:false})
]);
const WKEYS=['schema','pr','headSha','blobSha','sourceSha256','oracleSha256',
 'originalLogSha256','counterfactualLogSha256','normalControlPassed',
 'behaviorWitnessed','sensitivityProven','originalCallsitePinned',
 'candidateRead','baselineRead'];
const hex=/^[a-f0-9]{64}$/;
const id=x=>JSON.stringify([x.pr,x.rule,x.path,x.line]);
const validObj=(x,fields)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===fields.length&&fields.every(f=>Object.hasOwn(x,f));
function fail(){throw new Error('C2_RUN18_ORIGINAL_TRUTH_BLOCKED');}
function presealRun18({prior,witnesses}={}){
 if(!prior||prior.schema!=='ultra-sentinel-c2-run17-owner-source-truth-seal/v1'||
  prior.status!=='SOURCE_BEHAVIOR_TRUTH_PARTIAL'||
  prior.repository!==REPO||prior.packetDigest!==P||
  prior.presealDigest!==PREV||prior.ownerRunId!==39070029033||
  prior.sourceCIAuthenticated!==true||prior.benchmarkCertified!==false||
  prior.sourcePositiveLabels!==8||prior.verifiedScopedNegativeLabels!==8||
  prior.neededAdditionalLabelsAtLeast!==104||prior.benchmarkScoredLabels!==0||
  prior.precision!==null||prior.recall!==null||prior.f1!==null||
  prior.tripleSPlusCertified!==false||prior.fpNonRegressionVerified!==false||
  prior.candidatePredictionsRead!==false||prior.baselinePredictionsRead!==false||
  prior.canMerge!==false||prior.verdict!=='TRUTH_CORPUS_INCOMPLETE'||
  !Array.isArray(prior.labels)||prior.labels.length!==16)fail();
 const seen=new Set(),proofs=new Set();
 for(const label of prior.labels){
  if(!label||!Number.isInteger(label.pr)||!Number.isInteger(label.line)||
   label.line<=0||typeof label.rule!=='string'||typeof label.path!=='string'||
   typeof label.headSha!=='string'||typeof label.blobSha!=='string'||
   typeof label.positive!=='boolean')fail();
  if(seen.has(id(label)))fail();seen.add(id(label));
  if(label.evidenceSha256){
   if(!hex.test(label.evidenceSha256)||proofs.has(label.evidenceSha256))fail();
   proofs.add(label.evidenceSha256);
  }
 }
 if(prior.labels.filter(l=>l.positive).length!==8||prior.labels.filter(l=>!l.positive).length!==8)fail();
 if(!Array.isArray(witnesses)||witnesses.length!==2)fail();
 const added=[];
 for(let i=0;i<2;i++){
  const c=CASES[i],w=witnesses[i];
  if(!validObj(w,WKEYS)||w.schema!=='ultra-sentinel-c2-run18-original-witness/v1'||
   w.pr!==c.pr||w.headSha!==c.headSha||w.blobSha!==c.blobSha||
   w.sourceSha256!==c.sourceSha256||
   !hex.test(w.oracleSha256)||!hex.test(w.originalLogSha256)||
   !hex.test(w.counterfactualLogSha256)||
   w.normalControlPassed!==true||w.behaviorWitnessed!==true||
   w.sensitivityProven!==true||w.originalCallsitePinned!==true||
   w.candidateRead!==false||w.baselineRead!==false||seen.has(id(c)))fail();
  const evidenceSha256=crypto.createHash('sha256').update(JSON.stringify(w)).digest('hex');
  if(proofs.has(evidenceSha256))fail();
  seen.add(id(c));proofs.add(evidenceSha256);
  added.push(Object.freeze({...c,evidenceSha256}));
 }
 const labels=Object.freeze([...added,...prior.labels.map(x=>Object.freeze({...x}))]);
 const presealDigest=crypto.createHash('sha256').update(JSON.stringify({
  schema:'ultra-sentinel-c2-run18-two-truths-preseal/v1',previous:PREV,labels
 })).digest('hex');
 return Object.freeze({
  schema:'ultra-sentinel-c2-run18-two-truths-preseal/v1',
  status:'OWNER_CI_ATTESTATION_REQUIRED',repository:REPO,
  packetDigest:P,previousTruthDigest:PREV,previousOwnerRun:39070029033,
  labels,sourcePositiveLabels:9,verifiedScopedNegativeLabels:9,
  neededAdditionalLabelsAtLeast:102,benchmarkScoredLabels:0,
  precision:null,recall:null,f1:null,fpNonRegressionVerified:false,
  candidatePredictionsRead:false,baselinePredictionsRead:false,
  tripleSPlusCertified:false,canMerge:false,presealDigest
 });
}
module.exports={CASES,presealRun18};
