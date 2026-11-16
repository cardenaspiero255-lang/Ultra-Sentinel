'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {seal,verify,adjudicate}=require('../../scripts/phase2-kotlin-api-v2-eval.cjs');
const manifest={engine:{commitSha:'a'.repeat(40)},cohorts:[{id:1,source:{repository:'fixture/inert',commitSha:'b'.repeat(40)}}],
 oracles:[{cohortId:1,sha256:'c'.repeat(64)}],block27Allowed:false};
const finding={class:'simple.Api',method:'value(double;)double',argument:0,otherArguments:1,
 inputs:['0.0','0.5','1.0'],observed:['0.0','2.0','0.0'],status:'HYPOTHESIS_REQUIRES_INDEPENDENT_ORACLE'};
const report=()=>({schema:'ultra-sentinel-generic-jvm-metamorphic/v1',artifactSha256:'d'.repeat(64),
 status:'HYPOTHESES_REQUIRE_ORACLE',classesInspected:1,methodsProbed:1,methodCandidates:1,completedTriples:1,
 successfulInvocations:6,doubleMethodsExercised:1,structuredMethodsExercised:0,instanceMethodsExercised:0,
 unsupportedMethods:0,abstainedProbes:0,unloadableClasses:0,nestedClassesSkipped:0,comparableClasses:0,
 comparablePairs:0,comparableTriples:0,constructorAbstentions:0,findings:[finding],sourceAuthenticated:false,
 oracleVerified:false,novelFamilyVerified:false,repairAuthorized:false,remoteWrites:false,mergeAllowed:false});
const entry=r=>({cohortId:1,scope:'simple',artifactSha256:r.artifactSha256,raw:Buffer.from(JSON.stringify(r))});
const observation=(x,actual,expected)=>({class:'simple.Api',method:'value(double;)double',arguments:[x],
 actual,expected,contract:'independent exact finite identity',defectEligible:true});
const truth=rows=>{
 const raw=Buffer.from(JSON.stringify({schema:'ultra-sentinel-kotlin-api-v2-independent/v1',wholeCohortTruth:false,observations:rows}));
 return [{schema:'ultra-sentinel-kotlin-api-v2-oracle-execution/v1',cohortId:1,
  sourceSha:manifest.cohorts[0].source.commitSha,oracleSha256:manifest.oracles[0].sha256,
  rawOutputSha256:crypto.createHash('sha256').update(raw).digest('hex'),rawOutputBase64:raw.toString('base64')}];
};
test('seal binds immutable manifest and exact raw predictions before any oracle truth',()=>{
 const e=[entry(report())],s=seal(manifest,e,[]);assert.equal(verify(manifest,e,[],s).oracleExecuted,false);
 assert.throws(()=>verify(manifest,[{...e[0],raw:Buffer.concat([e[0].raw,Buffer.from(' ')])}],[],s));
 assert.throws(()=>verify({...manifest,engine:{commitSha:'e'.repeat(40)}},e,[],s));
 assert.throws(()=>seal(manifest,[entry({...report(),oracleVerified:true})],[]));
 assert.throws(()=>seal(manifest,[entry({...report(),findings:[{...finding,class:'outside.Api'}]})],[]));
});
test('only matching independent original observations can confirm a distinct method defect',()=>{
 const entries=[entry(report())],s=seal(manifest,entries,[]);
 const v=adjudicate(manifest,entries,[],s,truth([observation('0.0','0.0','0.0'),
  observation('0.5','2.0','0.5'),observation('1.0','0.0','1.0')]));
 assert.equal(v.confirmedDistinctDefects,1);assert.equal(v.confirmedHypotheses,1);
 assert.equal(v.unadjudicatedHypotheses,0);assert.equal(v.novelFamilyVerified,false);assert.equal(v.block27Allowed,false);
 assert.equal(v.globalPrecision,null);assert.equal(v.globalRecall,null);
 const wrong=adjudicate(manifest,entries,[],s,truth([observation('0.5','3.0','0.5')]));
 assert.equal(wrong.confirmedDistinctDefects,0);assert.equal(wrong.unadjudicatedHypotheses,1);
 const excluded=adjudicate(manifest,entries,[],s,truth([{...observation('0.5','2.0','0.5'),defectEligible:false}]));
 assert.equal(excluded.confirmedDistinctDefects,0);
});
test('fully checked intentional turning points are scoped false positives while uncovered and aborted APIs stay explicit',()=>{
 const entries=[entry(report())],abstentions=[{cohortId:1,scope:'other',reason:'PROBE_EXECUTION_ABSTENTION'}];
 const s=seal(manifest,entries,abstentions),v=adjudicate(manifest,entries,abstentions,s,truth([
  observation('0','0','0'),observation('.5','2','2'),observation('1','0','0')]));
 assert.equal(v.scopedFalsePositiveHypotheses,1);assert.equal(v.executionAbstentions.length,1);
 assert.equal(v.confirmedDistinctDefects,0);assert.equal(v.falseNegatives,null);
 assert.throws(()=>verify(manifest,entries,[],s));
});
test('structured samples and overloaded constructor identity cannot be joined to a different original invocation',()=>{
 const f={...finding,method:'value([D;)double',constructor:['double'],constructorArguments:['1.0'],
  inputs:['size=1;values=0..size-1','size=2;values=0..size-1','size=3;values=0..size-1']};
 const entries=[entry({...report(),findings:[f]})],s=seal(manifest,entries,[]);
 const o={...observation(f.inputs[1],'2.0','0.5'),method:f.method,constructor:f.constructor,
  constructorArguments:['1.0']};
 assert.equal(adjudicate(manifest,entries,[],s,truth([o])).confirmedDistinctDefects,1);
 assert.equal(adjudicate(manifest,entries,[],s,truth([{...o,constructor:['long']}])).confirmedDistinctDefects,0);
 assert.equal(adjudicate(manifest,entries,[],s,truth([{...o,constructorArguments:['100.0']}])).confirmedDistinctDefects,0);
 assert.throws(()=>seal(manifest,[entry({...report(),methodsProbed:2})],[]));
 assert.throws(()=>seal({...manifest,block27Allowed:true},entries,[]));
 assert.throws(()=>seal(manifest,[entries[0],entries[0]],[]));
});


