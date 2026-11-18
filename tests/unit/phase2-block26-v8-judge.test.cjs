'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {verifyOracleCommitment,adjudicateAfterPredictionSeal}=require('../../scripts/phase2-block26-v8-judge.cjs');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
test('v8 independent math and hex oracle commitments are fixed before any prediction',()=>{
 const commitment=JSON.parse(fs.readFileSync(path.join(root,'docs/quality/PHASE2-BLOCK26-V8-ORACLE-COMMITMENT.json'),'utf8'));
 const cohort=JSON.parse(fs.readFileSync(path.join(root,'docs/quality/PHASE2-BLOCK26-V8-COHORT.json'),'utf8'));
 const result=verifyOracleCommitment(commitment,cohort,root);
 assert.equal(result.originalSources,13);
 assert.equal(result.oracleExecuted,false);
 assert.equal(result.hunterExecuted,false);
 assert.equal(result.methodContracts.length,3);
 assert.deepEqual(result.methodContracts.map(x=>x.defectEligible),[true,true,false]);
});
test('independent judge refuses predictions that were not SHA-sealed before oracle disclosure',()=>{
 const hypothetical={schema:'ultra-sentinel-v8-prediction-seal/v1',reports:[],originalSources:13};
 const truth={schema:'ultra-sentinel-v8-independent-oracle/v1',observations:[]};
 assert.throws(()=>adjudicateAfterPredictionSeal(hypothetical,truth),/PREDICTION_SEAL/);
});
test('independent judge abstains when a hypothesis lacks a matching original truth',()=>{
 const seal={schema:'ultra-sentinel-v8-prediction-seal/v1',hypotheses:[{cohortId:1,class:'X',method:'foo(int;)int',
  argument:0,inputs:['-1','0','1'],observed:['0','1','0']}],
  reports:[],predictionsSealedBeforeOracle:true,oracleExecuted:false};
 const truth={schema:'ultra-sentinel-v8-independent-oracle/v1',observations:[],oracleExecuted:true};
 const result=adjudicateAfterPredictionSeal(seal,truth);
 assert.equal(result.confirmedOriginalDefects,0);
 assert.equal(result.unadjudicatedHypotheses,1);
 assert.equal(result.block26Closed,false);
});
