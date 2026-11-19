'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {analyze}=require('../../packages/core/ultra_sentinel_core.cjs');
const {planCrossFileInterventions}=require('../../packages/family-hunter/cross-file-interventions.cjs');
const {reproduceCrossFileInterventions}=require('../../packages/recovery/cross-file-sandbox-reproduction.cjs');
const {interpretFactorialOracleEvidence}=require('../../packages/family-hunter/factorial-oracle-evidence.cjs');
const {classifyOracleVectorFactorial}=require('../../packages/family-hunter/original-oracle-vector-factorial.cjs');
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
 const interpretation=interpretFactorialOracleEvidence({files:[first,second],reproduction:r});
 assert.equal(interpretation.status,'REGRESSION_OR_NONREPAIR_OBSERVED');
 assert.equal(interpretation.causalityVerified,false);
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
test('untrusted caller predicate cannot forge checked results and temporary trees are removed after exceptions',t=>{
 const {plan,versions}=sample();
 // Observe only this process's allocations, not concurrent test workers.
 const created=[],mkdtemp=fs.mkdtempSync.bind(fs);
 t.mock.method(fs,'mkdtempSync',(...args)=>{
  const dir=mkdtemp(...args);created.push(dir);return dir;
 });
 assert.throws(()=>reproduceCrossFileInterventions({plan,candidateRule:'UNSCOPED_COROUTINE',
  versions,independentOracle:()=>{throw Error('intentional oracle failure')}}),
  /ORACLE_EVALUATION_FAILED/);
 assert.ok(created.length>0);
 assert.ok(created.every(dir=>!fs.existsSync(dir)));
});
test('invalid or non-boolean oracle results cannot be certified as passing tests',()=>{
 const {plan,versions}=sample();
 assert.throws(()=>reproduceCrossFileInterventions({plan,candidateRule:'UNSCOPED_COROUTINE',
  versions,independentOracle:()=>({success:true})}),/ORACLE_EVALUATION_FAILED/);
});

function runIsolatedArithmeticOracle(kotlin,sources){
 const work=fs.mkdtempSync(path.join(os.tmpdir(),'factorial-kotlin-'));
 try{
  const fixture=path.resolve(__dirname,'../fixtures');
  const runner=path.join(fixture,'phase2-block26-object-contracts/run-isolated.sh');
  const input=path.join(work,'input'),oracle=path.join(input,'oracle');
  const compiled=path.join(work,'compiled'),results=path.join(work,'results');
  for(const dir of [oracle,compiled,results])fs.mkdirSync(dir,{recursive:true});
  for(const [file,source] of Object.entries(sources)){
   const destination=path.join(input,'src/main',file);
   fs.mkdirSync(path.dirname(destination),{recursive:true});
   fs.writeFileSync(destination,source);
  }
  fs.copyFileSync(path.join(fixture,'phase2-kotlin-module-factorial/IndependentArithmeticOracle.kt'),
   path.join(oracle,'IndependentArithmeticOracle.kt'));
  execFileSync('bash',[runner,'compile',kotlin,input,compiled],{stdio:'inherit'});
  execFileSync('bash',[runner,'oracle',kotlin,compiled,results],{stdio:'inherit'});
  const output=fs.readFileSync(path.join(results,'execution.log'),'utf8');
  const passed=output==='BENIGN_PASS\nCONTRACT_PASS\n';
  assert.ok(passed||output==='BENIGN_PASS\nCONTRACT_FAIL\n','Unexpected Kotlin oracle output');
  return passed;
 }finally{
  fs.rmSync(work,{recursive:true,force:true});
 }
}

