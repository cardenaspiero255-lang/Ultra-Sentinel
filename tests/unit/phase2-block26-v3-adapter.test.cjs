'use strict';
// Guard the independent evidence adapter against silently rejecting reports
// from the already frozen Hunter (#407). This is not an oracle or new finding.
const test = require('node:test');
const assert = require('node:assert/strict');
const {seal, adjudicate} = require('../../scripts/phase2-kotlin-api-v2-eval.cjs');

const manifest = {
 engine: {commitSha: 'a'.repeat(40)},
 cohorts: [{id:1, source:{repository:'fixture/original',commitSha:'b'.repeat(40)}}],
 oracles: [{cohortId:1,sha256:'c'.repeat(64)}],
 block27Allowed: false
};
const base = {
 schema:'ultra-sentinel-generic-jvm-metamorphic/v1',
 artifactSha256:'d'.repeat(64),status:'HYPOTHESES_REQUIRE_ORACLE',
 classesInspected:1,methodsProbed:0,methodCandidates:0,completedTriples:0,
 successfulInvocations:0,doubleMethodsExercised:0,floatMethodsExercised:0,
 structuredMethodsExercised:0,instanceMethodsExercised:0,unsupportedMethods:0,
 abstainedProbes:0,unloadableClasses:0,nestedClassesSkipped:0,
 comparableClasses:0,comparablePairs:0,comparableTriples:0,constructorAbstentions:0,
 objectContractClasses:1,objectContractPairs:1,objectContractAbstentions:0,
 findings:[],sourceAuthenticated:false,oracleVerified:false,novelFamilyVerified:false,
 repairAuthorized:false,remoteWrites:false,mergeAllowed:false
};
const entry = r => ({cohortId:1,scope:'algos',artifactSha256:r.artifactSha256,raw:Buffer.from(JSON.stringify(r))});
const objectFinding = rule => ({
 rule,class:'algos.arrays.BrokenValue',constructor:['int'],left:['0'],right:['0'],
 observed:rule==='OBJECT_EQUALS_HASHCODE_VIOLATION'?[0,1]:[false,false],
 status:'HYPOTHESIS_REQUIRES_INDEPENDENT_ORACLE'
});
test('v3: independent evidence accepts frozen object-law hypotheses as unadjudicated',()=>{
 for (const rule of [
  'OBJECT_EQUALS_REFLEXIVITY_VIOLATION',
  'OBJECT_EQUALS_SYMMETRY_VIOLATION',
  'OBJECT_EQUALS_HASHCODE_VIOLATION'
 ]) {
  const e=[entry({...base,findings:[objectFinding(rule)]})];
  const s=seal(manifest,e,[]);
  const verdict=adjudicate(manifest,e,[],s,[]);
  assert.equal(verdict.confirmedDistinctDefects,0);
  assert.equal(verdict.unadjudicatedHypotheses,1);
  assert.equal(verdict.globalPrecision,null);
  assert.equal(verdict.block27Allowed,false);
 }
});
test('v3: malformed object findings and invented rules fail closed',()=>{
 const good=objectFinding('OBJECT_EQUALS_SYMMETRY_VIOLATION');
 for (const bad of [{...good,rule:'OBJECT_AUTOMATIC_REPAIR_APPROVED'},{...good,class:'outside.Scope'}]) {
  assert.throws(()=>seal(manifest,[entry({...base,findings:[bad]})],[]));
 }
});
test('v3: object only evidence requires observed object-contract pair counts',()=>{
 assert.throws(()=>seal(manifest,[entry({...base,objectContractPairs:0})],[]),
  'a status claiming tested methods or pairs cannot be accepted when every count is zero');
});

test('v3: oracle bytes are authenticated and staged without executing them',()=>{
 const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
 const {spawnSync}=require('node:child_process'),crypto=require('node:crypto');
 const root=path.resolve(__dirname,'../..');
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-v3-oracle-'));
 try{
  const manifest=path.join(root,'docs/quality/PHASE2-BLOCK26-V3-COHORT.json');
  const out=path.join(temp,'staging');
  fs.mkdirSync(out);
  const script=path.join(root,'scripts/phase2-kotlin-api-v2-eval.cjs');
  const run=spawnSync(process.execPath,[script,'oracle-input',manifest,'1',out],{encoding:'utf8',timeout:10000});
  assert.equal(run.status,0,run.stderr);
  const bytes=fs.readFileSync(path.join(out,'oracle/IndependentArithmeticOracle.kt'));
  const expected=JSON.parse(fs.readFileSync(manifest)).oracles[0].sha256;
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),expected);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
