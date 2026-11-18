'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {admitFrozenHunterInvocability}=require('../../packages/quality-gates/v11-effective-invocability.cjs');

const sha=c=>c.repeat(40);
const dig=c=>c.repeat(64);
function source(name,blob){return {
 repository:name,commitSha:sha('a'),treeSha:sha('b'),
 files:[{path:'src/main/kotlin/Main.kt',blobSha:sha(blob),sizeBytes:100}],totalBytes:100
};}
function row(rank,repo,blob,methods,triples=2){
 return {rank,source:source(repo,blob),
  frozenReportSha256:dig(blob),
  report:{classesInspected:2,methodCandidates:methods,methodsProbed:methods,
   completedTriples:methods?triples:0,successfulInvocations:methods?triples*6:0,
   probeExecutionSucceeded:true,originalSourceAuthenticated:true,
   oracleExecuted:false,hunterRetuned:false}};
}
function input(rows){return {schema:'ultra-sentinel-v11-sealed-hunter-counter-evidence/v1',
 frozenEngineCommit:'689583c23277807345edb715d8c2d277a3d4bda7',
 frozenEngineBlob:'430b4e928527b20fe305d63f3efb85909f1dfa06',
 predictionsSealedBeforeSelection:true,oracleExecuted:false,
 originalSourcesNowExposed:true,rows};}
test('v11 chooses first sealed prefix with THREE successfully probed methods from TWO independent repositories',()=>{
 const r=admitFrozenHunterInvocability(input([
 row(4,'first/no-probes','1',0,0),
 row(7,'first/two','2',2,3),
 row(8,'middle/zero','3',0,0),
 row(9,'second/one','4',1,2),
 row(11,'third/more','5',5,5)]));
 assert.equal(r.eligible,true);
 assert.deepEqual(r.selected.map(x=>x.source.repository),['first/two','second/one']);
 assert.equal(r.probedMethods,3);
 assert.equal(r.successfulInvocations,30);
 assert.equal(r.independentProbedRepositories,2);
 assert.equal(r.fullPredictionsMustRemainSealed,true);
 assert.equal(r.oracleExecuted,false);
 assert.equal(r.originalSourcesNowExposed,true);
 assert.equal(r.allScoutedRepositories.length,5);
});
test('v8 ABI-only acceptance without successful Hunter probing is rejected prospectively',()=>{
 const result=admitFrozenHunterInvocability(input([
 row(68,'elevenetc/utils-kotlin-math','1',2,3),
 row(76,'kory33/bigmath','2',0,0)]));
 assert.equal(result.eligible,false);
 assert.equal(result.independentProbedRepositories,1);
 assert.deepEqual(result.selected,[]);
 assert.equal(result.reason,'INSUFFICIENT_EFFECTIVE_HUNTER_DIVERSITY');
});
test('a supported signature with failed invocations does NOT count as probed',()=>{
 const r=row(1,'fresh/no-invocations','2',1,1);
 r.report.successfulInvocations=0;
 assert.throws(()=>admitFrozenHunterInvocability(input([r])),/COUNTER_INTEGRITY/);
});
test('reject oracle answers, discovered hypothesis labels, unsealed reports, retuning and threshold weakening',()=>{
 const a=row(1,'fresh/math','3',2),b=row(2,'fresh/other','4',1);
 for(const key of ['oracleOutput','expected','observed','findings','hypotheses','functionalResults']){
  assert.throws(()=>admitFrozenHunterInvocability(input([
   {...a,[key]:true},b])),/FUNCTIONAL_LEAKAGE/);
 }
 const corrupt=input([a,b]);corrupt.predictionsSealedBeforeSelection=false;
 assert.throws(()=>admitFrozenHunterInvocability(corrupt),/NOT_PROSPECTIVE/);
 const altered=input([a,b]);altered.rows[0].report.hunterRetuned=true;
 assert.throws(()=>admitFrozenHunterInvocability(altered),/COUNTER_INTEGRITY/);
 assert.throws(()=>admitFrozenHunterInvocability(input([a,b]),{
  minimumProbedMethods:2,minimumIndependentRepositories:1}),/FROZEN_THRESHOLD/);
});
test('reject duplicate repo/blob, reordering and incorrect report hashes',()=>{
 const a=row(1,'new/Math','2',2),b=row(3,'new/Other','3',1);
 assert.throws(()=>admitFrozenHunterInvocability(input([b,a])),/RANK_ORDER/);
 assert.throws(()=>admitFrozenHunterInvocability(input([a,row(2,'NEW/math','4',1)])),/DUPLICATE_REPOSITORY/);
 assert.throws(()=>admitFrozenHunterInvocability(input([a,row(2,'new/other','2',1)])),/DUPLICATE_BLOB/);
 assert.throws(()=>admitFrozenHunterInvocability(input([{...a,frozenReportSha256:'invalid'},b])),/REPORT_INTEGRITY/);
});

test('compilation or sandbox abstention remains zero evidence without inventing probes',()=>{
 const absent=row(1,'fresh/not-built','6',0,0);
 absent.report.probeExecutionSucceeded=false;
 absent.report.classesInspected=0;
 const detected=row(2,'fresh/supported','7',3,3);
 const report=admitFrozenHunterInvocability(input([absent,detected]));
 assert.equal(report.eligible,false);
 assert.equal(report.independentProbedRepositories,1);
 const falseWitness=row(1,'fresh/inconsistent','8',0,0);
 falseWitness.report.probeExecutionSucceeded=false;
 falseWitness.report.classesInspected=1;
 assert.throws(()=>admitFrozenHunterInvocability(input([falseWitness])),/COUNTER_INTEGRITY/);
});
test('insufficient triples, source-size drift and duplicate pool metadata fail closed',()=>{
 const method=row(1,'fresh/incomplete','9',1,0);
 assert.throws(()=>admitFrozenHunterInvocability(input([method])),/COUNTER_INTEGRITY/);
 const sourceDrift=row(1,'fresh/drift','a',1);
 sourceDrift.source.totalBytes=15;
 assert.throws(()=>admitFrozenHunterInvocability(input([sourceDrift])),/SOURCE_INTEGRITY/);
 const target=row(1,'fresh/target','b',1);
 target.report.methodCandidates=0;
 assert.throws(()=>admitFrozenHunterInvocability(input([target])),/COUNTER_INTEGRITY/);
});

test('v11 source provenance incompatibility is an abstention, never an invocable repository',()=>{
 const failed=row(1,'fresh/untrusted-original','8',0,0);
 failed.report.originalSourceAuthenticated=false;
 failed.report.probeExecutionSucceeded=false;
 failed.report.classesInspected=0;
 const positive=row(2,'fresh/verified-original','9',3,3);
 const result=admitFrozenHunterInvocability(input([failed,positive]));
 assert.equal(result.eligible,false);
 assert.equal(result.independentProbedRepositories,1);
 const malicious=row(1,'fresh/invented-invocation','a',1,1);
 malicious.report.originalSourceAuthenticated=false;
 assert.throws(()=>admitFrozenHunterInvocability(input([malicious])),/COUNTER_INTEGRITY/);
});
