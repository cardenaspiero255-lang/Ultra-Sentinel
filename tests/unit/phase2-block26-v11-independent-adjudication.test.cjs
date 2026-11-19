'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {adjudicateV11,verifyV11OracleCommitment,verifyPredictionSeal}=require('../../scripts/phase2-block26-v11-independent-judge.cjs');
const digest='a'.repeat(64),other='b'.repeat(64);
const method='distanceTo-impl(long;long;)int';
const cls='DHash';
function f(observed=['1','0','1']){return {class:cls,method,argument:0,otherArguments:1,
 inputs:['0','1','2'],observed,status:'HYPOTHESIS_REQUIRES_INDEPENDENT_ORACLE'};}
function row(x,actual,expected,eligible=true){
 return {cohortId:2,class:cls,method,arguments:[String(x),'1'],actual:String(actual),expected:String(expected),
  tolerance:'0',contract:'xor64-popcount',defectEligible:eligible};
}
function seal(findings){return {schema:'ultra-sentinel-v11-verified-frozen-predictions/v1',
 frozenEngineCommit:'689583c23277807345edb715d8c2d277a3d4bda7',
 fullPredictionSealSha256:'0ccfa2c2cd51536f5a2bbecf624b6054fe05c0db06b4f5e04b598e480853737d',
 hypotheses:findings.map(x=>({...x,cohortId:2})),
 allSelectedReportsAuthenticated:true,predictionsSealedBeforeOracle:true,oracleExecuted:false};}
function truth(rows){return {schema:'ultra-sentinel-v11-independent-original-truth/v1',
 predictionSealSha256:'0ccfa2c2cd51536f5a2bbecf624b6054fe05c0db06b4f5e04b598e480853737d',
 oracleExecuted:true,oracleSourceAuthenticated:true,
 observations:rows,abstentions:[],wholeCohortTruth:false};}
test('V11 independently rejects a legitimate nonmonotone XOR/popcount turning-point false positive',()=>{
 const r=adjudicateV11(seal([f()]),truth([row(0,1,1),row(1,0,0),row(2,2,2)]));
 assert.equal(r.falsePositiveHypotheses,1);
 assert.equal(r.confirmedOriginalDefects,0);
 assert.equal(r.unadjudicatedHypotheses,0);
 assert.equal(r.block26Closed,false);
});
test('V11 does not confirm a defect unless three original observations agree with original frozen witness AND independent truth disagrees',()=>{
 const p=seal([f(['1','0','1'])]);
 let result=adjudicateV11(p,truth([row(0,1,1),row(1,0,1),row(2,1,1)]));
 assert.equal(result.confirmedOriginalDefects,1);
 result=adjudicateV11(p,truth([row(0,1,1),row(1,99,1),row(2,1,1)]));
 assert.equal(result.confirmedOriginalDefects,0);
 assert.equal(result.unadjudicatedHypotheses,1);
});
test('V11 refuses generated or non-public methods as defect proof even with matching witnesses',()=>{
 const rows=[row(0,1,1,false),row(1,0,1,false),row(2,1,1,false)];
 const r=adjudicateV11(seal([f()]),truth(rows));
 assert.equal(r.confirmedOriginalDefects,0);
 assert.equal(r.unadjudicatedHypotheses,1);
});
test('V11 fails closed when truth, engine, seal or source authentication differs',()=>{
 const p=seal([f()]),o=truth([row(0,1,1),row(1,0,0),row(2,1,1)]);
 assert.throws(()=>adjudicateV11({...p,fullPredictionSealSha256:other},o),/SEAL/);
 assert.throws(()=>adjudicateV11(p,{...o,oracleSourceAuthenticated:false}),/TRUTH/);
 assert.throws(()=>adjudicateV11(p,{...o,oracleExecuted:false}),/TRUTH/);
 assert.throws(()=>adjudicateV11({...p,allSelectedReportsAuthenticated:false},o),/SEAL/);
});
test('V11 oracle commitment must match exact blob hash of selected cohort and standalone independent implementation',()=>{
 const p=verifyV11OracleCommitment();
 assert.equal(p.frozenEngineCommit,'689583c23277807345edb715d8c2d277a3d4bda7');
 assert.equal(p.selectedOriginalFiles,13);
 assert.equal(p.allPredictionsSealedBeforeOracle,true);
 assert.equal(p.oracleExecuted,false);
 assert.equal(p.predictionSealSha256,'0ccfa2c2cd51536f5a2bbecf624b6054fe05c0db06b4f5e04b598e480853737d');
});
test('V11 refuses reports missing, altered, substituted or with findings not in frozen artifacts',()=>{
 const original={schema:'ultra-sentinel-v11-full-predictions-first/v1',
  frozenEngineCommit:'689583c23277807345edb715d8c2d277a3d4bda7',
  poolSha256:'6f894f51f2b657d3be139abca683878deeb2bbf3620d6cfa8b76f846f6b15f24',
  allPredictionsSealedBeforeSelection:true,oracleExecuted:false,hunterRetuned:false,
  reportFiles:[],originalRepositories:9};
 assert.throws(()=>verifyPredictionSeal(original,{}),/REPORTS/);
 assert.throws(()=>verifyPredictionSeal({...original,oracleExecuted:true},{}),/MANIFEST/);
});
