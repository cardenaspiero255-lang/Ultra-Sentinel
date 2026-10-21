'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {triageTwelve}=require('../../packages/quality-gates/c2-twelve-historical-identity-triage.cjs');
const sha=s=>createHash('sha256').update(s).digest('hex');
const repo='cardenaspiero255-lang/gamehub-ultra';
const q=(x)=>JSON.stringify([x.pr,x.headSha,x.rule,x.path,x.line,x.positive]);
function fixture(){
 const entries=[];
 for(let i=0;i<23;i++){
  const positive=i<11;
  entries.push({
   repository:repo,pr:i<2?150:i===2?153:151+(i%7),
   headSha:(i+1).toString(16).padStart(40,'0'),
   blobSha:(i+30).toString(16).padStart(40,'0'),
   path:i===11||i===12?'app/src/shared.kt':'app/src/Original'+i+'.kt',
   line:i===11?69:i===12?71:i+1,rule:'ORIGINAL_'+i,positive,
   evidenceSha256:i%3===0?null:sha('source'+i),
   rootCauseGroup:null,causalFingerprint:null,
   causalAdjudication:i<11?{
    status:'SCOPED_ORIGINAL_FIX_COUNTERFACTUAL_PROVISIONAL',
    independentlyCertified:false,
    provisionalFamily:positive?'HYPOTHESIS_ONLY':null,
    provisionalCausalFingerprint:positive?sha('hypothesis'):null
   }:null
  });
 }
 return {
  schema:'c2-run23-pr153-line69-scoped-negative-adjudication/v1',
  status:'PR153_69_SCOPED_NEGATIVE_CONTROL_ADJUDICATED_NOT_CERTIFIED',
  sourceRepository:repo,originalOwnerRun23:39077240648,
  originalNegativeOwnerRun16:39067708985,originalExtendedOwnerRun:39533113371,
  predecessorSha256:sha('historical source'),negativeSourceReceiptSha256:sha('Run16'),
  originalInventorySha256:sha('Run23 inventory'),
  originalHistoricalInventoryUnchanged:true,
  count:23,positives:11,negatives:12,
  adjudicatedNegativeHistoricalIdentities:1,
  historicalIdentitiesWithAnnotations:11,historicalIdentitiesWithoutAnnotations:12,
  provisionalPositiveFamiliesAfter:4,
  certifiedIndependentCausesAdded:0,remainingHistoricalCausesUncertified:21,
  entries,newLabels:0,negativeSourceReceiptAuthenticated:true,
  historicalEvidenceAuthenticated:false,independenceVerified:false,
  blindHoldout:false,holdoutFrozen:false,precision:null,recall:null,f1:null,
  sssPlusCertified:false,autoRepair:false,autoMerge:false
 };
}
test('RED: create exactly twelve source-specific pending adjudications and no fabricated roots',()=>{
 const input=fixture(),snap=JSON.stringify(input);
 const out=triageTwelve(structuredClone(input));
 assert.equal(JSON.stringify(input),snap);
 assert.equal(out.status,'TWELVE_HISTORICAL_IDENTITIES_REQUIRING_INDEPENDENT_COUNTERFACTUALS');
 assert.equal(out.count,23);assert.equal(out.positives,11);assert.equal(out.negatives,12);
 assert.equal(out.annotatedPrior,11);assert.equal(out.pending,12);
 assert.equal(out.queue.length,12);assert.equal(out.newLabels,0);
 assert.equal(out.certifiedIndependentCausesAdded,0);
 assert.equal(out.remainingHistoricalCausesUncertified,21);
 assert.equal(out.provisionalPositiveFamiliesAfter,4);
 assert.equal(out.sssPlusCertified,false);assert.equal(out.holdoutFrozen,false);
 assert.equal(out.precision,null);assert.equal(out.recall,null);assert.equal(out.f1,null);
 assert.deepEqual(out.queue.map(x=>x.identity),
  input.entries.slice(11).map(q).sort());
 assert.equal(out.queue.every(x=>x.counterfactualDecision==='NOT_YET_REPRODUCED_AND_ADJUDICATED'),true);
 assert.equal(out.queue.every(x=>x.independentCauseCertified===false&&
   x.provisionalFamily===null&&x.positiveCausalFingerprint===null),true);
 assert.equal(out.queue.filter(x=>x.positive).length,0);
 assert.equal(out.queue.filter(x=>!x.positive).length,12);
 assert.notEqual(out.queue.find(x=>x.line===69&&x.path==='app/src/shared.kt').identity,
  out.queue.find(x=>x.line===71&&x.path==='app/src/shared.kt').identity);
 assert.equal(out.queue.filter(x=>x.hasSealedEvidenceSha256).length,8);
});
test('RED: original evidence presence never equals a verified independent counterfactual',()=>{
 const x=triageTwelve(fixture());
 for(const item of x.queue){
  assert.equal(item.originalSourceProofStatus,'GITHUB_RUN23_SOURCE_BLOB_ATTESTED');
  assert.equal(item.oracleStatus,'ORIGINAL_BEHAVIOR_WITNESS_REVALIDATION_REQUIRED');
  assert.equal(item.conclusion,'UNVERIFIED_NOT_ADMITTED');
  assert.equal(item.eligibleForGold,false);
  assert.equal(item.eligibleForBlindHoldout,false);
  assert.ok(item.requiredEvidence.includes('ORIGINAL_UNMODIFIED_KOTLIN_EXECUTION'));
  assert.ok(item.requiredEvidence.includes('ORTHOGONAL_COUNTERFACTUAL_AND_BENIGN_CONTROL'));
 }
});
test('RED: reject cause-by-file, corpus edits, missing entries, inflated scores, false certification',()=>{
 const attacks=[
  x=>{x.entries[11].causalAdjudication={status:'CERTIFIED',independentlyCertified:true};},
  x=>{x.entries[11].blobSha='!';},
  x=>{x.entries[11].positive=true;},
  x=>{x.entries[13]={...x.entries[11]};},
  x=>{x.entries.pop();},
  x=>{x.entries[0].causalAdjudication.independentlyCertified=true;},
  x=>{x.entries[11].evidenceSha256='forged';},
  x=>{x.entries[11].rootCauseGroup='inferred_from_path';},
  x=>{x.certifiedIndependentCausesAdded=1;},
  x=>{x.historicalIdentitiesWithoutAnnotations=11;},
  x=>{x.newLabels=1;},
  x=>{x.positives=12;},
  x=>{x.precision=1;},
  x=>{x.holdoutFrozen=true;},
  x=>{x.sssPlusCertified=true;},
  x=>{x.originalNegativeOwnerRun16=0;}
 ];
 for(const attack of attacks){const obj=fixture();attack(obj);
  assert.throws(()=>triageTwelve(obj),/C2_TWELVE_HISTORICAL_TRIAGE_BLOCKED/);
 }
});
