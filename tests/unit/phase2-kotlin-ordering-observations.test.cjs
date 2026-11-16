'use strict';

// These are inert JSON examples, not observations from a target cohort.
const test=require('node:test'),assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {seal,verify,adjudicate}=require('../../scripts/phase2-kotlin-api-v2-eval.cjs');

const ANTI='COMPARABLE_ANTISYMMETRY_VIOLATION';
const TRANS='COMPARABLE_TRANSITIVITY_VIOLATION';
const STATUS='HYPOTHESIS_REQUIRES_INDEPENDENT_ORACLE';
const manifest={engine:{commitSha:'a'.repeat(40)},
 cohorts:[{id:1,source:{repository:'fixture/inert',commitSha:'b'.repeat(40)}}],
 oracles:[{cohortId:1,sha256:'c'.repeat(64)}],block27Allowed:false};
const anti=(changes={})=>({rule:ANTI,class:'fixture.Order',constructor:['double','int'],
 left:['-0.0','1'],right:['0.0','1'],observedSigns:[-1,-1],status:STATUS,...changes});
const trans=(changes={})=>({rule:TRANS,class:'fixture.Order',constructor:['int'],
 left:['2'],middle:['1'],right:['0'],observedSigns:[1,1,-1],status:STATUS,...changes});
const row=f=>{
 const {status,...witness}=f;
 return {...witness,expectedLawSatisfied:true,defectEligible:true};
};
function report(findings,changes={}){
 return {schema:'ultra-sentinel-generic-jvm-metamorphic/v1',artifactSha256:'d'.repeat(64),
  status:'HYPOTHESES_REQUIRE_ORACLE',classesInspected:1,methodsProbed:0,methodCandidates:0,
  completedTriples:0,successfulInvocations:0,doubleMethodsExercised:0,structuredMethodsExercised:0,
  instanceMethodsExercised:0,unsupportedMethods:0,abstainedProbes:0,unloadableClasses:0,
  nestedClassesSkipped:0,comparableClasses:1,comparablePairs:1,comparableTriples:1,
  constructorAbstentions:0,findings,sourceAuthenticated:false,oracleVerified:false,
  novelFamilyVerified:false,repairAuthorized:false,remoteWrites:false,mergeAllowed:false,...changes};
}
const entry=(r,cohortId=1)=>({cohortId,scope:'fixture',artifactSha256:r.artifactSha256,
 raw:Buffer.from(JSON.stringify(r))});
function truth(rows,{m=manifest,cohortId=1,observations=[]}={}){
 const data={schema:'ultra-sentinel-kotlin-api-v2-independent/v1',wholeCohortTruth:false,observations};
 if(rows!==undefined)data.orderingObservations=rows;
 const raw=Buffer.from(JSON.stringify(data));
 return {schema:'ultra-sentinel-kotlin-api-v2-oracle-execution/v1',cohortId,
  sourceSha:m.cohorts.find(c=>c.id===cohortId).source.commitSha,
  oracleSha256:m.oracles.find(o=>o.cohortId===cohortId).sha256,
  rawOutputSha256:crypto.createHash('sha256').update(raw).digest('hex'),
  rawOutputBase64:raw.toString('base64')};
}
function verdict(findings,rows,changes={}){
 const entries=[entry(report(findings,changes))],s=seal(manifest,entries,[]);
 return adjudicate(manifest,entries,[],s,[truth(rows)]);
}
// Invalid evidence can be refused outright or left unadjudicated, but must never confirm.
function noConfirmation(findings,rows,changes={}){
 let v;
 try{v=verdict(findings,rows,changes);}
 catch(e){assert.match(e.message,/KOTLIN_API_V2_EVIDENCE_REFUSED/);return;}
 assert.equal(v.confirmedDistinctDefects,0);
 assert.equal(v.confirmedHypotheses,0);
 assert.deepEqual(v.verifiedWitnesses,[]);
}

test('matching independent antisymmetry violations confirm and retain both original sign arrays',()=>{
 for(const signs of [[-1,-1],[1,1]]){
  const f=anti({observedSigns:signs}),o=row(f),entries=[entry(report([f]))];
  const rawBefore=Buffer.from(entries[0].raw),s=seal(manifest,entries,[]);
  const v=adjudicate(manifest,entries,[],s,[truth([o])]);
  assert.equal(v.confirmedDistinctDefects,1);
  assert.equal(v.confirmedHypotheses,1);
  assert.equal(v.unadjudicatedHypotheses,0);
  assert.equal(v.scopedFalsePositiveHypotheses,0);
  assert.equal(v.novelFamilyVerified,false);
  assert.equal(v.block27Allowed,false);
  assert.equal(v.verifiedWitnesses.length,1);
  assert.equal(v.verifiedWitnesses[0].cohortId,1);
  assert.deepEqual(v.verifiedWitnesses[0].finding,f);
  assert.deepEqual(v.verifiedWitnesses[0].observation,o);
  assert.deepEqual(entries[0].raw,rawBefore);
  assert.deepEqual(verify(manifest,entries,[],s),s);
 }
});

