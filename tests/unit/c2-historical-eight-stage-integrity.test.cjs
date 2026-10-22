'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {crosscheckHistoricalChain,linkRecoveredOriginalReceipts}=require('../../packages/quality-gates/c2-historical-eight-stage-integrity.cjs');
const sha=(n,length)=>n.toString(16).padStart(length,'0');
function make(){
 const labels=Array.from({length:23},(_,i)=>({
  pr:150+i,headSha:sha(i+1,40),blobSha:sha(i+100,40),
  rule:'RULE_'+i,path:'src/main/kotlin/Sample'+i+'.kt',
  line:i+1,positive:i<11,evidenceSha256:i<13?sha(i+1000,64):null
 }));
 const lengths=[11,12,14,16,18,20,21,23];
 const stages=lengths.map(n=>({repository:'cardenaspiero255-lang/gamehub-ultra',
  labels:structuredClone(labels.slice(0,n))}));
 const audit={repository:'cardenaspiero255-lang/gamehub-ultra',
  count:23,positives:11,negatives:12,sourceBlobsVerified:23,
  historicalEvidenceAuthenticated:false,independenceVerified:false,
  entries:structuredClone(labels)};
 return {stages,audit};
}
test('RED: authentic archive sequence can be crosschecked without pretending to establish causal independence',()=>{
 const {stages,audit}=make();
 const r=crosscheckHistoricalChain(stages,audit);
 assert.equal(r.stageCount,8);
 assert.equal(r.historicalIdentities,23);
 assert.equal(r.positives,11);
 assert.equal(r.negatives,12);
 assert.equal(r.originalIndividualEvidenceReceipts,13);
 assert.equal(r.missingEmbeddedRun23ReceiptFields,10);
 assert.equal(r.independenceVerified,false);
 assert.equal(r.historicalEvidenceAuthenticated,false);
 assert.equal(r.scoredNegativeLabels,0);
 assert.equal(r.measuredFalsePositiveRate,null);
 assert.equal(r.precision,null);
 assert.equal(r.newGoldLabels,0);
});
test('RED: changed historical evidence SHA in a later stage must block',()=>{
 const x=make();x.stages[5].labels[0].evidenceSha256=sha(777,64);
 assert.throws(()=>crosscheckHistoricalChain(x.stages,x.audit),/C2_HISTORICAL_CHAIN_REJECTED/);
});
test('RED: missing or substituted historic identity cannot silently pass',()=>{
 for(const mutation of ['drop','substitute']){
  const x=make();
  if(mutation==='drop')x.stages[3].labels.splice(1,1);
  else x.stages[2].labels[0]=structuredClone(x.stages[2].labels.at(-1));
  assert.throws(()=>crosscheckHistoricalChain(x.stages,x.audit),/C2_HISTORICAL_CHAIN_REJECTED/);
 }
});
test('RED: a changed final polarity or rule must block even if archive count stays 23',()=>{
 for(const field of ['positive','rule','line','blobSha']){
  const x=make();x.audit.entries[0][field]=field==='positive'?false:field==='line'?999:field==='rule'?'A_DIFFERENT_RULE':sha(997,40);
  assert.throws(()=>crosscheckHistoricalChain(x.stages,x.audit),/C2_HISTORICAL_CHAIN_REJECTED/);
 }
});
test('RED: historical receiptless entries must not be invented into scored negatives or authenticated GOLD',()=>{
 for(const field of ['historicalEvidenceAuthenticated','independenceVerified']){
  const x=make();x.audit[field]=true;
  assert.throws(()=>crosscheckHistoricalChain(x.stages,x.audit),/C2_HISTORICAL_CHAIN_REJECTED/);
 }
 const x=make();x.audit.entries[20].evidenceSha256=sha(2222,64);
 assert.throws(()=>crosscheckHistoricalChain(x.stages,x.audit),/C2_HISTORICAL_CHAIN_REJECTED/);
});

function recoveredFixture(){
 const {stages,audit}=make();
 const entries=audit.entries.filter(x=>!x.evidenceSha256).map((x,i)=>({
  pr:x.pr,sourceHeadSha:x.headSha,sourceBlobSha:x.blobSha,
  ruleId:x.rule,path:x.path,line:x.line,positive:x.positive,
  sourceRunId:i+100,artifactId:i+200,artifactSha256:sha(i+300,64),
  originalWitnessSha256:sha(i+400,64),
  status:'ORIGINAL_BEHAVIOR_RECEIPT_RECOVERED_CAUSAL_ADJUDICATION_PENDING'
 }));
 return {stages,audit,recovery:{
  historicalSourceLabels:23,originalBehaviorWitnessesRecovered:10,
  missingHistoricalIndividualReceiptsAfterIndependentRecovery:0,
  originalHistoricalSealAltered:false,unresolvedCausalGroups:21,
  historicalEvidenceAuthenticated:false,independenceVerified:false,
  newLabels:0,precision:null,recall:null,f1:null,
  entries}};
}
test('RED: link all ten missing Run23 hashes to original receipts, never to GOLD or scored negatives',()=>{
 const x=recoveredFixture();
 const summary=crosscheckHistoricalChain(x.stages,x.audit);
 const linked=linkRecoveredOriginalReceipts(x.audit,x.recovery);
 assert.equal(summary.missingEmbeddedRun23ReceiptFields,10);
 assert.equal(linked.linkedOriginalSourceReceipts,10);
 assert.equal(linked.uniqueWitnesses,10);
 assert.equal(linked.unlinkedHistoricalIdentities,0);
 assert.equal(linked.independenceVerified,false);
 assert.equal(linked.scoredNegativeLabels,0);
 assert.equal(linked.precision,null);
});
test('RED: missing, duplicated, or repurposed historical receipt must reject its external link',()=>{
 const bad=['duplicate','wrong-pol','wrong-source','invent-evidence','missing'];
 for(const scenario of bad){
  const x=recoveredFixture();
  if(scenario==='duplicate') x.recovery.entries[9]={...x.recovery.entries[0]};
  if(scenario==='wrong-pol') x.recovery.entries[0].positive=!x.recovery.entries[0].positive;
  if(scenario==='wrong-source') x.recovery.entries[0].sourceBlobSha=sha(999,40);
  if(scenario==='invent-evidence') x.audit.entries[13].evidenceSha256=sha(999,64);
  if(scenario==='missing') x.recovery.entries.pop();
  assert.throws(()=>linkRecoveredOriginalReceipts(x.audit,x.recovery),
   /C2_HISTORICAL_CHAIN_REJECTED/);
 }
});
test('RED: recovered witnesses cannot be promoted to independent truth by claiming a flag',()=>{
 const x=recoveredFixture();x.recovery.independenceVerified=true;
 assert.throws(()=>linkRecoveredOriginalReceipts(x.audit,x.recovery),/C2_HISTORICAL_CHAIN_REJECTED/);
});
