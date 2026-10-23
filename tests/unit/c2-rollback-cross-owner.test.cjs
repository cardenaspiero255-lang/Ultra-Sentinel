'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {adjudicateRollbackCross}=require('../../packages/quality-gates/c2-rollback-cross-owner.cjs');
const H=n=>n.toString(16).padStart(64,'0');
function fixture(){
 const source=[
  {id:'153:71',head:'6508cc124076b9dea437ea1efc213d3ce55d7baf',
   blob:'d8708fd6245cea2e8dab4404ef5bfb7e682e1a6f',repairSha256:H(17)},
  {id:'152:41',head:'104b7dc33e4c0341cec3fca81e3c8fbe3625357f',
   blob:'ed936aa687b08cf8d964d54f9d88e68bb12344ec',repairSha256:H(18)},
  {id:'153:69',head:'6508cc124076b9dea437ea1efc213d3ce55d7baf',
   blob:'18911c26a9afaf051fda0e9ea14cdaccf943a47b',
   sourceSha256:'8e136084412a57074f3c3a5ce8d7e209cef8274f79a752b5d1dc957447f7ee15'}
 ];
 const originalAdaptive={
  normalConsistent:true,preWriteRecovered:true,clearFailureShowsDivergence:true,
  replayProfileDiverged:true,replayStateConsistent:false,noDuplicateEvents:true,idempotent:true
 };
 const repairedAdaptive={...originalAdaptive,replayProfileDiverged:false,replayStateConsistent:true};
 return {schema:'c2-original-rollback-cross-jvm-input/v1',source,
  adaptive:{
   original:originalAdaptive,repaired:repairedAdaptive,
   originalLogSha256:H(21),repairedLogSha256:H(22),
   originalJarSha256:H(23),repairedJarSha256:H(24)
  },
  store:{
   original:{normalPassed:true,otherPackagePassed:true,staleRejected:false,forwardProgressPassed:true},
   repaired:{normalPassed:true,otherPackagePassed:true,staleRejected:true,forwardProgressPassed:true},
   originalLogSha256:H(25),repairedLogSha256:H(26),
   originalJarSha256:H(27),repairedJarSha256:H(28)
  },
  negative:{
   originalControlsPassed:true,mutantKilled:true,
   originalLogSha256:H(29),mutantLogSha256:H(30),
   originalJarSha256:H(31),mutantJarSha256:H(32),
   originalOperatorUntouched:true
  },sourceBlobsAuthenticated:true,sandboxEnforced:true,
  candidateSourceRead:false,detectorPredictionsRead:false,newGoldLabels:0
 };
}
test('RED: crossed original rollback repairs and genuine mutant-sensitive negative remain provisional',()=>{
 const report=adjudicateRollbackCross(fixture());
 assert.equal(report.schema,'c2-rollback-153-152-original-cross-verified/v1');
 assert.equal(report.originalKotlinJvmExecutions,6);
 assert.equal(report.matrix.length,4);
 assert.deepEqual(report.matrix.map(x=>[x.adaptiveCorrect,x.storeCorrect]),[
  [false,false],[false,true],[true,false],[true,true]
 ]);
 assert.equal(report.negative153Line69Validated,true);
 assert.equal(report.familiesIndependentlyCertified,0);
 assert.equal(report.historicalCausesClosed,0);
 assert.equal(report.newGoldLabels,0);
 assert.equal(report.candidateSourceRead,false);
 assert.equal(report.precision,null);
 assert.equal(report.sssPlusCertified,false);
 assert.match(report.evidenceSha256,/^[a-f0-9]{64}$/);
});
test('RED: deny source drift, mislabeled controls, incomplete JVM receipts and GOLD promotion',()=>{
 const mutations=[
  x=>x.source[0].blob='f'.repeat(40),
  x=>x.source[2].head='f'.repeat(40),
  x=>x.store.repaired.staleRejected=false,
  x=>x.store.original.otherPackagePassed=false,
  x=>x.adaptive.repaired.replayStateConsistent=false,
  x=>x.negative.originalControlsPassed=false,
  x=>x.negative.mutantKilled=false,
  x=>x.negative.originalLogSha256=x.negative.mutantLogSha256,
  x=>x.sourceBlobsAuthenticated=false,
  x=>x.sandboxEnforced=false,
  x=>x.detectorPredictionsRead=true,
  x=>x.newGoldLabels=1
 ];
 for(const mutate of mutations){const x=fixture();mutate(x);
  assert.throws(()=>adjudicateRollbackCross(x),/C2_ROLLBACK_CROSS_BLOCKED/);
 }
});
