'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {classifyOracleVectorFactorial}=
 require('../../packages/family-hunter/original-oracle-vector-factorial.cjs');
const paths=['app/src/main/java/example/A.kt','app/src/main/java/example/B.kt'];
const ids=['TERMUX','VOICE'];
function scenario(termux,voice){
 return Array.from({length:4},(_,mask)=>({
  selectedFiles:paths.filter((_,i)=>Boolean(mask&(1<<i))),
  verdicts:{TERMUX:termux[mask]?'PASS':'FAIL',VOICE:voice[mask]?'PASS':'FAIL'}
 }));
}
test('independent original Kotlin oracles prevent false cross-file causality claims',()=>{
 const out=classifyOracleVectorFactorial({
  files:paths,oracleIds:ids,
  scenarios:scenario([false,true,false,true],[false,false,true,true])
 });
 assert.equal(out.status,'INDEPENDENT_ORACLE_EFFECTS_OBSERVED');
 assert.deepEqual(out.oracleDependencies,{TERMUX:[paths[0]],VOICE:[paths[1]]});
 assert.equal(out.causalityVerified,false);
 assert.equal(out.jvmReceiptsAuthenticatedByThisFunction,false);
 assert.equal(out.remoteWrites,false);
});
test('shared interactions remain hypotheses when only joint code changes satisfy the oracle',()=>{
 const out=classifyOracleVectorFactorial({
  files:paths,oracleIds:ids,
  scenarios:scenario([false,false,false,true],[false,false,false,true])
 });
 assert.equal(out.status,'SHARED_OR_MULTI_FILE_EFFECT_HYPOTHESIS');
 assert.equal(out.causalityVerified,false);
});
test('reject partial tampered or fabricated oracle matrices',()=>{
 const variants=[
  x=>x.scenarios.pop(),
  x=>x.scenarios.reverse(),
  x=>x.scenarios[1].selectedFiles=[paths[1]],
  x=>x.scenarios[1].verdicts.VOICE='UNKNOWN',
  x=>x.scenarios[1].verdicts.EXTRA='PASS',
  x=>x.oracleIds.push('TERMUX'),
  x=>x.files[0]='../bad.kt'
 ];
 for(const alter of variants){
  const value={files:paths.slice(),oracleIds:ids.slice(),
   scenarios:scenario([false,true,false,true],[false,false,true,true])};
  alter(value);
  const out=classifyOracleVectorFactorial(value);
  assert.equal(out.status,'BLOCKED_UNTRUSTED_ORACLE_MATRIX');
 }
});
