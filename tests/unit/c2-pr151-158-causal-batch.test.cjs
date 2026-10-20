'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {
  patchedOriginal,adjudicateBatch,ORIGINALS,NEGATIVES
}=require('../../packages/quality-gates/c2-pr151-158-causal-batch.cjs');
const hash=x=>createHash('sha256').update(x).digest('hex');
const fake=(pr)=>{
 const row=ORIGINALS.find(x=>x.pr===pr);
 return pr===151?{original:{infinityAlert:true,finiteAlert:true,nanAlert:false},
  patched:{infinityAlert:false,finiteAlert:true,nanAlert:false}}:
 {original:{supportedStarved:true,supportedControl:true,unsupportedOnly:false,insufficient:false},
  patched:{supportedStarved:false,supportedControl:true,unsupportedOnly:false,insufficient:false}};
};
function data(){
 const rows=ORIGINALS.map(o=>({...o,originalEvidenceSha256:hash('original-'+o.pr),
  repairResults:o.pr===153?null:fake(o.pr)}));
 const negatives=NEGATIVES.map(o=>({...o,scopedOriginalControlPassed:true,
  counterfactualMutationKilled:true,negativeFindingLabelsEstablished:0,
  originalWitnessSha256:hash('original-negative-'+o.pr),
  mutantWitnessSha256:hash('negative-mutant-'+o.pr)}));
 return {rows,negatives};
}
test('strict source patch #151 repairs ONLY mid-session Infinity and #152 only refresh plurality',()=>{
 const source151='val headroomEscalated =\n current.thermalHeadroom != null &&\n !current.thermalHeadroom.isNaN() &&\n current.thermalHeadroom >= HIGH_THERMAL_HEADROOM';
 const source152='val candidate = grouped.maxByOrNull { it.value } ?: return null\n return candidate.key.takeIf';
 const patch151=patchedOriginal(151,source151,{requireBlob:false});
 const patch152=patchedOriginal(152,source152,{requireBlob:false});
 assert.ok(patch151.includes('current.thermalHeadroom.isFinite()'));
 assert.ok(patch152.includes('grouped.filterKeys { it in capabilities.supportedRefreshRatesHz }'));
 assert.ok(!patch151.includes('!current.thermalHeadroom.isNaN()'));
 assert.ok(!patch152.includes('val candidate = grouped.maxByOrNull'));
 assert.throws(()=>patchedOriginal(151,source151+source151,{requireBlob:false}),/C2_CAUSAL_BATCH_BLOCKED/);
 assert.throws(()=>patchedOriginal(152,'fun fake(){}',{requireBlob:false}),/C2_CAUSAL_BATCH_BLOCKED/);
});
test('matrix gives only provisional positives and mutation-sensitive negatives, zero accredited families',()=>{
 const r=adjudicateBatch(data());
 assert.equal(r.provisionalPositiveFamilies,2);
 assert.equal(r.originalPositiveControlsVerified,3);
 assert.equal(r.counterfactualPositivesVerified,2);
 assert.equal(r.scopedNegativeControlsVerified,4);
 assert.equal(r.negativeControlsMutantSensitive,4);
 assert.equal(r.pendingPositiveRepairs,1);
 assert.equal(r.entries.length,7);
 assert.equal(r.causalFamiliesIndependentlyCertified,0);
 assert.equal(r.newLabels,0);assert.equal(r.precision,null);
 assert.equal(r.holdoutFrozen,false);assert.equal(r.sssPlusCertified,false);
 assert.equal(r.entries.find(x=>x.pr===153).status,'ORIGINAL_ORACLE_ONLY_COUNTERFACTUAL_PENDING');
 assert.ok(r.entries.filter(x=>x.positive).every(x=>x.verifiedIndependentCause===false));
 assert.ok(r.entries.filter(x=>!x.positive).every(x=>x.provisionalCausalFingerprint===null));
});
test('attack: flipped original or mutating benign controls rejects',()=>{
 for(const mutate of [
  x=>x.rows[0].repairResults.patched.infinityAlert=true,
  x=>x.rows[0].repairResults.original.nanAlert=true,
  x=>x.rows[1].repairResults.patched.unsupportedOnly=true,
  x=>x.rows[1].repairResults.original.supportedStarved=false,
  x=>x.rows[0].blobSha='f'.repeat(40),
  x=>x.rows[0].ruleId='FAKE',
  x=>x.negatives[0].counterfactualMutationKilled=false,
  x=>x.negatives[2].positive=true,
  x=>x.rows[2].repairResults={...fake(151)},
  x=>x.negatives.pop()
 ]){
  const d=data();mutate(d);
  assert.throws(()=>adjudicateBatch(d),/C2_CAUSAL_BATCH_BLOCKED/);
 }
});