test('bounded numeric String inputs seal and join exact independent multi-argument observations',()=>{
 const f={...finding,method:'value(java.lang.String;int;)int',argument:0,
  otherArguments:100,inputs:['','a','aaa'],observed:['0','7','0']};
 const e=[entry({...report(),findings:[f]})],s=seal(manifest,e,[]);
 assert.equal(verify(manifest,e,[],s).reports[0].hypotheses,1);
 const o={...observation('a','7','6'),method:f.method,arguments:['a','100']};
 const confirmed=adjudicate(manifest,e,[],s,truth([o]));
 assert.equal(confirmed.confirmedDistinctDefects,1);
 assert.equal(confirmed.confirmedHypotheses,1);
 const wrong={...o,arguments:['a','1']};
 assert.equal(adjudicate(manifest,e,[],s,truth([wrong])).confirmedDistinctDefects,0,
  'fixed numeric arguments must match the exact executed call');
 assert.throws(()=>seal(manifest,[entry({...report(),findings:[{...f,method:'value(int;int;)int'}]})],[]),
  'raw text witnesses must not be accepted for a numeric parameter');
});
test('object equality hypotheses remain unadjudicated until a separate independent object oracle exists',()=>{
 const f={class:'simple.Api',rule:'OBJECT_EQUALS_HASHCODE_VIOLATION',
  constructor:['int'],left:['0'],right:['0'],observed:[1,2],
  status:'HYPOTHESIS_REQUIRES_INDEPENDENT_ORACLE'};
 const e=[entry({...report(),objectContractClasses:1,objectContractPairs:1,findings:[f]})],s=seal(manifest,e,[]);
 const v=adjudicate(manifest,e,[],s,truth([]));
 assert.equal(v.unadjudicatedHypotheses,1);
 assert.equal(v.confirmedDistinctDefects,0);
 assert.equal(v.novelFamilyVerified,false);
 assert.equal(v.block27Allowed,false);
});
