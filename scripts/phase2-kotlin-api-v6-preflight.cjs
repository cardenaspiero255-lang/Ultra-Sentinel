#!/usr/bin/env node
'use strict';
// Compile original sources in the existing frozen sandbox. javap reads declarations,
// descriptors and generic types only; it never initializes classes or runs methods.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const {prepareCohort}=require('./phase2-block26-object-eval.cjs');
const {parseJavap,classify}=require('../packages/quality-gates/jvm-abi-admission.cjs');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const command=(exe,args,timeout=150000)=>cp.spawnSync(exe,args,{encoding:'utf8',timeout,maxBuffer:8*1024*1024});
const success=r=>!r.error&&r.status===0;
function inspectJar(jar){
 const stat=fs.lstatSync(jar);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>32*1024*1024)throw Error('V6_ABI_JAR_REFUSED');
 const abstentions=[];
 const listing=command('jar',['tf',jar],15000);if(!success(listing))throw Error('V6_ABI_JAR_INDEX_FAILED');
 const names=listing.stdout.split('\n').filter(n=>n.endsWith('.class')&&
  !/^(kotlin\/|org\/jetbrains\/|org\/intellij\/|META-INF\/)/.test(n)).map(n=>n.slice(0,-6).replaceAll('/','.')).sort();
 if(names.length>256||new Set(names).size!==names.length)throw Error('V6_ABI_CLASS_BUDGET');
 const classes=[];
 for(const name of names){
  if(name.length>500||!/^[\p{ID_Start}_$][\p{ID_Continue}$]*(?:\.[\p{ID_Start}_$][\p{ID_Continue}$]*)*$/u.test(name)){
   abstentions.push({className:name,reason:'ABI_UNSUPPORTED'});continue;
  }
  const metadata=command('javap',['-public','-s','-classpath',jar,name],15000);
  if(!success(metadata)){abstentions.push({className:name,reason:'ABI_METADATA_UNAVAILABLE'});continue;}
  try{classes.push(parseJavap(metadata.stdout,name));}
  catch{abstentions.push({className:name,reason:'ABI_UNSUPPORTED'});}
 }
 const callables=classify(classes);
 if(!callables.some(x=>x.reason==='ADMISSIBLE_ABI_CANDIDATE'))abstentions.push({reason:'NO_SUPPORTED_CALLABLE'});
 return {callables,abstentions};
}
function main(){
 if(process.argv[2]==='inspect'&&process.argv.length===5){
  fs.writeFileSync(process.argv[4],JSON.stringify(inspectJar(process.argv[3]),null,2)+'\n',{flag:'wx',mode:0o600});return;
 }
const [reservationFile,engine,sources,kotlin,work,out]=process.argv.slice(2);
if(process.argv.length!==8)throw Error('V6_ABI_ARGUMENTS');
const reservation=JSON.parse(fs.readFileSync(reservationFile));
const manifest={engine:reservation.frozenEngine,cohorts:reservation.cohorts,oracles:[],block27Allowed:false};
const write=(name,data)=>fs.writeFileSync(path.join(out,name),JSON.stringify(data,null,2)+'\n',{flag:'wx',mode:0o600});
if(reservation.schema!=='ultra-sentinel-block26-v6-metadata-reservation/v1'||manifest.cohorts.length!==6)
 throw Error('V6_ABI_RESERVATION_REFUSED');
for(const module of manifest.engine.modules){
 const bytes=fs.readFileSync(path.join(engine,module.path));
 const sha=crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
 if(sha!==module.blobSha)throw Error('V6_FROZEN_ENGINE_CHANGED');
}
fs.mkdirSync(work,{mode:0o700});fs.mkdirSync(out,{mode:0o700});
const cohorts=[];
for(const c of manifest.cohorts){
 const base=path.join(work,'cohort-'+c.id),input=path.join(base,'input'),compiled=path.join(base,'compiled');
 fs.mkdirSync(base);fs.mkdirSync(compiled);
 prepareCohort(engine,path.join(sources,'source-'+c.id),input,{engine:manifest.engine,source:c.source},{extendedKotlinPaths:true});
 const result={cohortId:c.id,sourceSha:c.source.commitSha,sourceTreeSha:c.source.treeSha,
  originalBlobs:c.source.files.map(f=>f.blobSha),originalFiles:c.source.files.length,
  compilationSucceeded:false,callables:[],abstentions:[]};
 const build=command('bash',[path.join(engine,'tests/fixtures/phase2-block26-object-contracts/run-isolated.sh'),
  'compile-v2',kotlin,input,compiled]);
 for(const file of ['diagnostics.log','execution.log']){
  const source=path.join(compiled,file);
  if(fs.existsSync(source))fs.copyFileSync(source,path.join(out,'compile-'+c.id+'-'+file));
 }
 if(!success(build)){
  const diagnostics=fs.existsSync(path.join(compiled,'diagnostics.log'))?fs.readFileSync(path.join(compiled,'diagnostics.log'),'utf8'):'';
  result.abstentions.push({reason:/unresolved reference|cannot access class|unresolved supertypes/i.test(diagnostics)?
   'DEPENDENCY_UNRESOLVED':build.error?'ENVIRONMENT_BLOCKED':'COMPILATION_OR_ABI_UNSUPPORTED',exitStatus:build.status});
  cohorts.push(result);continue;
 }
 result.compilationSucceeded=true;
 const jar=path.join(compiled,'target.jar');result.artifactSha256=hash(fs.readFileSync(jar));
 const abi=inspectJar(jar);result.callables=abi.callables;result.abstentions.push(...abi.abstentions);
 cohorts.push(result);
}
const candidates=cohorts.flatMap(c=>c.callables.filter(m=>m.reason==='ADMISSIBLE_ABI_CANDIDATE'));
const candidateCohorts=cohorts.filter(c=>c.callables.some(m=>m.reason==='ADMISSIBLE_ABI_CANDIDATE')).length;
// These thresholds are committed before the reserved originals are compiled or inspected.
const threshold={minimumCallableCandidates:3,minimumCohorts:2};
const receipt={schema:'ultra-sentinel-v6-blind-abi-admission/v1',engineSha:manifest.engine.commitSha,
 reservationSha256:hash(fs.readFileSync(reservationFile)),threshold,cohorts,
 callableCandidates:candidates.length,candidateCohorts,
 discoveryTechnicallyAdmissible:candidates.length>=threshold.minimumCallableCandidates&&candidateCohorts>=threshold.minimumCohorts,
 expectedFunctionalResultsRead:false,targetInitializersExecuted:false,targetMethodsInvoked:false,
 hunterExecuted:false,oracleExecuted:false,finiteDomainsEvaluated:false,
 originalFiles:cohorts.reduce((n,c)=>n+c.originalFiles,0),block26Closed:false,block27Allowed:false};
write('admission.json',receipt);
write('admission-seal.json',{schema:'ultra-sentinel-v6-blind-abi-seal/v1',
 admissionSha256:hash(fs.readFileSync(path.join(out,'admission.json'))),engineSha:manifest.engine.commitSha,
 reservationSha256:receipt.reservationSha256,
 javaVersion:command('java',['-version'],10000).stderr.trim(),
 nodeVersion:process.version,sourceBodiesUsedForSemanticSelection:false,hunterExecuted:false,oracleExecuted:false});
console.log(JSON.stringify({schema:receipt.schema,callableCandidates:receipt.callableCandidates,candidateCohorts,
 discoveryTechnicallyAdmissible:receipt.discoveryTechnicallyAdmissible,
 originalFiles:receipt.originalFiles,hunterExecuted:false,oracleExecuted:false}));
}
if(require.main===module)main();
module.exports=Object.freeze({inspectJar});
