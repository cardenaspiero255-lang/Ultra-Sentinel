'use strict';
/*
 * Additive Stage-3 historical causal VIEW, not an edit to Run23 or GameHub.
 * Provenance is established by the consuming Actions workflow; this module
 * verifies internal integrity of its two historic input receipts. No provisional
 * causal fingerprint is an independently attested label or benchmark sample.
 */
const {createHash}=require('node:crypto');
const {isDeepStrictEqual}=require('node:util');
const {EXPECTED}=require('./c2-run23-ten-receipt-recovery.cjs');
const {PROVISIONAL_FP}=require('./c2-pr150-historical-causal-overlay.cjs');
const {adjudicateReplay,ORIGINAL_BLOB,ORIGINAL_HEAD,PATH}=require('./c2-pr153-replay-causal.cjs');
const fail=()=>{throw Error('C2_PR153_EXTENDED_OVERLAY_BLOCKED');};
const hash=x=>createHash('sha256').update(x).digest('hex');
const HEX40=/^[a-f0-9]{40}$/,HEX64=/^[a-f0-9]{64}$/;
const REPO='cardenaspiero255-lang/gamehub-ultra';
const FAMILY='ADAPTIVE_PENDING_REPLAY_PROFILE_DIVERGENCE';
const FP=hash('c2-provisional-family/v1\0'+REPO+'\0'+FAMILY);
const ID=x=>JSON.stringify([x.pr,x.headSha,x.rule,x.path,x.line,x.positive]);
function extendPr153CausalOverlay({extended,repair}={}){
 try{
  if(!extended||extended.schema!=='c2-run23-historical-extended-causal-overlay/v1'||
   extended.status!=='ADDITIVE_PROVISIONAL_CAUSAL_ADJUDICATION_NOT_CERTIFIED'||
   extended.referenceOwnerRun23!==39077240648||
   extended.preservedPr150Family!==true||extended.originalSourceInventoryUnchanged!==true||
   !HEX64.test(extended.originalInventorySha256)||
   !HEX64.test(extended.sourceOverlayDigest)||!HEX64.test(extended.caseBatchDigest)||
   extended.count!==23||extended.positives!==11||extended.negatives!==12||
   extended.preexistingProvisionalPositiveLabels!==2||
   extended.addedSourceAnnotations!==7||extended.provisionalPositivesAdded!==2||
   extended.positiveRepairPending!==1||extended.negativeControlsAdded!==4||
   extended.certifiedIndependentCausesAdded!==0||
   extended.remainingHistoricalCausesUncertified!==21||
   extended.originalHistoricalLabelsChanged!==false||
   extended.historicalEvidenceAuthenticated!==false||extended.independenceVerified!==false||
   extended.blindHoldout!==false||extended.holdoutFrozen!==false||
   extended.newLabels!==0||extended.precision!==null||extended.recall!==null||
   extended.f1!==null||extended.sssPlusCertified!==false||
   !Array.isArray(extended.entries)||extended.entries.length!==23)fail();
  if(!repair||repair.schema!=='c2-pr153-original-replay-cross-intervention/v1'||
   repair.originalRepo!==REPO||repair.originalPr!==153||
   repair.originalHeadSha!==ORIGINAL_HEAD||repair.originalBlobSha!==ORIGINAL_BLOB||
   repair.originalPath!==PATH||repair.provisionalCausalFamily!==FAMILY||
   repair.independentCauseCertified!==false||repair.independenceVerified!==false||
   repair.historicalEvidenceAuthenticated!==false||
   repair.originalHistoricalLabelsChanged!==false||repair.newHistoricalLabels!==0||
   repair.holdoutFrozen!==false||repair.precision!==null||repair.recall!==null||
   repair.f1!==null||repair.sssPlusCertified!==false||
   repair.autoRepair!==false||repair.autoMerge!==false)fail();
  // Re-evaluate the entire behavioral 2-way original/repair matrix rather than
  // trusting an artifact's self-declared "passed" booleans.
  const expected=adjudicateReplay(repair.originalAndRepairedJVMBehaviors);
  for(const [k,value] of Object.entries(expected)){
   if(!isDeepStrictEqual(repair[k],value))fail();
  }
  if(repair.sourceBlobs!==undefined){
   if(!repair.sourceBlobs||Object.keys(repair.sourceBlobs).length!==2||
    repair.sourceBlobs.original!==ORIGINAL_BLOB||
    !HEX40.test(repair.sourceBlobs.patched)||
    repair.sourceBlobs.patched===ORIGINAL_BLOB)fail();
  }
  const ids=new Set(),past=new Map();let positives=0,negatives=0;
  for(const x of extended.entries){
   if(!x||x.repository!==REPO||!HEX40.test(x.headSha)||
    !HEX40.test(x.blobSha)||typeof x.rule!=='string'||
    typeof x.path!=='string'||!Number.isSafeInteger(x.pr)||
    !Number.isSafeInteger(x.line)||x.line<1||typeof x.positive!=='boolean')fail();
   const id=ID(x);
   if(ids.has(id))fail();
   ids.add(id);past.set(id,x);
   x.positive?positives++:negatives++;
  }
  if(ids.size!==23||positives!==11||negatives!==12)fail();
  const known=EXPECTED.filter(x=>[150,151,152,153,154,155,157,158].includes(x.pr));
  if(known.length!==10)fail();
  for(const p of known){
   const id=JSON.stringify([p.pr,p.headSha,p.ruleId,p.path,p.line,p.positive]);
   const x=past.get(id),a=x?.causalAdjudication;
   if(!x||x.blobSha!==p.blobSha||!a||a.independentlyCertified!==false)fail();
   if(p.pr===150){
    if(a.status!==(p.positive?'PROVISIONAL_SHARED_FAMILY':'NEGATIVE_CONTROL')||
     a.provisionalCausalFingerprint!==(p.positive?PROVISIONAL_FP:null)||
     a.provisionalFamily!==(p.positive?'RECOMMENDATION_CONFIDENCE_CALIBRATION':null))fail();
   }else if(p.pr===153){
    if(!p.positive||p.line!==71||a.status!=='ORIGINAL_ORACLE_ONLY_COUNTERFACTUAL_PENDING'||
     a.provisionalCausalFingerprint!==null||a.provisionalFamily!==null||
     a.counterfactualStatus!=='PATCH_NOT_RUN'||!HEX64.test(a.originalEvidenceSha256)||
     a.candidateTrainingOnly!==true)fail();
   }else if(p.pr===151||p.pr===152){
    const f=p.pr===151?'THERMAL_SENSOR_NUMERIC_DOMAIN':'REFRESH_CANDIDATE_ELECTION';
    const fp=hash('c2-provisional-family/v1\0'+REPO+'\0'+f);
    if(a.status!=='SCOPED_ORIGINAL_FIX_COUNTERFACTUAL_PROVISIONAL'||
     a.provisionalFamily!==f||a.provisionalCausalFingerprint!==fp||
     a.counterfactualStatus!=='PATCH_SCOPE_VERIFIED')fail();
   }else if(a.status!=='SCOPED_ORIGINAL_NEGATIVE_MUTATION_SENSITIVE_NOT_SCORABLE'||
     a.provisionalFamily!==null||a.provisionalCausalFingerprint!==null||
     a.counterfactualStatus!=='NEGATIVE_MUTATION_KILLED')fail();
  }
  // For this extension, only the ten identities from the authentic known
  // source oracles may carry any causal annotation.
  const knownIDs=new Set(known.map(p=>JSON.stringify([p.pr,p.headSha,p.ruleId,p.path,p.line,p.positive])));
  for(const [id,x] of past)if(!knownIDs.has(id)&&x.causalAdjudication!==null)fail();
  const p=known.find(x=>x.pr===153);
  const id153=JSON.stringify([p.pr,p.headSha,p.ruleId,p.path,p.line,p.positive]);
  const prior=past.get(id153);
  if(!prior||prior.headSha!==ORIGINAL_HEAD||prior.blobSha!==ORIGINAL_BLOB||
   prior.path!==PATH)fail();
  const nextAnnotation={
   ...prior.causalAdjudication,
   status:'SCOPED_ORIGINAL_FIX_COUNTERFACTUAL_PROVISIONAL',
   provisionalFamily:FAMILY,
   provisionalCausalFingerprint:FP,
   independentlyCertified:false,
   counterfactualStatus:'PATCH_SCOPE_VERIFIED',
   candidateTrainingOnly:true,
   originalCounterfactualRun:39523094775,
   originalCounterfactualArtifact:12312576821,
   independentlyVerifiedRootCause:false,
   newGoldLabel:false
  };
  const entries=extended.entries.map(x=>ID(x)===id153?{
   ...x,causalAdjudication:nextAnnotation
  }:{...x});
  const otherPosFamilies=new Set(entries.filter(x=>x.positive&&
   x.causalAdjudication?.provisionalCausalFingerprint)
   .map(x=>x.causalAdjudication.provisionalCausalFingerprint));
  if(otherPosFamilies.size!==4||
   !otherPosFamilies.has(FP)||!otherPosFamilies.has(PROVISIONAL_FP))fail();
  return Object.freeze({
   schema:'c2-run23-pr153-historical-extended-causal-overlay/v1',
   status:'PR153_SCOPED_REPAIR_PROVISIONAL_NOT_INDEPENDENTLY_CERTIFIED',
   originalOwnerRun23:39077240648,
   inheritedExtendedOverlayDigest:hash(JSON.stringify(extended)),
   originalInventorySha256:extended.originalInventorySha256,
   originalHistoricalInventoryUnchanged:true,
   originalExtendedOverlayUnchanged:true,
   sourceCounterfactualDigest:hash(JSON.stringify(repair)),
   originalCounterfactualRun:39523094775,
   count:23,positives:11,negatives:12,
   inheritedSourceAnnotations:10,
   newlyAnnotatedHistoricalIdentities:0,
   updatedProvisionalCounterfactuals:1,
   provisionalPositiveFamiliesAfter:4,
   pendingScopedPositiveRepairsAfter:0,
   certifiedIndependentCausesAdded:0,
   remainingHistoricalCausesUncertified:21,
   entries,
   newLabels:0,
   historicalEvidenceAuthenticated:false,independenceVerified:false,
   blindHoldout:false,holdoutFrozen:false,
   precision:null,recall:null,f1:null,sssPlusCertified:false,
   autoRepair:false,autoMerge:false,
   limitation:'#153 replay fix is a scoped, reproducible original-Kotlin counterfactual; a provisional family is NOT an independently established root cause. The Run23 source labels and #150 negative remain untouched.'
  });
 }catch(e){
  if(e?.message==='C2_PR153_EXTENDED_OVERLAY_BLOCKED')throw e;
  fail();
 }
}
module.exports={extendPr153CausalOverlay,FAMILY,FP};
