#!/usr/bin/env node
'use strict';
// Phase 2.6 v8 prospective candidate scout, STAGE ONE. GitHub metadata only.
// A candidate pool is not an accepted evaluation cohort. Do not fetch Git
// blobs or execute Hunter, bytecode, or any independent functional oracle here.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {rankRepositoryMetadata,admitMetadataTree}=
 require('./phase2-kotlin-api-v7-select.cjs');
const ROOT=path.resolve(__dirname,'..'),SHA=/^[a-f0-9]{40}$/;
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const blobSha=p=>{
 const bytes=fs.readFileSync(path.join(ROOT,p));
 return crypto.createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0'))
  .update(bytes).digest('hex');
};
const readJson=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const fail=msg=>{throw Error('V8_POOL_'+msg);};
function validateProspectiveFreeze(){
 const f=readJson('docs/quality/PHASE2-BLOCK26-V8-FREEZE.json');
 if(f.schema!=='ultra-sentinel-block26-v8-prospective-structural-freeze/v1'||
  f.engine.sourceCommitSha!=='689583c23277807345edb715d8c2d277a3d4bda7'||
  f.engine.moduleBlobSha!=='430b4e928527b20fe305d63f3efb85909f1dfa06'||
  f.engine.mutable!==false||f.selector.query!=='math language:Kotlin fork:false archived:false stars:2..20'||
  f.selector.maxEligibleSourceCandidates!==18||
  f.selector.maxExaminedMetadataRepositories!==200||
  f.selector.maxRepoSizeKb!==8192||
  f.selector.maxMainKotlinFiles!==12||
  f.selector.maxMainKotlinBytes!==196608||
  f.selector.threshold.minimumNumericMethods!==3||
  f.selector.threshold.minimumCandidateCohorts!==2||
  f.current.sourceMetadataSearched!==false||
  f.current.abiScoutExecuted!==false||f.current.hunterExecuted!==false||
  f.current.oracleExecuted!==false)fail('FREEZE_INCONSISTENT');
 for(const item of [f.engine,f.gate,f.exclusions]){
  const file=item.modulePath||item.path,sha=item.moduleBlobSha||item.blobSha;
  if(!SHA.test(sha)||blobSha(file)!==sha)fail('FREEZE_MODULE_CHANGED:'+file);
 }
 const ex=readJson(f.exclusions.path);
 if(ex.repositories.length!==153||ex.blobShas.length!==555||
   new Set(ex.repositories.map(x=>x.toLowerCase())).size!==153||
   new Set(ex.blobShas).size!==555)fail('EXCLUSIONS_INCOMPLETE');
 const last=readJson('docs/quality/PHASE2-BLOCK26-V7-RESERVATION.json');
 const repos=new Set(ex.repositories.map(x=>x.toLowerCase())),
  blobs=new Set(ex.blobShas);
 for(const cohort of last.cohorts){
  if(!repos.has(cohort.source.repository.toLowerCase()))fail('REUSED_V7_REPOSITORY');
  for(const source of cohort.source.files)
   if(!blobs.has(source.blobSha))fail('REUSED_V7_SOURCE_BLOB');
 }
 return f;
}
async function planMetadataCandidates(repositories,excludedRepos,excludedBlobs,loadTree,limits){
 if(typeof loadTree!=='function')fail('NO_TREE_LOADER');
 const ordered=rankRepositoryMetadata(repositories);
 const audit=[],candidates=[],reservedBlobs=new Set();
 const max=limits.maxEligibleSourceCandidates,maxExamined=limits.maxExaminedMetadataRepositories;
 if(!Number.isSafeInteger(max)||max<1||max>48||
  !Number.isSafeInteger(maxExamined)||maxExamined<max||maxExamined>300||
  !Number.isSafeInteger(limits.maxRepoSizeKb)||limits.maxRepoSizeKb<1)
  fail('INVALID_LIMITS');
 for(let i=0;i<Math.min(maxExamined,ordered.length)&&candidates.length<max;i++){
  const candidate=ordered[i];let reason,admitted;
  if(excludedRepos.has(candidate.full_name.toLowerCase()))reason='EXPOSED_REPOSITORY';
  else if(candidate.private||candidate.archived||candidate.fork)reason='NOT_PUBLIC';
  else if(!Number.isSafeInteger(candidate.size)||candidate.size<0||
   candidate.size>limits.maxRepoSizeKb)reason='REPOSITORY_SIZE_UNSUPPORTED';
  else{
   const info=await loadTree(candidate);
   if(!info||!SHA.test(info.commitSha)||!SHA.test(info.treeSha))
    fail('INVALID_PINNED_TREE');
   try{
    admitted=admitMetadataTree(candidate,info.commitSha,info.treeSha,info.tree,
     excludedRepos,excludedBlobs);
    reason=admitted.eligible?'METADATA_CANDIDATE':admitted.reason;
    if(reason==='METADATA_CANDIDATE'&&admitted.files.some(f=>reservedBlobs.has(f.blobSha)))
     reason='DUPLICATE_CANDIDATE_BLOB';
   }catch(e){
    // An incomplete Git tree is not evidence that the source is clean.
    reason='TREE_METADATA_UNAVAILABLE';
   }
  }
  audit.push({rank:i+1,repository:candidate.full_name,reason});
  if(reason==='METADATA_CANDIDATE'){
   const source={repository:admitted.repository,commitSha:admitted.commitSha,
    treeSha:admitted.treeSha,files:admitted.files,totalBytes:admitted.totalBytes};
   candidates.push({rank:i+1,source});
   for(const file of source.files)reservedBlobs.add(file.blobSha);
  }
 }
 return {schema:'ultra-sentinel-v8-prospective-metadata-candidates/v1',
  candidates,audit,rankedRepositoryCount:ordered.length,
  examinedCount:audit.length,sourceBodiesRead:false,
  targetInvoked:false,oracleExecuted:false,hunterExecuted:false,
  frozenCohortCommitted:false,block26Closed:false,block27Allowed:false};
}
async function api(endpoint,token){
 if(!endpoint.startsWith('https://api.github.com/'))fail('UNSAFE_API_URL');
 const response=await fetch(endpoint,{headers:{
  Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
  'X-GitHub-Api-Version':'2022-11-28','User-Agent':'Ultra-Sentinel-v8-metadata-scout'
 },signal:AbortSignal.timeout(25000)});
 if(!response.ok)fail('GITHUB_METADATA_HTTP_'+response.status);
 return response.json();
}
async function retrieve(token,f){
 let results=[];
 for(let page=1;page<=f.selector.searchPages;page++){
  const response=await api('https://api.github.com/search/repositories?q='+
   encodeURIComponent(f.selector.query)+'&per_page='+f.selector.searchPageSize+
   '&page='+page,token);
  if(response.incomplete_results!==false||!Array.isArray(response.items))
   fail('INCOMPLETE_SEARCH_METADATA');
  results.push(...response.items);
  if(response.items.length<f.selector.searchPageSize)break;
 }
 const enriched=[];
 // GitHub search stargazer metadata may be stale; pin independent REST metadata.
 for(let i=0;i<results.length;i+=5){
  const batch=await Promise.all(results.slice(i,i+5).map(r=>{
   if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(r.full_name||''))
    fail('INVALID_SEARCH_IDENTITY');
   return api('https://api.github.com/repos/'+r.full_name,token);
  }));
  for(const r of batch)enriched.push({
   full_name:r.full_name,default_branch:r.default_branch,
   stargazers_count:r.stargazers_count,private:r.private,
   archived:r.archived,fork:r.fork,size:r.size
  });
 }
 return enriched;
}
async function main(){
 const f=validateProspectiveFreeze();
 const token=process.env.GH_TOKEN,out=process.argv[2];
 if(process.env.GITHUB_EVENT_NAME!=='pull_request'||!token||!out)
  fail('NOT_AUTHORIZED_PROSPECTIVE_JOB');
 const ex=readJson(f.exclusions.path);
 const repos=await retrieve(token,f);
 const result=await planMetadataCandidates(repos,
  new Set(ex.repositories.map(x=>x.toLowerCase())),new Set(ex.blobShas),
  async repo=>{
   if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo.full_name)||
    !/^[A-Za-z0-9_.-]+$/.test(repo.default_branch))fail('INVALID_GIT_REFERENCE');
   const c=await api('https://api.github.com/repos/'+repo.full_name+
    '/commits/'+encodeURIComponent(repo.default_branch),token);
   const commitSha=c.sha,treeSha=c.commit?.tree?.sha;
   if(!SHA.test(commitSha)||!SHA.test(treeSha))fail('INVALID_GIT_SHA');
   const tree=await api('https://api.github.com/repos/'+repo.full_name+
    '/git/trees/'+treeSha+'?recursive=1',token);
   return {commitSha,treeSha,tree};
  },f.selector);
 if(result.candidates.length!==f.selector.maxEligibleSourceCandidates)
  fail('INCOMPLETE_CANDIDATE_POOL:'+result.candidates.length);
 fs.mkdirSync(out,{recursive:true,mode:0o700});
 const json=JSON.stringify({...result,query:f.selector.query,
  engine:f.engine,exclusions:f.exclusions},null,2)+'\n';
 const file=path.join(out,'v8-metadata-candidates.json');
 fs.writeFileSync(file,json,{flag:'wx',mode:0o600});
 console.log('V8_METADATA_POOL_SHA256='+hash(Buffer.from(json)));
 console.log('V8_METADATA_REPOSITORIES='+repos.length);
 console.log('V8_METADATA_CANDIDATES='+result.candidates.length);
 console.log('V8_METADATA_FINAL_RANK='+result.audit.at(-1).rank);
 const encoded=Buffer.from(json).toString('base64');
 for(let i=0;i<encoded.length;i+=3000)
  console.log('V8_METADATA_B64_PART_'+Math.floor(i/3000)+'='+encoded.slice(i,i+3000));
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports=Object.freeze({planMetadataCandidates,validateProspectiveFreeze});
