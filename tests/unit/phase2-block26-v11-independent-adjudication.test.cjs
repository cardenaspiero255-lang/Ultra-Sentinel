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
 oracleExecuted:true,oracleSourceAuthenticated:true,wholeCohortTruth:false,
 observations:rows,abstentions:[],wholeCohortTruth:false};}
test('V11 independently rejects a legitimate nonmonotone XOR/popcount turning-point false positive',()=>{
 const r=adjudicateV11(seal([f(['1','0','2'])]),truth([row(0,1,1),row(1,0,0),row(2,2,2)]));
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

test('V11 explicitly handles numeric float witness comparison, invalid values and nonmatching method signatures',()=>{
 const readings=['0.5','1.5','2.5'];
 const finding={...f(readings),method:'numericProbe(double;long;)double',inputs:readings};
 const rows=readings.map(x=>({...row(x,x,x),method:finding.method,actual:x,expected:x,
  tolerance:'0.01'}));
 const result=adjudicateV11(seal([finding]),truth(rows));
 assert.equal(result.falsePositiveHypotheses,1);
 assert.equal(result.confirmedOriginalDefects,0);
 assert.equal(result.unadjudicatedHypotheses,0);
 const unsupported={...finding,method:'numericProbe(java.lang.String;long;)double'};
 assert.equal(adjudicateV11(seal([unsupported]),truth(rows)).unadjudicatedHypotheses,1);
 const wrongPosition={...finding,argument:4};
 assert.equal(adjudicateV11(seal([wrongPosition]),truth(rows)).unadjudicatedHypotheses,1);
 const missing={...finding,inputs:['0.5']};
 assert.equal(adjudicateV11(seal([missing]),truth(rows)).unadjudicatedHypotheses,1);
});
test('V11 refuses to promote malformed independent oracle data into a confirmed software defect',()=>{
 const finding=f(['1','0','1']);
 for(const rogue of [
  {...row(1,0,'not-a-number'),tolerance:'0'},
  {...row(1,0,1),tolerance:'NaN'},
  {...row(1,0,1),tolerance:'-1'},
  {...row(1,0,1),actual:'NaN'},
  {...row(1,0,1),expected:'Infinity'}
 ]){
  const verdict=adjudicateV11(seal([finding]),truth([
   row(0,1,1),rogue,row(2,1,1)
  ]));
  assert.equal(verdict.confirmedOriginalDefects,0);
  assert.equal(verdict.unadjudicatedHypotheses,1);
 }
});

test('V11 rejects inconsistent evidence schemas without promoting a finding',()=>{
 const p=seal([f()]),o=truth([row(0,1,1),row(1,0,0),row(2,1,1)]);
 for(const altered of [
  {...p,oracleExecuted:true},
  {...p,frozenEngineCommit:'f'.repeat(40)},
  {...p,hypotheses:null},
  {...p,predictionsSealedBeforeOracle:false}
 ])assert.throws(()=>adjudicateV11(altered,o),/SEAL/);
 for(const altered of [
  {...o,schema:'untrusted'},
  {...o,predictionSealSha256:other},
  {...o,wholeCohortTruth:true},
  {...o,observations:null},
  {...o,abstentions:null}
 ])assert.throws(()=>adjudicateV11(p,altered),/TRUTH/);
});
test('V11 unsupported original witness shapes are abstentions, never confirmed findings',()=>{
 const variants=[
  {...f(),method:'broken'},
  {...f(),method:'numericProbe(byte;short;int;long;)int'},
  {...f(),method:'numericProbe(boolean;)int'},
  {...f(),method:'numericProbe(long;)int',argument:2},
  {...f(),method:null},
  {...f(),inputs:[]},
  {...f(),otherArguments:9},
  {...f(),argument:-1}
 ];
 for(const item of variants){
  const v=adjudicateV11(seal([item]),truth([]));
  assert.equal(v.confirmedOriginalDefects,0);
  assert.equal(v.unadjudicatedHypotheses,1);
 }
});
