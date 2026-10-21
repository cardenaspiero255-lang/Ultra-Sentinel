'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {EXPECTED}=require('../../packages/quality-gates/c2-run23-ten-receipt-recovery.cjs');
const {adjudicateReplay}=require('../../packages/quality-gates/c2-pr153-replay-causal.cjs');
const {extendPr153CausalOverlay}=require('../../packages/quality-gates/c2-pr153-extended-causal-overlay.cjs');
const hash=s=>createHash('sha256').update(s).digest('hex');
const original={normalConsistent:true,preWriteRecovered:true,
 clearFailureShowsDivergence:true,replayProfileDiverged:true,
 replayStateConsistent:false,noDuplicateEvents:true,idempotent:true};
const patched={...original,replayProfileDiverged:false,replayStateConsistent:true};
function sample(){
 const pr150FP=hash('c2-provisional-family/v1\0cardenaspiero255-lang/gamehub-ultra\0RECOMMENDATION_CONFIDENCE_CALIBRATION');
 const entries=EXPECTED.map(x=>{
  const positive=x.positive;
  const initial=x.pr===150
   ?{status:positive?'PROVISIONAL_SHARED_FAMILY':'NEGATIVE_CONTROL',
     provisionalFamily:positive?'RECOMMENDATION_CONFIDENCE_CALIBRATION':null,
     provisionalCausalFingerprint:positive?pr150FP:null,independentlyCertified:false}
   :{status:x.pr===153?'ORIGINAL_ORACLE_ONLY_COUNTERFACTUAL_PENDING':
       positive?'SCOPED_ORIGINAL_FIX_COUNTERFACTUAL_PROVISIONAL':
       'SCOPED_ORIGINAL_NEGATIVE_MUTATION_SENSITIVE_NOT_SCORABLE',
     provisionalFamily:positive&&x.pr!==153?
        (x.pr===151?'THERMAL_SENSOR_NUMERIC_DOMAIN':'REFRESH_CANDIDATE_ELECTION'):null,
     provisionalCausalFingerprint:positive&&x.pr!==153?
       hash('c2-provisional-family/v1\0cardenaspiero255-lang/gamehub-ultra\0'+
         (x.pr===151?'THERMAL_SENSOR_NUMERIC_DOMAIN':'REFRESH_CANDIDATE_ELECTION')):null,
     independentlyCertified:false,
     originalEvidenceSha256:hash('evidence'+x.pr),
     counterfactualStatus:x.pr===153?'PATCH_NOT_RUN':positive?'PATCH_SCOPE_VERIFIED':'NEGATIVE_MUTATION_KILLED',
     candidateTrainingOnly:true};
  return {repository:'cardenaspiero255-lang/gamehub-ultra',
   pr:x.pr,headSha:x.headSha,blobSha:x.blobSha,rule:x.ruleId,path:x.path,
   line:x.line,positive:x.positive,causalAdjudication:initial};
 });
 const others=Array.from({length:13},(_,i)=>({
  repository:'cardenaspiero255-lang/gamehub-ultra',pr:i===0?153:210+i,
  headSha:(i+1).toString(16).padStart(40,'0'),
  blobSha:(i+20).toString(16).padStart(40,'0'),
  rule:i===0?'ADAPTIVE_PROFILE_WRITE_ISOLATED_FROM_EXPLICIT_CALLBACK':'UNKNOWN_'+i,
  path:'src/Unknown'+i+'.kt',line:i===0?69:i+1,positive:i<6,
  causalAdjudication:null
 }));
 const extended={
  schema:'c2-run23-historical-extended-causal-overlay/v1',
  status:'ADDITIVE_PROVISIONAL_CAUSAL_ADJUDICATION_NOT_CERTIFIED',
  referenceOwnerRun23:39077240648,originalInventorySha256:hash('original Run23'),
  preservedPr150Family:true,originalSourceInventoryUnchanged:true,
  sourceOverlayDigest:hash('parent'),caseBatchDigest:hash('batch'),
  count:23,positives:11,negatives:12,
  preexistingProvisionalPositiveLabels:2,addedSourceAnnotations:7,
  provisionalPositivesAdded:2,positiveRepairPending:1,negativeControlsAdded:4,
  certifiedIndependentCausesAdded:0,remainingHistoricalCausesUncertified:21,
  originalHistoricalLabelsChanged:false,entries:[...entries,...others],newLabels:0,
  historicalEvidenceAuthenticated:false,independenceVerified:false,
  blindHoldout:false,holdoutFrozen:false,
  precision:null,recall:null,f1:null,sssPlusCertified:false
 };
 return {extended,repair:structuredClone(adjudicateReplay(structuredClone({original,patched})))};
}
test('register PR153 only as provisional in historical extended view, preserving all 23 identities',()=>{
 const s=sample(),before=JSON.stringify(s.extended);
 const r=extendPr153CausalOverlay(s);
 assert.equal(JSON.stringify(s.extended),before);
 assert.equal(r.schema,'c2-run23-pr153-historical-extended-causal-overlay/v1');
 assert.equal(r.count,23);assert.equal(r.positives,11);assert.equal(r.negatives,12);
 assert.equal(r.originalHistoricalInventoryUnchanged,true);
 assert.equal(r.newLabels,0);assert.equal(r.certifiedIndependentCausesAdded,0);
 assert.equal(r.provisionalPositiveFamiliesAfter,4);
 assert.equal(r.pendingScopedPositiveRepairsAfter,0);
 assert.equal(r.remainingHistoricalCausesUncertified,21);
 assert.equal(r.independenceVerified,false);assert.equal(r.holdoutFrozen,false);
 assert.equal(r.precision,null);assert.equal(r.sssPlusCertified,false);
 const x=r.entries.find(x=>x.pr===153);
 const old=s.extended.entries.find(x=>x.pr===153);
 assert.equal(x.rule,old.rule);assert.equal(x.line,71);assert.equal(x.positive,true);
 assert.equal(x.causalAdjudication.status,'SCOPED_ORIGINAL_FIX_COUNTERFACTUAL_PROVISIONAL');
 assert.equal(x.causalAdjudication.provisionalFamily,'ADAPTIVE_PENDING_REPLAY_PROFILE_DIVERGENCE');
 assert.equal(x.causalAdjudication.independentlyCertified,false);
 assert.equal(x.causalAdjudication.counterfactualStatus,'PATCH_SCOPE_VERIFIED');
 assert.match(x.causalAdjudication.provisionalCausalFingerprint,/^[a-f0-9]{64}$/);
 assert.equal(x.causalAdjudication.provisionalCausalFingerprint!==null,true);
 const allOther=r.entries.filter(x=>!(x.pr===153&&x.line===71));
 assert.deepEqual(allOther,s.extended.entries.filter(x=>!(x.pr===153&&x.line===71)));
 const separate153=r.entries.find(x=>x.pr===153&&x.line===69);
 assert.equal(separate153.rule,'ADAPTIVE_PROFILE_WRITE_ISOLATED_FROM_EXPLICIT_CALLBACK');
 assert.equal(separate153.causalAdjudication,null);
});
test('PR150 shared family and its negative control must remain unchanged and distinct',()=>{
 const s=sample(),r=extendPr153CausalOverlay(s);
 const positives=r.entries.filter(x=>x.pr===150&&x.positive);
 assert.equal(positives.length,2);
 assert.equal(positives[0].causalAdjudication.provisionalCausalFingerprint,
   positives[1].causalAdjudication.provisionalCausalFingerprint);
 const neg=r.entries.find(x=>x.pr===150&&!x.positive);
 assert.equal(neg.line,250);
 assert.equal(neg.causalAdjudication.status,'NEGATIVE_CONTROL');
 assert.equal(neg.causalAdjudication.provisionalCausalFingerprint,null);
 assert.notEqual(r.entries.find(x=>x.pr===153).causalAdjudication.provisionalCausalFingerprint,
   positives[0].causalAdjudication.provisionalCausalFingerprint);
});
test('fail closed for counterfeit histories, defect polarity, matrix changes or forged certification',()=>{
 const attacks=[
  x=>{x.extended.entries.find(e=>e.pr===153).line=72;},
  x=>{x.extended.entries.find(e=>e.pr===153).positive=false;},
  x=>{x.extended.entries.find(e=>e.pr===153).causalAdjudication.status='CERTIFIED';},
  x=>{x.extended.entries.find(e=>e.pr===150&&!e.positive).causalAdjudication.status='PROVISIONAL_SHARED_FAMILY';},
  x=>{x.extended.entries.find(e=>e.pr===151).causalAdjudication.provisionalCausalFingerprint=
    x.extended.entries.find(e=>e.pr===150&&e.positive).causalAdjudication.provisionalCausalFingerprint;},
  x=>{x.repair.originalAndRepairedJVMBehaviors.patched.replayStateConsistent=false;},
  x=>{x.repair.originalBlobSha='f'.repeat(40);},
  x=>{x.repair.independentCauseCertified=true;},
  x=>{x.extended.newLabels=1;},
  x=>{x.extended.certifiedIndependentCausesAdded=1;},
  x=>{x.extended.entries.push({...x.extended.entries[0]});}
 ];
 for(const attack of attacks){
  const x=sample();attack(x);
  assert.throws(()=>extendPr153CausalOverlay(x),/C2_PR153_EXTENDED_OVERLAY_BLOCKED/);
 }
});
