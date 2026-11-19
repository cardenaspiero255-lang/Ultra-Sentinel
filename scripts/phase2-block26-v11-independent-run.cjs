#!/usr/bin/env node
'use strict';
// Host-only post-seal adjudication. Execute precommitted independent oracle
// AFTER verifying the immutable original Hunter artifact, isolated via the
// already deployed Bubblewrap/AppArmor/cgroup runner. No Hunter rerun.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const {prepareCohort}=require('./phase2-block26-object-eval.cjs');
const {verifyV11OracleCommitment,verifyPredictionSeal,adjudicateV11}=
 require('./phase2-block26-v11-independent-judge.cjs');
const ROOT=path.resolve(__dirname,'..'),ENGINE='689583c23277807345edb715d8c2d277a3d4bda7';
const fail=m=>{throw Error('V11_ORIGINAL_INDEPENDENT_'+m);};
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const read=p=>{const s=fs.lstatSync(p);if(!s.isFile()||s.isSymbolicLink()||s.size>262144)fail('UNSAFE_FILE');return fs.readFileSync(p);};
const write=(p,x)=>fs.writeFileSync(p,JSON.stringify(x,null,2)+'\n',{flag:'wx',mode:0o600});
const env={PATH:process.env.PATH||'/usr/bin:/bin',HOME:process.env.HOME||'/tmp',
 LANG:'C.UTF-8',LC_ALL:'C.UTF-8',GIT_NO_REPLACE_OBJECTS:'1',
 GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_NOSYSTEM:'1',GIT_TERMINAL_PROMPT:'0',
 GIT_OPTIONAL_LOCKS:'0'};
