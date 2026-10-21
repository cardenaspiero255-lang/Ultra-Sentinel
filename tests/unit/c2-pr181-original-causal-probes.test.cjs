'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {STAGES}=require('../../packages/quality-gates/c2-twelve-original-oracle-reconciliation.cjs');
const {adjudicateOriginalProbes}=require('../../packages/quality-gates/c2-pr181-original-causal-probes.cjs');
const h=x=>crypto.createHash('sha256').update(x).digest('hex');
const REPO='cardenaspiero255-lang/gamehub-ultra';
function input(){
 const entries=STAGES.flatMap(s=>s.cases.map(c=>{
  const tag=c.pr+':'+c.line,headSha=h('head'+tag).slice(0,40),blobSha=h('blob'+tag).slice(0,40);
  return {
   identity:JSON.stringify([c.pr,headSha,c.rule,'app/src/'+tag+'.kt',c.line,c.positive]),
   pr:c.pr,line:c.line,rule:c.rule,positive:c.positive,headSha,blobSha,
   path:'app/src/'+tag+'.kt',originalEvidenceSha256:h('evidence'+tag),
   originalOwnerRunId:s.run,originalOwnerWorkflow:s.workflow,originalOwnerArtifactId:s.artifact,
   originalOwnerArchiveSha256:s.digest,
   originalKotlinExecution:'HISTORICAL_OWNER_SOURCE_ORACLE_CI_ATTESTED',
   causalIndependenceStatus:'REQUIRES_INDEPENDENT_INTERVENTION',
   independentlyCertified:false,admittedNewCause:false,scoringAdmitted:false
  };
 }));
 const source={schema:'c2-run23-twelve-original-owner-oracle-reconciliation/v1',
  status:'ORIGINAL_OWNER_RECEIPTS_RECONCILED_CAUSAL_INDEPENDENCE_PENDING',
  sourceRepository:REPO,originalOwnerRun23:39077240648,inputQueueSha256:h('queue'),
  ownerOriginalOraclesReconciled:12,ownerSourceStagesReconciled:8,
  positiveSourceReceiptsReconciled:6,negativeSourceReceiptsReconciled:6,
  counterfactualJVMExecutionsThisRun:0,causalIndependenceAdjudicationsAdded:0,
  remainingWithoutIndependentCausalAssessment:12,entries,sourceLabels:23,
  sourcePositiveLabels:11,sourceNegativeLabels:12,provisionalPositiveFamiliesAfter:4,
  certifiedIndependentCausesAdded:0,remainingHistoricalCausesUncertified:21,
  newLabels:0,historicalEvidenceAuthenticated:false,independenceVerified:false,
  blindHoldout:false,holdoutFrozen:false,precision:null,recall:null,f1:null,
  sssPlusCertified:false,autoRepair:false,autoMerge:false};
 const trials=[{pr:152,line:41},{pr:158,line:114},{pr:154,line:100}].map((id,i)=>{
  const x=entries.find(x=>x.pr===id.pr&&x.line===id.line);
  return {identity:x.identity,originalHeadSha:x.headSha,originalBlobSha:x.blobSha,
   originalLogSha256:h('original'+i),firstRepairLogSha256:h('repair'+i),
   adversarialControlLogSha256:h('adversarial'+i),
   originalSourceUnmodified:true,originalFailureReproduced:true,
   firstRepairPassed:true,adversarialControlPassed:true,
   sourceBehaviorScoped:true,candidatePredictionsRead:false,baselinePredictionsRead:false};
 });
 return {source,trials};
}
test('RED: independent JVM experiments annotate first three without admitting distinct causes',()=>{
 const x=input(),before=JSON.stringify(x);
 const out=adjudicateOriginalProbes(structuredClone(x));
 assert.equal(JSON.stringify(x),before);
 assert.equal(out.status,'THREE_REPRODUCED_CAUSAL_INTERVENTIONS_FAMILY_INDEPENDENCE_PENDING');
 assert.equal(out.originalReceipts,12);assert.equal(out.positiveOriginalReceipts,6);
 assert.equal(out.negativeOriginalReceipts,6);assert.equal(out.retestedPositive,3);
 assert.equal(out.pendingPositive,3);assert.equal(out.pendingNegative,6);
 assert.equal(out.entryReviews.length,12);
 assert.equal(out.entryReviews.filter(x=>x.originalSourceReplayed).length,3);
 assert.equal(out.entryReviews.filter(x=>x.causalIndependenceStatus==='CONTRAFACTUAL_REPRODUCED_FAMILY_NOT_YET_DISTINCT').length,3);
 assert.equal(out.entryReviews.filter(x=>x.independentRootCauseCertified).length,0);
 assert.equal(out.certifiedIndependentCausesAdded,0);
 assert.equal(out.newLabels,0);assert.equal(out.sssPlusCertified,false);
 assert.equal(out.precision,null);assert.equal(out.recall,null);assert.equal(out.f1,null);
 assert.equal(out.holdoutFrozen,false);
 for(const e of out.entryReviews){
  assert.equal(e.causalFingerprint,null);
  assert.equal(e.eligibleForGold,false);
  assert.equal(e.eligibleForBlindHoldout,false);
  assert.equal(e.independentRootCauseCertified,false);
 }
});
test('RED: reject fabricated proof, swapped original identities, pr-level conflation or certification',()=>{
 const attacks=[
  x=>{x.source.entries[0].path='app/src/forged.kt';},
  x=>{x.source.entries[0].originalOwnerRunId=1;},
  x=>{x.source.entries[0].independentlyCertified=true;},
  x=>{x.source.entries[0].positive=!x.source.entries[0].positive;},
  x=>{x.source.entries.push({...x.source.entries[0]});},
  x=>{x.source.sssPlusCertified=true;},
  x=>{x.source.newLabels=1;},
  x=>{x.source.ownerOriginalOraclesReconciled=11;},
  x=>{x.trials[0].identity=x.trials[1].identity;},
  x=>{x.trials[0].originalBlobSha='0'.repeat(40);},
  x=>{x.trials[0].adversarialControlPassed=false;},
  x=>{x.trials[0].firstRepairPassed=false;},
  x=>{x.trials[0].originalSourceUnmodified=false;},
  x=>{x.trials[0].originalLogSha256='bad';},
  x=>{x.trials[0].candidatePredictionsRead=true;},
  x=>{x.trials.pop();}
 ];
 for(const attack of attacks){const x=input();attack(x);
  assert.throws(()=>adjudicateOriginalProbes(x),/C2_PR181_CAUSAL_PROBES_BLOCKED/);
 }
});
