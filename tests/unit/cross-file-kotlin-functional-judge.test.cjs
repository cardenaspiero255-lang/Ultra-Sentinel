'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {adjudicateKotlinCrossFileProof,verifyPinnedKotlinSourceBytes}=
 require('../../packages/recovery/cross-file-kotlin-functional-judge.cjs');
const M='app/src/main/java/com/cardenaspiero255/gamehubultra/ai/UltraMathEngine.kt';
const B='app/src/main/java/com/cardenaspiero255/gamehubultra/domain/BatteryAwareGamingEngine.kt';
const modes=['00','10','01','11'];
const baseline='a'.repeat(40);
function local(){
 return {schema:'ultra-sentinel-local-cross-file-reproduction/v1',
  status:'LOCAL_FACTORIAL_COMPLETED_REQUIRES_EXTERNAL_ORACLE',
  baseSha:'2289f4e4cda55ddaa50f2016113ded82dc17203c',
  headSha:'b74791d9ea7e1e4b88f0ef1e286d87f036c6e7be',
  candidateRule:'NONFINITE_NUMERIC_BOUNDARY',
  sourceAuthenticated:false,causalityVerified:false,mergeAllowed:false,
  commitAllowed:false,productionReleaseAllowed:false,independentOracleProvenanceVerified:false,
  scenarios:[[],[M],[B],[M,B]].map((selectedFiles,i)=>({
   selectedFiles,oracleVerdict:'PASS',
   judgeStatus:i?'APPROVED_LOCAL_POLICY_ONLY':'BASELINE_NO_COMMIT',
   rollbackVerified:true,remoteWrites:false,baselineTree:baseline,restoredTree:baseline
  }))};
}
function logs(){
 return Object.fromEntries(modes.map(mode=>[mode,
  'C2_PR185_ORDINARY_CONTROLS_PASS\n'+
  'C2_PR185_VECTOR mode='+mode+' math='+(mode[0]==='1')+
   ' battery='+(mode[1]==='1')+'\n'+
  'C2_PR185_FACTORIAL_SCOPE_PASS\n']));
}
function rows(){return ['00','01','10','11'].map(mode=>({
 mathRepair:mode[0]==='1',batteryRepair:mode[1]==='1',
 mathGuardedSuccess:mode[0]==='1',batteryPolicyRejectsNonfinite:mode[1]==='1',
 normalMathControlPassed:true,normalBatteryControlPassed:true,actualJVMExecution:true
}));}
test('four real-JVM expected vectors + local Judge + rollback are required for a conditional local PASS',()=>{
 const r=adjudicateKotlinCrossFileProof({localProof:local(),logs:logs(),rows:rows()});
 assert.equal(r.status,'LOCAL_KOTLIN_FACTORIAL_ACCEPTED_NO_RELEASE');
 assert.equal(r.functionalJudgeApproved,true);
 assert.equal(r.kotlinJVMExecutionVerifiedExternally,false);
 assert.equal(r.githubSourceAuthenticatedExternally,false);
 assert.equal(r.causalityVerified,false);assert.equal(r.remoteWrites,false);
 assert.equal(r.mergeAllowed,false);assert.equal(r.productionReleaseAllowed,false);
 assert.equal(r.modesValidated,4);
});
test('functional regression MUST veto even though every Git Judge and rollback status is green',()=>{
 const normal=logs();normal['11']='C2_PR185_VECTOR mode=11 math=true battery=true\n'+
  'C2_PR185_FACTORIAL_SCOPE_PASS\n'; // benign control silently regressed
 const r=adjudicateKotlinCrossFileProof({localProof:local(),logs:normal,rows:rows()});
 assert.equal(r.status,'FUNCTIONAL_JUDGE_VETO');
 assert.equal(r.functionalJudgeApproved,false);
 assert.equal(r.gitJudgeApproved,true);
 assert.equal(r.rollbackVerified,true);
 assert.equal(r.mergeAllowed,false);
});
test('mismatched true/false vectors, absent JVM runs, missing scenarios and wrong order veto',()=>{
 const inputs=[
  {logs:{...logs(), '10':logs()['00']}},
  {rows:rows().map((r,i)=>i===2?{...r,actualJVMExecution:false}:r)},
  {localProof:{...local(),scenarios:local().scenarios.slice(0,3)}},
  {localProof:{...local(),scenarios:local().scenarios.slice().reverse()}},
  {localProof:{...local(),scenarios:local().scenarios.map((s,i)=>
   i===2?{...s,oracleVerdict:'FAIL'}:s)}},
  {localProof:{...local(),scenarios:local().scenarios.map((s,i)=>
   i===3?{...s,restoredTree:'b'.repeat(40)}:s)}}
 ];
 for(const one of inputs){
  const r=adjudicateKotlinCrossFileProof({localProof:local(),logs:logs(),rows:rows(),...one});
  assert.equal(r.status,'FUNCTIONAL_JUDGE_VETO');
  assert.equal(r.functionalJudgeApproved,false);
 }
});
test('a missing or mispinned Kotlin source is denied before a JVM claim',()=>{
 assert.throws(()=>verifyPinnedKotlinSourceBytes({
  mathOriginal:'not original\n',batteryOriginal:'not original\n'
 }),/PINNED_KOTLIN_SOURCE_INVALID/);
});
