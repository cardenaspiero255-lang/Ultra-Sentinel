'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {admitFrozenHunterInvocability}=require('../../packages/quality-gates/v9-effective-invocability.cjs');

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
function input(rows){return {schema:'ultra-sentinel-v9-sealed-hunter-counter-evidence/v1',
 frozenEngineCommit:'689583c23277807345edb715d8c2d277a3d4bda7',
 frozenEngineBlob:'430b4e928527b20fe305d63f3efb85909f1dfa06',
 predictionsSealedBeforeSelection:true,oracleExecuted:false,
 originalSourcesNowExposed:true,rows};}
test('v9 chooses first sealed prefix with THREE successfully probed methods from TWO independent repositories',()=>{
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
