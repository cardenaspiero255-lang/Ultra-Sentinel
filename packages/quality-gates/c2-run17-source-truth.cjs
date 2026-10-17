'use strict';
// Run17: two original-source behavior witnesses. No training, scoring or repaired source commits.
const crypto=require('node:crypto');
const PACKET='f5f2f66b31e5dc768c18be68bef29cbd0f97c8161fda212ce2ae1e64eb664b34';
const PRIOR='c588dd2ceaf0e95644c30d6f0ca8b07fe7a8a06fb77e92f46954a016cadd23c3';
const REPO='cardenaspiero255-lang/gamehub-ultra';
const CASES=Object.freeze([
 Object.freeze({pr:155,headSha:'2289f4e4cda55ddaa50f2016113ded82dc17203c',
  blobSha:'8696360219231f3f1477d5ad21c93bca2197e281',
  sourceSha256:'cd1c9d6a1a6dfb15a67650a3b38aea3611e855b066e4f6217dd7101d6285a67b',
  rule:'NONFINITE_HIGH_DRAIN_POLICY_THRESHOLD',positive:true,
  path:'app/src/main/java/com/cardenaspiero255/gamehubultra/domain/BatteryAwareGamingEngine.kt',
  line:12}),
 Object.freeze({pr:158,headSha:'9d8572afedc634ac07dae58a0da326ea62bdc1da',
  blobSha:'e1423d747bdeeb556c4633febcfc9455e1f3cef6',
  sourceSha256:'921bf26b622392d06021ada2635a2a44d226c45c379156322ceb08892ed85430',
  rule:'LOCAL_QUERY_NEVER_TOUCHES_RESEARCH_GATEWAY',positive:false,
  path:'app/src/main/java/com/cardenaspiero255/gamehubultra/ai/UltraQueryExecutionCoordinator.kt',
  line:50})
]);
const WKEYS=['schema','pr','headSha','blobSha','sourceSha256','oracleSha256',
 'originalLogSha256','counterfactualLogSha256','originalControlPassed','behaviorObserved',
 'mutationSensitive','callsitePinned','candidateRead','baselineRead'];
const hex=/^[a-f0-9]{64}$/;
function fail(){throw Error('C2_RUN17_SOURCE_TRUTH_BLOCKED');}
const exact=(o,keys)=>o!==null&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const id=o=>JSON.stringify([o.pr,o.rule,o.path,o.line]);
function presealRun17({prior,witnesses}={}){
 if(!prior||prior.schema!=='ultra-sentinel-c2-run16-two-negatives-owner-seal/v1'||
  prior.status!=='SOURCE_BEHAVIOR_TRUTH_PARTIAL'||prior.repository!==REPO||
  prior.packetDigest!==PACKET||prior.presealDigest!==PRIOR||prior.ownerRunId!==39067708985||
  prior.sourceCIAuthenticated!==true||prior.benchmarkCertified!==false||
  prior.sourcePositiveLabels!==7||prior.verifiedScopedNegativeLabels!==7||
  prior.neededAdditionalLabelsAtLeast!==106||prior.benchmarkScoredLabels!==0||
  prior.precision!==null||prior.recall!==null||prior.f1!==null||
  prior.tripleSPlusCertified!==false||prior.fpNonRegressionVerified!==false||
  prior.candidatePredictionsRead!==false||prior.baselinePredictionsRead!==false||
  prior.canMerge!==false||prior.verdict!=='TRUTH_CORPUS_INCOMPLETE'||
  !Array.isArray(prior.labels)||prior.labels.length!==14)fail();
 const seen=new Set(),proof=new Set();
 for(const l of prior.labels){
  if(!l||!Number.isInteger(l.pr)||!Number.isInteger(l.line)||l.line<=0||
    typeof l.path!=='string'||typeof l.rule!=='string'||
    typeof l.headSha!=='string'||typeof l.blobSha!=='string'||
    typeof l.positive!=='boolean')fail();
  const k=id(l);if(seen.has(k))fail();seen.add(k);
  if(l.evidenceSha256){
   if(!hex.test(l.evidenceSha256)||proof.has(l.evidenceSha256))fail();
   proof.add(l.evidenceSha256);
  }
 }
 if(prior.labels.filter(l=>l.positive).length!==7||prior.labels.filter(l=>!l.positive).length!==7)fail();
 if(!Array.isArray(witnesses)||witnesses.length!==2)fail();
 const next=[];
 for(let i=0;i<2;i++){
  const c=CASES[i],w=witnesses[i];
  if(!exact(w,WKEYS)||w.schema!=='ultra-sentinel-c2-run17-witness/v1'||
    w.pr!==c.pr||w.headSha!==c.headSha||w.blobSha!==c.blobSha||
    w.sourceSha256!==c.sourceSha256||
    !hex.test(w.oracleSha256)||!hex.test(w.originalLogSha256)||
    !hex.test(w.counterfactualLogSha256)||
    w.originalControlPassed!==true||w.behaviorObserved!==true||
    w.mutationSensitive!==true||w.callsitePinned!==true||
    w.candidateRead!==false||w.baselineRead!==false)fail();
  if(seen.has(id(c)))fail();
  const evidenceSha256=crypto.createHash('sha256').update(JSON.stringify(w)).digest('hex');
  if(proof.has(evidenceSha256))fail();
  next.push(Object.freeze({...c,evidenceSha256}));
  seen.add(id(c));proof.add(evidenceSha256);
 }
 const labels=Object.freeze([...next,...prior.labels.map(x=>Object.freeze({...x}))]);
 const presealDigest=crypto.createHash('sha256').update(JSON.stringify({
  schema:'ultra-sentinel-c2-run17-two-behaviors-preseal/v1',prior:PRIOR,labels
 })).digest('hex');
 return Object.freeze({
  schema:'ultra-sentinel-c2-run17-two-behaviors-preseal/v1',
  status:'OWNER_CI_ATTESTATION_REQUIRED',repository:REPO,
  packetDigest:PACKET,previousTruthDigest:PRIOR,previousOwnerRun:39067708985,
  labels,sourcePositiveLabels:8,verifiedScopedNegativeLabels:8,
  neededAdditionalLabelsAtLeast:104,benchmarkScoredLabels:0,
  precision:null,recall:null,f1:null,fpNonRegressionVerified:false,
  candidatePredictionsRead:false,baselinePredictionsRead:false,
  tripleSPlusCertified:false,canMerge:false,presealDigest
 });
}
module.exports={CASES,presealRun17};
