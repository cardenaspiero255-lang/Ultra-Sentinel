'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {CASES,adjudicateFour}=require('../../packages/quality-gates/c2-pr186-four-causal-discriminators.cjs');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
function fixture(){
 const parent={
  schema:'c2-pr184-all-twelve-causal-mechanism-triage-v1',
  status:'BEHAVIOR_TWELVE_OF_TWELVE_MECHANISM_HYPOTHESES_NOT_INDEPENDENTLY_CERTIFIED',
  sourceIdentitiesReviewed:12,sourceReplaysAuthenticated:12,sourceHistoricalCount:23,
  sourcePositiveLabels:11,sourceNegativeLabels:12,
  provisionalMechanismCandidateBuckets:5,
  independentlyDistinctRootCausesAccredited:0,familiesCertifiedFromThisAdjudication:0,
  positivePredictionsScored:0,newLabels:0,causalIndependenceVerified:false,
  blindHoldout:false,holdoutFrozen:false,sssPlusCertified:false,
  precision:null,recall:null,f1:null,
  positiveHypotheses:CASES.map(c=>({pr:c.pr,line:c.line,sharedHypothesisKey:c.key,independentlyCertified:false}))
 };
 const receipts=CASES.map((c,i)=>({
  schema:'c2-pr186-discriminative-original-kotlin-source/v1',suite:c.suite,
  identityKey:c.pr+':'+c.line,mechanismHypothesisKey:c.key,
  originalGitBlobVerified:true,
  sourceOriginalSha256:c.sources[0].sourceSha256||sha('original-'+i),
  repairedSha256:sha('repaired-'+i),wrongFixSha256:sha('wrong-'+i),
  originalFailureLogSha256:sha('failure-'+i),
  repairSuccessLogSha256:sha('passing-'+i),
  adversarialWrongFixFailureLogSha256:sha('badfix-failure-'+i),
  normalControlPassedOnRepair:true,wrongFixKilled:true,originalDefectObserved:true,
  sourceBehaviorOnly:true,detectorPredictionsRead:false,
  newGoldLabels:0,certifiedIndependentCauseAdded:false
 }));
 return {parent,receipts};
}
test('RED: 4 original, repaired, wrong-fix discriminators are distinct, preserve 23 labels and no SSS+ claim',()=>{
 const d=fixture(),before=JSON.stringify(d),out=adjudicateFour(structuredClone(d));
 assert.equal(JSON.stringify(d),before);
 assert.equal(out.replayedDifferentialMechanisms,4);
 assert.equal(out.verifiedSourceInterventions,12);
 assert.deepEqual(out.cases.map(x=>x.suite).sort(),['json','query','rollback','thermal']);
 assert.equal(out.allWrongFixesRejected,true);
 assert.equal(out.sourceLabels,23);
 assert.equal(out.certifiedIndependentCausesAdded,0);
 assert.equal(out.newLabels,0);assert.equal(out.sssPlusCertified,false);
 assert.equal(out.causalFamilyIndependenceVerified,false);
 assert.equal(out.precision,null);assert.equal(out.recall,null);assert.equal(out.f1,null);
 assert.equal(out.holdoutFrozen,false);
});
test('RED: reject invented gold, false independence, duplicate suite, bad source, swapped logs and unverified wrong fixes',()=>{
 const mutations=[
 x=>{x.parent.newLabels=1;},x=>{x.parent.sssPlusCertified=true;},
 x=>{x.parent.positiveHypotheses[0].independentlyCertified=true;},
 x=>{x.parent.positiveHypotheses[0].sharedHypothesisKey='FRAUD';},
 x=>{x.receipts.pop();},x=>{x.receipts.push({...x.receipts[0]});},
 x=>{x.receipts[0].sourceOriginalSha256='x';},
 x=>{x.receipts[0].sourceOriginalSha256='0'.repeat(64);},
 x=>{x.receipts[0].suite='query';},
 x=>{x.receipts[0].wrongFixKilled=false;},
 x=>{x.receipts[0].normalControlPassedOnRepair=false;},
 x=>{x.receipts[0].adversarialWrongFixFailureLogSha256=x.receipts[0].repairSuccessLogSha256;},
 x=>{x.receipts[0].originalFailureLogSha256=x.receipts[0].wrongFixSha256;},
 x=>{x.receipts[0].newGoldLabels=1;},
 x=>{x.receipts[0].certifiedIndependentCauseAdded=true;},
 x=>{x.receipts[0].detectorPredictionsRead=true;},
 x=>{x.receipts[0].mechanismHypothesisKey='WRONG';}
 ];
 for(const mutate of mutations){const d=fixture();mutate(d);
  assert.throws(()=>adjudicateFour(d),/C2_PR186_CAUSAL_EVIDENCE_BLOCKED/);}
});

test('regression: original and wrong-fix may have identical failure traces, but a repaired trace cannot',()=>{
 const d=fixture();
 d.receipts[0].adversarialWrongFixFailureLogSha256=d.receipts[0].originalFailureLogSha256;
 assert.equal(adjudicateFour(d).replayedDifferentialMechanisms,4);
 d.receipts[0].repairSuccessLogSha256=d.receipts[0].originalFailureLogSha256;
 assert.throws(()=>adjudicateFour(d),/C2_PR186_CAUSAL_EVIDENCE_BLOCKED/);
});
