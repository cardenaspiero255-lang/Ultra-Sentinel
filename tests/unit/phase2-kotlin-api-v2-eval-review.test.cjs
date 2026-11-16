'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {seal,adjudicate}=require('../../scripts/phase2-kotlin-api-v2-eval.cjs');
const manifest={engine:{commitSha:'a'.repeat(40)},cohorts:[{id:1,
 source:{repository:'fixture/inert',commitSha:'b'.repeat(40)}}],
 oracles:[{cohortId:1,sha256:'c'.repeat(64)}],block27Allowed:false};
const finding={class:'review.Api',method:'value(long;)long',argument:0,otherArguments:1,
 inputs:['0','1','9223372036854775807'],observed:['0','9223372036854775807','0'],
 status:'HYPOTHESIS_REQUIRES_INDEPENDENT_ORACLE'};
function report(findings=[finding]){return {schema:'ultra-sentinel-generic-jvm-metamorphic/v1',artifactSha256:'d'.repeat(64),
 status:'HYPOTHESES_REQUIRE_ORACLE',classesInspected:1,methodsProbed:1,methodCandidates:1,completedTriples:findings.length,
 successfulInvocations:6*findings.length,doubleMethodsExercised:0,structuredMethodsExercised:0,instanceMethodsExercised:0,
 unsupportedMethods:0,abstainedProbes:0,unloadableClasses:0,nestedClassesSkipped:0,comparableClasses:0,
 comparablePairs:0,comparableTriples:0,constructorAbstentions:0,findings,sourceAuthenticated:false,
 oracleVerified:false,novelFamilyVerified:false,repairAuthorized:false,remoteWrites:false,mergeAllowed:false};}
const entry=r=>({cohortId:1,scope:'review',artifactSha256:r.artifactSha256,raw:Buffer.from(JSON.stringify(r))});
const observation=(args,actual,expected,contract='independent exact integral identity')=>({
 class:finding.class,method:finding.method,arguments:args,actual,expected,contract,defectEligible:true});
const truths=rows=>{
 const raw=Buffer.from(JSON.stringify({schema:'ultra-sentinel-kotlin-api-v2-independent/v1',wholeCohortTruth:false,observations:rows}));
 return [{schema:'ultra-sentinel-kotlin-api-v2-oracle-execution/v1',cohortId:1,
  sourceSha:manifest.cohorts[0].source.commitSha,oracleSha256:manifest.oracles[0].sha256,
  rawOutputSha256:crypto.createHash('sha256').update(raw).digest('hex'),rawOutputBase64:raw.toString('base64')}];
};
function requireNoFalseConfirmation(entries,rows){
 const s=seal(manifest,entries,[]);
 try{assert.equal(adjudicate(manifest,entries,[],s,truths(rows)).confirmedDistinctDefects,0);}
 catch(e){if(e.code==='ERR_ASSERTION')throw e;assert.match(e.message,/KOTLIN_API_V2_EVIDENCE_REFUSED/);}
}

test('a rounded decimal representation cannot impersonate a different exact Long output',()=>{
 const entries=[entry(report())];
 requireNoFalseConfirmation(entries,[observation(['1'],'9223372036854775808.0','0')]);
});

test('a rounded decimal representation cannot impersonate a different exact Long input',()=>{
 const entries=[entry(report())];
 requireNoFalseConfirmation(entries,[observation(['9223372036854775808.0'],'0','1')]);
});

test('incomplete zero-coverage reports cannot carry scalar hypotheses into adjudication',()=>{
 const impossible={...report(),status:'INCOMPLETE_NO_SUPPORTED_METHODS',methodsProbed:0,methodCandidates:0,
  completedTriples:0,successfulInvocations:0};
 assert.throws(()=>seal(manifest,[entry(impossible)],[]));
});

test('free-text contract wording cannot multiply one independently observed method defect',()=>{
 const one={...finding,method:'value(double;)double',inputs:['0.0','0.5','1.0'],observed:['0.0','2.0','0.0']};
 const two={...one,inputs:['0.0','0.25','1.0']};
 const entries=[entry(report([one,two]))],s=seal(manifest,entries,[]);
 const rows=[{...observation(['0.5'],'2.0','0.5','identity contract, fractional input'),method:one.method},
  {...observation(['0.25'],'2.0','0.25','same identity contract, alternate wording'),method:one.method}];
 assert.equal(adjudicate(manifest,entries,[],s,truths(rows)).confirmedDistinctDefects,1);
});

test('every reserved cohort must have predictions or an explicit execution abstention',()=>{
 assert.throws(()=>seal(manifest,[],[]));
 const s=seal(manifest,[],[{cohortId:1,reason:'COMPILATION_ABSTENTION'}]);
 assert.equal(s.executionAbstentions.length,1);
});

test('source, oracle, cohort and exact output hashes are mandatory evidence bindings',()=>{
 const entries=[entry(report())],s=seal(manifest,entries,[]);
 const [valid]=truths([observation(['1'],'9223372036854775807','0')]);
 assert.equal(adjudicate(manifest,entries,[],s,[valid]).confirmedDistinctDefects,1);
 for(const delta of [
  {sourceSha:'e'.repeat(40)},{oracleSha256:'e'.repeat(64)},{cohortId:2},
  {rawOutputSha256:'e'.repeat(64)},{rawOutputBase64:valid.rawOutputBase64+'AA=='},
  {sourceSha:undefined},{oracleSha256:undefined},{rawOutputSha256:undefined}
 ])assert.throws(()=>adjudicate(manifest,entries,[],s,[{...valid,...delta}]),/KOTLIN_API_V2_EVIDENCE_REFUSED/);
});

test('an oracle absent from the committed manifest cannot supply accepted truth',()=>{
 const absent={...manifest,oracles:[]},entries=[entry(report())];
 assert.throws(()=>{
  const s=seal(absent,entries,[]);
  adjudicate(absent,entries,[],s,truths([observation(['1'],'9223372036854775807','0')]));
 },/KOTLIN_API_V2_EVIDENCE_REFUSED/);
});

test('contradictory expected results for the same exact invocation and contract are refused',()=>{
 const entries=[entry(report())],s=seal(manifest,entries,[]);
 const rows=[observation(['1'],'9223372036854775807','0'),
  observation(['1'],'9223372036854775807','9223372036854775807')];
 assert.throws(()=>adjudicate(manifest,entries,[],s,truths(rows)),/KOTLIN_API_V2_EVIDENCE_REFUSED/);
});

test('exact scientific notation joins without rounding a Long through IEEE Double',()=>{
 const entries=[entry(report())],s=seal(manifest,entries,[]);
 const rows=[observation(['1.0'],'9.223372036854775807e18','0')];
 assert.equal(adjudicate(manifest,entries,[],s,truths(rows)).confirmedDistinctDefects,1);
});

test('constructor arguments require their constructor signature and oversized exponents are refused',()=>{
 assert.throws(()=>seal(manifest,[entry(report([{...finding,constructorArguments:['1']}]))],[]));
 assert.throws(()=>seal(manifest,[entry(report([{...finding,observed:['0e99999999999999999','1','0']}]))],[]));
});
