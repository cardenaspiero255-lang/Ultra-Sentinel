#!/usr/bin/env node
'use strict';
// Independent source-bound judge. This module never modifies original sources,
// Hunter oracles or historic evidence. Only already sealed prediction bytes are
// eligible for reconciliation against separately authenticated oracle outputs.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..'),SHA=/^[a-f0-9]{40}$/;
const blob=buffer=>crypto.createHash('sha1').update(Buffer.from('blob '+buffer.length+'\0')).update(buffer).digest('hex');
const hash=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
const fail=msg=>{throw Error('V8_JUDGE_'+msg);};
function verifyOracleCommitment(plan,cohort,root=ROOT){
 if(!plan||plan.schema!=='ultra-sentinel-block26-v8-independent-oracle-commitment/v1'||
  !cohort||cohort.schema!=='ultra-sentinel-block26-v8-structural-admitted-cohort/v1'||
  plan.frozenEngine.commitSha!==cohort.frozenHunter.commitSha||
  plan.frozenEngine.moduleBlobSha!==cohort.frozenHunter.moduleBlobSha||
  plan.cohort.originalSources!==13||plan.cohort.originalCohorts!==2||
  plan.cohort.path!=='docs/quality/PHASE2-BLOCK26-V8-COHORT.json'||
  plan.oracle.path!=='tests/fixtures/phase2-block26-v8/oracle/IndependentArithmeticOracle.kt'||
  plan.oracle.entrypoint!=='oracle.IndependentArithmeticOracleKt'||
  plan.oracle.compileBeforePrediction!==true||
  plan.oracle.executeOnlyAfterPredictionSeal!==true||
  plan.oracle.oracleHasNoAccessToPredictionArtifacts!==true||
  plan.protocol.oracleSourceCommittedBeforeHunter!==true||
  plan.protocol.captureCannotReadOracleOrSourceContract!==true||
  plan.protocol.independentRunMustFollowPredictionSeal!==true||
  plan.protocol.originalSourceBodiesUnmodified!==true||
  plan.state.oracleExecuted!==false||plan.state.hunterExecuted!==false||
  plan.state.predictionsSealed!==false||plan.state.block26Closed!==false||
  plan.state.block27Allowed!==false||plan.state.confirmedDistinctOriginalDefects!==null)
  fail('ORACLE_COMMITMENT');
 for(const [file,sha] of [[plan.cohort.path,plan.cohort.blobSha],
   [plan.oracle.path,plan.oracle.blobSha]]){
  if(!SHA.test(sha)||blob(fs.readFileSync(path.join(root,file)))!==sha)
   fail('ORACLE_HASH_CHANGED');
 }
 if(!Array.isArray(plan.methodContracts)||plan.methodContracts.length!==3||
  plan.methodContracts[0].method!=='toRadians(float;)float'||
  plan.methodContracts[1].method!=='round(float;int;)float'||
  plan.methodContracts[2].method!=='access$intFromUHex(java.lang.String;)int'||
  plan.methodContracts[0].defectEligible!==true||
  plan.methodContracts[1].defectEligible!==true||
  plan.methodContracts[2].defectEligible!==false||
  plan.methodContracts.some(c=>!Number.isFinite(c.absTolerance)||c.absTolerance<0)||
  !Array.isArray(plan.hunterScopes)||plan.hunterScopes.length!==2||
  cohort.originalFilesSelected!==13)
  fail('ORACLE_CONTRACTS');
 return Object.freeze({originalSources:13,methodContracts:plan.methodContracts,
  oracleExecuted:false,hunterExecuted:false,commitmentVerified:true});
}
const finite=x=>{
 if(typeof x!=='string'&&typeof x!=='number')return null;
 const n=Number(x);return Number.isFinite(n)&&String(x).trim()!==''?n:null;
};
const close=(x,y,tol=0)=>{
 const a=finite(x),b=finite(y);return a!==null&&b!==null&&Math.abs(a-b)<=tol;
};
function argumentsForFinding(f,i){
 if(!Number.isInteger(f.argument)||f.argument<0||f.argument>2||
  typeof f.method!=='string'||!f.method.includes('(')||!f.method.includes(')')||
  !Array.isArray(f.inputs)||f.inputs.length!==3||!Number.isInteger(f.otherArguments))
  return null;
 const t=f.method.slice(f.method.indexOf('(')+1,f.method.lastIndexOf(')')).split(';').filter(Boolean);
 if(t.length<1||t.length>3||f.argument>=t.length)return null;
 return t.map((type,j)=>j===f.argument?String(f.inputs[i]):
  type==='java.lang.String'?(f.otherArguments===100?'aa':'a'):String(f.otherArguments));
}
function adjudicateAfterPredictionSeal(seal,truth){
 if(!seal||seal.schema!=='ultra-sentinel-v8-prediction-seal/v1'||
  seal.predictionsSealedBeforeOracle!==true||seal.oracleExecuted!==false||
  !Array.isArray(seal.hypotheses)||!Array.isArray(seal.reports))fail('PREDICTION_SEAL');
 if(!truth||truth.schema!=='ultra-sentinel-v8-independent-oracle/v1'||
  truth.oracleExecuted!==true||!Array.isArray(truth.observations))fail('ORACLE_TRUTH');
 const details=[],confirmed=new Set();
 let falsePositives=0,unadjudicated=0;
 for(const f of seal.hypotheses){
  const rows=[];
  if(f.rule!==undefined){unadjudicated++;details.push({outcome:'UNADJUDICATED_RULE'});continue;}
  for(let i=0;i<3;i++){
   const args=argumentsForFinding(f,i);
   if(args===null)continue;
   const obs=truth.observations.find(o=>o.cohortId===f.cohortId&&
    o.class===f.class&&o.method===f.method&&o.defectEligible===true&&
    Array.isArray(o.arguments)&&JSON.stringify(o.arguments)===JSON.stringify(args)&&
    close(o.actual,f.observed[i],0.0001));
   if(obs)rows.push(obs);
  }
  if(rows.length!==3){
   unadjudicated++;details.push({outcome:'INSUFFICIENT_INDEPENDENT_WITNESSES',
    class:f.class,method:f.method,matched:rows.length});continue;
  }
  const discrepancies=rows.filter(o=>finite(o.tolerance)!==null&&
   !close(o.actual,o.expected,Number(o.tolerance)));
  if(discrepancies.length){
   confirmed.add(JSON.stringify([f.cohortId,f.class,f.method]));
   details.push({outcome:'CONFIRMED_SCOPED_HYPOTHESIS',
    cohortId:f.cohortId,class:f.class,method:f.method,
    witnesses:discrepancies});
  }else{
   falsePositives++;
   details.push({outcome:'SCOPED_FALSE_POSITIVE',
    cohortId:f.cohortId,class:f.class,method:f.method});
  }
 }
 return {schema:'ultra-sentinel-v8-independent-adjudication/v1',
  confirmedOriginalDefects:confirmed.size,falsePositiveHypotheses:falsePositives,
  unadjudicatedHypotheses:unadjudicated,evaluatedHypotheses:seal.hypotheses.length,
  details,independentOracleUsed:true,engineRetuned:false,block26Closed:false,block27Allowed:false};
}
module.exports=Object.freeze({verifyOracleCommitment,adjudicateAfterPredictionSeal});
