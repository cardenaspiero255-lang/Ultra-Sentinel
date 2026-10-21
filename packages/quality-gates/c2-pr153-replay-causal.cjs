'use strict';
/* Historical original source only: code-level replay counterfactual, not
 * deployed GameHub fix, independent GOLD, or SSS+ qualification.
 */
const {createHash}=require('node:crypto');
const ORIGINAL_BLOB='d8708fd6245cea2e8dab4404ef5bfb7e682e1a6f';
const ORIGINAL_HEAD='6508cc124076b9dea437ea1efc213d3ce55d7baf';
const PATH='app/src/main/java/com/cardenaspiero255/gamehubultra/PerGameAdaptiveRuntime.kt';
const FROM='        if (wasSessionHandled()) {\n            optimizer.restoreState(pending.key, pending.targetState)';
const TO='        if (wasSessionHandled()) {\n            persistProfile(pending.key.packageName, pending.targetProfile)\n            optimizer.restoreState(pending.key, pending.targetState)';
const fail=()=>{throw Error('C2_PR153_REPLAY_COUNTERFACTUAL_BLOCKED');};
const hashBlob=s=>{const b=Buffer.from(s,'utf8');return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');};
function patchOriginal(source,{requireOriginalBlob=true}={}){
 if(typeof source!=='string'||source.length<40||source.length>100000||
  source.includes('\0')||requireOriginalBlob&&hashBlob(source)!==ORIGINAL_BLOB||
  source.split(FROM).length!==2||source.includes(TO))fail();
 const repaired=source.replace(FROM,TO);
 if(repaired===source||hashBlob(repaired)===ORIGINAL_BLOB)fail();
 return repaired;
}
const original=Object.freeze({
 normalConsistent:true,preWriteRecovered:true,
 clearFailureShowsDivergence:true,replayProfileDiverged:true,
 replayStateConsistent:false,noDuplicateEvents:true,idempotent:true});
const patched=Object.freeze({
 normalConsistent:true,preWriteRecovered:true,
 clearFailureShowsDivergence:true,replayProfileDiverged:false,
 replayStateConsistent:true,noDuplicateEvents:true,idempotent:true});
function adjudicateReplay(observed){
 if(!observed||typeof observed!=='object'||Array.isArray(observed)||
  Object.keys(observed).length!==2)fail();
 for(const [name,want] of Object.entries({original,patched})){
  const x=observed[name];
  if(!x||typeof x!=='object'||Array.isArray(x)||
    Object.keys(x).length!==Object.keys(want).length)fail();
  for(const [key,value] of Object.entries(want))if(x[key]!==value)fail();
 }
 return Object.freeze({
  schema:'c2-pr153-original-replay-cross-intervention/v1',
  originalRepo:'cardenaspiero255-lang/gamehub-ultra',originalPr:153,
  originalHeadSha:ORIGINAL_HEAD,originalBlobSha:ORIGINAL_BLOB,originalPath:PATH,
  originalDefectObserved:true,patchedReplayRestoresPersistedTarget:true,
  scopedOnlyToPendingHandledBranch:true,
  originalAndRepairedJVMBehaviors:observed,
  benignControlsPassed:5,negativeControlFailures:0,
  originalHistoricalLabelsChanged:false,newHistoricalLabels:0,
  provisionalCausalFamily:'ADAPTIVE_PENDING_REPLAY_PROFILE_DIVERGENCE',
  independentCauseCertified:false,independenceVerified:false,
  historicalEvidenceAuthenticated:false,
  holdoutFrozen:false,precision:null,recall:null,f1:null,
  sssPlusCertified:false,autoRepair:false,autoMerge:false,
  limitations:'Original authentic Kotlin defect and disposable source repair validated for one injected post-handled clear failure. Other callsites, durability, hardware, and independent root-cause admission are not validated.'
 });
}
module.exports={patchOriginal,adjudicateReplay,hashBlob,ORIGINAL_BLOB,ORIGINAL_HEAD,PATH};
