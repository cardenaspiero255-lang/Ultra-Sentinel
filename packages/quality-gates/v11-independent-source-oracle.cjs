'use strict';
// V11 source-scoped reference specification. Authored from original Kotlin
// sources before opening ANY original Hunter findings. This module is immutable
// for this adjudication: no adaptation after reading sealed report contents.
// Not a generic semantic oracle. A mismatch is NOT an independently replayed
// software defect; it requires a separate original-target witness.
const V11_SOURCE_REFERENCE=Object.freeze({
 frozenEngineSha:'689583c23277807345edb715d8c2d277a3d4bda7',
 fullPredictionSealSha256:'0ccfa2c2cd51536f5a2bbecf624b6054fe05c0db06b4f5e04b598e480853737d',
 sourcePoolSha256:'6f894f51f2b657d3be139abca683878deeb2bbf3620d6cfa8b76f846f6b15f24',
 dHashOriginalBlobSha:'72e2752b37f6e5df38271b24d18e4c2d81b13d9a',
 whirlpoolOriginalBlobSha:'bf65a1afc051be3d266adbf5daa0b498434f3381',
 semantics:[
  {cohortId:2,class:'DHash',signature:'distanceTo-<compiler-mangle>(long;long;)int',
   reference:'64_BIT_HAMMING_DISTANCE',contract:'public distanceTo: popcount XOR of two 64-bit image hashes',
   defectEligible:true},
  {cohortId:1,class:'com.runetopic.cryptography.whirlpool.Whirlpool',
   signature:'maskWithReductionPolynomial(long;)long',
   reference:'GF2_SINGLE_BYTE_POLYNOMIAL_0x11D',
   contract:'original internal Whirlpool arithmetic: one GF(2) reduction step on 0..511',
   defectEligible:false}
 ],
 predictionContentsInspectedBeforeReferenceCommit:false,
 oracleExecutedBeforeReferenceCommit:false,
 independentlyReplayedTarget:false
});
const LONG_MIN=-(1n<<63n),LONG_MAX=(1n<<63n)-1n;
const numeric=x=>{
 if(typeof x!=='string'||!/^[-+]?(?:0|[1-9][0-9]*)$/.test(x))return null;
 try{const n=BigInt(x);return n>=LONG_MIN&&n<=LONG_MAX?n:null;}
 catch{return null;}
};
const popcount64=x=>{
 let bits=BigInt.asUintN(64,x),count=0;
 while(bits){bits &= bits-1n;count++;}
 return count;
};
const failResult=(status,ref=null,eligible=false)=>({
 status,reference:ref,defectEligible:eligible,
 confirmedOriginalDefect:false,independentlyReplayedTarget:false
});
function classifyOriginalWitness(f){
 if(!f||typeof f!=='object'||!Number.isInteger(f.cohortId)||
  typeof f.class!=='string'||typeof f.method!=='string')
  return failResult('UNADJUDICATED_MALFORMED');
 let reference=null,eligible=false;
 if(f.cohortId===2&&f.class==='DHash'&&
  /^distanceTo-[A-Za-z0-9_-]{1,30}\(long;long;\)int$/.test(f.method)){
  reference='64_BIT_HAMMING_DISTANCE';eligible=true;
 }else if(f.cohortId===1&&f.class==='com.runetopic.cryptography.whirlpool.Whirlpool'&&
  f.method==='maskWithReductionPolynomial(long;)long'){
  reference='GF2_SINGLE_BYTE_POLYNOMIAL_0x11D';
 }else return failResult('UNADJUDICATED_NO_PUBLIC_ORACLE');
 if(!Array.isArray(f.inputs)||f.inputs.length!==3||
  !Array.isArray(f.observed)||f.observed.length!==3||
  !Number.isInteger(f.argument)||f.argument<0||f.argument>1||
  !Number.isInteger(f.otherArguments)||
  (reference==='GF2_SINGLE_BYTE_POLYNOMIAL_0x11D'&&f.argument!==0))
  return failResult('UNADJUDICATED_MALFORMED',reference,eligible);
 const varied=f.inputs.map(numeric),fixed=BigInt(f.otherArguments);
 if(varied.some(x=>x===null)||fixed<LONG_MIN||fixed>LONG_MAX||
   f.observed.some(o=>!Number.isSafeInteger(o)))
  return failResult('UNADJUDICATED_OUT_OF_SCOPE',reference,eligible);
 let expected;
 if(reference==='64_BIT_HAMMING_DISTANCE'){
  expected=varied.map(x=>popcount64(x^fixed));
 }else{
  if(varied.some(x=>x<0n||x>511n))return failResult('UNADJUDICATED_OUT_OF_SCOPE',reference,false);
  // Single GF(2) reduction of the x^8 coefficient by polynomial 0x11D,
  // independently derived from the documented Whirlpool field polynomial.
  expected=varied.map(x=>Number(x<256n?x:(x^0x11dn)));
 }
 const ok=expected.every((n,i)=>n===f.observed[i]);
 return {...failResult(ok?'SCOPED_NONDEFECT_HYPOTHESIS':
  'DISCREPANCY_REQUIRES_INDEPENDENT_REPLAY',reference,eligible),expected};
}
function adjudicateOriginalFindings(hypotheses){
 if(!Array.isArray(hypotheses)||hypotheses.length>256)
  throw Error('V11_INDEPENDENT_INVALID_HYPOTHESES');
 const verdicts=hypotheses.map(classifyOriginalWitness);
 return {
  schema:'ultra-sentinel-v11-precommitted-source-reference-adjudication/v1',
  hypothesisCount:hypotheses.length,
  scopedNondefectHypotheses:verdicts.filter(x=>x.status==='SCOPED_NONDEFECT_HYPOTHESIS').length,
  requiresIndependentReplay:verdicts.filter(x=>x.status==='DISCREPANCY_REQUIRES_INDEPENDENT_REPLAY').length,
  unadjudicatedHypotheses:verdicts.filter(x=>x.status.startsWith('UNADJUDICATED')).length,
  confirmedOriginalDefects:0,
  fullOriginalFunctionalTruth:false,independentlyReplayedTarget:false,
  originalSourceModified:false,engineRetuned:false,
  block26Closed:false,block27Allowed:false,verdicts
 };
}
module.exports=Object.freeze({V11_SOURCE_REFERENCE,classifyOriginalWitness,adjudicateOriginalFindings});
