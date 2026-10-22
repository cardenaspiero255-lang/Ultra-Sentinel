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
  remainingWithoutOriginalReceipt:23-receipts,
  sourceBlobsReportedVerified:23,
  historicalEvidenceAuthenticated:false,independenceVerified:false,
  scoredNegativeLabels:0,measuredFalsePositiveRate:null,
  newGoldLabels:0,precision:null,recall:null,f1:null,
  prospectiveBlindHoldout:false,sssPlusCertified:false
 });
}
module.exports={crosscheckHistoricalChain};
