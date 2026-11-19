#!/usr/bin/env node
'use strict';
// V11 independent judge. The source-specific oracle was committed BEFORE any
// original frozen prediction archive was opened. This module never retunes
// Hunter or promotes nonmatching, internal or generated witnesses.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..');
const ENGINE='689583c23277807345edb715d8c2d277a3d4bda7';
const BLOB='430b4e928527b20fe305d63f3efb85909f1dfa06';
const PRIOR='0ccfa2c2cd51536f5a2bbecf624b6054fe05c0db06b4f5e04b598e480853737d';
const POOL='6f894f51f2b657d3be139abca683878deeb2bbf3620d6cfa8b76f846f6b15f24';
const HASH=/^[0-9a-f]{64}$/;
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const blob=b=>crypto.createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const fail=x=>{throw Error('V11_INDEPENDENT_'+x);};
const load=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const absolute=p=>path.join(ROOT,p);

function verifyV11OracleCommitment(){
 const plan=load(absolute('docs/quality/PHASE2-BLOCK26-V11-ORACLE-COMMITMENT.json'));
 const cohort=load(absolute('docs/quality/PHASE2-BLOCK26-V11-COHORT.json'));
 if(plan.schema!=='ultra-sentinel-v11-independent-original-oracle-commitment/v1'||
  plan.frozenHunterCommit!==ENGINE||plan.frozenHunterBlob!==BLOB||
  plan.sourceCohortPath!=='docs/quality/PHASE2-BLOCK26-V11-COHORT.json'||
  plan.selectedOriginalFiles!==13||plan.priorPredictionRunId!==44317152922||
  plan.priorFullPredictionManifestSha256!==PRIOR||
  plan.priorFullPredictionsArtifactId!==14432658115||
  plan.oracle?.path!=='tests/fixtures/phase2-block26-v11/oracle/IndependentArithmeticOracle.kt'||
  plan.oracle?.entrypoint!=='oracle.IndependentArithmeticOracleKt'||
  plan.oracle?.compileAndRunOnlyAfterPredictionSeal!==true||
  plan.oracle?.oracleHasNoPredictionAccess!==true||
  plan.state?.oracleExecuted!==false||
  plan.state?.fullPredictionsOpened!==false||
  plan.state?.block26Closed!==false||
  plan.state?.block27Allowed!==false||
  plan.protocol?.oracleSourceCommittedBeforeReadingFullHunterPredictions!==true||
  plan.protocol?.noHunterRetune!==true||
  plan.protocol?.noReusingOriginalsAsUnknown!==true||
  plan.protocol?.confirmOnlyExactThreeMatchingWitnesses!==true||
  plan.protocol?.generatedOrInternalMethodsNeverNewPublicDefect!==true)
  fail('COMMITMENT');
 for(const {file,expected} of [
  {file:plan.sourceCohortPath,expected:plan.sourceCohortBlobSha},
  {file:plan.oracle.path,expected:plan.oracle.blobSha}]){
  if(!/^[a-f0-9]{40}$/.test(expected)||
   blob(fs.readFileSync(absolute(file)))!==expected)fail('COMMITTED_BLOB_CHANGED');
 }
 if(cohort.frozenHunter.commitSha!==ENGINE||cohort.frozenHunter.moduleBlobSha!==BLOB||
  cohort.selectedCohorts.length!==2||cohort.originalFilesSelected!==13||
  cohort.admission.fullPredictionSealSha256!==PRIOR||
  cohort.selectedCohorts[0].source.repository!=='runetopic/cryptography'||
  cohort.selectedCohorts[1].source.repository!=='SebastianAigner/dhash-kotlin'||
  JSON.stringify(plan.selectedOriginals.map(x=>x.sourceCommit))!==
  JSON.stringify(cohort.selectedCohorts.map(x=>x.source.commitSha)))fail('ORIGINAL_COHORT_CHANGED');
 if(!Array.isArray(plan.contracts)||plan.contracts.length!==4||
  plan.contracts.filter(x=>x.defectEligible).length!==1||
  plan.contracts[0].reference!=='java.lang.Long.bitCount(left xor right)')
  fail('ORACLE_RULE_CHANGED');
 return Object.freeze({
  frozenEngineCommit:ENGINE,selectedOriginalFiles:13,
  predictionSealSha256:PRIOR,oracleSourceBlobSha:plan.oracle.blobSha,
  allPredictionsSealedBeforeOracle:true,oracleExecuted:false,plan,cohort
 });
}

