#!/usr/bin/env node
'use strict';
// Trusted host orchestrator for the prospectively fixed v8 original cohort.
// Strict stage separation: compile-only oracle -> frozen Hunter -> independent
// oracle after a SHA-256 prediction seal. No stage can change historical data.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),
 child=require('node:child_process');
const {prepareCohort}=require('./phase2-block26-object-eval.cjs');
const {verifyOracleCommitment,adjudicateAfterPredictionSeal}=
 require('./phase2-block26-v8-judge.cjs');
const root=path.resolve(__dirname,'..');
const file=p=>fs.readFileSync(p),sha=p=>crypto.createHash('sha256').update(file(p)).digest('hex');
const gitBlob=b=>crypto.createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const check=(condition,code)=>{if(!condition)throw Error('V8_ORIGINAL_'+code);};
const load=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const make=p=>fs.mkdirSync(p,{recursive:false,mode:0o700});
const write=(p,x)=>fs.writeFileSync(p,JSON.stringify(x,null,2)+'\n',{flag:'wx',mode:0o600});
const command=(app,args,timeout=180000)=>{
 const r=child.spawnSync(app,args,{encoding:'utf8',timeout,maxBuffer:8*1024*1024,
  env:{PATH:process.env.PATH||'/usr/bin:/bin',HOME:process.env.HOME||'/tmp',
   LANG:'C.UTF-8',GIT_NO_REPLACE_OBJECTS:'1',GIT_CONFIG_NOSYSTEM:'1',
   GIT_CONFIG_GLOBAL:'/dev/null',GIT_OPTIONAL_LOCKS:'0',
   JAVA_HOME:process.env.JAVA_HOME||''}});
 return r;
};
function success(r,why){
 if(r.error||r.status!==0)throw Error('V8_ORIGINAL_'+why+':'+(r.error?.code||r.status)+
  ':'+String(r.stderr||'').slice(0,300));
 return r.stdout;
}
function git(dir,args){
 return success(command('git',['-C',dir,'-c','core.hooksPath=/dev/null',...args],15000),
  'GIT_INTEGRITY').trim();
}
function provenance(engine,source){
 check(git(engine,['status','--porcelain'])==='', 'ENGINE_DIRTY');
 check(git(engine,['rev-parse','HEAD'])==='689583c23277807345edb715d8c2d277a3d4bda7','ENGINE_WRONG_SHA');
 check(git(source,['status','--porcelain'])==='', 'SOURCE_DIRTY');
}
function manifest(){
 const cohort=load(path.join(root,'docs/quality/PHASE2-BLOCK26-V8-COHORT.json'));
 const p=load(path.join(root,'docs/quality/PHASE2-BLOCK26-V8-ORACLE-COMMITMENT.json'));
 verifyOracleCommitment(p,cohort,root);
 return {cohort,p};
}
function ensureInputs(engine,sources,work,c,withOracle,oracleFile){
 const source=path.join(sources,'source-'+c.id);
 provenance(engine,source);
 const eng={commitSha:'689583c23277807345edb715d8c2d277a3d4bda7',
  treeSha:git(engine,['rev-parse','HEAD^{tree}'])};
 const base=path.join(work,'cohort-'+c.id),input=path.join(base,'input'),
  compiled=path.join(base,'compiled');
 make(base);make(compiled);
 prepareCohort(engine,source,input,{engine:eng,source:c.source},{extendedKotlinPaths:true});
 if(withOracle){
  const oracleDir=path.join(input,'oracle');make(oracleDir);
  fs.copyFileSync(oracleFile,path.join(oracleDir,'IndependentArithmeticOracle.kt'),
   fs.constants.COPYFILE_EXCL);
 }
 return {base,input,compiled};
}
function compile(engine,kotlin,input,compiled){
 return command('bash',[path.join(engine,
  'tests/fixtures/phase2-block26-object-contracts/run-isolated.sh'),
  'compile-v2',kotlin,input,compiled],180000);
}
function setup(a){
 check(a.length===5,'ARGUMENTS');
 const [engine,sources,kotlin,work,out]=a;
 for(const p of [engine,sources,kotlin])check(fs.lstatSync(p).isDirectory()&&!fs.lstatSync(p).isSymbolicLink(),'DIR');
 make(work);make(out);
 check(!process.env.GH_TOKEN&&!process.env.GITHUB_TOKEN,'NO_GITHUB_CREDENTIALS_ALLOWED');
 return {engine,sources,kotlin,work,out};
}
function preflight(a){
 const {engine,sources,kotlin,work,out}=setup(a);
 const {cohort,p}=manifest();
 const compiled=[];
 for(const c of cohort.selectedCohorts){
  const {input,compiled:dest}=ensureInputs(engine,sources,work,c,true,path.join(root,p.oracle.path));
  const r=compile(engine,kotlin,input,dest);
  success(r,'ORACLE_PRECOMMIT_COMPILATION');
  check(fs.existsSync(path.join(dest,'target.jar')),'ORACLE_JAR_MISSING');
  compiled.push({cohortId:c.id,sourceSha:c.source.commitSha,
   oracleCompiled:true,targetMethodsInvoked:false,oracleExecuted:false});
 }
 write(path.join(out,'oracle-compile-only.json'),{
  schema:'ultra-sentinel-v8-oracle-preflight/v1',
  frozenEngine:cohort.frozenHunter.commitSha,originalCohortsCompiled:compiled,
  sourceBodyUsedToAuthorHunter:false,oracleExecuted:false,hunterExecuted:false});
 console.log('V8_INDEPENDENT_ORACLES_COMPILED_BEFORE_HUNTER='+compiled.length);
}
function capture(a){
 const {engine,sources,kotlin,work,out}=setup(a);
 // Do not read, stage or mount the independent oracle source or commitment here.
 const cohort=load(path.join(root,'docs/quality/PHASE2-BLOCK26-V8-COHORT.json'));
 check(cohort.schema==='ultra-sentinel-block26-v8-structural-admitted-cohort/v1'&&
  cohort.frozenHunter.commitSha==='689583c23277807345edb715d8c2d277a3d4bda7'&&
  cohort.originalFilesSelected===13&&cohort.selectedCohorts.length===2,
  'UNVERIFIED_FROZEN_COHORT');
 const probeDir=path.join(work,'probe');make(probeDir);
 const source=path.join(engine,'packages/family-hunter/v7/GenericJvmMetamorphicProbe.java');
 const bytes=file(source);
 check(gitBlob(bytes)===cohort.frozenHunter.moduleBlobSha,'HUNTER_V7_CHANGED');
 success(command('javac',['-d',probeDir,source],30000),'HUNTER_COMPILATION');
 const scopes=['com.elevenetc.utils.kotlin.math','com.github.kory33.bigmath.integer'];
 const reports=[],hypotheses=[],abstentions=[];
 for(const [i,c] of cohort.selectedCohorts.entries()){
  const {input,compiled}=ensureInputs(engine,sources,work,c,false,null);
  const build=compile(engine,kotlin,input,compiled);
  if(build.error||build.status!==0){
   abstentions.push({cohortId:c.id,reason:'ORIGINAL_COMPILATION_FAILED'});
   continue;
  }
  const jar=path.join(compiled,'target.jar');
  const output=path.join(out,'cohort-'+c.id);make(output);
  const run=command('bash',[path.join(engine,
   'tests/fixtures/jvm-metamorphic/run-probe-v2.sh'),jar,probeDir,scopes[i],output],75000);
  if(run.error||run.status!==0){
   abstentions.push({cohortId:c.id,reason:'FROZEN_PROBE_EXECUTION_ABSTENTION'});
   continue;
  }
  const reportFile=path.join(output,'discovery.json'),original=load(reportFile);
  check(original.schema==='ultra-sentinel-generic-jvm-metamorphic/v1'&&
   original.artifactSha256===sha(jar)&&
   original.oracleVerified===false&&original.novelFamilyVerified===false&&
   original.repairAuthorized===false&&Array.isArray(original.findings)&&
   original.findings.length<=256,'INVALID_FROZEN_HUNTER_REPORT');
  reports.push({cohortId:c.id,scope:scopes[i],artifactSha256:sha(jar),
   reportSha256:sha(reportFile),path:'cohort-'+c.id+'/discovery.json',
   methodsProbed:original.methodsProbed,completedTriples:original.completedTriples,
   hypotheses:original.findings.length});
  for(const h of original.findings)hypotheses.push({...h,cohortId:c.id});
 }
 const seal={schema:'ultra-sentinel-v8-prediction-seal/v1',
  engineSha:cohort.frozenHunter.commitSha,
  engineBlobSha:cohort.frozenHunter.moduleBlobSha,
  cohortBlobSha:gitBlob(file(path.join(root,'docs/quality/PHASE2-BLOCK26-V8-COHORT.json'))),
  reports,hypotheses,abstentions,
  predictionsSealedBeforeOracle:true,oracleExecuted:false,
  engineRetuned:false,block26Closed:false,block27Allowed:false};
 write(path.join(out,'prediction-seal.json'),seal);
 console.log('V8_FROZEN_HUNTER_REPORTS='+reports.length);
 console.log('V8_FROZEN_HUNTER_HYPOTHESES='+hypotheses.length);
 console.log('V8_FROZEN_HUNTER_ABSTENTIONS='+abstentions.length);
 console.log('V8_PREDICTION_SEAL_SHA256='+sha(path.join(out,'prediction-seal.json')));
}
function verifySealedPrediction(predictions,cohort){
 const p=path.join(predictions,'prediction-seal.json');
 const seal=load(p);
 check(seal.schema==='ultra-sentinel-v8-prediction-seal/v1'&&
  seal.engineSha===cohort.frozenHunter.commitSha&&
  seal.engineBlobSha===cohort.frozenHunter.moduleBlobSha&&
  seal.cohortBlobSha===gitBlob(file(path.join(root,'docs/quality/PHASE2-BLOCK26-V8-COHORT.json')))&&
  seal.predictionsSealedBeforeOracle===true&&seal.oracleExecuted===false&&
  seal.engineRetuned===false&&Array.isArray(seal.hypotheses)&&
  Array.isArray(seal.reports)&&Array.isArray(seal.abstentions)&&
  seal.reports.length+seal.abstentions.length===cohort.selectedCohorts.length,
  'PREDICTION_SEAL_INVALID');
 const found=[];
 for(const r of seal.reports){
  check(Number.isInteger(r.cohortId)&&r.cohortId>=1&&r.cohortId<=2&&
   r.path==='cohort-'+r.cohortId+'/discovery.json'&&
   /^[a-f0-9]{64}$/.test(r.reportSha256),'UNSAFE_PREDICTION_PATH');
  check(!found.includes(r.cohortId),'DUPLICATE_PREDICTIONS');
  found.push(r.cohortId);
  const filePath=path.resolve(predictions,r.path);
  check(filePath.startsWith(path.resolve(predictions)+path.sep)&&
   sha(filePath)===r.reportSha256,'PREDICTION_CHANGED');
  const raw=load(filePath);
  check(raw.schema==='ultra-sentinel-generic-jvm-metamorphic/v1'&&
   raw.artifactSha256===r.artifactSha256&&
   JSON.stringify(raw.findings.map(f=>({...f,cohortId:r.cohortId})))===
   JSON.stringify(seal.hypotheses.filter(h=>h.cohortId===r.cohortId)),
   'PREDICTION_CONTENTS_CHANGED');
 }
 return {seal,predictionSealSha256:sha(p)};
}
function independent(a){
 check(a.length===6,'ORACLE_ARGUMENTS');
 const predictions=a[5],{engine,sources,kotlin,work,out}=setup(a.slice(0,5));
 const {cohort,p}=manifest();
 const {seal,predictionSealSha256}=verifySealedPrediction(predictions,cohort);
 const observations=[],abstentions=[];
 for(const c of cohort.selectedCohorts){
  const {input,compiled}=ensureInputs(engine,sources,work,c,true,path.join(root,p.oracle.path));
  const build=compile(engine,kotlin,input,compiled);
  if(build.error||build.status!==0){
   abstentions.push({cohortId:c.id,reason:'ORACLE_COMPILATION_ABSTENTION'});
   continue;
  }
  const output=path.join(out,'cohort-'+c.id);make(output);
  const run=command('bash',[path.join(engine,
   'tests/fixtures/phase2-block26-object-contracts/run-isolated.sh'),
   'oracle',kotlin,compiled,output],180000);
  if(run.error||run.status!==0){
   abstentions.push({cohortId:c.id,reason:'ORACLE_EXECUTION_ABSTENTION'});
   continue;
  }
  const raw=load(path.join(output,'execution.log'));
  check(raw.schema==='ultra-sentinel-v8-independent-oracle/v1'&&
   raw.oracleExecuted===true&&raw.wholeCohortTruth===false&&
   Array.isArray(raw.observations)&&raw.observations.length<=10000,
   'ORACLE_OUTPUT_UNTRUSTED');
  for(const row of raw.observations){
   const contract=p.methodContracts.find(x=>x.cohortId===c.id&&
    x.class===row.class&&x.method===row.method);
   check(contract&&contract.defectEligible===row.defectEligible&&
    Number(row.tolerance)===contract.absTolerance&&
    Array.isArray(row.arguments)&&row.arguments.length<=3&&
    typeof row.actual==='string'&&typeof row.expected==='string',
    'ORACLE_CONTRACT_CHANGED');
   observations.push({...row,cohortId:c.id});
  }
 }
 const truth={schema:'ultra-sentinel-v8-independent-oracle/v1',
  engineSha:cohort.frozenHunter.commitSha,
  predictionSealSha256,oracleSourceBlobSha:p.oracle.blobSha,
  oracleExecuted:true,originalCohorts:cohort.selectedCohorts.length,
  observations,abstentions,wholeCohortTruth:false};
 write(path.join(out,'independent-truth.json'),truth);
 const verdict=adjudicateAfterPredictionSeal(seal,truth);
 write(path.join(out,'independent-verdict.json'),{
  ...verdict,predictionSealSha256,oracleSourceBlobSha:p.oracle.blobSha,
  originalSourceBlobs:cohort.selectedCohorts.flatMap(c=>c.source.files.map(f=>f.blobSha)),
  originalCohorts:cohort.selectedCohorts.length,
  oracleAbstentions:abstentions});
 console.log('V8_INDEPENDENT_TRUTH_ROWS='+observations.length);
 console.log('V8_INDEPENDENT_ORACLE_ABSTENTIONS='+abstentions.length);
 console.log('V8_ORIGINAL_CONFIRMED_DEFECTS='+verdict.confirmedOriginalDefects);
 console.log('V8_ORIGINAL_FALSE_POSITIVES='+verdict.falsePositiveHypotheses);
 console.log('V8_ORIGINAL_UNADJUDICATED='+verdict.unadjudicatedHypotheses);
 console.log('V8_INDEPENDENT_VERDICT_SHA256='+sha(path.join(out,'independent-verdict.json')));
}
if(require.main===module){
 try{
  const [action,...args]=process.argv.slice(2);
  if(action==='preflight')preflight(args);
  else if(action==='capture')capture(args);
  else if(action==='independent')independent(args);
  else check(false,'UNKNOWN_STAGE');
 }catch(e){console.error(e.message);process.exitCode=1;}
}
module.exports=Object.freeze({preflight,capture,independent,verifySealedPrediction});
