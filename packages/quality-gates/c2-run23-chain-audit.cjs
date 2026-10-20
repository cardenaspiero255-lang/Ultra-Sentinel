'use strict';
/*
 * Reconciles historic owner-source-truth receipts, not detector predictions.
 * CI must independently fetch original GitHub Actions owner runs/artifacts and
 * immutable upstream commit/trees. This parser validates the downloaded data
 * but cannot authenticate its own transport when called outside that CI.
 */
const crypto=require('node:crypto');
const {isDeepStrictEqual}=require('node:util');
const {presealRun23,CASES}=require('./c2-run23-original-stores.cjs');
const {NEW_LOCK}=require('./c2-next-holdout.cjs');
const REPO='cardenaspiero255-lang/gamehub-ultra';
const RUN23=39077240648;
const SHA40=/^[a-f0-9]{40}$/;
const SHA64=/^[a-f0-9]{64}$/;
const CAUSE=/^[A-Za-z0-9_.:-]{3,160}$/;
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const fail=()=>{throw Error('C2_RUN23_CHAIN_AUDIT_BLOCKED');};
function auditRun23Chain({prior,witnesses,receipt,sourceTrees}={}){
 try{
  if(!receipt||receipt.schema!=='ultra-sentinel-c2-run23-owner-source-truth-seal/v1'||
   receipt.ownerRunId!==RUN23||receipt.status!=='SOURCE_BEHAVIOR_TRUTH_PARTIAL'||
   receipt.sourceCIAuthenticated!==true||receipt.benchmarkCertified!==false||
   receipt.verdict!=='TRUTH_CORPUS_INCOMPLETE'||receipt.repository!==REPO||
   receipt.previousOwnerRun!==39076132177||
   receipt.candidatePredictionsRead!==false||receipt.baselinePredictionsRead!==false||
   receipt.tripleSPlusCertified!==false||receipt.canMerge!==false||
   receipt.precision!==null||receipt.recall!==null||receipt.f1!==null||
   receipt.benchmarkScoredLabels!==0||receipt.neededAdditionalLabelsAtLeast!==97||
   !SHA64.test(receipt.witnessDigest)||!Array.isArray(receipt.labels)||
   !Array.isArray(witnesses)||witnesses.length!==2)fail();
  const pre=presealRun23({prior,witnesses});
  if(pre.presealDigest!==receipt.presealDigest||
   receipt.witnessDigest!==hash(JSON.stringify(witnesses))||
   !isDeepStrictEqual(receipt.labels,pre.labels))fail();
  if(!Array.isArray(sourceTrees)||sourceTrees.length!==NEW_LOCK.cases.length)fail();
  const trees=new Map();
  for(const t of sourceTrees){
   if(!t||!Number.isSafeInteger(t.pr)||!SHA40.test(t.headSha)||!SHA40.test(t.treeSha)||
    t.truncated!==false||!Array.isArray(t.blobs)||t.blobs.length>150000||
    !NEW_LOCK.cases.some(x=>x.pr===t.pr&&x.headSha===t.headSha)||
    trees.has(t.pr))fail();
   const byPath=new Map();
   for(const row of t.blobs){
    if(!row||typeof row.path!=='string'||!row.path||
      row.path.startsWith('/')||row.path.includes('//')||row.path.split('/').includes('..')||
      !SHA40.test(row.sha)||byPath.has(row.path))fail();
    byPath.set(row.path,row.sha);
   }
   trees.set(t.pr,{headSha:t.headSha,byPath});
  }
  const identities=new Map(),causes=new Map(),receipts=new Map();
  const duplicateIdentities=[],duplicateCausalGroups=[],missingCausalGroups=[],missingReceipts=[];
  const entries=[];let positives=0,negatives=0;
  for(const label of receipt.labels){
   if(!label||!Number.isSafeInteger(label.pr)||!Number.isSafeInteger(label.line)||label.line<1||
    !SHA40.test(label.headSha)||!SHA40.test(label.blobSha)||
    typeof label.rule!=='string'||!label.rule||typeof label.path!=='string'||!label.path||
    typeof label.positive!=='boolean')fail();
   const t=trees.get(label.pr);
   if(!t||t.headSha!==label.headSha||t.byPath.get(label.path)!==label.blobSha)fail();
   const identity=JSON.stringify([label.pr,label.headSha,label.rule,label.path,label.line,label.positive]);
   if(identities.has(identity))duplicateIdentities.push(identity);
   identities.set(identity,true);
   const rootCauseGroup=typeof label.rootCauseGroup==='string'&&CAUSE.test(label.rootCauseGroup)?
    label.rootCauseGroup:null;
   const causalFingerprint=rootCauseGroup?
    hash('c2-cause/v1\0'+REPO+'\0'+rootCauseGroup):null;
   if(!causalFingerprint)missingCausalGroups.push(identity);
   else if(causes.has(causalFingerprint))duplicateCausalGroups.push({
    first:causes.get(causalFingerprint),second:identity,fingerprint:causalFingerprint
   });
   else causes.set(causalFingerprint,identity);
   const evidenceSha256=typeof label.evidenceSha256==='string'&&
    SHA64.test(label.evidenceSha256)?label.evidenceSha256:null;
   if(!evidenceSha256)missingReceipts.push(identity);
   else if(receipts.has(evidenceSha256))fail();
   if(evidenceSha256)receipts.set(evidenceSha256,identity);
   label.positive?positives++:negatives++;
   entries.push(Object.freeze({
    repository:REPO,pr:label.pr,headSha:label.headSha,blobSha:label.blobSha,
    rule:label.rule,path:label.path,line:label.line,positive:label.positive,
    rootCauseGroup,causalFingerprint,evidenceSha256,
    independentOriginalWitnessVerifiedForThisLabel:CASES.some(c=>c.pr===label.pr&&
      c.rule===label.rule&&c.path===label.path&&c.line===label.line)
   }));
  }
  if(entries.length!==23||identities.size!==23||positives!==11||negatives!==12||
   duplicateIdentities.length)fail();
  const complete=!missingCausalGroups.length&&!missingReceipts.length&&
   !duplicateCausalGroups.length;
  return Object.freeze({
   schema:'ultra-sentinel-c2-run23-historical-source-chain-audit/v1',
   status:complete?'SOURCE_TREE_AND_CAUSAL_METADATA_CHECKED_PRIOR_WITNESSES_PENDING':
    'CAUSAL_REVIEW_REQUIRED',
   repository:REPO,ownerRun23:RUN23,priorOwnerRun22:39076132177,
   sourceRun23Attested:true, // only when invoked by GitHub Actions API-pinned workflow
   sourceBlobsVerified:entries.length,
   count:entries.length,positives,negatives,
   duplicateIdentities,duplicateCausalGroups,missingCausalGroups,missingReceipts,
   receiptPresealDigest:receipt.presealDigest,
   inventorySha256:hash(JSON.stringify(entries)),
   entries,knownTrainingOnly:true,historicalEvidenceAuthenticated:false,
   independenceVerified:false,blindHoldout:false,holdoutFrozen:false,
   newLabels:0,benchmarkScoredLabels:0,precision:null,recall:null,f1:null,
   tripleSPlusCertified:false,autoRepair:false,autoMerge:false,
   limitations:[
    'GitHub Actions caller must independently authenticate owner runs, artifact digests, original trees.',
    'Older 21 labels have not all had their individual original witnesses independently verified by this audit.',
    'A root cause group is a hypothesis of independence, not an independently certified cause.',
    'Historical training labels are permanently excluded from future blind holdout.'
   ]
  });
 }catch(e){
  if(e?.message==='C2_RUN23_CHAIN_AUDIT_BLOCKED')throw e;
  fail();
 }
}
module.exports={auditRun23Chain,RUN23};
