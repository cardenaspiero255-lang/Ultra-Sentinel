'use strict';
/*
 * Public development history: exactly eight owner seal snapshots and a later
 * read-only Run23 source audit. Integrity of successive JSON inventories is
 * not an oracle of independent causal labels, nor an FP-rate measurement.
 */
const {createHash}=require('node:crypto');
const REPO='cardenaspiero255-lang/gamehub-ultra';
const COUNTS=Object.freeze([11,12,14,16,18,20,21,23]);
const H40=/^[a-f0-9]{40}$/,H64=/^[a-f0-9]{64}$/;
const fail=()=>{throw Error('C2_HISTORICAL_CHAIN_REJECTED');};
const identity=x=>JSON.stringify([x.pr,x.headSha,x.blobSha,x.rule,x.path,x.line,x.positive]);
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
function checkLabel(x){
 if(!x||typeof x!=='object'||Array.isArray(x)||
    !Number.isSafeInteger(x.pr)||x.pr<1||
    !H40.test(x.headSha)||!H40.test(x.blobSha)||
    typeof x.rule!=='string'||!/^[A-Z][A-Z0-9_]{2,100}$/.test(x.rule)||
    typeof x.path!=='string'||x.path.length>350||
    x.path.startsWith('/')||x.path.includes('//')||
    x.path.split('/').includes('..')||
    !Number.isSafeInteger(x.line)||x.line<1||
    typeof x.positive!=='boolean'||
    !(x.evidenceSha256===null||x.evidenceSha256===undefined||H64.test(x.evidenceSha256)))fail();
}
function indexedLabels(rows,expectedCount){
 if(!Array.isArray(rows)||rows.length!==expectedCount)fail();
 const result=new Map();
 for(const label of rows){
  checkLabel(label);
  const id=identity(label);
  if(result.has(id))fail();
  result.set(id,label);
 }
 return result;
}
function crosscheckHistoricalChain(stages,audit){
 if(!Array.isArray(stages)||stages.length!==COUNTS.length||
   !audit||typeof audit!=='object'||Array.isArray(audit)||
   audit.repository!==REPO||audit.count!==23||
   audit.positives!==11||audit.negatives!==12||
   audit.sourceBlobsVerified!==23||
   audit.historicalEvidenceAuthenticated!==false||
   audit.independenceVerified!==false)fail();
 let prev=new Map();
 const snapshots=[];
 for(let i=0;i<COUNTS.length;i++){
  const stage=stages[i];
  if(!stage||stage.repository!==REPO)fail();
  const now=indexedLabels(stage.labels,COUNTS[i]);
  for(const [id,prior] of prev){
   const current=now.get(id);
   // The original chain can reorder labels; content, identity and receipt
   // SHA of earlier original witnesses must never change retrospectively.
   if(!current||current.evidenceSha256!==prior.evidenceSha256)fail();
  }
  snapshots.push(digest([...now].sort(([a],[b])=>a.localeCompare(b))
   .map(([id,x])=>[id,x.evidenceSha256??null])));
  prev=now;
 }
 const now=indexedLabels(audit.entries,23);
 if(now.size!==prev.size)fail();
 for(const [id,prior] of prev){
  const a=now.get(id);
  if(!a||a.evidenceSha256!==prior.evidenceSha256)fail();
 }
 const values=[...now.values()];
 const positives=values.filter(x=>x.positive).length;
 if(positives!==11||values.length-positives!==12)fail();
 const receipts=values.filter(x=>typeof x.evidenceSha256==='string').length;
 return Object.freeze({
  schema:'c2-eight-stage-historical-content-integrity/v1',
  status:'CHAIN_CONTENT_INTEGRITY_ONLY_CAUSAL_INDEPENDENCE_UNVERIFIED',
  stageCount:8,stageLabelCounts:Object.freeze([...COUNTS]),
  stageInventorySha256:Object.freeze(snapshots),
  originalInventorySha256:digest([...now].sort(([a],[b])=>a.localeCompare(b))
    .map(([id,x])=>[id,x.evidenceSha256??null])),
  historicalIdentities:23,positives:11,negatives:12,
  originalIndividualEvidenceReceipts:receipts,
  missingEmbeddedRun23ReceiptFields:23-receipts,
  sourceBlobsReportedVerified:23,
  historicalEvidenceAuthenticated:false,independenceVerified:false,
  scoredNegativeLabels:0,measuredFalsePositiveRate:null,
  newGoldLabels:0,precision:null,recall:null,f1:null,
  prospectiveBlindHoldout:false,sssPlusCertified:false
 });
}

