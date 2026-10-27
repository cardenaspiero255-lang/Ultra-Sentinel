'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os');
const {analyze}=require('../../packages/core/ultra_sentinel_core.cjs');
const {planCrossFileInterventions}=require('../../packages/family-hunter/cross-file-interventions.cjs');
const {reproduceCrossFileInterventions}=require('../../packages/recovery/cross-file-sandbox-reproduction.cjs');
const A='a'.repeat(40),B='b'.repeat(40);
const first='app/src/main/java/voice/First.kt';
const second='app/src/main/java/voice/Second.kt';
function core(sha,files){
 return analyze(files.map(filename=>({filename,status:'added',changes:1,
  additions:1,deletions:0,patch:'@@ -0,0 +1 @@\n+GlobalScope.launch { work() }\n'})),{sha});
}
function sample(){
 const before=core(A,[first]),after=core(B,[first,second]);
 return {plan:planCrossFileInterventions(before,after),versions:[
  {path:first,before:'fun first() = "old"\n',after:'fun first() = "new"\n'},
  {path:second,before:'fun second() = "old"\n',after:'fun second() = "new"\n'}
 ]};
}
const oracle=files=>{
 const a=files[first].includes('"new"'),b=files[second].includes('"new"');
 return a===b;
};
test('real disposable Git factorial experiments exercise Judge and restore exact baseline tree',()=>{
 const {plan,versions}=sample();
 const r=reproduceCrossFileInterventions({plan,candidateRule:'UNSCOPED_COROUTINE',
  versions,independentOracle:oracle});
 assert.equal(r.status,'LOCAL_FACTORIAL_COMPLETED_REQUIRES_EXTERNAL_ORACLE');
 assert.equal(r.scenarios.length,4);
 assert.deepEqual(r.scenarios.map(s=>s.selectedFiles),[[],[first],[second],[first,second]]);
 assert.deepEqual(r.scenarios.map(s=>s.oracleVerdict),['PASS','FAIL','FAIL','PASS']);
 assert.deepEqual(r.scenarios.map(s=>s.judgeStatus),[
  'BASELINE_NO_COMMIT','APPROVED_LOCAL_POLICY_ONLY','APPROVED_LOCAL_POLICY_ONLY','APPROVED_LOCAL_POLICY_ONLY'
 ]);
 assert.ok(r.scenarios.every(s=>s.rollbackVerified===true&&s.remoteWrites===false));
 assert.ok(r.scenarios.every(s=>/^[a-f0-9]{40}$/.test(s.baselineTree)&&s.baselineTree===s.restoredTree));
 assert.equal(r.causalityVerified,false);assert.equal(r.sourceAuthenticated,false);
 assert.equal(r.independentOracleProvenanceVerified,false);
 assert.equal(r.commitAllowed,false);assert.equal(r.mergeAllowed,false);
 assert.equal(r.productionReleaseAllowed,false);
});
test('caller cannot forge, omit or reorder the exact planned subset matrix',()=>{
 const {plan,versions}=sample(),bad={...plan,candidates:plan.candidates.map(c=>
  ({...c,experiments:[...c.experiments].reverse()}))};
 assert.throws(()=>reproduceCrossFileInterventions({plan:bad,candidateRule:'UNSCOPED_COROUTINE',
  versions,independentOracle:oracle}),/INVALID_CROSS_FILE_REPRODUCTION/);
});
test('wrong source file order, path traversal, unlisted changes or unchanged content are rejected',()=>{
 const {plan,versions}=sample();
 for(const entries of [
  versions.slice().reverse(),
  [{...versions[0],path:'app/src/main/../outside.kt'},versions[1]],
  [{...versions[0],path:'.github/workflows/ci.yml'},versions[1]],
  [versions[0],{...versions[1],after:versions[1].before}],
  [...versions,{path:'app/src/main/Evil.kt',before:'a\n',after:'b\n'}]
 ]){
  assert.throws(()=>reproduceCrossFileInterventions({plan,candidateRule:'UNSCOPED_COROUTINE',
   versions:entries,independentOracle:oracle}),/INVALID_CROSS_FILE_REPRODUCTION/);
 }
});
test('untrusted caller predicate cannot forge checked results and temporary trees are removed after exceptions',()=>{
 const {plan,versions}=sample();
 const before=new Set(fs.readdirSync(os.tmpdir()).filter(x=>x.startsWith('ultra-factorial-')));
 assert.throws(()=>reproduceCrossFileInterventions({plan,candidateRule:'UNSCOPED_COROUTINE',
  versions,independentOracle:()=>{throw Error('intentional oracle failure')}}),
  /ORACLE_EVALUATION_FAILED/);
 const after=fs.readdirSync(os.tmpdir()).filter(x=>x.startsWith('ultra-factorial-'));
 assert.deepEqual(after.filter(x=>!before.has(x)),[]);
});
test('invalid or non-boolean oracle results cannot be certified as passing tests',()=>{
 const {plan,versions}=sample();
 assert.throws(()=>reproduceCrossFileInterventions({plan,candidateRule:'UNSCOPED_COROUTINE',
  versions,independentOracle:()=>({success:true})}),/ORACLE_EVALUATION_FAILED/);
});
