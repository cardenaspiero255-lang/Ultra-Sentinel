'use strict';
// Two scope-limited genuine negatives, not a new benchmark or SSS+ certification.
const crypto=require('node:crypto');
const P='f5f2f66b31e5dc768c18be68bef29cbd0f97c8161fda212ce2ae1e64eb664b34';
const PREV='aa5de2d6028806b2f88aa1b027a5a8ede2d1aa75c3edd6385879ab100d68f0e3';
const SOURCE_REPO='cardenaspiero255-lang/gamehub-ultra';
const CASES=Object.freeze([
 Object.freeze({pr:151,headSha:'9ad983576c16c6c34d59283979d83c69ede50dce',
  blobSha:'f623999ecd31f6961bc48f34d834674494b7d1db',
  sourceSha256:'635d678a15f914e2fc3fb84a05839cf2eef8187c4221a5c8f3e4c3128157ea7e',
  rule:'ACTIVE_SESSION_ONLY_LATEST_THREE_OBSERVATIONS',
  path:'app/src/main/java/com/cardenaspiero255/gamehubultra/ui/components/SessionCoachPresentation.kt',line:22,positive:false}),
 Object.freeze({pr:153,headSha:'6508cc124076b9dea437ea1efc213d3ce55d7baf',
  blobSha:'18911c26a9afaf051fda0e9ea14cdaccf943a47b',
  sourceSha256:'8e136084412a57074f3c3a5ce8d7e209cef8274f79a752b5d1dc957447f7ee15',
  rule:'ADAPTIVE_PROFILE_WRITE_ISOLATED_FROM_EXPLICIT_CALLBACK',
  path:'app/src/main/java/com/cardenaspiero255/gamehubultra/data/GameStateOwnershipContracts.kt',line:69,positive:false})
]);
const RX=/^[0-9a-f]{64}$/;
const KEYS=['schema','pr','headSha','blobSha','sourceSha256','oracleSha256',
 'originalLogSha256','mutantLogSha256','originalPassed','controlsPassed',
 'mutantKilled','productionCallsitesAttested','candidateInspected','baselineInspected'];
const eq=(o,keys)=>o!==null&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).length===keys.length&&keys.every(x=>Object.hasOwn(o,x));
const identity=o=>JSON.stringify([o.pr,o.rule,o.path,o.line]);
function fail(){throw Error('C2_RUN16_NEGATIVES_BLOCKED');}
function presealTwoNegatives({prior,witnesses}={}){
 if(!prior||prior.schema!=='ultra-sentinel-c2-pr158-owner-source-truth-seal/v1'||
  prior.status!=='SOURCE_BEHAVIOR_TRUTH_PARTIAL'||prior.repository!==SOURCE_REPO||
  prior.packetDigest!==P||prior.presealDigest!==PREV||prior.ownerRunId!==39059101315||
  prior.sourceCIAuthenticated!==true||prior.benchmarkCertified!==false||
  prior.sourcePositiveLabels!==7||prior.verifiedScopedNegativeLabels!==5||
  prior.neededAdditionalLabelsAtLeast!==108||prior.benchmarkScoredLabels!==0||
  prior.precision!==null||prior.recall!==null||prior.f1!==null||
  prior.tripleSPlusCertified!==false||prior.fpNonRegressionVerified!==false||
  prior.candidatePredictionsRead!==false||prior.baselinePredictionsRead!==false||
  prior.canMerge!==false||prior.verdict!=='TRUTH_CORPUS_INCOMPLETE'||
  !Array.isArray(prior.labels)||prior.labels.length!==12)fail();
 const oldIds=new Set(),oldEvidence=new Set();
 for(const label of prior.labels){
  if(!label||!Number.isInteger(label.pr)||!Number.isInteger(label.line)||label.line<1||
   typeof label.path!=='string'||typeof label.rule!=='string'||
   typeof label.headSha!=='string'||typeof label.blobSha!=='string'||
   typeof label.positive!=='boolean')fail();
  const id=identity(label);if(oldIds.has(id))fail();oldIds.add(id);
  if(label.evidenceSha256!==undefined){
   if(!RX.test(label.evidenceSha256)||oldEvidence.has(label.evidenceSha256))fail();
   oldEvidence.add(label.evidenceSha256);
  }
 }
 if(prior.labels.filter(x=>x.positive).length!==7||
    prior.labels.filter(x=>!x.positive).length!==5)fail();
 if(!Array.isArray(witnesses)||witnesses.length!==2)fail();
 const added=[];
 for(let i=0;i<2;i++){
  const w=witnesses[i],c=CASES[i];
  if(!eq(w,KEYS)||w.schema!=='ultra-sentinel-c2-run16-negative-witness/v1'||
   w.pr!==c.pr||w.headSha!==c.headSha||w.blobSha!==c.blobSha||
   w.sourceSha256!==c.sourceSha256||
   !RX.test(w.oracleSha256)||!RX.test(w.originalLogSha256)||!RX.test(w.mutantLogSha256)||
   w.originalPassed!==true||w.controlsPassed!==true||w.mutantKilled!==true||
   w.productionCallsitesAttested!==true||
   w.candidateInspected!==false||w.baselineInspected!==false)fail();
  if(oldIds.has(identity(c)))fail();
  const evidenceSha256=crypto.createHash('sha256').update(JSON.stringify(w),'utf8').digest('hex');
  if(oldEvidence.has(evidenceSha256))fail();
  oldIds.add(identity(c));oldEvidence.add(evidenceSha256);
  added.push(Object.freeze({...c,evidenceSha256}));
 }
 const labels=Object.freeze([...added,...prior.labels.map(x=>Object.freeze({...x}))]);
 const digest=crypto.createHash('sha256').update(JSON.stringify({
  schema:'ultra-sentinel-c2-run16-two-negatives-preseal/v1',previous:PREV,labels
 }),'utf8').digest('hex');
 return Object.freeze({
  schema:'ultra-sentinel-c2-run16-two-negatives-preseal/v1',
  status:'OWNER_CI_ATTESTATION_REQUIRED',repository:SOURCE_REPO,
  packetDigest:P,previousTruthDigest:PREV,previousOwnerRun:39059101315,
  labels,sourcePositiveLabels:7,verifiedScopedNegativeLabels:7,
  neededAdditionalLabelsAtLeast:106,benchmarkScoredLabels:0,
  precision:null,recall:null,f1:null,fpNonRegressionVerified:false,
  candidatePredictionsRead:false,baselinePredictionsRead:false,
  tripleSPlusCertified:false,canMerge:false,presealDigest:digest
 });
}
module.exports={CASES,presealTwoNegatives};