function verifyPredictionSeal(manifest,files){
 const commitment=verifyV11OracleCommitment(),{cohort}=commitment;
 if(!manifest||manifest.schema!=='ultra-sentinel-v11-full-predictions-first/v1'||
  manifest.frozenEngineCommit!==ENGINE||manifest.poolSha256!==POOL||
  manifest.allPredictionsSealedBeforeSelection!==true||
  manifest.oracleExecuted!==false||manifest.hunterRetuned!==false||
  manifest.originalRepositories!==9)fail('MANIFEST');
 if(!Array.isArray(manifest.reportFiles)||manifest.reportFiles.length<2||
  manifest.reportFiles.length>72)fail('REPORTS');
 const ids=new Set(),hypotheses=[],observed={1:{methods:0,triples:0,invocations:0,reports:[]},
 2:{methods:0,triples:0,invocations:0,reports:[]}};
 for(const r of manifest.reportFiles){
  if(!Number.isSafeInteger(r.rank)||
   !/^candidate-[0-9]{1,3}\/scope-[0-5]\/discovery\.json$/.test(r.path)||
   r.path!==('candidate-'+r.rank+'/scope-'+r.path.match(/scope-([0-5])/)[1]+'/discovery.json')||
   !HASH.test(r.reportSha256)||!HASH.test(r.jarSha256)||
   ids.has(r.path))fail('REPORT_METADATA');
  ids.add(r.path);
  const raw=files[r.path];
  if(!Buffer.isBuffer(raw)||raw.length>262144||hash(raw)!==r.reportSha256)
   fail('REPORT_SHA_MISMATCH');
  let parsed;try{parsed=JSON.parse(raw);}catch{fail('REPORT_PARSE');}
  if(parsed.schema!=='ultra-sentinel-generic-jvm-metamorphic/v1'||
   parsed.artifactSha256!==r.jarSha256||
   parsed.oracleVerified!==false||parsed.novelFamilyVerified!==false||
   parsed.repairAuthorized!==false||parsed.sourceAuthenticated!==false||
   parsed.remoteWrites!==false||parsed.mergeAllowed!==false||
   !Array.isArray(parsed.findings)||parsed.findings.length>256||
   !['methodsProbed','completedTriples','successfulInvocations'].every(k=>
     Number.isSafeInteger(parsed[k])&&parsed[k]>=0))fail('REPORT_CONTENTS');
  const selected=cohort.selectedCohorts.find(c=>c.rank===r.rank);
  if(!selected)continue;
  const id=selected.id; observed[id].methods+=parsed.methodsProbed;
  observed[id].triples+=parsed.completedTriples;
  observed[id].invocations+=parsed.successfulInvocations;
  observed[id].reports.push(r);
  for(const finding of parsed.findings)hypotheses.push({...finding,cohortId:id});
 }
 for(const c of cohort.selectedCohorts){
  const counts=observed[c.id];
  if(!counts.reports.length||counts.methods!==c.effectiveMethodsProbed||
   counts.triples!==c.completedTriples||counts.invocations!==c.successfulInvocations||
   hash(Buffer.from(JSON.stringify(counts.reports)))!==c.originalReportReferenceSha256)
    fail('SELECTED_REPORTS_INCOMPLETE');
 }
 return Object.freeze({
  schema:'ultra-sentinel-v11-verified-frozen-predictions/v1',
  frozenEngineCommit:ENGINE,fullPredictionSealSha256:PRIOR,
  hypotheses,originalReportCount:manifest.reportFiles.length,
  allSelectedReportsAuthenticated:true,predictionsSealedBeforeOracle:true,
  oracleExecuted:false
 });
}
function findingArgs(f,i){
 if(!Array.isArray(f.inputs)||f.inputs.length!==3||!Number.isInteger(f.argument)||
  f.argument<0||f.argument>2||![1,100].includes(f.otherArguments)||
  typeof f.method!=='string'||!f.method.includes('(')||!f.method.includes(')'))
  return null;
 const parts=f.method.slice(f.method.indexOf('(')+1,f.method.lastIndexOf(')'))
  .split(';').filter(Boolean);
 if(parts.length<1||parts.length>3||f.argument>=parts.length)return null;
 if(parts.some(x=>!['byte','short','int','long','float','double'].includes(x)))return null;
 return parts.map((p,j)=>j===f.argument?String(f.inputs[i]):String(f.otherArguments));
}
function numeric(value){
 if(typeof value!=='string'&&typeof value!=='number')return null;
 if(typeof value==='number'&&!Number.isFinite(value))return null;
 if(!/^-?(?:\d+(?:\.\d+)?(?:[Ee][+-]?\d+)?)$/.test(String(value)))return null;
 return Number(value);
}
function agrees(a,b,tol){
 if(tol===0&&/^-?\d+$/.test(String(a))&&/^-?\d+$/.test(String(b)))
  return BigInt(String(a))===BigInt(String(b));
 const x=numeric(a),y=numeric(b);
 return x!==null&&y!==null&&Number.isFinite(x)&&Number.isFinite(y)&&
  Number.isFinite(tol)&&tol>=0&&Math.abs(x-y)<=tol;
}
function adjudicateV11(seal,truth){
 if(!seal||seal.schema!=='ultra-sentinel-v11-verified-frozen-predictions/v1'||
  seal.frozenEngineCommit!==ENGINE||seal.fullPredictionSealSha256!==PRIOR||
  seal.allSelectedReportsAuthenticated!==true||seal.predictionsSealedBeforeOracle!==true||
  seal.oracleExecuted!==false||!Array.isArray(seal.hypotheses))fail('SEAL');
 if(!truth||truth.schema!=='ultra-sentinel-v11-independent-original-truth/v1'||
  truth.predictionSealSha256!==PRIOR||truth.oracleExecuted!==true||
  truth.oracleSourceAuthenticated!==true||truth.wholeCohortTruth!==false||
  !Array.isArray(truth.observations)||truth.observations.length>4096||
  !Array.isArray(truth.abstentions))fail('TRUTH');
 const details=[],confirmed=new Set();
 let falsePositiveHypotheses=0,unadjudicatedHypotheses=0;
 for(const f of seal.hypotheses){
  const key=[f.cohortId,f.class,f.method].join('::');
  const witnesses=[];
  for(let i=0;i<3;i++){
   const args=findingArgs(f,i);if(!args)break;
   const match=truth.observations.find(o=>o.cohortId===f.cohortId&&
    o.class===f.class&&o.method===f.method&&o.defectEligible===true&&
    Array.isArray(o.arguments)&&JSON.stringify(o.arguments)===JSON.stringify(args)&&
    agrees(o.actual,f.observed?.[i],0));
   if(match)witnesses.push(match);
  }
  // Invalid or nonfinite independent references and negative/non-numeric
  // tolerances are abstentions, NEVER evidence of a new original defect.
  const invalidReference=witnesses.some(o=>
   numeric(o.expected)===null||numeric(o.tolerance)===null||
   Number(o.tolerance)<0);
  if(witnesses.length!==3||invalidReference){
   unadjudicatedHypotheses++;
   details.push({outcome:'INCOMPLETE_INDEPENDENT_WITNESS',cohortId:f.cohortId,
    class:f.class,method:f.method,matched:witnesses.length});continue;
  }
  const discrepancies=witnesses.filter(o=>!agrees(o.actual,o.expected,Number(o.tolerance)));
  if(discrepancies.length){
   confirmed.add(key);
   details.push({outcome:'CONFIRMED_SCOPED_ORIGINAL_DISCREPANCY',cohortId:f.cohortId,
    class:f.class,method:f.method,discrepancies:discrepancies.length});
  }else{
   falsePositiveHypotheses++;
   details.push({outcome:'SCOPED_FALSE_POSITIVE',cohortId:f.cohortId,
    class:f.class,method:f.method});
  }
 }
 return Object.freeze({schema:'ultra-sentinel-v11-independent-original-adjudication/v1',
  originalHypotheses:seal.hypotheses.length,
  confirmedOriginalDefects:confirmed.size,falsePositiveHypotheses,
  unadjudicatedHypotheses,independentOracleUsed:true,wholeCohortTruth:false,
  originalSecondDefectVerified:confirmed.size>0,engineRetuned:false,
  block26Closed:false,block27Allowed:false,details});
}
module.exports=Object.freeze({verifyV11OracleCommitment,verifyPredictionSeal,adjudicateV11});
