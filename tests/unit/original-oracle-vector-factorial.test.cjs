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
test('one oracle alone cannot establish independent oracle effects',()=>{
 const scenarios=Array.from({length:4},(_,mask)=>({
  selectedFiles:paths.filter((_,i)=>Boolean(mask&(1<<i))),
  verdicts:{ONLY:(mask&1)?'PASS':'FAIL'}
 }));
 const out=classifyOracleVectorFactorial({files:paths,oracleIds:['ONLY'],scenarios});
 assert.equal(out.status,'NONDIAGNOSTIC_ORACLE_MATRIX');
 assert.deepEqual(out.oracleDependencies,{ONLY:[paths[0]]});
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

function matrix(files, oracleFunctions){
 const oracleIds=Object.keys(oracleFunctions).sort();
 return {files,oracleIds,scenarios:Array.from({length:2**files.length},(_,mask)=>({
  selectedFiles:files.filter((_,i)=>Boolean(mask&(1<<i))),
  verdicts:Object.fromEntries(oracleIds.map(id=>[id,oracleFunctions[id](mask)?'PASS':'FAIL']))
 }))};
}

test('separate oracles expose aggregate AND of three independent repairs',()=>{
 const files=['A','B','C'].map(x=>`app/src/main/java/example/${x}.kt`);
 const x=classifyOracleVectorFactorial(matrix(files,{
  FIRST:m=>Boolean(m&1),SECOND:m=>Boolean(m&2),THIRD:m=>Boolean(m&4)
 }));
 assert.equal(x.status,'INDEPENDENT_ORACLE_EFFECTS_OBSERVED');
 assert.deepEqual(x.oracleDependencies,{FIRST:[files[0]],SECOND:[files[1]],THIRD:[files[2]]});
 assert.deepEqual(x.minimalPassingSubsetsByOracle,{
  FIRST:[[files[0]]],SECOND:[[files[1]]],THIRD:[[files[2]]]
 });
 assert.equal(x.causalityVerified,false);
});

test('12-file exhaustive matrix identifies a three-file minimal set and a benign control',()=>{
 const files=Array.from({length:12},(_,i)=>`app/src/main/java/example/File${String(i).padStart(2,'0')}.kt`);
 const input=matrix(files,{BENIGN:()=>true,CONTRACT:m=>(m&2081)===2081});
 const x=classifyOracleVectorFactorial(input);
 assert.equal(input.scenarios.length,4096);
 assert.equal(x.status,'SHARED_OR_MULTI_FILE_EFFECT_HYPOTHESIS');
 assert.deepEqual(x.oracleDependencies.CONTRACT,[files[0],files[5],files[11]]);
 assert.deepEqual(x.minimalPassingSubsetsByOracle.CONTRACT,[[files[0],files[5],files[11]]]);
 assert.deepEqual(x.minimalPassingSubsetsByOracle.BENIGN,[[]]);
 assert.equal(x.causalityVerified,false);
 assert.equal(x.jvmReceiptsAuthenticatedByThisFunction,false);
 assert.ok(Object.isFrozen(x.minimalPassingSubsetsByOracle.CONTRACT[0]));
});

test('minimal passing subsets do not assume monotonic oracle results',()=>{
 const files=['A','B','C'].map(x=>`app/src/main/java/example/${x}.kt`);
 const x=classifyOracleVectorFactorial(matrix(files,{ONLY:m=>m===3||m===5}));
 assert.deepEqual(x.minimalPassingSubsetsByOracle.ONLY,[[files[0],files[1]],[files[0],files[2]]]);
 assert.equal(x.causalityVerified,false);
});

test('large and incomplete matrices fail closed',()=>{
 const files=Array.from({length:13},(_,i)=>`app/src/main/java/example/File${String(i).padStart(2,'0')}.kt`);
 const tooMany={files,oracleIds:['ORACLE'],scenarios:[]};
 assert.equal(classifyOracleVectorFactorial(tooMany).status,'BLOCKED_UNTRUSTED_ORACLE_MATRIX');
 const twelve=matrix(files.slice(0,12),{ORACLE:m=>m===4095});
 twelve.scenarios.pop();
 assert.equal(classifyOracleVectorFactorial(twelve).status,'BLOCKED_UNTRUSTED_ORACLE_MATRIX');
});

test('rejects accessors, proxies and extra active properties without invoking them',()=>{
 let effects=0;
 const value=()=>matrix(paths,{TERMUX:m=>Boolean(m&1),VOICE:m=>Boolean(m&2)});
 const getter=value();
 Object.defineProperty(getter.scenarios[0].verdicts,'VOICE',{
  get(){effects++;return 'FAIL';},enumerable:true
 });
 assert.equal(classifyOracleVectorFactorial(getter).status,'BLOCKED_UNTRUSTED_ORACLE_MATRIX');
 const extra=value();
 Object.defineProperty(extra.scenarios[0],'surprise',{get(){effects++;return 1;}});
 assert.equal(classifyOracleVectorFactorial(extra).status,'BLOCKED_UNTRUSTED_ORACLE_MATRIX');
 const proxied=value();
 proxied.scenarios[0].verdicts=new Proxy(proxied.scenarios[0].verdicts,{
  get(){effects++;throw Error('proxy trap');},ownKeys(){effects++;throw Error('proxy trap');}
 });
 assert.equal(classifyOracleVectorFactorial(proxied).status,'BLOCKED_UNTRUSTED_ORACLE_MATRIX');
 assert.equal(effects,0);
});

test('GameHub three-source original matrix has alternative single-file repairs, not a joint cause',()=>{
 const files=['A','B','C'].map(x=>`app/src/main/java/example/${x}.kt`);
 const output=classifyOracleVectorFactorial(matrix(files,{
  BENIGN:()=>true,
  EXTREME:mask=>Boolean(mask&1)||Boolean(mask&2)
 }));
 assert.equal(output.status,'ALTERNATIVE_SINGLE_FILE_EFFECTS_OBSERVED');
 assert.deepEqual(output.oracleDependencies,{BENIGN:[],EXTREME:[files[0],files[1]]});
 assert.deepEqual(output.minimalPassingSubsetsByOracle,{
  BENIGN:[[]],EXTREME:[[files[0]],[files[1]]]
 });
 assert.equal(output.causalityVerified,false);
 assert.equal(output.jvmReceiptsAuthenticatedByThisFunction,false);
 assert.equal(output.mergeAllowed,false);
});

test('three-file minimal repair remains joint even with a benign always-passing oracle',()=>{
 const files=['A','B','C'].map(x=>`app/src/main/java/example/${x}.kt`);
 const output=classifyOracleVectorFactorial(matrix(files,{
  BENIGN:()=>true,
  CONTRACT:mask=>(mask&7)===7
 }));
 assert.equal(output.status,'SHARED_OR_MULTI_FILE_EFFECT_HYPOTHESIS');
 assert.deepEqual(output.minimalPassingSubsetsByOracle.CONTRACT,[[...files]]);
 assert.equal(output.causalityVerified,false);
});

test('a baseline-passing oracle with regressions on two interventions does not prove a repair',()=>{
 const files=['A','B','C'].map(x=>`app/src/main/java/example/${x}.kt`);
 const output=classifyOracleVectorFactorial(matrix(files,{
  BENIGN:()=>true,
  REGRESSION:mask=>mask===0||mask===7
 }));
 assert.equal(output.status,'NONDIAGNOSTIC_ORACLE_MATRIX');
 assert.deepEqual(output.minimalPassingSubsetsByOracle.REGRESSION,[[]]);
 assert.equal(output.causalityVerified,false);
});


test('two baseline-passing oracles that regress on distinct file changes are not independent repairs',()=>{
 const files=['A','B'].map(x=>`app/src/main/java/example/${x}.kt`);
 const output=classifyOracleVectorFactorial(matrix(files,{
  BATTERY:mask=>!(mask&1),
  NETWORK:mask=>!(mask&2)
 }));
 assert.equal(output.status,'NONDIAGNOSTIC_ORACLE_MATRIX');
 assert.deepEqual(output.oracleDependencies,{BATTERY:[files[0]],NETWORK:[files[1]]});
 assert.deepEqual(output.minimalPassingSubsetsByOracle,{BATTERY:[[]],NETWORK:[[]]});
 assert.equal(output.causalityVerified,false);
});

test('a genuine repair and an unrelated baseline regression cannot establish independent repairs',()=>{
 const files=['A','B'].map(x=>`app/src/main/java/example/${x}.kt`);
 const output=classifyOracleVectorFactorial(matrix(files,{
  AUTH:mask=>Boolean(mask&1),
  VOICE:mask=>!(mask&2)
 }));
 assert.equal(output.status,'NONDIAGNOSTIC_ORACLE_MATRIX');
 assert.deepEqual(output.minimalPassingSubsetsByOracle,{AUTH:[[files[0]]],VOICE:[[]]});
 assert.equal(output.causalityVerified,false);
});
