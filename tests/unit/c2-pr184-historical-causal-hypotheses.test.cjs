'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const crypto=require('node:crypto'),h=s=>crypto.createHash('sha256').update(s).digest('hex');
const {STAGES}=require('../../packages/quality-gates/c2-twelve-original-oracle-reconciliation.cjs');
const {classifyTwelve}=require('../../packages/quality-gates/c2-pr184-historical-causal-hypotheses.cjs');
const MAKE=()=>{
 const entries=STAGES.flatMap(s=>s.cases.map(c=>{
  const id=c.pr+':'+c.line,headSha=h('head'+id).slice(0,40),blobSha=h('blob'+id).slice(0,40);
  return {pr:c.pr,line:c.line,rule:c.rule,positive:c.positive,
   identity:JSON.stringify([c.pr,headSha,c.rule,'app/file'+id+'.kt',c.line,c.positive]),
   headSha,blobSha,originalSourceReplayed:true,
   sourceReplayLogSha256:h('original'+id),adversarialControlLogSha256:h('mutant'+id),
   causalIndependenceStatus:c.positive?
    'CONTRAFACTUAL_REPRODUCED_FAMILY_NOT_YET_DISTINCT':
    'ORIGINAL_NEGATIVE_AND_MUTANT_REPLAYED_NO_POSITIVE_CAUSE',
   independentRootCauseCertified:false,eligibleForGold:false,
   eligibleForBlindHoldout:false,causalFingerprint:null};
 }));
 return {schema:'c2-pr183-twelve-original-kotlin-replays-not-causally-certified/v1',
  status:'TWELVE_ORIGINAL_SOURCES_REPLAYED_CAUSAL_FAMILY_INDEPENDENCE_PENDING',
  sourceLabels:23,sourcePositiveLabels:11,sourceNegativeLabels:12,
  originalReceipts:12,retestedPositive:6,retestedNegative:6,
  remainingWithoutSourceReplay:0,certifiedIndependentCausesAdded:0,newLabels:0,
  causalFamilyIndependenceVerified:false,sssPlusCertified:false,holdoutFrozen:false,
  precision:null,recall:null,f1:null,entryReviews:entries};
};
test('RED: all 12 have causal hypotheses vs safe-control status, with numeric pair shared and no new family certification',()=>{
 const x=MAKE(),before=JSON.stringify(x),out=classifyTwelve(structuredClone(x));
 assert.equal(JSON.stringify(x),before);
 assert.equal(out.positiveHypotheses.length,6);
 assert.equal(out.negativeControls.length,6);
 assert.equal(out.positiveHypotheses.filter(x=>x.independentlyCertified).length,0);
 assert.equal(out.provisionalMechanismCandidateBuckets,5);
 const numeric=out.positiveHypotheses.filter(x=>[154,155].includes(x.pr));
 assert.equal(numeric.length,2);
 assert.equal(numeric[0].sharedHypothesisKey,numeric[1].sharedHypothesisKey);
 assert.equal(out.familiesCertifiedFromThisAdjudication,0);
 assert.equal(out.positivePredictionsScored,0);
 assert.equal(out.newLabels,0);
 assert.equal(out.sssPlusCertified,false);
 assert.equal(out.holdoutFrozen,false);
 assert.equal(out.precision,null);
 assert.equal(out.recall,null);
 assert.equal(out.f1,null);
 assert.ok(out.positiveHypotheses.every(x=>x.evidenceScope==='ORIGINAL_KOTLIN_BEHAVIOR_NOT_DETECTOR'));
 assert.ok(out.negativeControls.every(x=>x.independentRootCauseCertified===false));
});
test('RED: tampered identity, label, source outcome and induced certification are rejected',()=>{
 const attacks=[
  x=>x.entryReviews.pop(),x=>{x.entryReviews[0].line=999;},
  x=>{x.entryReviews[0].rule='FAKE';},
  x=>{x.entryReviews[0].positive=!x.entryReviews[0].positive;},
  x=>{x.entryReviews[0].originalSourceReplayed=false;},
  x=>{x.entryReviews[0].causalFingerprint='fake';},
  x=>{x.entryReviews[0].eligibleForGold=true;},
  x=>{x.entryReviews[0].independentRootCauseCertified=true;},
  x=>{x.entryReviews[0].sourceReplayLogSha256='broken';},
  x=>{x.entryReviews[0].causalIndependenceStatus='CERTIFIED';},
  x=>{x.entryReviews.push({...x.entryReviews[0]});},
  x=>{x.sourceLabels=24;},x=>{x.newLabels=1;},
  x=>{x.sssPlusCertified=true;},x=>{x.holdoutFrozen=true;}
 ];
 for(const mutate of attacks){const x=MAKE();mutate(x);
  assert.throws(()=>classifyTwelve(x),/C2_PR184_CAUSAL_CLASSIFICATION_BLOCKED/);}
});
