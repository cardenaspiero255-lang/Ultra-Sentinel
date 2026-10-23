'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {reconcileFullHistoricalDevelopmentLedger}=require('../../packages/quality-gates/c2-historical-23-ledger.cjs');
const h40=n=>n.toString(16).padStart(40,'0');
const h64=n=>n.toString(16).padStart(64,'0');
const repo='cardenaspiero255-lang/gamehub-ultra';
function fixture(){
 const entries=Array.from({length:23},(_,i)=>({
   repository:repo,pr:150+(i%8),headSha:h40(100+i),blobSha:h40(400+i),
   rule:'HISTORICAL_RULE_'+i,path:'app/src/main/java/Example'+i+'.kt',
   line:i+1,positive:i<11,
   evidenceSha256:i<13?h64(1000+i):null,
   rootCauseGroup:null,causalFingerprint:null
 }));
 for(let i=0;i<2;i++){
  entries[i].rootCauseGroup='historical_provisional_'+i;
  entries[i].causalFingerprint=createHash('sha256').update('c2-cause/v1\\0'+repo+'\\0'+entries[i].rootCauseGroup).digest('hex');
 }
 const audit={schema:'ultra-sentinel-c2-run23-historical-source-chain-audit/v1',
  repository:repo,count:23,positives:11,negatives:12,
  sourceBlobsVerified:23,historicalEvidenceAuthenticated:false,
  independenceVerified:false,entries};
 const queue=entries.slice(0,12).map(e=>({
  identity:JSON.stringify([e.pr,e.headSha,e.rule,e.path,e.line,e.positive]),
  pr:e.pr,headSha:e.headSha,blobSha:e.blobSha,rule:e.rule,path:e.path,
  line:e.line,positive:e.positive,hasSealedEvidenceSha256:true,
  sealedOriginalEvidenceSha256:e.evidenceSha256,
  conclusion:'UNVERIFIED_NOT_ADMITTED',independentCauseCertified:false,
  eligibleForGold:false,eligibleForBlindHoldout:false
 }));
 const pending={schema:'c2-run23-12-pending-original-causal-adjudication-queue/v1',
  count:23,positives:11,negatives:12,pending:12,queue,
  certifiedIndependentCausesAdded:0,newLabels:0,independenceVerified:false,
  holdoutFrozen:false};
 const recoveredEntries=entries.slice(13).map((e,i)=>({
  id:e.pr+'-'+e.line,pr:e.pr,sourceHeadSha:e.headSha,
  sourceBlobSha:e.blobSha,ruleId:e.rule,path:e.path,line:e.line,
  positive:e.positive,sourceRunId:38000+i,artifactId:39000+i,
  artifactSha256:h64(800+i),originalWitnessSha256:h64(500+i),
  status:'ORIGINAL_BEHAVIOR_RECEIPT_RECOVERED_CAUSAL_ADJUDICATION_PENDING'
 }));
 const recovered={schema:'c2-run23-ten-original-receipts-recovered/v1',
  historicalSourceLabels:23,originalBehaviorWitnessesRecovered:10,
  missingHistoricalIndividualReceiptsAfterIndependentRecovery:0,
  unresolvedCausalGroups:21,originalHistoricalSealAltered:false,
  historicalEvidenceAuthenticated:false,independenceVerified:false,newLabels:0,
  entries:recoveredEntries};
 return {audit,pending,recovered};
}
const run=x=>reconcileFullHistoricalDevelopmentLedger(x);

test('RED: merge exact 12 original archived receipts + 10 recovered + one residual, without causal claims',()=>{
 const x=fixture(),s=run(x);
 assert.equal(s.schema,'c2-historical-23-traceability-ledger/v1');
 assert.equal(s.historicalIdentities,23);
 assert.equal(s.positives,11);assert.equal(s.negatives,12);
 assert.equal(s.queueMatchedEmbeddedReceipts,12);
 assert.equal(s.recoveredExternalReceiptLinks,10);
 assert.equal(s.residualEmbeddedReceipts,1);
 assert.equal(s.unresolvedCausalAssignments,21);
 assert.equal(s.verifiedIndependentCausalFamilies,0);
 assert.equal(s.originalSourceOraclesExecutedThisRun,0);
 assert.equal(s.evidenceAuthenticatedByThisPureFunction,false);
 assert.equal(s.candidateSourceInspected,false);
 assert.equal(s.candidatePredictionsRead,false);
 assert.equal(s.nextcloudSourceReleaseAuthorized,false);
 assert.equal(s.newGoldLabels,0);
 assert.equal(s.falsePositiveRate,null);
 assert.equal(s.precision,null);
 assert.equal(s.f1,null);
 assert.equal(s.holdoutFrozen,false);
 assert.equal(s.sssPlusCertified,false);
 assert.match(s.ledgerSha256,/^[a-f0-9]{64}$/);
 assert.equal(new Set(s.entries.map(e=>e.identity)).size,23);
 assert.equal(s.entries.filter(e=>e.witnessCategory==='RUN23_ARCHIVED_AND_12_QUEUE').length,12);
 assert.equal(s.entries.filter(e=>e.witnessCategory==='RECOVERED_ORIGINAL_WITNESS').length,10);
 assert.equal(s.entries.filter(e=>e.witnessCategory==='RUN23_ARCHIVED_RESIDUAL_UNADJUDICATED').length,1);
 assert.ok(s.entries.every(e=>e.eligibleForGold===false&&e.causalIndependenceCertified===false));
});
test('RED: unchanged partitions and input reordering preserve canonical ledger SHA',()=>{
 const a=fixture(),b=fixture();
 b.audit.entries.reverse();b.pending.queue.reverse();b.recovered.entries.reverse();
 assert.equal(run(a).ledgerSha256,run(b).ledgerSha256);
});
test('RED: reject missing receipt, duplicate identity, swapped polarity or SHA, forged score or causal clearance',()=>{
 const mutations=[
  x=>x.audit.entries.pop(),
  x=>x.pending.queue.pop(),
  x=>x.recovered.entries.pop(),
  x=>x.pending.queue[0].sealedOriginalEvidenceSha256=h64(99999),
  x=>x.recovered.entries[0].sourceBlobSha=h40(99999),
  x=>x.recovered.entries[1]={...x.recovered.entries[0]},
  x=>x.audit.entries[0].positive=false,
  x=>x.audit.entries[0].rootCauseGroup='invented_independent',
  x=>x.pending.queue[0].eligibleForGold=true,
  x=>x.recovered.independenceVerified=true,
  x=>x.audit.historicalEvidenceAuthenticated=true,
  x=>x.pending.newLabels=1
 ];
 for(const mutate of mutations){
  const x=fixture();mutate(x);
  assert.throws(()=>run(x),/C2_HISTORICAL_23_LEDGER_BLOCKED/);
 }
});
