'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const json=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
test('v8 freeze retains exact successful three-stage ordering and no fabricated discovery',()=>{
 const r=json('docs/quality/PHASE2-BLOCK26-V8-BLIND-EVALUATION-RECEIPT.json');
 const plan=json('docs/quality/PHASE2-BLOCK26-V8-ORACLE-COMMITMENT.json');
 const cohort=json('docs/quality/PHASE2-BLOCK26-V8-COHORT.json');
 assert.equal(r.schema,'ultra-sentinel-v8-immutable-original-blind-evaluation-receipt/v1');
 assert.equal(r.experiment.workflowRunId,44251627135);
 assert.equal(r.experiment.hunterCommit,cohort.frozenHunter.commitSha);
 assert.equal(r.experiment.independentOracleBlobSha,plan.oracle.blobSha);
 assert.equal(r.experiment.selectedOriginalKotlinFiles,13);
 assert.deepEqual(r.experiment.order.map(x=>x.outcome),['success','success','success']);
 assert.deepEqual(r.experiment.order.map(x=>x.oracleExecuted),[false,false,true]);
 assert.match(r.frozenPredictions.sealSha256,/^[a-f0-9]{64}$/);
 assert.equal(r.frozenPredictions.hypotheses,0);
 assert.equal(r.frozenPredictions.probeExecutionAbstentions,0);
 assert.equal(r.frozenPredictions.predictionsSealedBeforeOracleExecution,true);
 assert.equal(r.frozenPredictions.sourceReports.length,2);
 assert.deepEqual(r.frozenPredictions.sourceReports.map(x=>x.methodsProbed),[2,0]);
 assert.deepEqual(r.frozenPredictions.sourceReports.map(x=>x.successfulInvocations),[108,0]);
 assert.equal(r.independentOracles.witnessRows,39);
 assert.equal(r.independentOracles.mismatchesOutsideCommittedTolerance,0);
 assert.equal(r.independentOracles.executionAbstentions,0);
 assert.equal(r.independentOracles.witnessDistribution.reduce((n,x)=>n+x.rows,0),39);
 assert.equal(r.independentOracles.witnessDistribution[2].publicContract,false);
 assert.equal(r.result.confirmedDistinctNewOriginalDefects,0);
 assert.equal(r.result.secondIndependentDiscoveryDemonstrated,false);
 assert.equal(r.result.effectiveHunterMethodCoverageAcrossIndependentRepositories,false);
 for(const key of ['block26Closed','block27Allowed','phase2Closed'])
  assert.equal(r.result[key],false);
 for(const key of ['globalPrecision','globalRecall','falseNegativeRate'])
  assert.equal(r.result[key],null);
 for(const key of ['frozenHunterUnmodified','historicalV6V7V8EvidenceUnmodified',
  'noPostVerdictRetuning','noReplacementCohortAfterRevealedResults'])
  assert.equal(r.noninterference[key],true);
});
