'use strict';
/**
 * Historical Kotlin original-source truth extension. Only interprets owner
 * attested oracle witnesses; it neither runs nor queries any detector.
 * Exact previous receipt must be authenticated by the owner workflow first.
 */
const crypto = require('node:crypto');
const {NEW_LOCK} = require('./c2-next-holdout.cjs');
const REPO = 'cardenaspiero255-lang/gamehub-ultra';
const HEX40 = /^[a-f0-9]{40}$/;
const HEX64 = /^[a-f0-9]{64}$/;
const WKEYS = ['schema','pr','headSha','blobSha','sourceSha256','oracleSha256',
 'originalLogSha256','counterfactualLogSha256','normalControlPassed',
 'behaviorWitnessed','sensitivityProven','productionCallsitePinned',
 'candidatePredictionsRead','baselinePredictionsRead'];
const CASES = Object.freeze([
 Object.freeze({
   pr:152,headSha:'104b7dc33e4c0341cec3fca81e3c8fbe3625357f',
   blobSha:'ed936aa687b08cf8d964d54f9d88e68bb12344ec',
   sourceSha256:'f06604f1bdd7bba80d060adac49d99d9edfb38234e47a91d2f861af3997435da',
   path:'app/src/main/java/com/cardenaspiero255/gamehubultra/data/AiProfileProposalStore.kt',
   line:41,rule:'STALE_PROPOSAL_VERSION_REPLACES_NEWER_ROLLBACK_STATE',
   rootCauseGroup:'state_version_monotonicity',positive:true
 }),
 Object.freeze({
   pr:151,headSha:'9ad983576c16c6c34d59283979d83c69ede50dce',
   blobSha:'742e440004d51743e8e4b02c40171f951edfd125',
   sourceSha256:'d8dbd5fadac170ed7b36c844f2480a03185046f381f64fd30feee0d20c219a70',
   path:'app/src/main/java/com/cardenaspiero255/gamehubultra/data/SessionCoachSessionStore.kt',
   line:185,rule:'SESSION_ID_MISMATCH_REJECTS_FOREIGN_FINISH',
   rootCauseGroup:'session_ownership_guard',positive:false
 })
]);
const sha256=x=>crypto.createHash('sha256').update(x).digest('hex');
const key=x=>JSON.stringify([x.pr,x.rule,x.path,x.line]);
const exact=(x,keys)=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
function fail(){throw Error('C2_RUN23_UNAUTHENTIC_ORIGINAL_TRUTH');}
function presealRun23({prior,witnesses}={}){
 if(!prior||prior.schema!=='ultra-sentinel-c2-run22-owner-source-truth-seal/v1'||
  prior.status!=='SOURCE_BEHAVIOR_TRUTH_PARTIAL'||
  prior.repository!==REPO||
  prior.packetDigest!=='f5f2f66b31e5dc768c18be68bef29cbd0f97c8161fda212ce2ae1e64eb664b34'||
  prior.ownerRunId!==39076132177||
  prior.sourceCIAuthenticated!==true||prior.benchmarkCertified!==false||
  prior.sourcePositiveLabels!==10||prior.verifiedScopedNegativeLabels!==11||
  prior.neededAdditionalLabelsAtLeast!==99||prior.benchmarkScoredLabels!==0||
  prior.precision!==null||prior.recall!==null||prior.f1!==null||
  prior.fpNonRegressionVerified!==false||prior.blindHoldoutCertified!==false||
  prior.tripleSPlusCertified!==false||prior.canMerge!==false||
  prior.candidatePredictionsRead!==false||prior.baselinePredictionsRead!==false||
  prior.verdict!=='TRUTH_CORPUS_INCOMPLETE'||
  !HEX64.test(prior.presealDigest)||!HEX64.test(prior.previousTruthDigest)||
  !HEX64.test(prior.witnessDigest)||!Array.isArray(prior.labels)||
  prior.labels.length!==21)fail();
 const recomputed=sha256(JSON.stringify({
  schema:'ultra-sentinel-c2-run22-one-original-positive-preseal/v1',
  previous:prior.previousTruthDigest,labels:prior.labels
 }));
 if(prior.presealDigest!==recomputed)fail();
 const ids=new Set(),proofs=new Set(),rootGroups=new Set();
 let positive=0,negative=0;
 for(const x of prior.labels){
  if(!x||!Number.isInteger(x.pr)||!Number.isInteger(x.line)||x.line<1||
   !HEX40.test(x.headSha)||!HEX40.test(x.blobSha)||
   typeof x.rule!=='string'||x.rule.length===0||
   typeof x.path!=='string'||x.path.length===0||
   typeof x.positive!=='boolean'||
   !NEW_LOCK.cases.some(c=>c.pr===x.pr&&c.headSha===x.headSha)||
   ids.has(key(x))||
   (x.evidenceSha256!=null&&
    (!HEX64.test(x.evidenceSha256)||proofs.has(x.evidenceSha256))))fail();
  ids.add(key(x));
  if(x.evidenceSha256)proofs.add(x.evidenceSha256);
  if(x.rootCauseGroup){
   if(typeof x.rootCauseGroup!=='string'||rootGroups.has(x.rootCauseGroup))fail();
   rootGroups.add(x.rootCauseGroup);
  }
  if(x.positive)positive++;else negative++;
 }
 if(positive!==10||negative!==11||
    !Array.isArray(witnesses)||witnesses.length!==CASES.length)fail();
 const additions=[];
 for(let i=0;i<CASES.length;i++){
  const c=CASES[i],w=witnesses[i];
  if(!exact(w,WKEYS)||
    w.schema!=='ultra-sentinel-c2-run20-original-witness/v1'||
    w.pr!==c.pr||w.headSha!==c.headSha||w.blobSha!==c.blobSha||
    w.sourceSha256!==c.sourceSha256||
    !HEX64.test(w.oracleSha256)||!HEX64.test(w.originalLogSha256)||
    !HEX64.test(w.counterfactualLogSha256)||
    w.normalControlPassed!==true||w.behaviorWitnessed!==true||
    w.sensitivityProven!==true||w.productionCallsitePinned!==true||
    w.candidatePredictionsRead!==false||w.baselinePredictionsRead!==false||
    ids.has(key(c))||rootGroups.has(c.rootCauseGroup))fail();
  const evidenceSha256=sha256(JSON.stringify(w));
  if(proofs.has(evidenceSha256))fail();
  ids.add(key(c));proofs.add(evidenceSha256);
  rootGroups.add(c.rootCauseGroup);
  additions.push(Object.freeze({...c,evidenceSha256}));
 }
 const labels=Object.freeze([...additions,
  ...prior.labels.map(x=>Object.freeze({...x}))]);
 const presealDigest=sha256(JSON.stringify({
  schema:'ultra-sentinel-c2-run23-two-store-source-truths-preseal/v1',
  previous:prior.presealDigest,labels
 }));
 return Object.freeze({
  schema:'ultra-sentinel-c2-run23-two-store-source-truths-preseal/v1',
  status:'OWNER_CI_ATTESTATION_REQUIRED',repository:REPO,
  packetDigest:prior.packetDigest,previousTruthDigest:prior.presealDigest,
  previousOwnerRun:39076132177,labels,
  sourcePositiveLabels:11,verifiedScopedNegativeLabels:12,
  neededAdditionalLabelsAtLeast:97,
  minimumAdditionalPositiveLabels:37,minimumAdditionalNegativeLabels:36,
  remainingDiversitySlots:24,
  benchmarkScoredLabels:0,
  precision:null,recall:null,f1:null,fpNonRegressionVerified:false,
  candidatePredictionsRead:false,baselinePredictionsRead:false,
  blindHoldoutCertified:false,tripleSPlusCertified:false,
  canMerge:false,canRepair:false,presealDigest
 });
}
module.exports={CASES,presealRun23};
