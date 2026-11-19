'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {classifyOriginalWitness,adjudicateOriginalFindings}=require('../../packages/quality-gates/v11-independent-source-oracle.cjs');
const distance=(numbers,observed)=>{
 return {cohortId:2,class:'DHash',method:'distanceTo-ABC123(long;long;)int',
  argument:0,otherArguments:1,inputs:numbers.map(String),observed};
};
test('source-defined dHash Hamming distance is not monotone and that alone is NOT a defect',()=>{
 const h=distance([0,1,3],[1,0,1]);
 const result=classifyOriginalWitness(h);
 assert.equal(result.status,'SCOPED_NONDEFECT_HYPOTHESIS');
 assert.equal(result.reference,'64_BIT_HAMMING_DISTANCE');
 assert.deepEqual(result.expected,[1,0,1]);
 assert.equal(result.confirmedOriginalDefect,false);
});
test('dHash reference mismatch is only a candidate until independent original replay',()=>{
 const h=distance([0,1,3],[1,1,1]);
 const result=classifyOriginalWitness(h);
 assert.equal(result.status,'DISCREPANCY_REQUIRES_INDEPENDENT_REPLAY');
 assert.equal(result.confirmedOriginalDefect,false);
});
test('negative, upper-bit and fixed-second-argument dHash values use full unsigned 64bit XOR',()=>{
 const h=distance([-1,0,1],[63,1,0]);
 h.otherArguments=2;
 const r=classifyOriginalWitness(h);
 assert.deepEqual(r.expected,[63,1,2]);
 assert.equal(r.confirmedOriginalDefect,false);
});
test('Whirlpool GF(2) reduction is independently bounded to 0...511',()=>{
 const h={cohortId:1,class:'com.runetopic.cryptography.whirlpool.Whirlpool',
  method:'maskWithReductionPolynomial(long;)long',argument:0,otherArguments:1,
  inputs:['255','256','511'],observed:[255,29,226]};
 const r=classifyOriginalWitness(h);
 assert.equal(r.status,'SCOPED_NONDEFECT_HYPOTHESIS');
 assert.deepEqual(r.expected,[255,29,226]);
 assert.equal(r.defectEligible,false);
 h.inputs=['-1','0','1'];
 assert.equal(classifyOriginalWitness(h).status,'UNADJUDICATED_OUT_OF_SCOPE');
});
test('unknown methods, nonmonotone hash helpers and bad numeric evidence abstain',()=>{
 assert.equal(classifyOriginalWitness({class:'DHash',method:'constructor-impl(long;)long',
  cohortId:2,argument:0,otherArguments:1,inputs:['0','1','2'],observed:[0,1,2]}).status,
  'UNADJUDICATED_NO_PUBLIC_ORACLE');
 assert.equal(classifyOriginalWitness({class:'DHash',method:'distanceTo-ABC123(long;long;)int',
  cohortId:2,argument:0,otherArguments:1,inputs:['NaN','1','2'],observed:[1,1,1]}).status,
  'UNADJUDICATED_OUT_OF_SCOPE');
});
test('fake findings or contradictions never automatically prove original defects',()=>{
 const rows=adjudicateOriginalFindings([distance([0,1,3],[1,0,1]),distance([0,1,3],[1,1,1])]);
 assert.equal(rows.confirmedOriginalDefects,0);
 assert.equal(rows.scopedNondefectHypotheses,1);
 assert.equal(rows.requiresIndependentReplay,1);
 assert.equal(rows.block26Closed,false);
 assert.equal(rows.block27Allowed,false);
});