test('independent transitivity violations include the middle seed and all three signs',()=>{
 for(const last of [-1,0]){
  const f=trans({observedSigns:[1,1,last]}),o=row(f);
  const v=verdict([f],[o]);
  assert.equal(v.confirmedDistinctDefects,1);
  assert.equal(v.confirmedHypotheses,1);
  assert.equal(v.verifiedWitnesses.length,1);
  assert.deepEqual(v.verifiedWitnesses[0].finding,f);
  assert.deepEqual(v.verifiedWitnesses[0].observation,o);
 }
});

test('matching uses the exact law, class, constructor, seed strings and detector signs',()=>{
 const f=anti(),o=row(f);
 for(const mismatch of [
  {rule:TRANS},
  {class:'fixture.Other'},
  {constructor:['java.lang.Double','int']},
  {constructor:['double','long']},
  {left:['0.0','1']}, // Signed zero has a different lexical identity.
  {left:['-0.0','1.0']},
  {right:['-0.0','1']},
  {left:f.right,right:f.left},
  {observedSigns:[1,1]}
 ])noConfirmation([f],[{...o,...mismatch}]);
 const t=trans(),ot=row(t);
 noConfirmation([t],[{...ot,middle:['0']}]);
 noConfirmation([t],[{...ot,observedSigns:[1,1,0]}]);
});

test('one matched row cannot confirm other witnesses or laws in the same class',()=>{
 const first=anti(),second=anti({left:['-1.0','1'],right:['1.0','1']}),third=trans();
 const v=verdict([first,second,third],[row(first)]);
 assert.equal(v.confirmedDistinctDefects,1);
 assert.equal(v.confirmedHypotheses,1);
 assert.equal(v.unadjudicatedHypotheses,2);
 assert.equal(v.verifiedWitnesses.length,1);
 assert.deepEqual(v.verifiedWitnesses[0].finding,first);
});

test('correct laws, incomplete or ineligible rows, and absent rows cannot confirm',()=>{
 for(const signs of [[-1,1],[1,-1],[0,0]]){
  const f=anti({observedSigns:signs});noConfirmation([f],[row(f)]);
 }
 const correct=trans({observedSigns:[1,1,1]});noConfirmation([correct],[row(correct)]);
 const a=anti(),o=row(a);
 for(const changes of [
  {expectedLawSatisfied:false}, {expectedLawSatisfied:undefined},
  {defectEligible:false}, {defectEligible:undefined}, {observedSigns:undefined},
  {left:undefined}, {constructor:undefined}
 ])noConfirmation([a],[{...o,...changes}]);
 noConfirmation([a],[]);
 noConfirmation([a],undefined);
});

test('invalid or incomplete sign vectors cannot masquerade as ordering violations',()=>{
 for(const signs of [[],[-1],[-1,-1,-1],[2,2],['-1','-1']]){
  const f=anti({observedSigns:signs});noConfirmation([f],[row(f)]);
 }
 for(const signs of [[1,1],[1,1,0,0],[1,2,0],[1,1,'-1']]){
  const f=trans({observedSigns:signs});noConfirmation([f],[row(f)]);
 }
});

test('contradictory independent rows for one exact law witness cannot select a favorable row',()=>{
 const f=anti(),o=row(f);
 for(const conflicting of [
  {...o,observedSigns:[-1,1]},
  {...o,middle:['-0.0','1'],observedSigns:[-1,1]},
  {...o,expectedLawSatisfied:false},
  {...o,defectEligible:false}
 ]){
  noConfirmation([f],[o,conflicting]);
  noConfirmation([f],[conflicting,o]);
 }
});

test('unsupported constructor types or absent Comparable coverage cannot create confirmations',()=>{
 for(const constructor of [[],['java.lang.Object'],['int','int','int','int']]){
  const f=anti({constructor,left:constructor.map(()=> '0'),right:constructor.map(()=> '1')});
  noConfirmation([f],[row(f)]);
 }
 const f=anti();
 // A scalar method makes the report nonempty without supplying ordering coverage.
 const scalarCoverage={methodsProbed:1,methodCandidates:1,completedTriples:1,successfulInvocations:6};
 noConfirmation([f],[row(f)],{...scalarCoverage,comparablePairs:0});
 noConfirmation([f],[row(f)],{...scalarCoverage,comparableClasses:0});
 const t=trans();
 noConfirmation([t],[row(t)],{...scalarCoverage,comparableTriples:0});
});

