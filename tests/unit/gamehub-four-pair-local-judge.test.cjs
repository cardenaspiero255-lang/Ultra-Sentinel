'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {SPECS,assessCrossPair,runPinnedPair}=
 require('../../packages/recovery/gamehub-four-pair-local-judge.cjs');
const treesha='c'.repeat(40);
function sample(suite='refresh-battery'){
 const spec=SPECS[suite];return {
  localProof:{schema:'ultra-sentinel-local-cross-file-reproduction/v1',
   status:'LOCAL_FACTORIAL_COMPLETED_REQUIRES_EXTERNAL_ORACLE',
   commitAllowed:false,mergeAllowed:false,productionReleaseAllowed:false,
   candidateRule:spec.rule,
   scenarios:['00','01','10','11'].map((mode,i)=>({
    selectedFiles:[spec.first.path,spec.second.path].filter((p,j)=>
     p===spec.first.path?mode[0]==='1':mode[1]==='1').sort(),
    oracleVerdict:'PASS',
    judgeStatus:i?'APPROVED_LOCAL_POLICY_ONLY':'BASELINE_NO_COMMIT',
    remoteWrites:false,rollbackVerified:true,
    baselineTree:treesha,restoredTree:treesha
   }))},
  logs:Object.fromEntries(['00','01','10','11'].map(mode=>[mode,
    'C2_CROSS_SUITE '+suite+'\nC2_CROSS_NORMAL_CONTROLS_PASS\n'+
    'C2_CROSS_VECTOR mode='+mode+' first='+(mode[0]==='1')+
    ' second='+(mode[1]==='1')+'\n']))
 };
}
test('all four existing GameHub Kotlin suite contracts supported without certification',()=>{
 assert.deepEqual(Object.keys(SPECS).sort(),[
  'json-confidence','query-confidence','refresh-battery','ttl-thermal']);
 for(const suite of Object.keys(SPECS)){
  const v=sample(suite),out=assessCrossPair({...v,suite});
  assert.equal(out.status,'LOCAL_GIT_AND_KOTLIN_CONTROLS_APPROVED_NO_RELEASE');
  assert.equal(out.functionalJudgeApproved,true);
  assert.equal(out.gitJudgeApproved,true);assert.equal(out.rollbackVerified,true);
  assert.equal(out.rootCauseVerified,false);assert.equal(out.remoteWrites,false);
  assert.equal(out.sourceCommitHistoryAuthenticated,false);
 }
});
test('stale controls cannot be excused by passing git hashes and rollback',()=>{
 const v=sample(),logs={...v.logs,'11':'C2_CROSS_SUITE refresh-battery\nC2_CROSS_VECTOR mode=11 first=true second=true\n'};
 const r=assessCrossPair({...v,logs,suite:'refresh-battery'});
 assert.equal(r.functionalJudgeApproved,false);
 assert.equal(r.gitJudgeApproved,true);assert.equal(r.rollbackVerified,true);
 assert.equal(r.status,'LOCAL_CROSS_PAIR_FUNCTIONAL_VETO');
});
test('bad mode, wrong tuple, mismatched Git tree or spoofed subset veto',()=>{
 const v=sample('ttl-thermal');
 for(const changed of [
  {logs:{...v.logs,'10':v.logs['11']}},
  {localProof:{...v.localProof,scenarios:v.localProof.scenarios.slice(0,3)}},
  {localProof:{...v.localProof,scenarios:v.localProof.scenarios.map((s,i)=>
   i===2?{...s,restoredTree:'d'.repeat(40)}:s)}},
  {localProof:{...v.localProof,scenarios:v.localProof.scenarios.map((s,i)=>
   i===2?{...s,selectedFiles:['app/src/main/Unexpected.kt']}:s)}}
 ]){
  const out=assessCrossPair({...v,suite:'ttl-thermal',...changed});
  assert.equal(out.status,'LOCAL_CROSS_PAIR_FUNCTIONAL_VETO');
 }
});
test('do not accept source bytes other than originals frozen by git blob',()=>{
 assert.throws(()=>runPinnedPair({root:'/nonexistent',suite:'refresh-battery'}),
  /PINNED_GAMEHUB_PAIR_GATE_BLOCKED/);
});
