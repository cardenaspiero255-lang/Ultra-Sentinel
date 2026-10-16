'use strict';
/**
 * Evaluate only the three SHA-sealed, previously unseen positive witnesses.
 * No true-negative labels, so precision, FP count/non-regression, global recall
 * and F1 are NOT estimable. Fail closed on provenance or tampered data.
 */
const {LOCK}=require('./c2-unseen-holdout.cjs');
const TRUTH_SHA256='dce263a427b05c2fcb4fa2c52509ed6a82964772fe9c4f0bd526230c77809a59';
const LABELS=Object.freeze([
 Object.freeze({pr:205,rule:'CLAIM_VALUE_UNIT_CASE_COLLISION',
 path:'app/src/main/java/com/cardenaspiero255/gamehubultra/ai/UltraFrontierV2.kt',line:318,positive:true}),
 Object.freeze({pr:206,rule:'TTS_UTF16_SURROGATE_SPLIT',
 path:'app/src/main/java/com/cardenaspiero255/gamehubultra/voice/UltraSpeechChunker.kt',line:26,positive:true}),
 Object.freeze({pr:208,rule:'STALE_VOICE_ENABLED_AFTER_MIC_PERMISSION_REVOKED',
 path:'app/src/main/java/com/cardenaspiero255/gamehubultra/voice/ContinuousVoiceController.kt',line:52,positive:true})
]);
const BLOBS=Object.freeze({core:'db29f94be1e0afb791a241d26f449695df0eafd0',
 semantic:'b8b6e79c1c544a9c22ea5aa0ea857881a0e1b6d9'});
