'use strict';
// Source-behavior truth, not a blinded performance benchmark.
const crypto=require('node:crypto');
const OLD='efb7da33efad947995f315621d42de2de9edace6d9d6b9e4d9e91cf4dd1aae12';
const P='f5f2f66b31e5dc768c18be68bef29cbd0f97c8161fda212ce2ae1e64eb664b34';
const REPO='cardenaspiero255-lang/gamehub-ultra';
const CASES=Object.freeze([
 Object.freeze({pr:152,headSha:'104b7dc33e4c0341cec3fca81e3c8fbe3625357f',
   blobSha:'ed936aa687b08cf8d964d54f9d88e68bb12344ec',
   sourceSha256:'f06604f1bdd7bba80d060adac49d99d9edfb38234e47a91d2f861af3997435da',
   path:'app/src/main/java/com/cardenaspiero255/gamehubultra/data/AiProfileProposalStore.kt',
   line:41,rule:'STALE_PROPOSAL_VERSION_REPLACES_NEWER_ROLLBACK_STATE',positive:true,
   rootCauseGroup:'state_version_monotonicity'}),
 Object.freeze({pr:151,headSha:'9ad983576c16c6c34d59283979d83c69ede50dce',
   blobSha:'742e440004d51743e8e4b02c40171f951edfd125',
   sourceSha256:'d8dbd5fadac170ed7b36c844f2480a03185046f381f64fd30feee0d20c219a70',
   path:'app/src/main/java/com/cardenaspiero255/gamehubultra/data/SessionCoachSessionStore.kt',
   line:185,rule:'SESSION_ID_MISMATCH_REJECTS_FOREIGN_FINISH',positive:false,
   rootCauseGroup:'session_ownership_guard'})
]);
const WKEYS=['schema','pr','headSha','blobSha','sourceSha256','oracleSha256',
'originalLogSha256','counterfactualLogSha256','normalControlPassed',
'behaviorWitnessed','sensitivityProven','productionCallsitePinned',
'candidatePredictionsRead','baselinePredictionsRead'];
const RX=/^[0-9a-f]{64}$/;
const id=l=>JSON.stringify([l.pr,l.rule,l.path,l.line]);
const fail=()=>{throw Error('C2_RUN20_SOURCE_TRUTH_BLOCKED');};
const exact=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
function preseal({prior,witnesses}={}){
 if(!prior||prior.schema!=='ultra-sentinel-c2-run18-owner-source-truth-seal/v1'||
  prior.status!=='SOURCE_BEHAVIOR_TRUTH_PARTIAL'||prior.repository!==REPO||
  prior.packetDigest!==P||prior.presealDigest!==OLD||prior.ownerRunId!==39071144969||
  prior.sourceCIAuthenticated!==true||prior.benchmarkCertified!==false||
  prior.sourcePositiveLabels!==9||prior.verifiedScopedNegativeLabels!==9||
  prior.neededAdditionalLabelsAtLeast!==102||prior.benchmarkScoredLabels!==0||
  prior.precision!==null||prior.recall!==null||prior.f1!==null||
  prior.fpNonRegressionVerified!==false||prior.tripleSPlusCertified!==false||
  prior.candidatePredictionsRead!==false||prior.baselinePredictionsRead!==false||
  prior.canMerge!==false||prior.verdict!=='TRUTH_CORPUS_INCOMPLETE'||
  !Array.isArray(prior.labels)||prior.labels.length!==18)fail();
 const seen=new Set(),proofs=new Set();
 for(const l of prior.labels){
  if(!l||!Number.isInteger(l.pr)||!Number.isInteger(l.line)||l.line<1||
   typeof l.path!=='string'||typeof l.rule!=='string'||typeof l.blobSha!=='string'||
   typeof l.headSha!=='string'||typeof l.positive!=='boolean')fail();
  const k=id(l);if(seen.has(k))fail();seen.add(k);
  if(l.evidenceSha256){
   if(!RX.test(l.evidenceSha256)||proofs.has(l.evidenceSha256))fail();
   proofs.add(l.evidenceSha256);
  }
 }
 if(prior.labels.filter(x=>x.positive).length!==9||prior.labels.filter(x=>!x.positive).length!==9)fail();
 if(!Array.isArray(witnesses)||witnesses.length!==2)fail();
 const added=[];
 for(let i=0;i<2;i++){
  const c=CASES[i],w=witnesses[i];
  if(!exact(w,WKEYS)||w.schema!=='ultra-sentinel-c2-run20-original-witness/v1'||
   w.pr!==c.pr||w.headSha!==c.headSha||w.blobSha!==c.blobSha||
   w.sourceSha256!==c.sourceSha256||
   !RX.test(w.oracleSha256)||!RX.test(w.originalLogSha256)||
   !RX.test(w.counterfactualLogSha256)||w.normalControlPassed!==true||
   w.behaviorWitnessed!==true||w.sensitivityProven!==true||
   w.productionCallsitePinned!==true||w.candidatePredictionsRead!==false||
   w.baselinePredictionsRead!==false||seen.has(id(c)))fail();
  const proof=crypto.createHash('sha256').update(JSON.stringify(w)).digest('hex');
  if(proofs.has(proof))fail();proofs.add(proof);seen.add(id(c));
  added.push(Object.freeze({...c,evidenceSha256:proof}));
 }
 const labels=Object.freeze([...added,...prior.labels.map(l=>Object.freeze({...l}))]);
 const presealDigest=crypto.createHash('sha256').update(JSON.stringify({
  schema:'ultra-sentinel-c2-run20-preseal/v1',previousTruthDigest:OLD,labels
 })).digest('hex');
 return Object.freeze({
  schema:'ultra-sentinel-c2-run20-preseal/v1',status:'OWNER_CI_ATTESTATION_REQUIRED',
  repository:REPO,packetDigest:P,previousTruthDigest:OLD,previousOwnerRun:39071144969,
  labels,sourcePositiveLabels:10,verifiedScopedNegativeLabels:10,neededAdditionalLabelsAtLeast:100,
  benchmarkScoredLabels:0,precision:null,recall:null,f1:null,
  fpNonRegressionVerified:false,candidatePredictionsRead:false,baselinePredictionsRead:false,
  independentBlindHoldoutCertified:false,
  tripleSPlusCertified:false,canMerge:false,presealDigest
 });
}
module.exports={CASES,preseal};
