#!/usr/bin/env node
'use strict';
// V9 prospectively frozen runner: source commit and bytes are authenticated.
// The ORIGINAL frozen Hunter is run only in real networkless cgroup/AppArmor
// isolation. Full predictions are sealed and never supplied to the selector.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const {prepareCohort}=require('./phase2-block26-object-eval.cjs');
const {validateFreeze}=require('./phase2-kotlin-api-v9-metadata.cjs');
const ROOT=path.resolve(__dirname,'..'),SHA=/^[a-f0-9]{40}$/,HASH=/^[a-f0-9]{64}$/;
const ENGINE='689583c23277807345edb715d8c2d277a3d4bda7';
const fail=m=>{throw Error('V9_HUNTER_SCOUT_'+m);};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const blob=b=>crypto.createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const json=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const cleanEnv={PATH:process.env.PATH||'/usr/bin:/bin',HOME:process.env.HOME||'/tmp',
 LANG:'C.UTF-8',GIT_NO_REPLACE_OBJECTS:'1',GIT_CONFIG_GLOBAL:'/dev/null',
 GIT_CONFIG_NOSYSTEM:'1',GIT_TERMINAL_PROMPT:'0',GIT_OPTIONAL_LOCKS:'0'};
function cmd(name,args,timeout=120000){
 return cp.spawnSync(name,args,{encoding:'utf8',timeout,maxBuffer:4*1024*1024,env:cleanEnv});
}
const okay=r=>!r.error&&r.status===0;
function git(dir,args,timeout=120000){
 const r=cmd('git',['-C',dir,'-c','core.hooksPath=/dev/null',...args],timeout);
 if(!okay(r))fail('GIT_INTEGRITY');return r.stdout.trim();
}
function validatePool(){
 const f=validateFreeze(),p=path.join(ROOT,'docs/quality/PHASE2-BLOCK26-V9-POOL.json');
 const seal=json(path.join(ROOT,'docs/quality/PHASE2-BLOCK26-V9-POOL-SEAL.json'));
 const bytes=fs.readFileSync(p);
 if(seal.schema!=='ultra-sentinel-v9-prospective-metadata-seal/v1'||
  !HASH.test(seal.poolSha256)||seal.poolSha256!==hash(bytes)||
  !SHA.test(seal.poolBlobSha)||seal.poolBlobSha!==blob(bytes))
  fail('UNSEALED_POOL');
 const pool=JSON.parse(bytes);
 if(pool.schema!=='ultra-sentinel-v9-original-metadata-only-pool/v1'||
  pool.freezeSchema!==f.schema||
  JSON.stringify(pool.engine)!==JSON.stringify(f.engine)||
  JSON.stringify(pool.exclusions)!==JSON.stringify(f.exclusions)||
  pool.query!==f.selector.query||pool.sourceContentsRead!==false||
  pool.hunterExecuted!==false||pool.oracleExecuted!==false||
  pool.fullPredictionReportsRead!==false||
  !Array.isArray(pool.candidates)||pool.candidates.length<1||
  pool.candidates.length>f.selector.maxEligibleSourceCandidates||
  !Array.isArray(pool.audit)||pool.audit.length>f.selector.maxExaminedMetadataRepositories)
  fail('POOL_CONTENTS');
 const excluded=json(path.join(ROOT,f.exclusions.path));
 const repos=new Set(excluded.repositories.map(x=>x.toLowerCase())),
  blobs=new Set(excluded.blobShas),fresh=new Set(),newBlobs=new Set();
 let prev=0;
 for(const item of pool.candidates){
  const s=item.source;
  if(!Number.isSafeInteger(item.rank)||item.rank<=prev||item.rank>pool.audit.length||
   pool.audit[item.rank-1].repository!==s.repository||
   pool.audit[item.rank-1].reason!=='METADATA_CANDIDATE')
   fail('POOL_RANK');
  prev=item.rank;
  if(!/^[a-z\d_.-]+\/[a-z\d_.-]+$/i.test(s.repository)||!SHA.test(s.commitSha)||
   !SHA.test(s.treeSha)||repos.has(s.repository.toLowerCase())||
   fresh.has(s.repository.toLowerCase())||!Array.isArray(s.files)||
   s.files.length<1||s.files.length>12)fail('POOL_IDENTITY');
  fresh.add(s.repository.toLowerCase());let total=0;
  for(const sf of s.files){
   if(!/^src\/main\/(?:[^/]+\/)*[^/]+\.kt$/.test(sf.path)||
    sf.path.split('/').some(x=>!x||x==='.'||x==='..')||
    !SHA.test(sf.blobSha)||blobs.has(sf.blobSha)||newBlobs.has(sf.blobSha)||
    !Number.isSafeInteger(sf.sizeBytes)||sf.sizeBytes<1)fail('POOL_BLOB');
   total+=sf.sizeBytes;newBlobs.add(sf.blobSha);
  }
  if(total!==s.totalBytes||total>196608)fail('POOL_BYTES');
 }
 return {f,pool,seal};
}
function fetchPinned(dir,source){
 fs.mkdirSync(dir,{mode:0o700});
 git(dir,['init','-q','.'],15000);
 git(dir,['fetch','--depth=1','--no-tags','--filter=blob:none',
  'https://github.com/'+source.repository+'.git',source.commitSha],100000);
 git(dir,['checkout','--detach','-q',source.commitSha],100000);
 if(git(dir,['rev-parse','HEAD'])!==source.commitSha||
  git(dir,['rev-parse','HEAD^{tree}'])!==source.treeSha||
  git(dir,['status','--porcelain']))fail('PINNED_ORIGINAL_DRIFT');
}
function jarScopes(jar){
 const listing=cmd('jar',['tf',jar],20000);if(!okay(listing))fail('JAR_INDEX');
 const roots=new Set(),names=listing.stdout.split(/\r?\n/);
 if(names.length>50000)fail('JAR_SIZE');
 for(const n of names){
  if(!n.endsWith('.class')||n.startsWith('kotlin/')||
   n.startsWith('org/jetbrains/')||n.startsWith('META-INF/')||
   n.startsWith('java/')||n.startsWith('jdk/'))continue;
  const components=n.slice(0,-6).split('/');
  if(!components.every(x=>/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(x)))continue;
  if(components.length===1)roots.add('.');
  else roots.add(components.slice(0,Math.min(2,components.length-1)).join('.'));
 }
 // Disjoint package roots. No substring search of function bodies or outputs.
 return [...roots].sort().slice(0,6);
}
function aggregate(rows){
 const counts={classesInspected:0,methodCandidates:0,methodsProbed:0,completedTriples:0,
  successfulInvocations:0};
 for(const r of rows)for(const k of Object.keys(counts))counts[k]+=r[k];
 return counts;
}
function main(){
 if(process.argv.length!==6||process.env.GH_TOKEN||process.env.GITHUB_TOKEN)
  fail('ARGUMENTS_OR_TOKEN');
 const [engine,kotlin,work,out]=process.argv.slice(2),{f,pool,seal}=validatePool();
 if(git(engine,['rev-parse','HEAD'])!==ENGINE||
  git(engine,['status','--porcelain']))fail('ENGINE_HEAD');
 const hunter=path.join(engine,f.engine.modulePath),sourceBytes=fs.readFileSync(hunter);
 if(blob(sourceBytes)!==f.engine.moduleBlobSha)fail('ENGINE_BLOB');
 const eng={commitSha:ENGINE,treeSha:git(engine,['rev-parse','HEAD^{tree}'])};
 fs.mkdirSync(work,{recursive:false,mode:0o700});
 fs.mkdirSync(out,{recursive:false,mode:0o700});
 const probe=path.join(work,'frozen-hunter');fs.mkdirSync(probe);
 if(!okay(cmd('javac',['-d',probe,hunter],30000)))fail('HUNTER_COMPILE');
 const rows=[],reports=[];
 for(const item of pool.candidates){
  const dir=path.join(work,'candidate-'+item.rank),clone=path.join(dir,'original'),
   input=path.join(dir,'input'),compiled=path.join(dir,'compiled');
  fs.mkdirSync(dir);fs.mkdirSync(compiled);
  fetchPinned(clone,item.source);
  prepareCohort(engine,clone,input,{engine:eng,source:item.source},
   {extendedKotlinPaths:true});
  const runner=path.join(engine,'tests/fixtures/phase2-block26-object-contracts/run-isolated.sh');
  const build=cmd('bash',[runner,'compile-v2',kotlin,input,compiled],150000);
  const subdir=path.join(out,'candidate-'+item.rank);fs.mkdirSync(subdir);
  const full=[],seenScopes=[];
  if(okay(build)){
   const jar=path.join(compiled,'target.jar'),jarHash=hash(fs.readFileSync(jar));
   const scopes=jarScopes(jar);
   for(let i=0;i<scopes.length;i++){
    const scope=scopes[i],dest=path.join(subdir,'scope-'+i);
    fs.mkdirSync(dest);
    const run=cmd('bash',[path.join(engine,'tests/fixtures/jvm-metamorphic/run-probe-v2.sh'),
     jar,probe,scope,dest],75000);
    if(!okay(run)){
     seenScopes.push({scope,success:false});continue;
    }
    const fpath=path.join(dest,'discovery.json'),raw=fs.readFileSync(fpath);
    if(raw.length>262144)fail('OVERSIZED_FROZEN_REPORT');
    const report=JSON.parse(raw);
    if(report.schema!=='ultra-sentinel-generic-jvm-metamorphic/v1'||
     report.artifactSha256!==jarHash||
     report.sourceAuthenticated!==false||report.oracleVerified!==false||
     report.novelFamilyVerified!==false||report.repairAuthorized!==false||
     report.remoteWrites!==false||report.mergeAllowed!==false||
     !Array.isArray(report.findings)||report.findings.length>256||
     !['methodsProbed','methodCandidates','completedTriples','successfulInvocations',
      'classesInspected'].every(k=>Number.isSafeInteger(report[k])&&report[k]>=0))
     fail('FROZEN_OUTPUT_UNTRUSTED');
    const record={rank:item.rank,scope,jarSha256:jarHash,reportSha256:hash(raw),
     path:'candidate-'+item.rank+'/scope-'+i+'/discovery.json'};
    reports.push(record);full.push(report);seenScopes.push({scope,success:true});
   }
  }
  // A compilation failure or an unsupported original is a factual zero-
  // coverage abstention, never a successful method invocation.
  const counters=aggregate(full);
  const row={rank:item.rank,source:item.source,
   frozenReportSha256:hash(Buffer.from(JSON.stringify(reports.filter(x=>x.rank===item.rank)))),
   report:{...counters,probeExecutionSucceeded:full.length>0,
    originalSourceAuthenticated:true,oracleExecuted:false,hunterRetuned:false}};
  rows.push(row);
  console.log('V9_SCOUT_COUNTERS='+JSON.stringify({
   rank:item.rank,repository:item.source.repository,compiled:okay(build),
   frozenScopes:seenScopes,methodsProbed:counters.methodsProbed,
   completedTriples:counters.completedTriples,successfulInvocations:counters.successfulInvocations}));
 }
 const evidence={schema:'ultra-sentinel-v9-sealed-hunter-counter-evidence/v1',
  frozenEngineCommit:ENGINE,frozenEngineBlob:f.engine.moduleBlobSha,
  poolSha256:seal.poolSha256,rows,
  predictionsSealedBeforeSelection:true,oracleExecuted:false,
  originalSourcesNowExposed:true};
 const raw=JSON.stringify(evidence,null,2)+'\n';
 fs.writeFileSync(path.join(out,'sealed-counters.json'),raw,{flag:'wx',mode:0o600});
 const reportManifest={schema:'ultra-sentinel-v9-full-predictions-first/v1',
  frozenEngineCommit:ENGINE,poolSha256:seal.poolSha256,
  reportFiles:reports,originalRepositories:pool.candidates.length,
  allPredictionsSealedBeforeSelection:true,oracleExecuted:false,
  hunterRetuned:false};
 const manifest=JSON.stringify(reportManifest,null,2)+'\n';
 fs.writeFileSync(path.join(out,'full-prediction-seal.json'),manifest,{flag:'wx',mode:0o600});
 console.log('V9_FULL_PREDICTION_SEAL_SHA256='+hash(Buffer.from(manifest)));
 console.log('V9_SEALED_COUNTERS_SHA256='+hash(Buffer.from(raw)));
 console.log('V9_SCOUT_ORIGINAL_REPOSITORIES='+rows.length);
 console.log('V9_SCOUT_ORIGINAL_METHODS_PROBED='+rows.reduce((s,r)=>s+r.report.methodsProbed,0));
 console.log('V9_SCOUT_REPORT_FILES='+reports.length);
}
if(require.main===module)try{main();}catch(e){console.error(e.message);process.exitCode=1;}
module.exports=Object.freeze({validatePool,jarScopes});
