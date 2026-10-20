'use strict';
/* Train-only recovery triage from authenticated GitHub owner source-audit output.
 * An inventory metadata hash is not a signed attestation. The caller MUST
 * verify source run metadata and artifact digest before invoking this code.
 */
const crypto=require('node:crypto');
const {isDeepStrictEqual}=require('node:util');
const SHA40=/^[a-f0-9]{40}$/;
const SHA64=/^[a-f0-9]{64}$/;
const REPO='cardenaspiero255-lang/gamehub-ultra';
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const fail=()=>{throw Error('C2_RUN23_RECOVERY_BLOCKED');};
function planRecovery(report){
 if(!report||report.schema!=='ultra-sentinel-c2-run23-historical-source-chain-audit/v1'||
  report.ownerRun23!==39077240648||report.priorOwnerRun22!==39076132177||
  report.repository!==REPO||!SHA64.test(report.receiptPresealDigest)||
  report.status!=='CAUSAL_REVIEW_REQUIRED'&&
   report.status!=='SOURCE_TREE_AND_CAUSAL_METADATA_CHECKED_PRIOR_WITNESSES_PENDING'||
  report.count!==23||report.sourceBlobsVerified!==23||
  report.positives!==11||report.negatives!==12||
  report.sourceRun23Attested!==true||report.historicalEvidenceAuthenticated!==false||
  report.independenceVerified!==false||report.blindHoldout!==false||
  report.holdoutFrozen!==false||report.newLabels!==0||
  report.precision!==null||report.recall!==null||report.f1!==null||
  report.tripleSPlusCertified!==false||report.autoRepair!==false||
  report.autoMerge!==false||!Array.isArray(report.entries)||report.entries.length!==23||
  !SHA64.test(report.inventorySha256)||
  sha(JSON.stringify(report.entries))!==report.inventorySha256||
  !isDeepStrictEqual(report.duplicateIdentities,[])||
  !isDeepStrictEqual(report.duplicateCausalGroups,[])||
  !Array.isArray(report.missingCausalGroups)||!Array.isArray(report.missingReceipts))fail();
 const missingCause=[],missingReceipt=[],ids=new Set(),queue=[];
 let positive=0,negative=0,both=0;
 for(const x of report.entries){
  if(!x||x.repository!==REPO||!Number.isSafeInteger(x.pr)||x.pr<1||
   !SHA40.test(x.headSha)||!SHA40.test(x.blobSha)||
   typeof x.rule!=='string'||!/^[_A-Z0-9]{4,110}$/.test(x.rule)||
   typeof x.path!=='string'||!x.path||
   !Number.isSafeInteger(x.line)||x.line<=0||
   typeof x.positive!=='boolean'||![
    'string','object'
   ].includes(typeof x.causalFingerprint)||
   typeof x.independentOriginalWitnessVerifiedForThisLabel!=='boolean')fail();
  const id=JSON.stringify([x.pr,x.headSha,x.rule,x.path,x.line,x.positive]);
  if(ids.has(id))fail();ids.add(id);
  const missingC=x.rootCauseGroup==null&&x.causalFingerprint===null;
  const withCause=typeof x.rootCauseGroup==='string'&&
   /^[A-Za-z0-9_.:-]{3,160}$/.test(x.rootCauseGroup)&&
   x.causalFingerprint===sha('c2-cause/v1\0'+REPO+'\0'+x.rootCauseGroup);
  if(!missingC&&!withCause)fail();
  const missingR=x.evidenceSha256===null;
  if(!missingR&&!SHA64.test(x.evidenceSha256))fail();
  if(missingC)missingCause.push(id);
  if(missingR)missingReceipt.push(id);
  x.positive?positive++:negative++;
  if(missingC||missingR){
   if(missingC&&missingR)both++;
   queue.push({
    identity:id,pr:x.pr,sourceHeadSha:x.headSha,sourceBlobSha:x.blobSha,
    ruleId:x.rule,path:x.path,line:x.line,positive:x.positive,
    causeMissing:missingC,evidenceMissing:missingR,
    priority:missingC&&missingR?'P0_RECEIPT_AND_CAUSE':
     missingR?'P0_RECEIPT_ONLY':'P1_CAUSE_ONLY',
    decision:'REQUIRES_ORIGINAL_WITNESS_ADJUDICATION_NOT_ADMITTED'
   });
  }
 }
 if(positive!==11||negative!==12||
  !isDeepStrictEqual(missingCause,report.missingCausalGroups)||
  !isDeepStrictEqual(missingReceipt,report.missingReceipts)||ids.size!==23)fail();
 const weight={P0_RECEIPT_AND_CAUSE:0,P0_RECEIPT_ONLY:1,P1_CAUSE_ONLY:2};
 queue.sort((a,b)=>weight[a.priority]-weight[b.priority]||a.pr-b.pr||a.path.localeCompare(b.path));
 return Object.freeze({
  schema:'c2-run23-historical-recovery-queue/v1',
  ownerAuditRun:39498922958,originOwnerRun:39077240648,
  originalInventorySha256:report.inventorySha256,
  sourceLabels:23,causalGroupsMissing:missingCause.length,
  individualReceiptsMissing:missingReceipt.length,bothMissing:both,
  queue,admittedNewLabels:0,independenceVerified:false,benchmarkReady:false,
  holdoutFrozen:false,precision:null,recall:null,f1:null,tripleSPlusCertified:false,
  next:'Recover 10 missing individual witnesses and 21 independent root-cause assessments. Never fill missing groups from rule or path strings.'
 });
}
module.exports={planRecovery};
