'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {planRecovery}=require('../../packages/quality-gates/c2-run23-recovery-queue.cjs');
const h=s=>crypto.createHash('sha256').update(s).digest('hex');
const sha=n=>n.toString(16).padStart(40,'0');
function report(){
 const entries=Array.from({length:23},(_,i)=>({
  repository:'cardenaspiero255-lang/gamehub-ultra',pr:150+i,
  headSha:sha(i+1),blobSha:sha(i+101),rule:'RULE_'+i,
  path:'app/src/main/java/Case'+i+'.kt',line:i+1,positive:i<11,
  rootCauseGroup:i<2?'cause_'+i:null,causalFingerprint:i<2?
   h('c2-cause/v1\0cardenaspiero255-lang/gamehub-ultra\0cause_'+i):null,
  evidenceSha256:i<13?h('witness-'+i):null,
  independentOriginalWitnessVerifiedForThisLabel:i<2
 }));
 return {
  schema:'ultra-sentinel-c2-run23-historical-source-chain-audit/v1',
  status:'CAUSAL_REVIEW_REQUIRED',repository:'cardenaspiero255-lang/gamehub-ultra',
  ownerRun23:39077240648,priorOwnerRun22:39076132177,
  sourceRun23Attested:true,sourceBlobsVerified:23,count:23,positives:11,negatives:12,
  duplicateIdentities:[],duplicateCausalGroups:[],
  missingCausalGroups:entries.filter(e=>!e.rootCauseGroup).map(e=>JSON.stringify([e.pr,e.headSha,e.rule,e.path,e.line,e.positive])),
  missingReceipts:entries.filter(e=>!e.evidenceSha256).map(e=>JSON.stringify([e.pr,e.headSha,e.rule,e.path,e.line,e.positive])),
  receiptPresealDigest:h('owner-preseal'),inventorySha256:h(JSON.stringify(entries)),
  entries,knownTrainingOnly:true,historicalEvidenceAuthenticated:false,
  independenceVerified:false,blindHoldout:false,holdoutFrozen:false,newLabels:0,
  benchmarkScoredLabels:0,precision:null,recall:null,f1:null,tripleSPlusCertified:false,
  autoRepair:false,autoMerge:false
 };
}
test('prioritizes original missing witness+cause over only missing cause',()=>{
 const r=planRecovery(report());
 assert.equal(r.sourceLabels,23);assert.equal(r.causalGroupsMissing,21);
 assert.equal(r.individualReceiptsMissing,10);assert.equal(r.bothMissing,10);
 assert.equal(r.queue.length,21);
 assert.equal(r.queue[0].priority,'P0_RECEIPT_AND_CAUSE');
 assert.equal(r.queue[10].priority,'P1_CAUSE_ONLY');
 assert.equal(r.queue[0].sourceHeadSha.length,40);
 assert.equal(r.admittedNewLabels,0);assert.equal(r.benchmarkReady,false);
 assert.equal(r.precision,null);
});
test('metadata tampering and forged 95% claims are rejected',()=>{
 const transforms=[
  x=>x.entries[0].line=300,
  x=>x.entries[1].causalFingerprint='0'.repeat(64),
  x=>x.missingReceipts=[],
  x=>x.sourceBlobsVerified=22,
  x=>x.tripleSPlusCertified=true,
  x=>x.precision=.95,
  x=>x.ownerRun23=0,
  x=>x.entries[3].positive='true',
 ];
 for(const change of transforms){const x=report();change(x);assert.throws(()=>planRecovery(x),/C2_RUN23_RECOVERY_BLOCKED/);}
});
test('complete receipts still require independent causal adjudication',()=>{
 const x=report();
 for(let i=0;i<23;i++){
  x.entries[i].rootCauseGroup='cause_'+i;
  x.entries[i].causalFingerprint=h('c2-cause/v1\0cardenaspiero255-lang/gamehub-ultra\0cause_'+i);
  x.entries[i].evidenceSha256=h('complete-'+i);
 }
 x.missingCausalGroups=[];x.missingReceipts=[];x.status='SOURCE_TREE_AND_CAUSAL_METADATA_CHECKED_PRIOR_WITNESSES_PENDING';
 x.inventorySha256=h(JSON.stringify(x.entries));
 const r=planRecovery(x);
 assert.equal(r.queue.length,0);
 assert.equal(r.independenceVerified,false);
 assert.equal(r.benchmarkReady,false);
});