const TRUTH_DIGEST='544fb6e0c035239166097bf5abac894ccf8d0bedc234626326a31cd7e6ee7dec';
const FINDING=/^[A-Z][A-Z0-9_]{2,80}$/;
const FPATH=/^[A-Za-z0-9_.\/-]{1,240}$/;
function fail(){throw Error('C2_UNSEEN_UNBLIND_BLOCKED');}
function exact(o,keys){
 return o!==null&&typeof o==='object'&&!Array.isArray(o)&&
  Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
}
function verifyTruth(t){
 if(!t||t.schema!=='ultra-sentinel-c2-owner-truth-seal/v3'||
 t.status!=='SOURCE_BEHAVIOR_TRUTH_PARTIAL'||
 t.repository!==LOCK.repository||t.modelSourceSha!==LOCK.modelSourceSha||
 t.sealedTruthDigest!==TRUTH_DIGEST||
 t.verifiedPositiveBehavior!==3||t.verifiedNegativeFindingLabels!==0||
 t.benignBehaviorControls!==3||
 t.includesPredictions!==false||t.includesBaseline!==false||
 t.precision!==null||t.recall!==null||t.f1!==null||
 t.baselineComparable!==false||t.tripleSPlusCertified!==false||
 !Array.isArray(t.labels)||t.labels.length!==LABELS.length)fail();
 for(let i=0;i<LABELS.length;i++){
  if(!exact(t.labels[i],['pr','rule','path','line','positive'])||
   Object.keys(LABELS[i]).some(k=>t.labels[i][k]!==LABELS[i][k]))fail();
 }
}
function verifyCandidate(c){
 if(!exact(c,['schema','repository','modelSourceSha','coreGitBlobs',
  'sourceKind','samples','candidateOnly','labelsRead','baselineRead',
  'allSamplesComplete','globalPrecision','globalRecall','globalF1',
  'fpNonRegressionVerified','tripleSPlusCertified','mergeAllowed','autoRepair'])||
  c.schema!=='ultra-sentinel-c2-unseen-core-capture/v1'||
  c.repository!==LOCK.repository||c.modelSourceSha!==LOCK.modelSourceSha||
  !exact(c.coreGitBlobs,['core','semantic'])||
  Object.keys(BLOBS).some(k=>c.coreGitBlobs[k]!==BLOBS[k])||
  c.sourceKind!=='FROZEN_ORIGINAL_PR_DIFF'||c.candidateOnly!==true||
  c.labelsRead!==false||c.baselineRead!==false||
  c.allSamplesComplete!==true||c.globalPrecision!==null||
  c.globalRecall!==null||c.globalF1!==null||
  c.fpNonRegressionVerified!==false||c.tripleSPlusCertified!==false||
  c.mergeAllowed!==false||c.autoRepair!==false||
  !Array.isArray(c.samples)||c.samples.length!==3)fail();
 for(let i=0;i<3;i++){
  const p=c.samples[i],pr=[205,206,208][i],locked=LOCK.cases.find(x=>x.pr===pr);
  if(!exact(p,['pr','headSha','baseSha','changedFiles','source',
   'partial','nonPositionalFindings','findings'])||
   p.pr!==pr||p.headSha!==locked.headSha||p.baseSha!==locked.baseSha||
   p.changedFiles!==locked.changedFiles||
   p.source!=='AUTHENTICATED_IMMUTABLE_GITHUB_DIFF'||p.partial!==false||
   !Number.isSafeInteger(p.nonPositionalFindings)||
   p.nonPositionalFindings<0||p.nonPositionalFindings>40||
   !Array.isArray(p.findings)||p.findings.length>40)fail();
  const seen=new Set();
  for(const f of p.findings){
   if(!exact(f,['rule','path','line'])||!FINDING.test(f.rule||'')||
     !FPATH.test(f.path||'')||f.path.startsWith('/')||
     f.path.split('/').includes('..')||
     !Number.isSafeInteger(f.line)||f.line<1||f.line>1000000)fail();
   const id=JSON.stringify([f.rule,f.path,f.line]);
   if(seen.has(id))fail();seen.add(id);
  }
 }
}
function evaluateFirstUnseenHoldout({truth,candidate}={}){
 verifyTruth(truth);verifyCandidate(candidate);
 let detected=0,extra=0;
 const byPr=[];
 for(let i=0;i<LABELS.length;i++){
  const label=LABELS[i],sample=candidate.samples[i];
  const found=sample.findings.some(f=>f.rule===label.rule&&
   f.path===label.path&&f.line===label.line);
  if(found)detected++;
  extra+=sample.findings.filter(f=>f.rule!==label.rule||
   f.path!==label.path||f.line!==label.line).length;
  byPr.push(Object.freeze({pr:label.pr,knownPositiveDetected:found,
   unlabelledAdditionalFindings:sample.findings.length-(found?1:0)}));
 }
 return Object.freeze({
  schema:'ultra-sentinel-c2-unseen-first-unblinding/v1',
  repository:LOCK.repository,modelSourceSha:LOCK.modelSourceSha,
  truthDigest:TRUTH_DIGEST,
  observedKnownPositives:Object.freeze({
   total:3,detected,missed:3-detected,observedHitRate:detected/3
  }),
  perPr:Object.freeze(byPr),unlabelledCandidateFindings:extra,
  verifiedNegativeFindingLabels:0,verifiedFalsePositives:null,
  falsePositiveRate:null,globalPrecision:null,globalRecall:null,globalF1:null,
  baselineComparable:false,fpNonRegressionVerified:false,
  certified95Percent:false,tripleSPlusCertified:false,
  autoRepair:false,mergeAllowed:false,
  verdict:'SMALL_HOLDOUT_NOT_CERTIFIABLE',
  limitation:'Three held-out positives allow an observed hit rate only. '+
   'Unlabelled candidate findings cannot be counted as false positives. '+
   'No finding-level negatives, equal-SHA legacy baseline or representative '+
   '120-label corpus exists; no global precision, recall or F1 claim is valid.'
 });
}
module.exports={TRUTH_SHA256,TRUTH_DIGEST,evaluateFirstUnseenHoldout};
