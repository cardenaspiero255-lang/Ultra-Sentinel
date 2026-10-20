'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {recoverTenReceipts,ORIGINS,EXPECTED}=require('../../packages/quality-gates/c2-run23-ten-receipt-recovery.cjs');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
function witness(key){
 const [id]=key.split('@'),p=EXPECTED.find(x=>x.id===id);
 const o={schema:p.schema,pr:p.pr,sourceGitBlob:p.blobSha,
   executedOriginalSource:true,originalSourceExecuted:true,
   candidateInspected:false,baselineCompared:false,precision:null,recall:null,f1:null,
   tripleSPlusCertified:false};
 if(p.pr===150){o.headSha=p.headSha;
  if(id==='150-251'){Object.assign(o,{rule:p.ruleId,line:p.line,originalBadHistoryHigh:true,emptyHistoryMedium:true,mutantKilled:false,newTruthLabelsSealed:0});}
  else Object.assign(o,{allAuthoritativeSourcesOpposeButConfidenceHigh:true,weakExternalEvidenceDowngradesConfidence:true,affirmativeControlHigh:true});}
 else if(p.pr===151)Object.assign(o,{rule:p.ruleId,line:p.line,reproducedBehavioralDefect:true,finiteHighControlPassed:true,missingRejected:true,nanRejected:true,infiniteMidSessionIncorrectlyAlerted:true});
 else if(p.pr===152)Object.assign(o,{rule:p.ruleId,line:p.line,reproducedBehavioralDefect:true,supportedPluralitySelected:true,unsupportedOnlyRejected:true,insufficientSamplesRejected:true,existingTargetPreserved:true});
 else if(p.pr===153)Object.assign(o,{rule:p.ruleId,line:p.line,reproduced:true,normalSuccessControlPassed:true,prewriteFailureControlPassed:true,failureAfterHandledReproduced:true,replayProfileStateDiverged:true,idempotentHandledControlPassed:true});
 else if(p.pr===154)Object.assign(o,{noWarningPassed:true,preventivePassed:true,negativeFindingLabelsEstablished:0});
 else if(p.pr===155)Object.assign(o,{chargingPreventsDrain:true,chargingBoundaryResets:true,negativeFindingLabelsEstablished:0});
 else if(p.pr===157)Object.assign(o,{unapprovedMutationBlocked:true,wrongToolBlocked:true,negativeFindingLabelsEstablished:0});
 else if(p.pr===158)Object.assign(o,{boundedEvictionPassed:true,negativeFindingLabelsEstablished:0});
 return o;
}
function fixtures(){
 const names=['150-251','150-252','150-250','151-264','152-207','153-71','154-22','155-47','157-32','158-60'];
 const receipt={schema:'c2-run23-historical-recovery-queue/v1',ownerAuditRun:39498922958,
  originOwnerRun:39077240648,sourceLabels:23,causalGroupsMissing:21,
  individualReceiptsMissing:10,bothMissing:10,
  originalInventorySha256:sha('source'),
  queue:[
   ...names.map(id=>{const p=EXPECTED.find(x=>x.id===id);
    return {identity:JSON.stringify([p.pr,p.headSha,p.ruleId,p.path,p.line,p.positive]),
     pr:p.pr,sourceHeadSha:p.headSha,sourceBlobSha:p.blobSha,ruleId:p.ruleId,
     path:p.path,line:p.line,positive:p.positive,causeMissing:true,
     evidenceMissing:true,priority:'P0_RECEIPT_AND_CAUSE',
     decision:'REQUIRES_ORIGINAL_WITNESS_ADJUDICATION_NOT_ADMITTED'};}),
   ...Array.from({length:11},(_,i)=>({identity:'p1-'+i,priority:'P1_CAUSE_ONLY',causeMissing:true,evidenceMissing:false}))
  ],admittedNewLabels:0,independenceVerified:false,benchmarkReady:false,
  holdoutFrozen:false,precision:null,recall:null,f1:null,tripleSPlusCertified:false};
 const groups=[
  {'150-251':witness('150-251')},
  {'150-250':witness('150-250'),'150-252':witness('150-252')},
  {'151-264':witness('151-264')},
  {'152-207':witness('152-207')},
  {'153-71':witness('153-71')},
  {'154-22':witness('154-22'),'155-47':witness('155-47')},
  {'157-32':witness('157-32'),'158-60':witness('158-60')}
 ];
 const bundles=ORIGINS.map((r,i)=>({originId:r.id,runId:r.runId,artifactId:r.artifactId,
  sha256:r.archiveSha256,runHeadSha:r.runHeadSha,repositoryId:1418338512,
  actorId:322222186,runConcluded:'success',archiveExpired:false,
  files:groups[i]}));
 return {receipt,bundles};
}
test('recovers original ten missing witnesses but never upgrades causal independence or SSS+',()=>{
 const data=fixtures(),r=recoverTenReceipts(data);
 assert.equal(r.originalBehaviorWitnessesRecovered,10);
 assert.equal(r.missingHistoricalIndividualReceiptsAfterIndependentRecovery,0);
 assert.equal(r.originalHistoricalSealAltered,false);
 assert.equal(r.unresolvedCausalGroups,21);
 assert.equal(r.independenceVerified,false);
 assert.equal(r.causalClusters.some(x=>x.pr===150&&x.lines.length===3&&x.independence==='UNRESOLVED'),true);
 assert.equal(r.newLabels,0);assert.equal(r.precision,null);assert.equal(r.tripleSPlusCertified,false);
 assert.equal(r.entries.length,10);
 assert.ok(r.entries.every(e=>e.sourceRunId>0&&e.originalWitnessSha256.length===64));
});
test('rejects fake owner runs, altered digest and fail-open archive flags',()=>{
 for(const mutate of [
  x=>x.bundles[0].actorId=3,
  x=>x.bundles[1].sha256='f'.repeat(64),
  x=>x.bundles[0].archiveExpired=true,
  x=>x.bundles[3].runConcluded='failure',
  x=>x.bundles[6].files['157-32'].unapprovedMutationBlocked=false,
  x=>x.bundles[0].files['150-251'].originalBadHistoryHigh=false,
  x=>x.receipt.individualReceiptsMissing=9,
  x=>x.receipt.queue[1].ruleId='FAKE',
  x=>x.bundles[1].files['150-250'].weakExternalEvidenceDowngradesConfidence=false
 ]){
  const x=fixtures();mutate(x);assert.throws(()=>recoverTenReceipts(x),/C2_TEN_RECEIPT_RECOVERY_BLOCKED/);
 }
});
test('rejects incomplete originals without filling gaps from repeated lines',()=>{
 const x=fixtures();delete x.bundles[1].files['150-252'];
 assert.throws(()=>recoverTenReceipts(x),/C2_TEN_RECEIPT_RECOVERY_BLOCKED/);
});
