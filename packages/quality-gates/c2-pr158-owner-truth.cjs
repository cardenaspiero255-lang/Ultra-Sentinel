'use strict';
// Historical source truth only; never calculate detector metrics or modify the frozen Core.
const crypto=require('node:crypto');
const {NEW_LOCK}=require('./c2-next-holdout.cjs');
const OLD='3872fdcd4e42fe3ed09192f29fe44af3a25ba2f9419f781446b0e549aecd8efc';
const PRIOR_RUN=39057159822;
const HEAD='9d8572afedc634ac07dae58a0da326ea62bdc1da';
const BLOB='0d18a43a8e36ea3edacc2cad72071d96aa31626e';
const SOURCE_SHA256='99a229e357823d65d7b04b642c9cf1ba312a35d0308da635ee38c425c8576591';
const PATH='app/src/main/java/com/cardenaspiero255/gamehubultra/ai/UltraFrontierWorldState.kt';
const RULE='ADVANCED_SIGNAL_TTL_REFRESH_EXTENSION';
const RX=/^[a-f0-9]{64}$/;
const FIELDS=['schema','pr','headSha','blobSha','sourceSha256','oracleSha256','originalLogSha256','counterfactualLogSha256','positiveControlPassed','originalDefectReproduced','counterfactualPassed','productionCallsitesAttested','planningConsumerAttested','candidateRead','baselineRead'];
const exact=(o,f)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===f.length&&f.every(k=>Object.hasOwn(o,k));
function reject(){throw Error('C2_PR158_SOURCE_TRUTH_BLOCKED');}
const labelId=l=>JSON.stringify([l.pr,l.rule,l.path,l.line]);
function presealPr158({prior,witness}={}){
 if(!prior||prior.schema!=='ultra-sentinel-c2-pr152-owner-source-truth-seal/v1'||
  prior.status!=='SOURCE_BEHAVIOR_TRUTH_PARTIAL'||prior.repository!==NEW_LOCK.repository||
  prior.packetDigest!=='f5f2f66b31e5dc768c18be68bef29cbd0f97c8161fda212ce2ae1e64eb664b34') reject();
 if(prior.presealDigest!==OLD||prior.ownerRunId!==PRIOR_RUN||
  prior.sourceCIAuthenticated!==true||prior.benchmarkCertified!==false||
  prior.sourcePositiveLabels!==6||prior.verifiedScopedNegativeLabels!==5||
  prior.neededAdditionalLabelsAtLeast!==109||prior.benchmarkScoredLabels!==0||
  prior.precision!==null||prior.recall!==null||prior.f1!==null||
  prior.fpNonRegressionVerified!==false||prior.tripleSPlusCertified!==false||
  prior.candidatePredictionsRead!==false||prior.baselinePredictionsRead!==false||
  prior.canMerge!==false||prior.verdict!=='TRUTH_CORPUS_INCOMPLETE'||
  !Array.isArray(prior.labels)||prior.labels.length!==11) reject();
 const seen=new Set();
 for(const l of prior.labels){
  if(!l||!Number.isInteger(l.pr)||!Number.isInteger(l.line)||l.line<=0||
  typeof l.rule!=='string'||typeof l.path!=='string'||typeof l.headSha!=='string'||
  typeof l.blobSha!=='string'||typeof l.positive!=='boolean')reject();
  const id=labelId(l);if(seen.has(id))reject();seen.add(id);
 }
 if(prior.labels.filter(l=>l.positive).length!==6||prior.labels.filter(l=>!l.positive).length!==5)reject();
 if(!exact(witness,FIELDS)||witness.schema!=='ultra-sentinel-c2-pr158-advanced-ttl-witness/v1'||
  witness.pr!==158||witness.headSha!==HEAD||witness.blobSha!==BLOB||
  witness.sourceSha256!==SOURCE_SHA256||
  !RX.test(witness.oracleSha256)||!RX.test(witness.originalLogSha256)||
  !RX.test(witness.counterfactualLogSha256)||
  witness.positiveControlPassed!==true||witness.originalDefectReproduced!==true||
  witness.counterfactualPassed!==true||witness.productionCallsitesAttested!==true||
  witness.planningConsumerAttested!==true||witness.candidateRead!==false||
  witness.baselineRead!==false)reject();
 const label={pr:158,headSha:HEAD,blobSha:BLOB,rule:RULE,path:PATH,line:114,positive:true};
 if(seen.has(labelId(label)))reject();
 const evidenceSha256=crypto.createHash('sha256').update(JSON.stringify({
  source:SOURCE_SHA256,oracle:witness.oracleSha256,original:witness.originalLogSha256,
  counterfactual:witness.counterfactualLogSha256,producer:true,consumer:true
 })).digest('hex');
 if(prior.labels.some(l=>l.evidenceSha256===evidenceSha256))reject();
 const labels=[Object.freeze({...label,evidenceSha256}),...prior.labels.map(l=>Object.freeze({...l}))];
 const digest=crypto.createHash('sha256').update(JSON.stringify({
  schema:'ultra-sentinel-c2-pr158-owner-preseal/v1',priorSealDigest:OLD,labels
 })).digest('hex');
 return Object.freeze({
  schema:'ultra-sentinel-c2-pr158-owner-preseal/v1',status:'OWNER_CI_ATTESTATION_REQUIRED',
  repository:NEW_LOCK.repository,packetDigest:prior.packetDigest,priorSealDigest:OLD,
  priorOwnerRun:PRIOR_RUN,evidenceSha256,labels,sourcePositiveLabels:7,
  verifiedScopedNegativeLabels:5,neededAdditionalLabelsAtLeast:108,
  benchmarkScoredLabels:0,precision:null,recall:null,f1:null,
  fpNonRegressionVerified:false,candidatePredictionsRead:false,baselinePredictionsRead:false,
  tripleSPlusCertified:false,canMerge:false,presealDigest:digest
 });
}
module.exports={presealPr158};
