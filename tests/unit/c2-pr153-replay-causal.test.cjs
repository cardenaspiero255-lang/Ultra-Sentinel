'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {patchOriginal,adjudicateReplay,ORIGINAL_BLOB}=require('../../packages/quality-gates/c2-pr153-replay-causal.cjs');
const source='  if (wasSessionHandled()) {\n            optimizer.restoreState(pending.key, pending.targetState)\n            optimizer.clearPendingDecision(session.sessionId)\n            return PerGameAdaptiveDecision(\n';
const valid={original:{normalConsistent:true,preWriteRecovered:true,
 clearFailureShowsDivergence:true,replayProfileDiverged:true,replayStateConsistent:false,
 noDuplicateEvents:true,idempotent:true},
 patched:{normalConsistent:true,preWriteRecovered:true,
 clearFailureShowsDivergence:true,replayProfileDiverged:false,replayStateConsistent:true,
 noDuplicateEvents:true,idempotent:true}};
test('minimal authenticated Kotlin source edit only re-persists target during handled pending replay',()=>{
 const mutated=patchOriginal(source,{requireOriginalBlob:false});
 assert.equal(mutated.split('\n').length,source.split('\n').length+1);
 assert.match(mutated,/if \(wasSessionHandled\(\)\) \{\n            persistProfile\(pending.key.packageName, pending.targetProfile\)\n            optimizer.restoreState/);
 assert.equal(mutated.replace('            persistProfile(pending.key.packageName, pending.targetProfile)\n',''),source);
 assert.notEqual(mutated,source);
 assert.equal(ORIGINAL_BLOB,'d8708fd6245cea2e8dab4404ef5bfb7e682e1a6f');
});
test('2-way original vs repaired JVM behavior isolates one failure and keeps all benign controls',()=>{
 const r=adjudicateReplay(valid);
 assert.equal(r.originalDefectObserved,true);
 assert.equal(r.patchedReplayRestoresPersistedTarget,true);
 assert.equal(r.newHistoricalLabels,0);
 assert.equal(r.independentCauseCertified,false);
 assert.equal(r.holdoutFrozen,false);
 assert.equal(r.precision,null);
});
test('fail closed for incomplete or tampered counterfactual observations',()=>{
 for(const variant of ['original','patched']){
  for(const field of Object.keys(valid[variant])){
   const x=structuredClone(valid);x[variant][field]=!x[variant][field];
   assert.throws(()=>adjudicateReplay(x),/C2_PR153_REPLAY_COUNTERFACTUAL_BLOCKED/);
  }
 }
 const forged=structuredClone(valid);forged.patched.fake=true;
 assert.throws(()=>adjudicateReplay(forged),/C2_PR153_REPLAY_COUNTERFACTUAL_BLOCKED/);
});
test('cannot patch unrelated code or multiply a source anchor',()=>{
 assert.throws(()=>patchOriginal('class Irrelevant {}',{requireOriginalBlob:false}),/C2_PR153_REPLAY_COUNTERFACTUAL_BLOCKED/);
 assert.throws(()=>patchOriginal(source+source,{requireOriginalBlob:false}),/C2_PR153_REPLAY_COUNTERFACTUAL_BLOCKED/);
});
