'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {STAGES,reconcileTwelveOracles}=require('../../packages/quality-gates/c2-twelve-original-oracle-reconciliation.cjs');
const sha=x=>createHash('sha256').update(x).digest('hex');
const REPO='cardenaspiero255-lang/gamehub-ultra';
function sample(){
 const queue=[],stages=STAGES.map(s=>({key:s.key,receipt:{
  schema:'ORIGINAL_OWNER_SOURCE_SEAL',ownerRunId:s.run,status:'SOURCE_BEHAVIOR_TRUTH_PARTIAL',
  repository:REPO,sourceCIAuthenticated:true,benchmarkCertified:false,
  sourcePositiveLabels:s.positives,verifiedScopedNegativeLabels:s.negatives,
  benchmarkScoredLabels:0,tripleSPlusCertified:false,
  precision:null,recall:null,f1:null,labels:[]
 }}));
 for(let i=0;i<STAGES.length;i++){
  const s=STAGES[i];
  for(const c of s.cases){
   const caseId=s.key+':'+c.pr+':'+c.line;
   const p={repository:REPO,pr:c.pr,headSha:sha(caseId).slice(0,40),
    blobSha:sha(caseId+'-blob').slice(0,40),
    rule:c.rule,path:'app/src/'+caseId+'.kt',line:c.line,positive:c.positive,
    evidenceSha256:sha(caseId+'-evidence')};
   stages[i].receipt.labels.push(p);
   queue.push({
    identity:JSON.stringify([p.pr,p.headSha,p.rule,p.path,p.line,p.positive]),
    pr:p.pr,headSha:p.headSha,blobSha:p.blobSha,rule:p.rule,path:p.path,
    line:p.line,positive:p.positive,sealedOriginalEvidenceSha256:p.evidenceSha256,
    hasSealedEvidenceSha256:true,conclusion:'UNVERIFIED_NOT_ADMITTED',
    independentCauseCertified:false,eligibleForGold:false,eligibleForBlindHoldout:false,
    counterfactualDecision:'NOT_YET_REPRODUCED_AND_ADJUDICATED'
   });
  }
  // Older stage seals accumulate historical labels. Additional unrelated records
  // must never be construed as evidence for the twelve target identities.
  const remainingPositives=s.positives-
   stages[i].receipt.labels.filter(x=>x.positive).length;
  let added=0;
  while(stages[i].receipt.labels.length<s.total){
   const n=stages[i].receipt.labels.length;
   stages[i].receipt.labels.push({repository:REPO,pr:900+i,headSha:'a'.repeat(40),
    blobSha:sha(s.key+'other'+n).slice(0,40),
    rule:'UNRELATED_'+i+'_'+n,path:'app/src/Other'+i+'_'+n+'.kt',
    line:n+10,positive:added++<remainingPositives});
  }
  // Polarity count is deliberately not inferred from synthetic extra labels.
 }
 queue.sort((a,b)=>a.identity<b.identity?-1:a.identity>b.identity?1:0);
 const prior={
  schema:'c2-run23-12-pending-original-causal-adjudication-queue/v1',
  status:'TWELVE_HISTORICAL_IDENTITIES_REQUIRING_INDEPENDENT_COUNTERFACTUALS',
  sourceRepository:REPO,ownerRun23:39077240648,inheritedOwnerRun179:39538354430,
  originalInventorySha256:sha('Run23'),predecessorDigestSha256:sha('PR179'),
  count:23,positives:11,negatives:12,annotatedPrior:11,pending:12,
  pendingPositiveIdentities:6,pendingNegativeIdentities:6,
  sourceOraclesReexecutedByThisWorkflow:0,
  independentCounterfactualsExecutedByThisWorkflow:0,
  independentlyAdjudicatedFromQueue:0,provisionalPositiveFamiliesAfter:4,
  certifiedIndependentCausesAdded:0,remainingHistoricalCausesUncertified:21,
  originalHistoricalInventoryUnchanged:true,newLabels:0,
  historicalEvidenceAuthenticated:false,independenceVerified:false,
  blindHoldout:false,holdoutFrozen:false,precision:null,recall:null,f1:null,
  sssPlusCertified:false,autoRepair:false,autoMerge:false,queue
 };
 return {prior,stages};
}
test('RED: reconcile twelve identities against eight separately authenticated historical owner oracle seals',()=>{
 const input=sample();
 const original=JSON.stringify(input);
 const out=reconcileTwelveOracles(structuredClone(input));
 assert.equal(JSON.stringify(input),original);
 assert.equal(out.ownerOriginalOraclesReconciled,12);
 assert.equal(out.ownerSourceStagesReconciled,8);
 assert.equal(out.positiveSourceReceiptsReconciled,6);
 assert.equal(out.negativeSourceReceiptsReconciled,6);
 assert.equal(out.causalIndependenceAdjudicationsAdded,0);
 assert.equal(out.counterfactualJVMExecutionsThisRun,0);
 assert.equal(out.remainingWithoutIndependentCausalAssessment,12);
 assert.equal(out.newLabels,0);assert.equal(out.independenceVerified,false);
 assert.equal(out.sssPlusCertified,false);assert.equal(out.holdoutFrozen,false);
 assert.equal(out.precision,null);assert.equal(out.recall,null);assert.equal(out.f1,null);
 assert.equal(out.entries.length,12);
 assert.equal(new Set(out.entries.map(x=>x.identity)).size,12);
 for(const x of out.entries){
  assert.equal(x.independentlyCertified,false);
  assert.equal(x.causalIndependenceStatus,'REQUIRES_INDEPENDENT_INTERVENTION');
  assert.equal(x.admittedNewCause,false);
  assert.equal(x.scoringAdmitted,false);
  assert.match(x.originalOwnerWorkflow,/^\.github\/workflows\//);
  assert.match(x.originalEvidenceSha256,/^[0-9a-f]{64}$/);
  assert.equal(x.positiveCausalFingerprint,null);
 }
});
test('RED: do not infer duplicate causes from same historical PR or similar rule name',()=>{
 const r=reconcileTwelveOracles(sample());
 const one=r.entries.filter(x=>x.pr===151);
 assert.equal(one.length,3);
 assert.equal(new Set(one.map(x=>x.identity)).size,3);
 assert.equal(one.every(x=>x.positiveCausalFingerprint===null),true);
});
test('RED: fake owner receipts, swapped labels, duplicated identities or certification fail closed',()=>{
 const attacks=[
  x=>{x.stages[0].receipt.labels[0].rule='SWAPPED';},
  x=>{x.stages[0].receipt.labels[0].blobSha='f'.repeat(40);},
  x=>{x.stages[0].receipt.ownerRunId=1;},
  x=>{x.stages[0].receipt.sourceCIAuthenticated=false;},
  x=>{x.stages[0].receipt.tripleSPlusCertified=true;},
  x=>{x.stages[0].receipt.labels=[];},
  x=>{x.stages[0].receipt.labels.push({...x.stages[0].receipt.labels[0]});},
  x=>{x.prior.queue.pop();},
  x=>{x.prior.queue[0].positive=!x.prior.queue[0].positive;},
  x=>{x.prior.queue[0].sealedOriginalEvidenceSha256='0'.repeat(64);},
  x=>{x.prior.queue[0].independentCauseCertified=true;},
  x=>{x.prior.pending=11;},
  x=>{x.prior.sssPlusCertified=true;},
  x=>{x.stages=[x.stages[0],...x.stages.slice(0,-1)];}
 ];
 for(const attack of attacks){const p=sample();attack(p);
  assert.throws(()=>reconcileTwelveOracles(p),/C2_TWELVE_ORIGINAL_ORACLES_BLOCKED/);
 }
});
