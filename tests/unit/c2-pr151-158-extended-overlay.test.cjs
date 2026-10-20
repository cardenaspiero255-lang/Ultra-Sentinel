'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {extendCausalOverlay}=require('../../packages/quality-gates/c2-pr151-158-extended-overlay.cjs');
const {EXPECTED}=require('../../packages/quality-gates/c2-run23-ten-receipt-recovery.cjs');
const {adjudicateBatch,ORIGINALS,NEGATIVES}=require('../../packages/quality-gates/c2-pr151-158-causal-batch.cjs');
const {createHash}=require('node:crypto');
const h=s=>createHash('sha256').update(s).digest('hex');
function batch(){
 const rows=ORIGINALS.map(p=>({...p,originalEvidenceSha256:h('source'+p.pr),
  repairResults:p.pr===153?null:p.pr===151?{
   original:{infinityAlert:true,finiteAlert:true,nanAlert:false},
   patched:{infinityAlert:false,finiteAlert:true,nanAlert:false}
  }:{
   original:{supportedStarved:true,supportedControl:true,unsupportedOnly:false,insufficient:false},
   patched:{supportedStarved:false,supportedControl:true,unsupportedOnly:false,insufficient:false}
  }}));
 const negatives=NEGATIVES.map(p=>({...p,scopedOriginalControlPassed:true,
  counterfactualMutationKilled:true,negativeFindingLabelsEstablished:0,
  originalWitnessSha256:h('n'+p.pr),mutantWitnessSha256:h('m'+p.pr)}));
 return adjudicateBatch({rows,negatives});
}
function originalOverlay(){
 const pre=EXPECTED.filter(x=>x.pr===150);
 const others=EXPECTED.filter(x=>x.pr>=151);
 const inv=[
 ...[...pre,...others].map(p=>({repository:'cardenaspiero255-lang/gamehub-ultra',
   pr:p.pr,headSha:p.headSha,blobSha:p.blobSha,rule:p.ruleId,
   path:p.path,line:p.line,positive:p.positive,causalAdjudication:p.pr===150?{
    status:p.positive?'PROVISIONAL_SHARED_FAMILY':'NEGATIVE_CONTROL',
    provisionalFamily:p.positive?'RECOMMENDATION_CONFIDENCE_CALIBRATION':null,
    provisionalCausalFingerprint:p.positive?h('historical-'+p.pr):null,
    independentlyCertified:false
   }:null})),
 ...Array.from({length:13},(_,i)=>({repository:'cardenaspiero255-lang/gamehub-ultra',
  pr:i===12?150:300+i,headSha:String(i+1).padStart(40,'0'),
  blobSha:String(i+10).padStart(40,'0'),rule:'UNKNOWN_'+i,
  path:'app/src/Unknown.kt',line:i+1,positive:i<6,causalAdjudication:null}))
 ];
 const r={schema:'ultra-sentinel-c2-run23-pr150-causal-overlay/v1',
  status:'PROVISIONAL_FAMILY_REGISTERED_NOT_INDEPENDENTLY_CERTIFIED',
  repository:'cardenaspiero255-lang/gamehub-ultra',count:23,positives:11,negatives:12,
  originalHistoricalInventoryUnchanged:true,originalSourceLabelsUnchanged:true,
  originalInventorySha256:h('immutable-run23'),provisionalGroupsAdded:1,
  provisionalPositiveLabelsGrouped:2,originalRun23:39077240648,
  causalAdjudicationRun:39507901311,provisionalAnnotations:pre.map(x=>({
   pr:150,line:x.line,positive:x.positive,
   causalStatus:x.positive?'PROVISIONAL_SHARED_FAMILY':'NEGATIVE_CONTROL'
  })),inventory:inv,remainingHistoricalCausesUncertified:21,
  historicalIndependenceProven:false,independenceVerified:false,
  historicalEvidenceAuthenticated:false,blindHoldout:false,holdoutFrozen:false,
  corpusNewLabels:0,precision:null,recall:null,f1:null,sssPlusCertified:false};
 return r;
}
test('adds 7 original case annotations without touching #150 or sealing any independent cause',()=>{
 const o=originalOverlay(),prior=JSON.stringify(o);
 const r=extendCausalOverlay(o,batch());
 assert.equal(JSON.stringify(o),prior);
 assert.equal(r.count,23);
 assert.equal(r.addedSourceAnnotations,7);
 assert.equal(r.provisionalPositivesAdded,2);
 assert.equal(r.positiveRepairPending,1);
 assert.equal(r.negativeControlsAdded,4);
 assert.equal(r.certifiedIndependentCausesAdded,0);
 assert.equal(r.newLabels,0);
 assert.equal(r.holdoutFrozen,false);
 assert.equal(r.precision,null);
 assert.equal(r.entries.filter(x=>x.causalAdjudication!==null).length,10);
 assert.equal(r.entries.filter(x=>x.pr===150&&x.positive).length,2);
 assert.equal(r.entries.filter(x=>x.pr===150&&x.rule==='UNKNOWN_12').length,1);
 assert.equal(r.entries.find(x=>x.pr===150&&x.rule==='UNKNOWN_12').causalAdjudication,null);
 assert.ok(r.entries.filter(x=>x.pr===150).every(x=>x.causalAdjudication?.independentlyCertified===false));
 assert.ok(r.entries.filter(x=>[154,155,157,158].includes(x.pr)).every(x=>
  x.causalAdjudication.provisionalCausalFingerprint===null));
});
test('tampering historical identity, misplaced negative or forged independent root causes fails',()=>{
 for(const mutation of [
  x=>x.inventory[3].line=999,
  x=>x.inventory[5].positive=!x.inventory[5].positive,
  x=>x.count=24,
  x=>x.independenceVerified=true,
  x=>x.inventory[1].causalAdjudication=null,
  x=>x.sssPlusCertified=true
 ]){
  const o=originalOverlay();mutation(o);assert.throws(()=>extendCausalOverlay(o,batch()),/C2_EXTENDED_CAUSAL_OVERLAY_BLOCKED/);
 }
 const b=structuredClone(batch());b.entries[0].verifiedIndependentCause=true;
 assert.throws(()=>extendCausalOverlay(originalOverlay(),b),/C2_EXTENDED_CAUSAL_OVERLAY_BLOCKED/);
});
