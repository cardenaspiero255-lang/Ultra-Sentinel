'use strict';
const {LOCK}=require('./c2-unseen-holdout.cjs');
/** PREVIOUSLY REVEALED data: engineering regressions, not validation data. */
const EXPECTED=Object.freeze([
 {pr:205,rule:'CLAIM_VALUE_UNIT_CASE_COLLISION',
  path:'app/src/main/java/com/cardenaspiero255/gamehubultra/ai/UltraFrontierV2.kt',line:318},
 {pr:206,rule:'TTS_UTF16_SURROGATE_SPLIT',
  path:'app/src/main/java/com/cardenaspiero255/gamehubultra/voice/UltraSpeechChunker.kt',line:26},
 {pr:208,rule:'STALE_VOICE_ENABLED_AFTER_MIC_PERMISSION_REVOKED',
  path:'app/src/main/java/com/cardenaspiero255/gamehubultra/voice/ContinuousVoiceController.kt',line:52}
].map(x=>Object.freeze(x)));
const RULE=/^[A-Z][A-Z0-9_]{2,80}$/;
const PATH=/^[A-Za-z0-9_.\/-]{1,240}$/;
function fail(){throw Error('C2_KNOWN_REPLAY_UNVERIFIED');}
function exact(obj,keys){return obj!==null&&typeof obj==='object'&&!Array.isArray(obj)&&
 Object.keys(obj).length===keys.length&&keys.every(k=>Object.hasOwn(obj,k));}
function scoreKnownRegressions(samples,modelGitSha){
 if(!Array.isArray(samples)||samples.length!==3||
  typeof modelGitSha!=='string'||!/^[a-f0-9]{40}$/.test(modelGitSha)||
  modelGitSha===LOCK.modelSourceSha)fail();
 let detected=0,unlabelled=0;
 const perPr=[];
 for(let i=0;i<EXPECTED.length;i++){
  const exp=EXPECTED[i],s=samples[i],frozen=LOCK.cases.find(x=>x.pr===exp.pr);
  if(!exact(s,['pr','headSha','baseSha','changedFiles','source','partial',
   'nonPositionalFindings','findings'])||
   s.pr!==exp.pr||s.headSha!==frozen.headSha||
   s.baseSha!==frozen.baseSha||s.changedFiles!==frozen.changedFiles||
   s.source!=='VERIFIED_PINNED_GITHUB_COMPARE_TARGET'||s.partial!==false||
   !Number.isSafeInteger(s.nonPositionalFindings)||s.nonPositionalFindings<0||
   s.nonPositionalFindings>40||!Array.isArray(s.findings)||s.findings.length>40)
   fail();
  const seen=new Set();let hit=false;
  for(const f of s.findings){
   if(!exact(f,['rule','path','line'])||!RULE.test(f.rule||'')||
    !PATH.test(f.path||'')||f.path.startsWith('/')||
    f.path.split('/').includes('..')||
    !Number.isSafeInteger(f.line)||f.line<1||f.line>1000000)fail();
   const identity=JSON.stringify([f.rule,f.path,f.line]);
   if(seen.has(identity))fail();seen.add(identity);
   if(f.rule===exp.rule&&f.path===exp.path&&f.line===exp.line)hit=true;
   else unlabelled++;
  }
  if(hit)detected++;
  perPr.push(Object.freeze({pr:exp.pr,matchedOriginalKnownDefect:hit,
   extraUnverifiedAlertCount:s.findings.length-(hit?1:0)}));
 }
 return Object.freeze({
  schema:'ultra-sentinel-c2-known-regressions/v1',
  sourceRepository:LOCK.repository,
  replayModelGitSha:modelGitSha,originalFrozenModelSha:LOCK.modelSourceSha,
  sourceKind:'PINNED_ORIGINAL_GITHUB_TARGETS',
  trainingOnly:true,freshHoldout:false,wholePrCoverage:false,
  knownRegressionMatches:Object.freeze({total:3,detected,missed:3-detected}),
  legacyFrozenBaselineMatches:0,perPr:Object.freeze(perPr),
  unlabelledAdditionalFindings:unlabelled,falsePositivesVerified:null,
  verifiedNegativeFindingLabels:0,precision:null,recall:null,f1:null,
  fpNonRegressionVerified:false,tripleSPlusCertified:false,
  autoRepair:false,mergeAllowed:false,verdict:'KNOWN_TRAINING_REPLAY_NOT_CERTIFICATION',
  note:'All three cases were disclosed to rule authors before this change. '+
   'This measures known regressions only, not blind detector recall, global '+
   'precision/F1 or false-positive non-regression.'
 });
}
module.exports={EXPECTED,scoreKnownRegressions};