function linkRecoveredOriginalReceipts(audit,recovered){
 if(!audit||typeof audit!=='object'||audit.repository!==REPO||
    audit.count!==23||audit.positives!==11||audit.negatives!==12||
    audit.sourceBlobsVerified!==23||
    audit.historicalEvidenceAuthenticated!==false||
    audit.independenceVerified!==false||
    !recovered||typeof recovered!=='object'||Array.isArray(recovered)||
    recovered.historicalSourceLabels!==23||
    recovered.originalBehaviorWitnessesRecovered!==10||
    recovered.missingHistoricalIndividualReceiptsAfterIndependentRecovery!==0||
    recovered.originalHistoricalSealAltered!==false||
    recovered.historicalEvidenceAuthenticated!==false||
    recovered.independenceVerified!==false||recovered.newLabels!==0||
    !Array.isArray(recovered.entries)||recovered.entries.length!==10)fail();
 const baseline=indexedLabels(audit.entries,23);
 const missing=new Map([...baseline].filter(([,v])=>!v.evidenceSha256));
 if(missing.size!==10)fail();
 const matched=new Set(),witnesses=new Set(),artifacts=new Set();
 for(const v of recovered.entries){
  if(!v||typeof v!=='object'||Array.isArray(v)||
     !Number.isSafeInteger(v.pr)||v.pr<1||
     !H40.test(v.sourceHeadSha)||!H40.test(v.sourceBlobSha)||
     typeof v.ruleId!=='string'||typeof v.path!=='string'||
     !Number.isSafeInteger(v.line)||v.line<1||
     typeof v.positive!=='boolean'||
     !H64.test(v.artifactSha256)||!H64.test(v.originalWitnessSha256)||
     !Number.isSafeInteger(v.sourceRunId)||v.sourceRunId<1||
     !Number.isSafeInteger(v.artifactId)||v.artifactId<1||
     v.status!=='ORIGINAL_BEHAVIOR_RECEIPT_RECOVERED_CAUSAL_ADJUDICATION_PENDING')fail();
  const id=JSON.stringify([v.pr,v.sourceHeadSha,v.sourceBlobSha,v.ruleId,
    v.path,v.line,v.positive]);
  if(!missing.has(id)||matched.has(id))fail();
  matched.add(id);
  witnesses.add(v.originalWitnessSha256);
  artifacts.add(v.artifactId);
 }
 if(matched.size!==missing.size)fail();
 return Object.freeze({
  schema:'c2-run23-external-recovered-receipt-links/v1',
  status:'TEN_WITNESS_LINKS_MATCH_ORIGINAL_MISSING_IDENTITIES_CAUSAL_REVIEW_PENDING',
  historicalIdentities:23,linkedOriginalSourceReceipts:matched.size,
  unlinkedHistoricalIdentities:missing.size-matched.size,
  uniqueWitnesses:witnesses.size,uniqueOriginalArtifacts:artifacts.size,
  sourceRunAuthenticationClaimFromPriorReceipt:true,
  sourceRunIndependentlyRecheckedByThisFunction:false,
  historicalEvidenceAuthenticated:false,independenceVerified:false,
  scoredNegativeLabels:0,measuredFalsePositiveRate:null,
  newGoldLabels:0,precision:null,recall:null,f1:null,
  prospectiveBlindHoldout:false,sssPlusCertified:false
 });
}
module.exports={crosscheckHistoricalChain,linkRecoveredOriginalReceipts};
