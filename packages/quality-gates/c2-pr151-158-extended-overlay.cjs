'use strict';
/* Additive only: never rewrite Run23 source attestations or original PR150.
 * Stage-2 annotations remain unscored while causal independence is unproven.
 */
const {ORIGINALS,NEGATIVES}=require('./c2-pr151-158-causal-batch.cjs');
const {EXPECTED}=require('./c2-run23-ten-receipt-recovery.cjs');
const {createHash}=require('node:crypto');
const sha=s=>createHash('sha256').update(s).digest('hex');
const fail=()=>{const caller=(new Error().stack||'').split('\n')[2]||'';const line=caller.match(/:(\d+):\d+\)?$/)?.[1]||'unknown';throw Error('C2_EXTENDED_CAUSAL_OVERLAY_BLOCKED source-line='+line);};
const repo='cardenaspiero255-lang/gamehub-ultra';
function extendCausalOverlay(original,batch){
 if(!original||original.schema!=='ultra-sentinel-c2-run23-pr150-causal-overlay/v1'||
  original.status!=='PROVISIONAL_FAMILY_REGISTERED_NOT_INDEPENDENTLY_CERTIFIED'||
  original.repository!==repo||original.originalRun23!==39077240648||
  original.count!==23||original.positives!==11||original.negatives!==12||
  original.originalHistoricalInventoryUnchanged!==true||
  original.originalSourceLabelsUnchanged!==true||
  original.provisionalGroupsAdded!==1||
  original.provisionalPositiveLabelsGrouped!==2||
  original.remainingHistoricalCausesUncertified!==21||
  original.historicalIndependenceProven!==false||
  original.independenceVerified!==false||
  original.historicalEvidenceAuthenticated!==false||
  original.blindHoldout!==false||original.holdoutFrozen!==false||
  original.corpusNewLabels!==0||original.precision!==null||
  original.recall!==null||original.f1!==null||original.sssPlusCertified!==false||
  !/^[a-f0-9]{64}$/.test(original.originalInventorySha256)||
  !Array.isArray(original.provisionalAnnotations)||
  original.provisionalAnnotations.length!==3||
  !Array.isArray(original.inventory)||original.inventory.length!==23)fail();
 if(!batch||batch.schema!=='c2-run23-pr151-158-source-causal-batch/v1'||
  batch.sourceRepo!==repo||batch.referenceInventoryRun!==39077240648||
  batch.originalPositiveControlsVerified!==3||
  batch.counterfactualPositivesVerified!==2||batch.pendingPositiveRepairs!==1||
  batch.scopedNegativeControlsVerified!==4||
  batch.negativeControlsMutantSensitive!==4||
  batch.provisionalPositiveFamilies!==2||
  batch.causalFamiliesIndependentlyCertified!==0||
  batch.originalDevelopmentOnly!==true||batch.historicalLabelsChanged!==false||
  batch.independenceVerified!==false||batch.blindHoldout!==false||
  batch.holdoutFrozen!==false||batch.newLabels!==0||
  batch.precision!==null||batch.recall!==null||batch.f1!==null||
  batch.sssPlusCertified!==false||
  !Array.isArray(batch.entries)||batch.entries.length!==7)fail();
 const inventory=new Map(),historic150=[];
 let positives=0,negatives=0;
 for(const x of original.inventory){
  const id=JSON.stringify([x.pr,x.headSha,x.rule,x.path,x.line,x.positive]);
  if(inventory.has(id)||x.repository!==repo||
   !/^[a-f0-9]{40}$/.test(x.headSha)||
   !/^[a-f0-9]{40}$/.test(x.blobSha)||
   !Number.isSafeInteger(x.line)||x.line<1||
   typeof x.positive!=='boolean')fail();
  inventory.set(id,x);
  if(x.positive)positives++;else negatives++;
  if(x.pr===150&&EXPECTED.some(p=>p.pr===150&&p.headSha===x.headSha&&
    p.ruleId===x.rule&&p.path===x.path&&p.line===x.line&&p.positive===x.positive))historic150.push(x);
 }
 if(positives!==11||negatives!==12||historic150.length!==3)fail();
 for(const p of EXPECTED.filter(x=>x.pr===150)){
  const id=JSON.stringify([p.pr,p.headSha,p.ruleId,p.path,p.line,p.positive]);
  const x=inventory.get(id),a=x?.causalAdjudication;
  if(!x||x.blobSha!==p.blobSha||!a||a.independentlyCertified!==false||
   a.status!==(p.positive?'PROVISIONAL_SHARED_FAMILY':'NEGATIVE_CONTROL')||
   (p.positive&&!/^[a-f0-9]{64}$/.test(a.provisionalCausalFingerprint))||
   (!p.positive&&a.provisionalCausalFingerprint!==null))fail();
 }
 const seen=new Set(),annotate=new Map();
 const expected=[...ORIGINALS,...NEGATIVES];
 for(let i=0;i<expected.length;i++){
  const p=expected[i],x=batch.entries[i];
  const id=JSON.stringify([p.pr,p.headSha,p.ruleId,p.path,p.line,p.positive]);
  const old=inventory.get(id);
  if(!x||seen.has(id)||!old||old.blobSha!==p.blobSha||
   old.causalAdjudication!==null||x.pr!==p.pr||
   x.headSha!==p.headSha||x.sourceBlobSha!==p.blobSha||
   x.ruleId!==p.ruleId||x.path!==p.path||x.line!==p.line||
   x.positive!==p.positive||x.verifiedIndependentCause!==false||
   !/^[a-f0-9]{64}$/.test(x.originalEvidenceSha256))fail();
  const positive=p.positive,hasRepair=p.pr===151||p.pr===152;
  if(x.status!==(positive?
    hasRepair?'SCOPED_ORIGINAL_FIX_COUNTERFACTUAL_PROVISIONAL':'ORIGINAL_ORACLE_ONLY_COUNTERFACTUAL_PENDING':
    'SCOPED_ORIGINAL_NEGATIVE_MUTATION_SENSITIVE_NOT_SCORABLE'))fail();
  if(positive){
   if(hasRepair){
    if(typeof x.provisionalFamily!=='string'||!x.provisionalFamily||
     !/^[a-f0-9]{64}$/.test(x.provisionalCausalFingerprint))fail();
   }else if(x.provisionalFamily!==null||x.provisionalCausalFingerprint!==null)fail();
  }else if(x.provisionalFamily!==null||x.provisionalCausalFingerprint!==null||
    x.closedWholePrCoverage!==false||!/^[a-f0-9]{64}$/.test(x.counterfactualWitnessSha256))fail();
  annotate.set(id,Object.freeze({
   status:x.status,
   provisionalFamily:positive?x.provisionalFamily:null,
   provisionalCausalFingerprint:positive?x.provisionalCausalFingerprint:null,
   independentlyCertified:false,
   originalEvidenceSha256:x.originalEvidenceSha256,
   counterfactualStatus:!positive?'NEGATIVE_MUTATION_KILLED':hasRepair?'PATCH_SCOPE_VERIFIED':'PATCH_NOT_RUN',
   candidateTrainingOnly:true
  }));
  seen.add(id);
 }
 if(seen.size!==7)fail();
 const entries=original.inventory.map(x=>{
  const id=JSON.stringify([x.pr,x.headSha,x.rule,x.path,x.line,x.positive]);
  return {...x,causalAdjudication:annotate.get(id)||x.causalAdjudication};
 });
 return Object.freeze({
  schema:'c2-run23-historical-extended-causal-overlay/v1',
  status:'ADDITIVE_PROVISIONAL_CAUSAL_ADJUDICATION_NOT_CERTIFIED',
  referenceOwnerRun23:39077240648,originalInventorySha256:original.originalInventorySha256,
  preservedPr150Family:true,originalSourceInventoryUnchanged:true,
  sourceOverlayDigest:sha(JSON.stringify(original)),
  caseBatchDigest:sha(JSON.stringify(batch)),
  count:23,positives:11,negatives:12,
  preexistingProvisionalPositiveLabels:2,
  addedSourceAnnotations:7,provisionalPositivesAdded:2,
  positiveRepairPending:1,negativeControlsAdded:4,
  certifiedIndependentCausesAdded:0,remainingHistoricalCausesUncertified:21,
  originalHistoricalLabelsChanged:false,
  entries,newLabels:0,
  historicalEvidenceAuthenticated:false,independenceVerified:false,
  blindHoldout:false,holdoutFrozen:false,
  precision:null,recall:null,f1:null,sssPlusCertified:false,
  limits:'PR151/152 scoped repair; PR153 original only; PR154/155/157/158 mutation-sensitive negatives are not full PR TN samples. No provisional families certified independent.'
 });
}
module.exports={extendCausalOverlay};
