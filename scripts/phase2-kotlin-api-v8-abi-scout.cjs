#!/usr/bin/env node
'use strict';
// Trusted host-only v8 ABI scout. Uses only the SHA-sealed metadata candidate
// pool. Source bodies are authenticated build inputs, not semantic evidence.
// The isolated Kotlin compiler and javap may run; target methods, initializers,
// Hunter and independent functional oracles MUST NOT run here.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),
 cp=require('node:child_process');
const {prepareCohort}=require('./phase2-block26-object-eval.cjs');
const {inspectJar}=require('./phase2-kotlin-api-v6-preflight.cjs');
const {validateProspectiveFreeze}=require('./phase2-kotlin-api-v8-candidate-pool.cjs');
const {selectStructuralCohorts}=require('../packages/quality-gates/v8-structural-diversity.cjs');
const ROOT=path.resolve(__dirname,'..'),SHA=/^[a-f0-9]{40}$/;
const fail=s=>{throw Error('V8_ABI_'+s);};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const gitBlob=b=>crypto.createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const readJson=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const cleanEnv={
 PATH:process.env.PATH||'/usr/bin:/bin',HOME:process.env.HOME||'/tmp',
 GIT_TERMINAL_PROMPT:'0',GIT_CONFIG_NOSYSTEM:'1',
 GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_COUNT:'0',
 GIT_OPTIONAL_LOCKS:'0',GIT_NO_REPLACE_OBJECTS:'1',LANG:'C.UTF-8'
};
function execute(program,args,timeout=120000){
 return cp.spawnSync(program,args,{encoding:'utf8',timeout,maxBuffer:2*1024*1024,env:cleanEnv});
}
function success(r){return !r.error&&r.status===0;}
function git(dir,args,timeout=120000){
 const r=execute('git',['-C',dir,'-c','core.hooksPath=/dev/null',...args],timeout);
 if(!success(r))fail('GIT_SOURCE_UNAVAILABLE');
 return r.stdout.trim();
}
function validateCandidatePool(){
 const freeze=validateProspectiveFreeze();
 const seal=readJson('docs/quality/PHASE2-BLOCK26-V8-POOL-SEAL.json');
 const p='docs/quality/PHASE2-BLOCK26-V8-POOL.json',
  bytes=fs.readFileSync(path.join(ROOT,p));
 if(seal.schema!=='ultra-sentinel-v8-abi-candidate-pool-seal/v1'||
  !/^[a-f0-9]{64}$/.test(seal.poolSha256)||
  hash(bytes)!==seal.poolSha256||!SHA.test(seal.poolBlobSha)||
  gitBlob(bytes)!==seal.poolBlobSha)fail('POOL_UNSEALED');
 const m=JSON.parse(bytes);
 if(m.schema!=='ultra-sentinel-v8-prospective-metadata-candidates/v1'||
  m.sourceBodiesRead!==false||m.targetInvoked!==false||
  m.hunterExecuted!==false||m.oracleExecuted!==false||
  m.frozenCohortCommitted!==false||
  m.query!==freeze.selector.query||
  JSON.stringify(m.engine)!==JSON.stringify(freeze.engine)||
  JSON.stringify(m.exclusions)!==JSON.stringify(freeze.exclusions)||
  m.examinedCount!==m.audit.length||
  m.candidates.length<1||m.candidates.length>freeze.selector.maxEligibleSourceCandidates)
  fail('POOL_CONTENT_INVALID');
 const repos=new Set(),blobs=new Set(),
  ex=readJson(freeze.exclusions.path),
  history=new Set(ex.repositories.map(x=>x.toLowerCase())),
  oldBlobs=new Set(ex.blobShas);
 let before=0;
 for(const c of m.candidates){
  if(!Number.isSafeInteger(c.rank)||c.rank<=before||c.rank>m.audit.length||
   m.audit[c.rank-1].repository!==c.source.repository||
   m.audit[c.rank-1].reason!=='METADATA_CANDIDATE')fail('POOL_RANK_INVALID');
  before=c.rank;
  const s=c.source,id=s.repository.toLowerCase();
  if(!/^[a-z\d_.-]+\/[a-z\d_.-]+$/i.test(s.repository)||
   !SHA.test(s.commitSha)||!SHA.test(s.treeSha)||
   history.has(id)||repos.has(id)||!Array.isArray(s.files)||
   s.files.length<1||s.files.length>12||!Number.isSafeInteger(s.totalBytes)||
   s.totalBytes>196608)fail('POOL_SOURCE_INVALID');
  repos.add(id);let total=0;
  for(const f of s.files){
   if(!/^src\/main\/(?:[^/]+\/)*[^/]+\.kt$/.test(f.path)||
    f.path.split('/').some(x=>x==='..'||x==='.')||
    !SHA.test(f.blobSha)||oldBlobs.has(f.blobSha)||blobs.has(f.blobSha)||
    !Number.isSafeInteger(f.sizeBytes)||f.sizeBytes<1)fail('POOL_SOURCE_INVALID');
   blobs.add(f.blobSha);total+=f.sizeBytes;
  }
  if(total!==s.totalBytes)fail('POOL_SOURCE_TOTAL_INVALID');
 }
 return {freeze,seal,pool:m};
}
function preparePinnedRepository(root,source){
 fs.mkdirSync(root,{mode:0o700});
 git(root,['init','-q','.'],15000);
 const url='https://github.com/'+source.repository+'.git';
 git(root,['fetch','--depth=1','--no-tags','--filter=blob:none',url,source.commitSha],100000);
 git(root,['checkout','--detach','-q',source.commitSha],100000);
 if(git(root,['rev-parse','HEAD'])!==source.commitSha||
  git(root,['rev-parse','HEAD^{tree}'])!==source.treeSha||
  git(root,['status','--porcelain']))fail('PINNED_GIT_DRIFT');
}
function main(){
 if(process.argv.length!==6)fail('ARGUMENTS');
 if(process.env.GH_TOKEN||process.env.GITHUB_TOKEN)fail('TOKEN_VISIBLE_TO_SCOUT');
 const [engine,kotlin,work,out]=process.argv.slice(2);
 const {freeze,seal,pool}=validateCandidatePool();
 if(git(engine,['rev-parse','HEAD'])!==freeze.engine.sourceCommitSha||
  git(engine,['status','--porcelain']))fail('ENGINE_DRIFT');
 const tree=git(engine,['rev-parse','HEAD^{tree}']);
 const engineM={commitSha:freeze.engine.sourceCommitSha,treeSha:tree};
 fs.mkdirSync(work,{recursive:false,mode:0o700});
 fs.mkdirSync(out,{recursive:false,mode:0o700});
 const records=[];
 for(const c of pool.candidates){
  const workdir=path.join(work,'candidate-'+c.rank),
   clone=path.join(workdir,'original'),
   input=path.join(workdir,'input'),compiled=path.join(workdir,'compiled');
  fs.mkdirSync(workdir);fs.mkdirSync(compiled);
  preparePinnedRepository(clone,c.source);
  // Existing provenance guard verifies every original blob and the exact
  // tree before staging unchanged sources for isolated compiler consumption.
  prepareCohort(engine,clone,input,{engine:engineM,source:c.source},
   {extendedKotlinPaths:true});
  const build=execute('bash',[path.join(engine,
   'tests/fixtures/phase2-block26-object-contracts/run-isolated.sh'),
   'compile-v2',kotlin,input,compiled],110000);
  const abi={compilationSucceeded:false,callables:[],abstentions:[]};
  if(!success(build)){
   if(build.error?.code==='ETIMEDOUT')abi.abstentions.push({reason:'COMPILATION_TIMEOUT'});
   else abi.abstentions.push({reason:'COMPILATION_OR_ABI_UNSUPPORTED'});
  }else{
   abi.compilationSucceeded=true;
   const jar=path.join(compiled,'target.jar');
   try{
    const result=inspectJar(jar);
    abi.callables=result.callables;
    abi.abstentions=result.abstentions;
   }catch(e){
    // An unsupported ABI is an abstention, not evidence of a defect.
    abi.abstentions.push({reason:'ABI_METADATA_UNAVAILABLE'});
   }
  }
  const row={rank:c.rank,source:c.source,abi,
   compilerReadOriginalSource:true,targetInvoked:false,
   oracleExecuted:false,hunterExecuted:false};
  records.push(row);
  console.log('V8_ABI_CANDIDATE='+JSON.stringify({
   rank:c.rank,repository:c.source.repository,compilationSucceeded:abi.compilationSucceeded,
   admitted:abi.callables.filter(m=>m.reason==='ADMISSIBLE_ABI_CANDIDATE').length,
   abstentions:abi.abstentions.map(x=>x.reason)
  }));
 }
 const structural=selectStructuralCohorts(records);
 const report={
  schema:'ultra-sentinel-v8-prospective-abi-result/v1',
  engineSha:freeze.engine.sourceCommitSha,poolSha256:seal.poolSha256,
  sourceBodiesUsedForFunctionalSelection:false,
  originalCompilerInputOnly:true,unsafeMethodExecution:false,
  recordCount:records.length,records,structural,
  frozenCohortCommitted:false,predictionsExecuted:false,
  oracleExecuted:false,confirmedDistinctNewDefects:null,
  block26Closed:false,block27Allowed:false
 };
 const json=JSON.stringify(report,null,2)+'\n';
 fs.writeFileSync(path.join(out,'abi-result.json'),json,{flag:'wx',mode:0o600});
 fs.writeFileSync(path.join(out,'abi-seal.json'),JSON.stringify({
  schema:'ultra-sentinel-v8-abi-seal/v1',
  reportSha256:hash(Buffer.from(json)),metadataPoolSha256:seal.poolSha256,
  frozenEngineSha:freeze.engine.sourceCommitSha,
  oracleExecuted:false,hunterExecuted:false},null,2)+'\n',{flag:'wx',mode:0o600});
 console.log('V8_ABI_REPORT_SHA256='+hash(Buffer.from(json)));
 console.log('V8_ABI_ELIGIBLE='+structural.eligible);
 console.log('V8_ABI_METHODS='+structural.numericMethods);
 console.log('V8_ABI_INDEPENDENT_COHORTS='+structural.candidateCohorts);
 console.log('V8_ABI_SELECTED='+structural.selected.map(s=>s.source.repository).join(','));
 // Only metadata and ABI signatures (never method results) enter the seal.
 const receipt=JSON.stringify({schema:'ultra-sentinel-v8-cohort-admission-receipt/v1',
  engineSha:freeze.engine.sourceCommitSha,poolSha256:seal.poolSha256,
  reportSha256:hash(Buffer.from(json)),structural},null,2)+'\n';
 const encoded=Buffer.from(receipt).toString('base64');
 for(let i=0;i<encoded.length;i+=3000)
  console.log('V8_ABI_RECEIPT_B64_PART_'+Math.floor(i/3000)+'='+encoded.slice(i,i+3000));
}
if(require.main===module)try{main();}catch(e){console.error(e.message);process.exitCode=1;}
module.exports=Object.freeze({validateCandidatePool});