test('three admitted Gradle Kotlin modules run every counterfactual and restore their Git baseline',t=>{
 const suffix='src/main/kotlin/demo/performance/framepacing/FramePacingIntelligenceEngine.kt';
 const modules=['alpha','beta','gamma'];
 const files=modules.map(module=>module+'/'+suffix);
 const lines=[
  'fun ready(orderedFast: List<Sample>, policy: Policy): Boolean {',
  '  val slowNow = 10L',
  '  val fastNow = orderedFast.lastOrNull()?.timestampMs ?: 0L',
  '  val recentFast = orderedFast.filter { fastNow - it.timestampMs <= policy.windowFastMs }',
  '  return recentFast.size >= policy.minSamplesFast',
  '}'
 ];
 const fullSource=lines.join('\n')+'\n';
 const analyzeModules=(sha,paths)=>analyze(paths.map(filename=>({
  filename,status:'added',changes:lines.length,additions:lines.length,deletions:0,fullSource,
  patch:'@@ -0,0 +1,'+lines.length+' @@\n'+lines.map(line=>'+'+line).join('\n')+'\n'
 })),{sha,sourceScope:'KOTLIN_JVM_V3_EXPERIMENTAL'});
 const plan=planCrossFileInterventions(analyzeModules(A,files.slice(0,1)),analyzeModules(B,files));
 const candidateRule='STALE_FRAME_TIMING_ACCEPTED';
 assert.equal(plan.candidates.find(candidate=>candidate.rule===candidateRule).experiments.length,8);

 const versions=files.map((path,i)=>{
  const prefix=`package ${modules[i]}\nfun convert(ticks: Int): Int = ticks * `;
  return {path,before:prefix+'1\n',after:prefix+'2\n'};
 });
 // The hosted JVM regression uses the same snapshots and Git rollback checks.
 const kotlin=process.env.SENTINEL_PHASE2_FACTORIAL_KOTLIN;
 const independentOracle=kotlin
  ? sources=>runIsolatedArithmeticOracle(kotlin,sources)
  : sources=>versions.every(({path,after})=>sources[path]===after);
 const reproduction=reproduceCrossFileInterventions({plan,candidateRule,versions,independentOracle});
 assert.deepEqual(reproduction.scenarios.map(row=>row.oracleVerdict),
  ['FAIL','FAIL','FAIL','FAIL','FAIL','FAIL','FAIL','PASS']);
 assert.ok(reproduction.scenarios.every(row=>row.rollbackVerified&&row.baselineTree===row.restoredTree));
 const result=interpretFactorialOracleEvidence({files,reproduction});
 assert.equal(result.status,'JOINT_INTERACTION_HYPOTHESIS');
 assert.deepEqual(result.minimalPassingSubsets,[files]);
 assert.equal(result.causalityVerified,false);
 assert.equal(result.commitAllowed,false);

 const vector=classifyOracleVectorFactorial({files,oracleIds:['PUBLIC_CONTRACT'],
  scenarios:reproduction.scenarios.map(({selectedFiles,oracleVerdict})=>({
   selectedFiles,verdicts:{PUBLIC_CONTRACT:oracleVerdict}
  }))});
 assert.equal(vector.status,'SHARED_OR_MULTI_FILE_EFFECT_HYPOTHESIS');
 assert.deepEqual(vector.minimalPassingSubsetsByOracle.PUBLIC_CONTRACT,[files]);
 assert.equal(vector.jvmReceiptsAuthenticatedByThisFunction,false);
 assert.equal(vector.commitAllowed,false);

 const rootFiles=[suffix,...files.slice(1)].sort();
 const advisoryPlan=planCrossFileInterventions(analyzeModules(A,rootFiles.slice(0,1)),
  analyzeModules(B,rootFiles));
 const advisoryVersions=rootFiles.map(path=>({...versions[0],path}));
 assert.throws(()=>reproduceCrossFileInterventions({
  plan:advisoryPlan,candidateRule,versions:advisoryVersions,independentOracle
 }),/INVALID_CROSS_FILE_REPRODUCTION/);
 if(kotlin)t.diagnostic(`Isolated Kotlin fixture: ${reproduction.scenarios.map(row=>row.oracleVerdict).join(', ')}; Git tree restored in all eight scenarios`);
});
