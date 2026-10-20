'use strict';
/*
 * Scope-limited development-only source counterfactuals; no GOLD or inferred
 * causal independence from different files/rules/commits. Inherited original
 * truth must be authenticated by the consuming Actions workflow.
 */
const {createHash}=require('node:crypto');
const {EXPECTED}=require('./c2-run23-ten-receipt-recovery.cjs');
const {NEW_LOCK}=require('./c2-next-holdout.cjs');
const fail=()=>{throw Error('C2_CAUSAL_BATCH_BLOCKED');};
const sha256=s=>createHash('sha256').update(s).digest('hex');
const sha1Git=s=>{const b=Buffer.from(s);return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');};
const SHA64=/^[a-f0-9]{64}$/;
const ORIGINALS=Object.freeze(EXPECTED.filter(x=>[151,152,153].includes(x.pr)).map(x=>Object.freeze(x)));
const NEGATIVES=Object.freeze(EXPECTED.filter(x=>[154,155,157,158].includes(x.pr)).map(x=>Object.freeze(x)));
if(ORIGINALS.length!==3||NEGATIVES.length!==4)throw Error('C2_CAUSAL_INVALID_ORIGINAL_REGISTRY');
const patchPlan={
  151:{
    from:'!current.thermalHeadroom.isNaN() &&',
    to:'current.thermalHeadroom.isFinite() &&'
  },
  152:{
    from:'val candidate = grouped.maxByOrNull { it.value } ?: return null',
    to:'val candidate = grouped.filterKeys { it in capabilities.supportedRefreshRatesHz }.maxByOrNull { it.value } ?: return null'
  }
};
function patchedOriginal(pr,source,{requireBlob=true}={}){
 const original=ORIGINALS.find(x=>x.pr===pr);
 const plan=patchPlan[pr];
 if(!original||!plan||typeof source!=='string'||source.length<20||source.length>100000||
  source.includes('\0')||(requireBlob&&sha1Git(source)!==original.blobSha))fail();
 if(source.split(plan.from).length!==2||source.includes(plan.to))fail();
 const patched=source.replace(plan.from,plan.to);
 if(patched===source||sha1Git(patched)===sha1Git(source))fail();
 return patched;
}
const asBoolean=(obj,names)=>obj&&typeof obj==='object'&&!Array.isArray(obj)&&
 Object.keys(obj).length===names.length&&
 names.every(n=>typeof obj[n]==='boolean');
function valid151(x){
 const keys=['infinityAlert','finiteAlert','nanAlert'];
 if(!asBoolean(x.original,keys)||!asBoolean(x.patched,keys))fail();
 if(x.original.infinityAlert!==true||x.patched.infinityAlert!==false||
  x.original.finiteAlert!==true||x.patched.finiteAlert!==true||
  x.original.nanAlert!==false||x.patched.nanAlert!==false)fail();
}
function valid152(x){
 const keys=['supportedStarved','supportedControl','unsupportedOnly','insufficient'];
 if(!asBoolean(x.original,keys)||!asBoolean(x.patched,keys))fail();
 if(x.original.supportedStarved!==true||x.patched.supportedStarved!==false||
  x.original.supportedControl!==true||x.patched.supportedControl!==true||
  x.original.unsupportedOnly!==false||x.patched.unsupportedOnly!==false||
  x.original.insufficient!==false||x.patched.insufficient!==false)fail();
}
function adjudicateBatch({rows,negatives}={}){
 if(!Array.isArray(rows)||rows.length!==3||!Array.isArray(negatives)||negatives.length!==4)fail();
 const entries=[];
 for(let i=0;i<ORIGINALS.length;i++){
  const orig=ORIGINALS[i],r=rows[i];
  if(!r||Object.keys(r).length!==Object.keys(orig).length+2 ||
   Object.entries(orig).some(([k,v])=>r[k]!==v)||
   !SHA64.test(r.originalEvidenceSha256))fail();
  if(orig.pr===151)valid151(r.repairResults);
  if(orig.pr===152)valid152(r.repairResults);
  if(orig.pr===153&&r.repairResults!==null)fail();
  const withRepair=orig.pr!==153;
  const family=withRepair?({151:'THERMAL_SENSOR_NUMERIC_DOMAIN',152:'REFRESH_CANDIDATE_ELECTION'})[orig.pr]:null;
  entries.push(Object.freeze({pr:orig.pr,headSha:orig.headSha,sourceBlobSha:orig.blobSha,
   path:orig.path,line:orig.line,ruleId:orig.ruleId,positive:true,
   originalEvidenceSha256:r.originalEvidenceSha256,
   status:withRepair?'SCOPED_ORIGINAL_FIX_COUNTERFACTUAL_PROVISIONAL':'ORIGINAL_ORACLE_ONLY_COUNTERFACTUAL_PENDING',
   scope:orig.pr===151?'MID_SESSION_THERMAL_ONLY':orig.pr===152?'SUPPORTED_REFRESH_RATE_INFERENCE_ONLY':'PENDING_REPLAY_ROLLBACK',
   provisionalFamily:family,
   provisionalCausalFingerprint:family?sha256('c2-provisional-family/v1\0'+NEW_LOCK.repository+'\0'+family):null,
   verifiedIndependentCause:false,
   allOriginalFailurePathsResolved:false
  }));
 }
 for(let i=0;i<NEGATIVES.length;i++){
  const orig=NEGATIVES[i],r=negatives[i];
  if(!r||Object.keys(r).length!==Object.keys(orig).length+5 ||
   Object.entries(orig).some(([k,v])=>r[k]!==v)||
   r.scopedOriginalControlPassed!==true||
   r.counterfactualMutationKilled!==true||
   r.negativeFindingLabelsEstablished!==0||
   !SHA64.test(r.originalWitnessSha256)||!SHA64.test(r.mutantWitnessSha256))fail();
  entries.push(Object.freeze({pr:orig.pr,headSha:orig.headSha,sourceBlobSha:orig.blobSha,
   path:orig.path,line:orig.line,ruleId:orig.ruleId,positive:false,
   status:'SCOPED_ORIGINAL_NEGATIVE_MUTATION_SENSITIVE_NOT_SCORABLE',
   originalEvidenceSha256:r.originalWitnessSha256,
   counterfactualWitnessSha256:r.mutantWitnessSha256,
   provisionalFamily:null,provisionalCausalFingerprint:null,
   verifiedIndependentCause:false,closedWholePrCoverage:false
  }));
 }
 if(new Set(entries.map(x=>JSON.stringify([x.pr,x.headSha,x.ruleId,x.path,x.line,x.positive]))).size!==7)fail();
 return Object.freeze({
  schema:'c2-run23-pr151-158-source-causal-batch/v1',
  sourceRepo:NEW_LOCK.repository,referenceInventoryRun:39077240648,
  originalPositiveControlsVerified:3,counterfactualPositivesVerified:2,
  pendingPositiveRepairs:1,scopedNegativeControlsVerified:4,
  negativeControlsMutantSensitive:4,
  provisionalPositiveFamilies:2,causalFamiliesIndependentlyCertified:0,
  entries,originalDevelopmentOnly:true,
  historicalLabelsChanged:false,independenceVerified:false,
  blindHoldout:false,holdoutFrozen:false,newLabels:0,
  precision:null,recall:null,f1:null,sssPlusCertified:false,
  limitations:[
   'PR151 patch only tests mid-session thermal alert; pre-session and recurring guards remain unverified.',
   'PR152 patch tests supported-refresh election against original Kotlin, not all device hardware.',
   'PR153 has an original behavior witness but its repair counterfactual is pending.',
   'PR154/155/157/158 are bounded source-negative controls with mutation-sensitive oracles, not scored whole-PR negatives.',
   'Provisional family labels cannot be counted as independent root causes or new GOLD.'
  ]
 });
}
module.exports={ORIGINALS,NEGATIVES,patchedOriginal,adjudicateBatch,sha1Git};
