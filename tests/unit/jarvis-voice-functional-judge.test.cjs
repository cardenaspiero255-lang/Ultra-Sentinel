'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {reproduceCrossFileInterventions}=
 require('../../packages/recovery/cross-file-sandbox-reproduction.cjs');
const {assessJarvisVoiceMatrix,verifyJarvisSourceBytes,PATHS,PINS}=
 require('../../packages/recovery/jarvis-voice-functional-judge.cjs');
const [barge,wake]=PATHS;
const modes=['00','10','01','11'];
function plan(){
 return {schema:'ultra-sentinel-cross-file-interventions/v1',
  status:'EXPERIMENTS_REQUIRED',baseSha:'a'.repeat(40),headSha:'b'.repeat(40),
  sourceAuthenticated:false,causalityVerified:false,commitAllowed:false,
  mergeAllowed:false,candidates:[{rule:'JARVIS_VOICE_GUARD',
   status:'MULTI_FILE_CAUSAL_HYPOTHESIS_NOT_VERIFIED',causalLinksProved:false,
   files:[barge,wake],experiments:[0,1,2,3].map(mask=>({
    kind:mask===0?'baseline':mask===3?'combined':'subset',
    selectedFiles:[barge,wake].filter((_,i)=>mask&(1<<i)),
    executed:false,independentOracleVerified:false}))}]};
}
function local(){
 const samples=['00','10','01','11'];
 return {schema:'ultra-sentinel-local-cross-file-reproduction/v1',
  status:'LOCAL_FACTORIAL_COMPLETED_REQUIRES_EXTERNAL_ORACLE',
  baseSha:'a'.repeat(40),headSha:'b'.repeat(40),
  candidateRule:'JARVIS_VOICE_GUARD',
  commitAllowed:false,mergeAllowed:false,productionReleaseAllowed:false,
  scenarios:samples.map((mode,i)=>({selectedFiles:
   [barge,wake].filter((_,j)=>mode[j]==='1'),
   judgeStatus:i?'APPROVED_LOCAL_POLICY_ONLY':'BASELINE_NO_COMMIT',
   oracleVerdict:'PASS',remoteWrites:false,rollbackVerified:true,
   baselineTree:'c'.repeat(40),restoredTree:'c'.repeat(40)}))};
}
function logs(){
 return Object.fromEntries(modes.map(mode=>[mode,
  'JARVIS_VOICE_NORMAL_CONTROLS_PASS\n'+
  'JARVIS_VOICE_VECTOR mode='+mode+' barge='+(mode[0]==='1')+
   ' wake='+(mode[1]==='1')+'\n'+
  'JARVIS_VOICE_MATRIX_PROBED\n']));
}
test('read-only JARVIS source-original matrix plus local Git Judge and rollback yields conditional result',()=>{
 const proof=reproduceCrossFileInterventions({plan:plan(),
  candidateRule:'JARVIS_VOICE_GUARD',
  versions:[{path:barge,before:'safe barge\n',after:'mutant barge\n'},
   {path:wake,before:'safe wake\n',after:'mutant wake\n'}],
  independentOracle:()=>true});
 assert.equal(proof.scenarios.length,4);
 assert.ok(proof.scenarios.every(s=>s.rollbackVerified===true));
 const r=assessJarvisVoiceMatrix({localProof:proof,logs:logs()});
 assert.equal(r.status,'LOCAL_VOICE_MATRIX_ACCEPTED_NOT_CERTIFIED');
 assert.equal(r.functionalJudgeApproved,true);
 assert.equal(r.gitJudgeApproved,true);
 assert.equal(r.rollbackVerified,true);
 assert.equal(r.authenticatedRuntimeEvidence,false);
 assert.equal(r.mergeAllowed,false);
});
test('failed executable behavior does not invalidate a sound Git Judge or rollback',()=>{
 const original=local();
 const broken={...original,scenarios:original.scenarios.map((s,i)=>
  i===1?{...s,oracleVerdict:'FAIL'}:s)};
 const r=assessJarvisVoiceMatrix({localProof:broken,logs:logs()});
 assert.equal(r.status,'VOICE_FUNCTIONAL_JUDGE_VETO');
 assert.equal(r.gitJudgeApproved,true);
 assert.equal(r.rollbackVerified,true);
 assert.equal(r.functionalJudgeApproved,false);
});
test('voice regression veto overrides green Git Judge and exact tree restoration',()=>{
 const r=assessJarvisVoiceMatrix({localProof:local(),
  logs:{...logs(),'11':'JARVIS_VOICE_BENIGN_BARGE_STOP_REGRESSION\n'}});
 assert.equal(r.status,'VOICE_FUNCTIONAL_JUDGE_VETO');
 assert.equal(r.functionalJudgeApproved,false);
 assert.equal(r.gitJudgeApproved,true);
 assert.equal(r.rollbackVerified,true);
});
test('fail closed on missing echo controls, incorrect vector, duplicate or missing execution',()=>{
 for(const logsBroken of [
  {...logs(),'10':'JARVIS_VOICE_VECTOR mode=10 barge=true wake=false\nJARVIS_VOICE_MATRIX_PROBED\n'},
  {...logs(),'01':'JARVIS_VOICE_NORMAL_CONTROLS_PASS\nJARVIS_VOICE_VECTOR mode=01 barge=true wake=true\nJARVIS_VOICE_MATRIX_PROBED\n'},
  {...logs(),'00':logs()['00']+'JARVIS_VOICE_VECTOR mode=00 barge=false wake=false\n'},
  Object.fromEntries(Object.entries(logs()).filter(([k])=>k!=='11'))
 ]){
  const r=assessJarvisVoiceMatrix({localProof:local(),logs:logsBroken});
  assert.equal(r.status,'VOICE_FUNCTIONAL_JUDGE_VETO');
 }
});
test('missing rollback or mismatched scenario identity blocks the functional Judge',()=>{
 for(const scenarios of [
  local().scenarios.map((s,i)=>i===1?{...s,restoredTree:'d'.repeat(40)}:s),
  [...local().scenarios].reverse(),
  local().scenarios.slice(0,3)
 ]){
  const r=assessJarvisVoiceMatrix({localProof:{...local(),scenarios},logs:logs()});
  assert.equal(r.status,'VOICE_FUNCTIONAL_JUDGE_VETO');
 }
});
test('cannot attest fake JARVIS Kotlin originals by claiming their Git blob SHAs',()=>{
 assert.throws(()=>verifyJarvisSourceBytes({
  [barge]:'fake source\n',[wake]:'fake source\n'
 }),/JARVIS_PINNED_SOURCE_INVALID/);
 assert.equal(PINS.length,2);
});
test('JARVIS source paths cannot escape controlled Android main directory',()=>{
 const p=plan();
 assert.throws(()=>reproduceCrossFileInterventions({
  plan:{...p,candidates:p.candidates.map(c=>({...c,files:[
   '../../evil.kt',wake]}))},
  candidateRule:'JARVIS_VOICE_GUARD',
  versions:[{path:'../../evil.kt',before:'a\n',after:'b\n'},
   {path:wake,before:'a\n',after:'b\n'}],independentOracle:()=>true
 }),/INVALID_CROSS_FILE_REPRODUCTION/);
});
