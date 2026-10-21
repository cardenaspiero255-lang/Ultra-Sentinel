'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {EXPECTED}=require('../../packages/quality-gates/c2-run23-ten-receipt-recovery.cjs');
const {CASES}=require('../../packages/quality-gates/c2-run16-two-negatives.cjs');
const {adjudicatePr153Negative}=require('../../packages/quality-gates/c2-pr153-negative-identity-adjudication.cjs');
const h=s=>createHash('sha256').update(s).digest('hex');
const repo='cardenaspiero255-lang/gamehub-ultra';
const family=name=>h('c2-provisional-family/v1\0'+repo+'\0'+name);
function fixtures(){
 const source=CASES[1];
 const entries=EXPECTED.map(p=>{
  const positive=p.positive;
  const f=p.pr===150?'RECOMMENDATION_CONFIDENCE_CALIBRATION':
    p.pr===151?'THERMAL_SENSOR_NUMERIC_DOMAIN':
    p.pr===152?'REFRESH_CANDIDATE_ELECTION':
    p.pr===153?'ADAPTIVE_PENDING_REPLAY_PROFILE_DIVERGENCE':null;
  return {repository:repo,pr:p.pr,headSha:p.headSha,blobSha:p.blobSha,
   rule:p.ruleId,path:p.path,line:p.line,positive,
   causalAdjudication:{status:positive?'SCOPED_ORIGINAL_FIX_COUNTERFACTUAL_PROVISIONAL':
    p.pr===150?'NEGATIVE_CONTROL':'SCOPED_ORIGINAL_NEGATIVE_MUTATION_SENSITIVE_NOT_SCORABLE',
    provisionalFamily:positive?f:null,
    provisionalCausalFingerprint:positive?family(f):null,
    independentlyCertified:false}};
 });
 entries.push({repository:repo,pr:source.pr,headSha:source.headSha,blobSha:source.blobSha,
  rule:source.rule,path:source.path,line:source.line,positive:false,causalAdjudication:null});
 for(let i=1;i<=12;i++)entries.push({repository:repo,pr:200+i,
  headSha:String(i).padStart(40,'a'),blobSha:String(i).padStart(40,'b'),
  rule:'OTHER_'+i,path:'src/Other'+i+'.kt',line:i,positive:i<=6,
  causalAdjudication:null});
 const history={schema:'c2-run23-pr153-historical-extended-causal-overlay/v1',
  status:'PR153_SCOPED_REPAIR_PROVISIONAL_NOT_INDEPENDENTLY_CERTIFIED',
  originalOwnerRun23:39077240648,originalInventorySha256:h('inventory'),
  originalHistoricalInventoryUnchanged:true,originalExtendedOverlayUnchanged:true,
  inheritedExtendedOverlayDigest:h('parent'),sourceCounterfactualDigest:h('repair'),
  originalCounterfactualRun:39523094775,count:23,positives:11,negatives:12,
  provisionalPositiveFamiliesAfter:4,certifiedIndependentCausesAdded:0,
  remainingHistoricalCausesUncertified:21,entries,newLabels:0,
  historicalEvidenceAuthenticated:false,independenceVerified:false,
  blindHoldout:false,holdoutFrozen:false,precision:null,recall:null,f1:null,
  sssPlusCertified:false,autoRepair:false,autoMerge:false};
 const labels=[CASES[0],CASES[1],...Array.from({length:12},(_,i)=>({
  pr:200+i,rule:'ANOTHER_'+i,path:'other/'+i,line:i+1,
  headSha:'d'.repeat(40),blobSha:'e'.repeat(40),positive:i<7
 }))].map((x,i)=>({...x,evidenceSha256:h('source-witness-'+i)}));
 const sourceTruth={schema:'ultra-sentinel-c2-run16-two-negatives-owner-seal/v1',
  status:'SOURCE_BEHAVIOR_TRUTH_PARTIAL',repository:repo,ownerRunId:39067708985,
  presealDigest:'c588dd2ceaf0e95644c30d6f0ca8b07fe7a8a06fb77e92f46954a016cadd23c3',
  witnessDigest:h('owner-witnesses'),labels,sourceCIAuthenticated:true,
  benchmarkCertified:false,sourcePositiveLabels:7,verifiedScopedNegativeLabels:7,
  benchmarkScoredLabels:0,tripleSPlusCertified:false};
 return {history,sourceTruth};
}
function review(input=fixtures()){return adjudicatePr153Negative(structuredClone(input));}
test('RED: authenticate original #153:69 scoped negative without manufacturing a cause',()=>{
 const p=fixtures(),before=JSON.stringify(p);
 const out=review(p);
 assert.equal(JSON.stringify(p),before);
 assert.equal(out.count,23);assert.equal(out.positives,11);assert.equal(out.negatives,12);
 assert.equal(out.adjudicatedNegativeHistoricalIdentities,1);
 assert.equal(out.provisionalPositiveFamiliesAfter,4);
 assert.equal(out.certifiedIndependentCausesAdded,0);
 assert.equal(out.remainingHistoricalCausesUncertified,21);
 assert.equal(out.newLabels,0);assert.equal(out.independenceVerified,false);
 assert.equal(out.holdoutFrozen,false);assert.equal(out.sssPlusCertified,false);
 assert.equal(out.precision,null);assert.equal(out.recall,null);assert.equal(out.f1,null);
 const row=out.entries.find(x=>x.pr===153&&x.line===69);
 assert.equal(row.positive,false);
 assert.equal(row.causalAdjudication.status,'SCOPED_ORIGINAL_NEGATIVE_MUTATION_SENSITIVE_NOT_SCORABLE');
 assert.equal(row.causalAdjudication.counterfactualStatus,'NEGATIVE_MUTATION_KILLED');
 assert.equal(row.causalAdjudication.provisionalFamily,null);
 assert.equal(row.causalAdjudication.provisionalCausalFingerprint,null);
 assert.equal(row.causalAdjudication.independentlyCertified,false);
 assert.equal(row.causalAdjudication.newGoldLabel,false);
 assert.equal(row.causalAdjudication.originalEvidenceSha256,p.sourceTruth.labels[1].evidenceSha256);
 assert.deepEqual(out.entries.filter(x=>!(x.pr===153&&x.line===69)),
  p.history.entries.filter(x=>!(x.pr===153&&x.line===69)));
 const positive=out.entries.find(x=>x.pr===153&&x.line===71);
 assert.equal(positive.causalAdjudication.provisionalFamily,'ADAPTIVE_PENDING_REPLAY_PROFILE_DIVERGENCE');
 assert.notEqual(positive.causalAdjudication.provisionalCausalFingerprint,null);
});
test('RED: reject forged history, swapped negative source, false safety or independence',()=>{
 const attacks=[
  x=>{x.history.entries.find(e=>e.pr===153&&e.line===69).positive=true;},
  x=>{x.history.entries.find(e=>e.pr===153&&e.line===69).blobSha='f'.repeat(40);},
  x=>{x.history.entries.find(e=>e.pr===153&&e.line===69).path='other.kt';},
  x=>{x.history.entries.find(e=>e.pr===153&&e.line===69).causalAdjudication={status:'CERTIFIED'};},
  x=>{x.history.entries.find(e=>e.pr===153&&e.line===71).positive=false;},
  x=>{x.history.entries.find(e=>e.pr===153&&e.line===71).causalAdjudication.provisionalFamily='BAD';},
  x=>{x.history.entries.push({...x.history.entries[0]});},
  x=>{x.history.provisionalPositiveFamiliesAfter=5;},
  x=>{x.history.newLabels=1;},
  x=>{x.history.sssPlusCertified=true;},
  x=>{x.sourceTruth.labels[1].positive=true;},
  x=>{x.sourceTruth.labels[1].sourceSha256='0'.repeat(64);},
  x=>{x.sourceTruth.labels[1].evidenceSha256='invalid';},
  x=>{x.sourceTruth.ownerRunId=1;},
  x=>{x.sourceTruth.presealDigest='0'.repeat(64);},
  x=>{x.sourceTruth.sourceCIAuthenticated=false;},
  x=>{x.sourceTruth.benchmarkScoredLabels=1;},
  x=>{x.sourceTruth.tripleSPlusCertified=true;}
 ];
 for(const attack of attacks){const p=fixtures();attack(p);
  assert.throws(()=>review(p),/C2_PR153_NEGATIVE_ADJUDICATION_BLOCKED/);
 }
});
