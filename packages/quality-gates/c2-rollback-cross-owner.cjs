'use strict';
// Grounded original Kotlin JVM cross: separate ABI sandboxes, one shared mechanism
// hypothesis. Independent causal family membership is NOT inferred.
const {createHash}=require('node:crypto');
const {adjudicateReplay}=require('./c2-pr153-replay-causal.cjs');
const H64=/^[a-f0-9]{64}$/;
const fail=()=>{throw Error('C2_ROLLBACK_CROSS_BLOCKED');};
const sources=[
 {id:'153:71',head:'6508cc124076b9dea437ea1efc213d3ce55d7baf',
  blob:'d8708fd6245cea2e8dab4404ef5bfb7e682e1a6f'},
 {id:'152:41',head:'104b7dc33e4c0341cec3fca81e3c8fbe3625357f',
  blob:'ed936aa687b08cf8d964d54f9d88e68bb12344ec'},
 {id:'153:69',head:'6508cc124076b9dea437ea1efc213d3ce55d7baf',
  blob:'18911c26a9afaf051fda0e9ea14cdaccf943a47b',
  sourceSha256:'8e136084412a57074f3c3a5ce8d7e209cef8274f79a752b5d1dc957447f7ee15'}
];
const exact=(x,o)=>x&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).sort().join('|')===Object.keys(o).sort().join('|')&&
 Object.keys(o).every(k=>x[k]===o[k]);
const SHA=x=>typeof x==='string'&&H64.test(x);
function adjudicateRollbackCross(data){
 try{
  if(!data||data.schema!=='c2-original-rollback-cross-jvm-input/v1'||
   !Array.isArray(data.source)||data.source.length!==3||
   data.source.some((x,i)=>Object.entries(sources[i]).some(([k,v])=>x?.[k]!==v)||
    i<2&&!SHA(x.repairSha256))||
   data.source[0].repairSha256===data.source[1].repairSha256||
   data.sourceBlobsAuthenticated!==true||data.sandboxEnforced!==true||
   data.candidateSourceRead!==false||data.detectorPredictionsRead!==false||
   data.newGoldLabels!==0){
    console.error('C2_SOURCE_GATE_DIAGNOSTIC '+JSON.stringify({
      validSchema:data?.schema==='c2-original-rollback-cross-jvm-input/v1',
      sourceCount:data?.source?.length,
      tupleMisses:data?.source?.map((v,i)=>Object.entries(sources[i]).filter(([k,w])=>v?.[k]!==w).map(([k])=>k)),
      repairShaValid:data?.source?.slice(0,2).map(v=>SHA(v.repairSha256)),
      repairShaDistinct:data?.source?.[0]?.repairSha256!==data?.source?.[1]?.repairSha256,
      sourceBlobsAuthenticated:data?.sourceBlobsAuthenticated,
      sandboxEnforced:data?.sandboxEnforced,
      candidateSourceRead:data?.candidateSourceRead,
      detectorPredictionsRead:data?.detectorPredictionsRead,
      newGoldLabels:data?.newGoldLabels
    }));
    fail();
   }
  const a=data.adaptive,s=data.store,n=data.negative;
  if(!a||!s||!n)fail();
  const replay=adjudicateReplay({original:a.original,patched:a.repaired});
  if(!replay.originalDefectObserved||!replay.patchedReplayRestoresPersistedTarget)fail();
  const expectedOriginal={normalPassed:true,otherPackagePassed:true,staleRejected:false,forwardProgressPassed:true};
  const expectedFixed={...expectedOriginal,staleRejected:true};
  if(!exact(s.original,expectedOriginal)||!exact(s.repaired,expectedFixed)||
   n.originalControlsPassed!==true||n.mutantKilled!==true||
   n.originalOperatorUntouched!==true)fail();
  const fields=['originalLogSha256','repairedLogSha256','originalJarSha256','repairedJarSha256'];
  const originals=[...fields.map(k=>a[k]),...fields.map(k=>s[k]),
   ...['originalLogSha256','mutantLogSha256','originalJarSha256','mutantJarSha256'].map(k=>n[k])];
  if(originals.length!==12||originals.some(x=>!SHA(x))||
   new Set(originals).size!==originals.length)fail();
  const matrix=['00','01','10','11'].map(mode=>Object.freeze({
   mode,adaptiveRepaired:mode[0]==='1',storeRepaired:mode[1]==='1',
   adaptiveCorrect:mode[0]==='1',storeCorrect:mode[1]==='1',
   independentJVMProcesses:true,
   sharedRuntimeCrossInteractionTested:false
  }));
  const report={
   schema:'c2-rollback-153-152-original-cross-verified/v1',
   status:'SIX_REAL_KOTLIN_JVMS_ROLLBACK_LOCAL_EFFECTS_SEPARABLE_CAUSAL_FAMILIES_UNPROVEN',
   sources,
   originalKotlinJvmExecutions:6,originalJVMContexts:3,
   matrix,
   adaptiveRepairEffectVerified:true,storeRepairEffectVerified:true,
   negative153Line69Validated:true,benignControlFailures:0,
   originalHistoricalLabelsAltered:false,independentRuntimeInteractionTested:false,
   familiesIndependentlyCertified:0,historicalCausesClosed:0,
   causalMechanismHypotheses:[
    'ADAPTIVE_PENDING_REPLAY_PROFILE_DIVERGENCE',
    'ROLLBACK_VERSION_MONOTONICITY'
   ],
   newGoldLabels:0,candidateSourceRead:false,detectorPredictionsRead:false,
   holdoutFrozen:false,precision:null,recall:null,f1:null,sssPlusCertified:false,
   limitation:'Four-cell outcome matrix pairs results of TWO independent Kotlin API executions per repaired state, not a shared JVM integration; local guards do not establish independent root-cause families. #153:69 is a real original-vs-mutant scope negative, not a scored benchmark negative.'
  };
  return Object.freeze({...report,evidenceSha256:createHash('sha256').update(JSON.stringify({
   inputs:data,report
  })).digest('hex')});
 }catch(e){if(e?.message==='C2_ROLLBACK_CROSS_BLOCKED')throw e;fail();}
}
module.exports={adjudicateRollbackCross};
