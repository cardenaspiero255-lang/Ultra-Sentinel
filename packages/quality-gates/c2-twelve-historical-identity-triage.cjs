'use strict';
/*
 * Additive review queue for the twelve Run23 identities still without causal
 * annotations. The consuming CI authenticates exact owner run and ZIP digest.
 * A source witness, rootCauseGroup, same file or same PR is NOT an independent
 * cause. This module deliberately cannot label, score or certify.
 */
const {createHash}=require('node:crypto');
const sha=x=>createHash('sha256').update(x).digest('hex');
const fail=()=>{throw Error('C2_TWELVE_HISTORICAL_TRIAGE_BLOCKED');};
const HEX40=/^[a-f0-9]{40}$/,HEX64=/^[a-f0-9]{64}$/;
const REPO='cardenaspiero255-lang/gamehub-ultra';
const ID=x=>JSON.stringify([x.pr,x.headSha,x.rule,x.path,x.line,x.positive]);
const CAUSE=r=>sha('c2-cause/v1\\0'+REPO+'\\0'+r);
function triageTwelve(history){
 try{
  if(!history||history.schema!=='c2-run23-pr153-line69-scoped-negative-adjudication/v1'||
   history.status!=='PR153_69_SCOPED_NEGATIVE_CONTROL_ADJUDICATED_NOT_CERTIFIED'||
   history.sourceRepository!==REPO||history.originalOwnerRun23!==39077240648||
   history.originalNegativeOwnerRun16!==39067708985||
   history.originalExtendedOwnerRun!==39533113371||
   !HEX64.test(history.originalInventorySha256)||
   !HEX64.test(history.predecessorSha256)||!HEX64.test(history.negativeSourceReceiptSha256)||
   history.originalHistoricalInventoryUnchanged!==true||
   history.negativeSourceReceiptAuthenticated!==true||
   history.count!==23||history.positives!==11||history.negatives!==12||
   history.adjudicatedNegativeHistoricalIdentities!==1||
   history.historicalIdentitiesWithAnnotations!==11||
   history.historicalIdentitiesWithoutAnnotations!==12||
   history.provisionalPositiveFamiliesAfter!==4||
   history.certifiedIndependentCausesAdded!==0||
   history.remainingHistoricalCausesUncertified!==21||
   history.newLabels!==0||history.historicalEvidenceAuthenticated!==false||
   history.independenceVerified!==false||history.blindHoldout!==false||
   history.holdoutFrozen!==false||history.precision!==null||
   history.recall!==null||history.f1!==null||history.sssPlusCertified!==false||
   history.autoRepair!==false||history.autoMerge!==false||
   !Array.isArray(history.entries)||history.entries.length!==23)fail();
  const ids=new Set(),pending=[],annotated=[];
  let positives=0,negatives=0;
  for(const x of history.entries){
   if(!x||x.repository!==REPO||!Number.isSafeInteger(x.pr)||x.pr<1||
    !Number.isSafeInteger(x.line)||x.line<1||
    !HEX40.test(x.headSha)||!HEX40.test(x.blobSha)||
    typeof x.path!=='string'||!x.path.startsWith('app/')||
    x.path.includes('..')||typeof x.rule!=='string'||
    !/^[A-Z0-9_]{4,110}$/.test(x.rule)||
    typeof x.positive!=='boolean'||x.positive===null||
    (x.evidenceSha256!=null&&!HEX64.test(x.evidenceSha256)))fail();
   if(x.rootCauseGroup==null){
    if(x.causalFingerprint!=null)fail();
   }else if(typeof x.rootCauseGroup!=='string'||
    !/^[A-Za-z0-9_.:-]{3,160}$/.test(x.rootCauseGroup)||
    x.causalFingerprint!==CAUSE(x.rootCauseGroup))fail();
   const id=ID(x);
   if(ids.has(id))fail();
   ids.add(id);
   x.positive?positives++:negatives++;
   if(x.causalAdjudication===null){
    pending.push(x);
   }else{
    const a=x.causalAdjudication;
    if(!a||typeof a!=='object'||a.independentlyCertified!==false||
     a.newGoldLabel===true||a.eligibleForBlindHoldout===true||
     a.status==='CERTIFIED')fail();
    annotated.push(x);
   }
  }
  if(ids.size!==23||positives!==11||negatives!==12||
   pending.length!==12||annotated.length!==11)fail();
  const queue=pending.map(x=>Object.freeze({
   identity:ID(x),pr:x.pr,headSha:x.headSha,blobSha:x.blobSha,
   rule:x.rule,path:x.path,line:x.line,positive:x.positive,
   hasSealedEvidenceSha256:typeof x.evidenceSha256==='string',
   sealedOriginalEvidenceSha256:x.evidenceSha256,
   historicalRootCauseGroupUncertified:x.rootCauseGroup,
   originalSourceProofStatus:'GITHUB_RUN23_SOURCE_BLOB_ATTESTED',
   oracleStatus:'ORIGINAL_BEHAVIOR_WITNESS_REVALIDATION_REQUIRED',
   counterfactualDecision:'NOT_YET_REPRODUCED_AND_ADJUDICATED',
   requiredEvidence:Object.freeze([
    'AUTHENTICATE_ORIGINAL_OWNER_ORACLE_RUN_AND_ARTIFACT',
    'ORIGINAL_UNMODIFIED_KOTLIN_EXECUTION',
    'ORTHOGONAL_COUNTERFACTUAL_AND_BENIGN_CONTROL',
    'SCOPE_EQUIVALENCE_AND_DISTINCT_CAUSAL_INTERVENTION'
   ]),
   conclusion:'UNVERIFIED_NOT_ADMITTED',
   independentCauseCertified:false,provisionalFamily:null,
   positiveCausalFingerprint:null,eligibleForGold:false,
   eligibleForBlindHoldout:false
  })).sort((a,b)=>a.identity.localeCompare(b.identity,'en'));
  // Avoid locale-dependent ordering in signed evidence.
  queue.sort((a,b)=>a.identity<b.identity?-1:a.identity>b.identity?1:0);
  return Object.freeze({
   schema:'c2-run23-12-pending-original-causal-adjudication-queue/v1',
   status:'TWELVE_HISTORICAL_IDENTITIES_REQUIRING_INDEPENDENT_COUNTERFACTUALS',
   sourceRepository:REPO,ownerRun23:39077240648,
   inheritedOwnerRun179:39538354430,
   originalInventorySha256:history.originalInventorySha256,
   predecessorDigestSha256:sha(JSON.stringify(history)),
   count:23,positives:11,negatives:12,
   annotatedPrior:11,pending:12,
   pendingPositiveIdentities:queue.filter(x=>x.positive).length,
   pendingNegativeIdentities:queue.filter(x=>!x.positive).length,
   sourceOraclesReexecutedByThisWorkflow:0,
   independentCounterfactualsExecutedByThisWorkflow:0,
   independentlyAdjudicatedFromQueue:0,
   provisionalPositiveFamiliesAfter:4,
   certifiedIndependentCausesAdded:0,remainingHistoricalCausesUncertified:21,
   queue,originalHistoricalInventoryUnchanged:true,newLabels:0,
   historicalEvidenceAuthenticated:false,independenceVerified:false,
   blindHoldout:false,holdoutFrozen:false,precision:null,recall:null,f1:null,
   sssPlusCertified:false,autoRepair:false,autoMerge:false,
   next:'Authenticate and replay each original oracle with its own bounded counterfactual; never infer independence or group by PR/path.'
  });
 }catch(e){
  if(e?.message==='C2_TWELVE_HISTORICAL_TRIAGE_BLOCKED')throw e;
  fail();
 }
}
module.exports={triageTwelve};