test('ordering observations require the sealed source, oracle and exact raw-output bytes',()=>{
 const f=anti(),entries=[entry(report([f]))],s=seal(manifest,entries,[]),valid=truth([row(f)]);
 for(const delta of [
  {sourceSha:'e'.repeat(40)},{oracleSha256:'e'.repeat(64)},{cohortId:2},
  {rawOutputSha256:'e'.repeat(64)},
  {rawOutputBase64:Buffer.from('changed').toString('base64')},
  {sourceSha:undefined},{oracleSha256:undefined},{rawOutputSha256:undefined}
 ])assert.throws(()=>adjudicate(manifest,entries,[],s,[{...valid,...delta}]),
  /KOTLIN_API_V2_EVIDENCE_REFUSED/);
});

test('different ordering witnesses of one class count once per cohort',()=>{
 const m={...manifest,cohorts:[...manifest.cohorts,
  {id:2,source:{repository:'fixture/other',commitSha:'e'.repeat(40)}}],
  oracles:[...manifest.oracles,{cohortId:2,sha256:'f'.repeat(64)}]};
 const first=anti(),second=anti({left:['-1.0','1'],right:['1.0','1'],observedSigns:[1,1]});
 const third=trans(),fourth=anti({class:'fixture.Other'}),findings=[first,second,third,fourth];
 const r=report(findings,{classesInspected:2,comparableClasses:2});
 const entries=[entry(r,1),entry(r,2)];
 const s=seal(m,entries,[]),v=adjudicate(m,entries,[],s,[
  truth(findings.map(row),{m,cohortId:1}),truth(findings.map(row),{m,cohortId:2})]);
 assert.equal(v.confirmedHypotheses,8);
 assert.equal(v.confirmedDistinctDefects,4);
 assert.equal(v.unadjudicatedHypotheses,0);
 assert.equal(v.novelFamilyVerified,false);
});

test('ordering truth in one cohort cannot adjudicate the same witness in another',()=>{
 const m={...manifest,cohorts:[...manifest.cohorts,
  {id:2,source:{repository:'fixture/other',commitSha:'e'.repeat(40)}}],
  oracles:[...manifest.oracles,{cohortId:2,sha256:'f'.repeat(64)}]};
 const f=anti(),entries=[entry(report([f]),1),entry(report([f]),2)],s=seal(m,entries,[]);
 const v=adjudicate(m,entries,[],s,[truth([row(f)],{m,cohortId:1})]);
 assert.equal(v.confirmedHypotheses,1);
 assert.equal(v.confirmedDistinctDefects,1);
 assert.equal(v.unadjudicatedHypotheses,1);
 assert.deepEqual(v.verifiedWitnesses.map(w=>w.cohortId),[1]);
});

test('an ordering contract and a numeric method are distinct defects within one class',()=>{
 const f=anti(),scalar={class:f.class,method:'value(int;)int',argument:0,otherArguments:1,
  inputs:['0','1','2'],observed:['0','5','0'],status:STATUS};
 const observation={class:scalar.class,method:scalar.method,arguments:['1'],actual:'5',expected:'1',
  contract:'independent exact finite identity',defectEligible:true};
 const entries=[entry(report([f,scalar],
  {methodsProbed:1,methodCandidates:1,completedTriples:1,successfulInvocations:6}))];
 const s=seal(manifest,entries,[]),v=adjudicate(manifest,entries,[],s,
  [truth([row(f)],{observations:[observation]})]);
 assert.equal(v.confirmedHypotheses,2);
 assert.equal(v.confirmedDistinctDefects,2);
 assert.equal(v.verifiedWitnesses.length,2);
});

test('legacy numeric and Comparable verdicts remain exactly unchanged without ordering rows',()=>{
 const scalar={class:'fixture.Measure',method:'value(int;)int',argument:0,otherArguments:1,
  inputs:['0','1','2'],observed:['0','5','0'],status:STATUS};
 const observation={class:scalar.class,method:scalar.method,arguments:['1'],actual:'5',expected:'1',
  contract:'independent exact finite identity',defectEligible:true};
 const entries=[entry(report([scalar,anti()],
  {methodsProbed:1,methodCandidates:1,completedTriples:1,successfulInvocations:6}))];
 const s=seal(manifest,entries,[]),v=adjudicate(manifest,entries,[],s,[truth(undefined,{observations:[observation]})]);
 assert.deepEqual(v,{schema:'ultra-sentinel-kotlin-api-v2-independent-verdict/v1',engineSha:manifest.engine.commitSha,
  manifestSha256:s.manifestSha256,confirmedDistinctDefects:1,confirmedHypotheses:1,
  scopedFalsePositiveHypotheses:0,unadjudicatedHypotheses:1,scopedIndependentObservations:1,
  executionAbstentions:[],methodsProbed:1,globalPrecision:null,globalRecall:null,falseNegatives:null,
  verifiedWitnesses:[{cohortId:1,class:scalar.class,method:scalar.method,arguments:['1'],
   actual:'5',expected:'1',contract:observation.contract}],
  novelFamilyVerified:false,engineRetuned:false,block27Allowed:false});
});
