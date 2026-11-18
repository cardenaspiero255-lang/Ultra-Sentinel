'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {selectStructuralCohorts,validateStructuralRecord}=require('../../packages/quality-gates/v8-structural-diversity.cjs');
const hex=x=>x.repeat(40);
const source=(name,blob='a')=>({
 repository:name,commitSha:hex('c'),treeSha:hex('d'),
 files:[{path:'src/main/kotlin/F.kt',blobSha:hex(blob),sizeBytes:110}]
});
const method=(name)=>({
 className:'sample.FKt',method:name,descriptor:'(I)I',
 reason:'ADMISSIBLE_ABI_CANDIDATE',finiteDomain:'NOT_EVALUATED_BY_ABI',targetInvoked:false,
 receiver:'STATIC'
});
const candidate=(rank,repo,blob,names,compiled=true)=>({
 rank,source:source(repo,blob),
 abi:{compilationSucceeded:compiled,callables:compiled?names.map(method):[],
  abstentions:compiled?[]:[{reason:'COMPILATION_OR_ABI_UNSUPPORTED'}]},
 compilerReadOriginalSource:true,targetInvoked:false,oracleExecuted:false,hunterExecuted:false
});
test('v8 freezes required independent cohorts and selects the minimal first ABI-qualified prefix',()=>{
 const rows=[
  candidate(6,'fresh/alpha','a',['a','b']),
  candidate(11,'fresh/beta','b',[]),
  candidate(14,'fresh/gamma','e',['c']),
  candidate(20,'fresh/delta','f',['d','e','f'])
 ];
 const r=selectStructuralCohorts(rows);
 assert.equal(r.schema,'ultra-sentinel-structural-abi-diversity/v1');
 assert.equal(r.eligible,true);
 assert.equal(r.numericMethods,3);assert.equal(r.candidateCohorts,2);
 assert.deepEqual(r.selected.map(x=>x.source.repository),['fresh/alpha','fresh/gamma']);
 assert.deepEqual(r.inspectedRanks,[6,11,14,20]);
 assert.equal(r.oracleExecuted,false);assert.equal(r.hunterExecuted,false);
 assert.equal(r.precommitRequired,true);
 assert.deepEqual(r.exposedOriginals.map(x=>x.repository),
  ['fresh/alpha','fresh/beta','fresh/gamma','fresh/delta']);
});
test('v7 failure cannot be rescued by reducing precommitted diversity or combining methods within one repository',()=>{
 const rows=[
  candidate(42,'niiad/hashkt','a',['one','two','three','four','five']),
  candidate(67,'fresh/without-abi','b',[])
 ];
 const r=selectStructuralCohorts(rows);
 assert.equal(r.eligible,false);assert.equal(r.numericMethods,5);
 assert.equal(r.candidateCohorts,1);assert.deepEqual(r.selected,[]);
 assert.equal(r.reason,'INSUFFICIENT_INDEPENDENT_ABI_COHORTS');
 assert.throws(()=>selectStructuralCohorts(rows,{minimumCandidateCohorts:1}),/FROZEN_THRESHOLD/);
 assert.throws(()=>selectStructuralCohorts(rows,{minimumNumericMethods:2}),/FROZEN_THRESHOLD/);
});
test('ABI metadata can never be replaced with oracle answers, predictions or executed targets',()=>{
 const row=candidate(1,'fresh/ok','a',['m']);
 for(const key of ['oracleResult','expected','actual','observations','sourceBody',
  'findings','predictions','functionalTruth']){
  assert.throws(()=>validateStructuralRecord({...row,[key]:'forbidden'}),/FORBIDDEN_FUNCTIONAL_DATA/);
 }
 assert.throws(()=>validateStructuralRecord({...row,abi:{...row.abi,callables:[
  {...row.abi.callables[0],targetInvoked:true}]}}),/TARGET_EXECUTION_FORBIDDEN/);
 assert.throws(()=>validateStructuralRecord({...row,oracleExecuted:true}),/TARGET_EXECUTION_FORBIDDEN/);
});
test('unsafe source identity, duplicate originals, uncompiled method and rank reordering fail closed',()=>{
 const a=candidate(2,'fresh/Alpha','a',['x']),b=candidate(3,'fresh/beta','b',['y']);
 assert.throws(()=>selectStructuralCohorts([b,a]),/RANK_ORDER/);
 assert.throws(()=>selectStructuralCohorts([a,candidate(3,'FRESH/alpha','b',['y'])]),/DUPLICATE_REPOSITORY/);
 assert.throws(()=>selectStructuralCohorts([a,candidate(3,'fresh/gamma','a',['y'])]),/DUPLICATE_BLOB/);
 assert.throws(()=>selectStructuralCohorts([candidate(2,'fresh/uncompiled','c',['x'],false)]),/UNCOMPILED_ABI/);
 assert.throws(()=>validateStructuralRecord({...a,source:{...a.source,files:[
  {...a.source.files[0],path:'src/main/kotlin/../../outside.kt'}]}}),/INVALID_SOURCE/);
});