function command(app,args,timeout=180000){
 return cp.spawnSync(app,args,{encoding:'utf8',timeout,maxBuffer:4*1024*1024,env});
}
function git(dir,args){
 const r=command('git',['-C',dir,'-c','core.hooksPath=/dev/null',...args],15000);
 if(r.error||r.status!==0)fail('GIT_AUTHENTICATION');
 return r.stdout.trim();
}
const okay=r=>r.status===0&&!r.error;
function authenticateArtifact(predictions){
 const commit=verifyV11OracleCommitment();
 const sealFile=path.join(predictions,'full-prediction-seal.json');
 if(hash(read(sealFile))!==commit.predictionSealSha256)fail('PREDICTION_SEAL_CHANGED');
 const manifest=JSON.parse(read(sealFile));
 if(!Array.isArray(manifest.reportFiles)||manifest.reportFiles.length>72)fail('REPORT_INDEX');
 const files=Object.create(null);
 for(const r of manifest.reportFiles){
  if(!/^candidate-[0-9]{1,3}\/scope-[0-5]\/discovery\.json$/.test(r.path))
   fail('UNSAFE_REPORT_PATH');
  const file=path.resolve(predictions,r.path);
  if(!file.startsWith(path.resolve(predictions)+path.sep))fail('PATH_ESCAPE');
  files[r.path]=read(file);
 }
 return {sealed:verifyPredictionSeal(manifest,files),commit};
}
function truthValid(row,id){
 if(!row||typeof row.class!=='string'||typeof row.method!=='string'||
  !Array.isArray(row.arguments)||row.arguments.length<1||row.arguments.length>3||
  !row.arguments.every(x=>typeof x==='string'&&x.length<=64)||
  !/^-?\d+$/.test(row.actual)||!/^-?\d+$/.test(row.expected)||
  row.tolerance!=='0'||typeof row.contract!=='string'||row.contract.length>128||
  typeof row.defectEligible!=='boolean')fail('UNTRUSTED_ORACLE_ROW');
 if(row.defectEligible){
  if(id!==2||row.class!=='DHash'||row.contract!=='xor64-popcount'||
   !/^distanceTo-[A-Za-z0-9]+\(long;long;\)int$/.test(row.method)||
   row.arguments.length!==2||!row.arguments.every(x=>/^-?\d+$/.test(x)))
   fail('UNAUTHORIZED_DEFECT_CONTRACT');
 }else{
  const allowed=id===2&&row.class==='DHash'&&
   /^(?:hashCode-impl\(long;\)int|constructor-impl\(long;\)long)$/.test(row.method);
  const internal=id===1&&
   (row.class==='com.runetopic.cryptography.CryptoExtensions'||
    row.class==='com.runetopic.cryptography.whirlpool.Whirlpool');
  if(!allowed&&!internal)fail('UNCOMMITTED_ORACLE_CONTRACT');
 }
 return {...row,cohortId:id};
}
function main(argv){
 if(argv.length!==6||process.env.GH_TOKEN||process.env.GITHUB_TOKEN)fail('ARGUMENTS_OR_TOKEN');
 const [engine,originals,kotlin,work,out,predictions]=argv;
 const {sealed,commit}=authenticateArtifact(predictions);
 if(git(engine,['rev-parse','HEAD'])!==ENGINE||
  git(engine,['status','--porcelain']))fail('ENGINE_MOVED');
 for(const dir of [engine,originals,kotlin,predictions])
  if(!fs.lstatSync(dir).isDirectory()||fs.lstatSync(dir).isSymbolicLink())fail('DIRECTORY');
 fs.mkdirSync(work,{recursive:false,mode:0o700});
 fs.mkdirSync(out,{recursive:false,mode:0o700});
 const cohorts=commit.cohort.selectedCohorts,oracle=path.join(ROOT,commit.plan.oracle.path);
 const observations=[],abstentions=[];
 const tree=git(engine,['rev-parse','HEAD^{tree}']);
 for(const c of cohorts){
  const original=path.join(originals,'source-'+c.id);
  if(git(original,['rev-parse','HEAD'])!==c.source.commitSha||
   git(original,['rev-parse','HEAD^{tree}'])!==c.source.treeSha||
   git(original,['status','--porcelain']))fail('SOURCE_DRIFT');
  const dir=path.join(work,'cohort-'+c.id),input=path.join(dir,'input'),
   compiled=path.join(dir,'compiled'),output=path.join(dir,'oracle-output');
  fs.mkdirSync(dir);fs.mkdirSync(compiled);
  prepareCohort(engine,original,input,{
   engine:{commitSha:ENGINE,treeSha:tree},source:c.source
  },{extendedKotlinPaths:true});
  fs.mkdirSync(path.join(input,'oracle'));
  fs.copyFileSync(oracle,path.join(input,'oracle','IndependentArithmeticOracle.kt'),fs.constants.COPYFILE_EXCL);
  const runner=path.join(engine,'tests/fixtures/phase2-block26-object-contracts/run-isolated.sh');
  const build=command('bash',[runner,'compile-v2',kotlin,input,compiled],180000);
  if(!okay(build)){
   abstentions.push({cohortId:c.id,reason:'INDEPENDENT_ORACLE_COMPILE_FAILED'});
   continue;
  }
  fs.mkdirSync(output);
  const run=command('bash',[runner,'oracle',kotlin,compiled,output],180000);
  if(!okay(run)){
   abstentions.push({cohortId:c.id,reason:'INDEPENDENT_ORACLE_EXECUTION_FAILED'});
   continue;
  }
  const observed=JSON.parse(read(path.join(output,'execution.log')));
  if(observed.schema!=='ultra-sentinel-v11-independent-oracle-execution/v1'||
   observed.oracleExecuted!==true||observed.wholeCohortTruth!==false||
   !Array.isArray(observed.observations)||observed.observations.length>4096)
   fail('ORACLE_INVALID');
  for(const row of observed.observations)observations.push(truthValid(row,c.id));
  if(!observed.observations.length)abstentions.push({cohortId:c.id,reason:'NO_REFERENCED_METHODS'});
 }
 const truth={schema:'ultra-sentinel-v11-independent-original-truth/v1',
  predictionSealSha256:commit.predictionSealSha256,
  oracleSourceBlobSha:commit.oracleSourceBlobSha,oracleExecuted:true,
  oracleSourceAuthenticated:true,wholeCohortTruth:false,
  admittedOriginalRepositories:cohorts.length,originalKotlinFiles:13,
  observations,abstentions};
 write(path.join(out,'independent-truth.json'),truth);
 const verdict=adjudicateV11(sealed,truth);
 write(path.join(out,'independent-verdict.json'),{
  ...verdict,originalSources:cohorts.map(c=>({repository:c.source.repository,sha:c.source.commitSha})),
  oracleSourceBlobSha:commit.oracleSourceBlobSha,oracleAbstentions:abstentions,
  originalPredictionManifestSha256:commit.predictionSealSha256,
  originalHunterRunId:44317152922});
 console.log('V11_INDEPENDENT_ORACLE_OBSERVATIONS='+observations.length);
 console.log('V11_INDEPENDENT_ORACLE_ABSTENTIONS='+abstentions.length);
 console.log('V11_ORIGINAL_HYPOTHESES='+verdict.originalHypotheses);
 console.log('V11_ORIGINAL_CONFIRMED_DEFECTS='+verdict.confirmedOriginalDefects);
 console.log('V11_ORIGINAL_FALSE_POSITIVES='+verdict.falsePositiveHypotheses);
 console.log('V11_ORIGINAL_UNADJUDICATED='+verdict.unadjudicatedHypotheses);
 console.log('V11_TRUTH_SHA256='+hash(read(path.join(out,'independent-truth.json'))));
 console.log('V11_VERDICT_SHA256='+hash(read(path.join(out,'independent-verdict.json'))));
}
if(require.main===module)try{main(process.argv.slice(2));}catch(e){console.error(e.message);process.exitCode=1;}
module.exports=Object.freeze({truthValid,authenticateArtifact});
