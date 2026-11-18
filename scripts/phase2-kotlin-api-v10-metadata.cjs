#!/usr/bin/env node
'use strict';
// V10 metadata only. Never download source blobs, evaluate a function,
// or run Hunter/oracles before v10 freeze has been authenticated.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {planMetadataCandidates}=require('./phase2-kotlin-api-v8-candidate-pool.cjs');
const ROOT=path.resolve(__dirname,'..');
const SHA=/^[a-f0-9]{40}$/;
const fail=s=>{throw Error('V10_POOL_'+s);};
const read=p=>fs.readFileSync(path.join(ROOT,p));
const json=p=>JSON.parse(read(p));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const blob=b=>crypto.createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
function validateFreeze(){
 const f=json('docs/quality/PHASE2-BLOCK26-V10-FREEZE.json');
 if(f.schema!=='ultra-sentinel-block26-v10-prospective-invocability-freeze/v1'||
  f.engine.sourceCommitSha!=='689583c23277807345edb715d8c2d277a3d4bda7'||
  f.engine.moduleBlobSha!=='430b4e928527b20fe305d63f3efb85909f1dfa06'||
  f.engine.mutable!==false||
  f.exclusions.repositories!==176||f.exclusions.blobs!==690||
  f.selector.query!=='math language:Kotlin fork:false archived:false stars:2..20'||
  f.selector.searchPages!==3||f.selector.searchPageSize!==100||
  f.selector.maxEligibleSourceCandidates!==12||
  f.selector.maxExaminedMetadataRepositories!==250||
  f.selector.maxRepoSizeKb!==8192||
  f.selector.threshold.minimumProbedMethods!==3||
  f.selector.threshold.minimumIndependentRepositories!==2||
  f.current.newSourceMetadataQueried!==false||
  f.current.newSourceBodiesRead!==false||
  f.current.frozenHunterExecuted!==false||
  f.current.oracleExecuted!==false)fail('INVALID_PRECOMMIT');
 for(const x of [f.engine,f.gate,f.exclusions,...f.reusedModules]){
  const p=x.modulePath||x.path,d=x.moduleBlobSha||x.blobSha;
  if(!SHA.test(d)||blob(read(p))!==d)fail('FROZEN_BLOB_CHANGED:'+p);
 }
 const ex=json(f.exclusions.path);
 if(ex.repositories.length!==176||ex.blobShas.length!==690||
  new Set(ex.repositories.map(x=>x.toLowerCase())).size!==176||
  new Set(ex.blobShas).size!==690)fail('INCOMPLETE_EXCLUSIONS');
 return f;
}
async function api(url,token){
 if(!url.startsWith('https://api.github.com/'))fail('BAD_API_URL');
 const r=await fetch(url,{headers:{'Authorization':'Bearer '+token,
  'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',
  'User-Agent':'Ultra-Sentinel-v10-prospective-structural'},signal:AbortSignal.timeout(25000)});
 if(!r.ok)fail('METADATA_HTTP_'+r.status);
 return r.json();
}
async function repositoryMetadata(f,token){
 const all=[];
 for(let page=1;page<=f.selector.searchPages;page++){
  const r=await api('https://api.github.com/search/repositories?q='+
   encodeURIComponent(f.selector.query)+'&per_page='+f.selector.searchPageSize+
   '&page='+page,token);
  if(r.incomplete_results!==false||!Array.isArray(r.items))fail('INCOMPLETE_SEARCH');
  all.push(...r.items);
  if(r.items.length<f.selector.searchPageSize)break;
 }
 const fresh=[];
 for(let i=0;i<all.length;i+=5){
  const batch=await Promise.all(all.slice(i,i+5).map(r=>{
   if(!/^[a-z\d_.-]+\/[a-z\d_.-]+$/i.test(r.full_name||''))fail('INVALID_ID');
   return api('https://api.github.com/repos/'+r.full_name,token);
  }));
  for(const r of batch)fresh.push({
   full_name:r.full_name,default_branch:r.default_branch,
   stargazers_count:r.stargazers_count,private:r.private,
   archived:r.archived,fork:r.fork,size:r.size});
 }
 return fresh;
}
function verifyFullOriginalTree(tree){
 if(!tree||tree.truncated!==false||!Array.isArray(tree.tree))
  throw Error('V10_TRUNCATED_ORIGINAL_GIT_TREE');
 for(const e of tree.tree){
  if(!e||typeof e.path!=='string')throw Error('V10_INVALID_TREE_ENTRY');
  if(!e.path.startsWith('src/main/')||!e.path.endsWith('.kt'))continue;
  // Original frozen readCohort authenticates every tracked Kotlin file, not
  // just files surviving a metadata filter. Reject mismatched mode/path at
  // selection time, before any code is read.
  if(e.type!=='blob'||e.mode!=='100644'||
   !/^src\/main\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.kt$/.test(e.path))
   throw Error('V10_NONCANONICAL_ORIGINAL_KOTLIN_TREE');
 }
 return tree;
}
async function main(){
 const f=validateFreeze(),token=process.env.GH_TOKEN,out=process.argv[2];
 if(!token||!out||process.env.GITHUB_EVENT_NAME!=='pull_request')
  fail('NOT_AUTHORIZED_METADATA_ONLY_STAGE');
 const ex=json(f.exclusions.path),repos=await repositoryMetadata(f,token);
 const result=await planMetadataCandidates(repos,new Set(ex.repositories.map(x=>x.toLowerCase())),
  new Set(ex.blobShas),async r=>{
   if(!/^[a-z\d_.-]+\/[a-z\d_.-]+$/i.test(r.full_name)||
    !/^[a-z\d_.-]+$/i.test(r.default_branch))fail('INVALID_REPO_REF');
   const commit=await api('https://api.github.com/repos/'+r.full_name+
    '/commits/'+encodeURIComponent(r.default_branch),token);
   const sha=commit.sha,treeSha=commit.commit?.tree?.sha;
   if(!SHA.test(sha)||!SHA.test(treeSha))fail('INVALID_TREE_SHA');
   const tree=await api('https://api.github.com/repos/'+r.full_name+
    '/git/trees/'+treeSha+'?recursive=1',token);
   return {commitSha:sha,treeSha,tree};
  },f.selector);
 if(result.candidates.length<1||result.candidates.length>12)fail('EMPTY_METADATA_POOL');
 const doc={schema:'ultra-sentinel-v10-original-metadata-only-pool/v1',
  freezeSchema:f.schema,engine:f.engine,exclusions:f.exclusions,query:f.selector.query,
  candidateCount:result.candidates.length,candidates:result.candidates,
  audit:result.audit,rankedRepositoryCount:result.rankedRepositoryCount,
  sourceContentsRead:false,hunterExecuted:false,oracleExecuted:false,
  fullPredictionReportsRead:false,block26Closed:false,block27Allowed:false};
 fs.mkdirSync(out,{recursive:true,mode:0o700});
 const raw=JSON.stringify(doc,null,2)+'\n';
 fs.writeFileSync(path.join(out,'metadata.json'),raw,{flag:'wx',mode:0o600});
 console.log('V10_METADATA_POOL_SHA256='+hash(Buffer.from(raw)));
 console.log('V10_METADATA_REPOSITORIES='+repos.length);
 console.log('V10_METADATA_CANDIDATES='+doc.candidateCount);
 const encoded=Buffer.from(raw).toString('base64');
 for(let i=0;i<encoded.length;i+=3000)
  console.log('V10_METADATA_B64_PART_'+Math.floor(i/3000)+'='+encoded.slice(i,i+3000));
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports=Object.freeze({validateFreeze,repositoryMetadata,verifyFullOriginalTree});
