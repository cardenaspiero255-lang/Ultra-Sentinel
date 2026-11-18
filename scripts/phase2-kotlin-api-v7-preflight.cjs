#!/usr/bin/env node
'use strict';
// Trusted host-only ABI gate. No target initializers, target method calls,
// independent oracles, or Hunter predictions run during this preflight.
const fs=require('node:fs'),path=require('node:path'),
 cp=require('node:child_process'),crypto=require('node:crypto');
const {prepareCohort}=require('./phase2-block26-object-eval.cjs');
const {inspectJar}=require('./phase2-kotlin-api-v6-preflight.cjs');
const ROOT=path.resolve(__dirname,'..');
const RESERVATION='docs/quality/PHASE2-BLOCK26-V7-RESERVATION.json';
const FREEZE='docs/quality/PHASE2-BLOCK26-V7-FREEZE.json';
const DIGEST='11e53fe012cff24a594db6c47412495e5de43b587b598a93c6c7c6c86b56411c';
const ENGINE_SHA='689583c23277807345edb715d8c2d277a3d4bda7';
const SHA=/^[a-f0-9]{40}$/;
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const blob=b=>crypto.createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
function readJson(p){return JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));}
function fail(msg){throw Error('V7_ABI_'+msg);}
function validateReservation(reservation,freeze){
 const bytes=fs.readFileSync(path.join(ROOT,RESERVATION));
 if(hash(bytes)!==DIGEST||JSON.stringify(reservation)!==JSON.stringify(JSON.parse(bytes)))
  fail('RESERVATION_CHANGED');
 const original=readJson(FREEZE);
 if(JSON.stringify(freeze)!==JSON.stringify(original))fail('FREEZE_CHANGED');
 if(reservation.schema!=='ultra-sentinel-block26-v7-metadata-reservation/v1'||
  freeze.schema!=='ultra-sentinel-block26-v7-prospective-freeze/v1'||
  JSON.stringify(reservation.engine)!==JSON.stringify(freeze.engine)||
  JSON.stringify(reservation.previousExclusions)!==JSON.stringify(freeze.exclusions)||
  freeze.engine.sourceCommitSha!==ENGINE_SHA)
  fail('SOURCE_BINDING');
 const known=readJson(freeze.exclusions.path),
  repos=new Set(known.repositories.map(x=>x.toLowerCase())),
  blobs=new Set(known.blobShas),seen=new Set();
 if(known.repositories.length!==147||known.blobShas.length!==523)
  fail('SOURCE_BINDING');
 if(blob(fs.readFileSync(path.join(ROOT,freeze.exclusions.path)))!==freeze.exclusions.blobSha)
  fail('SOURCE_BINDING');
 for(const module of freeze.engine.modules){
  if(!SHA.test(module.blobSha)||blob(fs.readFileSync(path.join(ROOT,module.path)))!==module.blobSha)
   fail('ENGINE_CHANGED');
 }
 if(!Array.isArray(reservation.cohorts)||reservation.cohorts.length!==6||
  reservation.sourceContentsRead!==false||reservation.predictionsExecuted!==false||
  reservation.oracleExecuted!==false||reservation.originalSourcesNowExposed!==false||
  reservation.block26Closed!==false||reservation.block27Allowed!==false)
  fail('SOURCE_BINDING');
 for(let i=0;i<reservation.cohorts.length;i++){
  const c=reservation.cohorts[i],s=c.source;
  if(c.id!==i+1||!SHA.test(s.commitSha)||!SHA.test(s.treeSha)||
   !/^[a-z0-9_.-]+\/[a-z0-9_.-]+$/i.test(s.repository)||repos.has(s.repository.toLowerCase())||
   !Array.isArray(s.files)||s.files.length<1||s.files.length>12)
   fail('SOURCE_BINDING');
  let total=0;
  for(const f of s.files){
   if(!/^src\/main\/(?:[^/]+\/)*[^/]+\.kt$/.test(f.path)||
    !SHA.test(f.blobSha)||blobs.has(f.blobSha)||seen.has(f.blobSha)||
    !Number.isSafeInteger(f.sizeBytes)||f.sizeBytes<1)fail('SOURCE_BINDING');
   seen.add(f.blobSha);total+=f.sizeBytes;
  }
  if(total!==s.totalBytes||total>196608)fail('SOURCE_BINDING');
 }
 return {engine:freeze.engine,cohorts:reservation.cohorts,expectedSourceBytesSha256:DIGEST};
}
function command(program,args,timeout=150000){
 return cp.spawnSync(program,args,{encoding:'utf8',timeout,maxBuffer:8*1024*1024});
}
function success(r){return !r.error&&r.status===0;}
function git(repo,args){
 const r=command('git',['-C',repo,'-c','core.hooksPath=/dev/null',...args],20000);
 if(!success(r))fail('GIT_INTEGRITY');return r.stdout.trim();
}
function captureDiagnostics(compiled,out,id){
 for(const name of ['diagnostics.log','execution.log']){
  const src=path.join(compiled,name);
  if(fs.existsSync(src)){
   const dst=path.join(out,'compile-'+id+'-'+name);
   fs.copyFileSync(src,dst);
  }
 }
}
function main(){
 if(process.argv.length!==8)fail('ARGUMENTS');
 const [reservationFile,engine,sources,kotlin,work,out]=process.argv.slice(2);
 if(path.resolve(reservationFile)!==path.join(ROOT,RESERVATION))fail('RESERVATION_PATH');
 const reservation=readJson(RESERVATION),freeze=readJson(FREEZE);
 const accepted=validateReservation(reservation,freeze);
 const exactHead=git(engine,['rev-parse','HEAD']);
 if(exactHead!==ENGINE_SHA||git(engine,['status','--porcelain']))fail('ENGINE_COMMIT_CHANGED');
 const treeSha=git(engine,['rev-parse','HEAD^{tree}']);
 const manifestEngine={...freeze.engine,commitSha:ENGINE_SHA,treeSha};
 fs.mkdirSync(work,{recursive:false,mode:0o700});
 fs.mkdirSync(out,{recursive:false,mode:0o700});
 const results=[];
 for(const c of accepted.cohorts){
  const workdir=path.join(work,'cohort-'+c.id),input=path.join(workdir,'input'),
   compiled=path.join(workdir,'compiled');
  fs.mkdirSync(workdir);fs.mkdirSync(compiled);
  // Verifies every original Git blob and stages unchanged Kotlin source bytes.
  prepareCohort(engine,path.join(sources,'source-'+c.id),input,
   {engine:manifestEngine,source:c.source},{extendedKotlinPaths:true});
  const outcome={cohortId:c.id,sourceRepository:c.source.repository,
   sourceSha:c.source.commitSha,sourceTreeSha:c.source.treeSha,
   originalBlobs:c.source.files.map(f=>f.blobSha),originalFiles:c.source.files.length,
   compilationSucceeded:false,callables:[],abstentions:[]};
  const build=command('bash',[path.join(engine,
   'tests/fixtures/phase2-block26-object-contracts/run-isolated.sh'),
   'compile-v2',kotlin,input,compiled],180000);
  captureDiagnostics(compiled,out,c.id);
  if(!success(build)){
   const file=path.join(compiled,'diagnostics.log');
   const msg=fs.existsSync(file)?fs.readFileSync(file,'utf8'):'';
   outcome.abstentions.push({reason:/unresolved reference|cannot access class|unresolved supertypes/i.test(msg)?
    'DEPENDENCY_UNRESOLVED':build.error?'ENVIRONMENT_BLOCKED':'COMPILATION_OR_ABI_UNSUPPORTED',
    exitStatus:build.status});
   results.push(outcome);continue;
  }
  outcome.compilationSucceeded=true;
  const jar=path.join(compiled,'target.jar');
  outcome.artifactSha256=hash(fs.readFileSync(jar));
  try{
   const abi=inspectJar(jar);
   outcome.callables=abi.callables;
   outcome.abstentions.push(...abi.abstentions);
  }catch(_){outcome.abstentions.push({reason:'ABI_METADATA_UNAVAILABLE'});}
  results.push(outcome);
 }
 const candidates=results.flatMap(c=>c.callables.filter(m=>m.reason==='ADMISSIBLE_ABI_CANDIDATE'));
 const cohorts=results.filter(c=>c.callables.some(m=>m.reason==='ADMISSIBLE_ABI_CANDIDATE')).length;
 const admission={schema:'ultra-sentinel-v7-blind-abi-admission/v1',
  engineSha:ENGINE_SHA,reservationSha256:DIGEST,
  threshold:{minimumCallableCandidates:3,minimumCohorts:2},
  cohorts:results,callableCandidates:candidates.length,candidateCohorts:cohorts,
  discoveryTechnicallyAdmissible:candidates.length>=3&&cohorts>=2,
  sourceBodiesUsedForMetadataSelection:false,
  originalSourcesCompiledWithinNetworklessSandbox:true,
  targetInitializersExecuted:false,targetMethodsInvoked:false,
  hunterExecuted:false,oracleExecuted:false,finiteDomainsEvaluated:false,
  originalFiles:results.reduce((n,c)=>n+c.originalFiles,0),
  confirmedNewDefects:null,block26Closed:false,block27Allowed:false};
 const write=(name,value)=>fs.writeFileSync(path.join(out,name),
  JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});
 write('admission.json',admission);
 write('admission-seal.json',{schema:'ultra-sentinel-v7-blind-abi-seal/v1',
  admissionSha256:hash(fs.readFileSync(path.join(out,'admission.json'))),
  engineSha:ENGINE_SHA,reservationSha256:DIGEST,
  sourceBodiesUsedForSemanticSelection:false,hunterExecuted:false,oracleExecuted:false});
 console.log('V7_ABI_ORIGINAL_FILES='+admission.originalFiles);
 console.log('V7_ABI_COMPILED_COHORTS='+results.filter(c=>c.compilationSucceeded).length);
 console.log('V7_ABI_NUMERIC_CANDIDATES='+candidates.length);
 console.log('V7_ABI_CANDIDATE_COHORTS='+cohorts);
 console.log('V7_ABI_ELIGIBLE='+admission.discoveryTechnicallyAdmissible);
 console.log('V7_ABI_ADMISSION_SHA256='+hash(fs.readFileSync(path.join(out,'admission.json'))));
 console.log('V7_ABI_COUNTS_BY_COHORT='+JSON.stringify(results.map(x=>({
  id:x.cohortId,repo:x.sourceRepository,compilationSucceeded:x.compilationSucceeded,
  candidates:x.callables.filter(m=>m.reason==='ADMISSIBLE_ABI_CANDIDATE').length,
  abstentions:x.abstentions.map(y=>y.reason)}))));
}
if(require.main===module){
 try{main();}
 catch(error){console.error(error.message);process.exitCode=1;}
}
module.exports=Object.freeze({validateReservation});
