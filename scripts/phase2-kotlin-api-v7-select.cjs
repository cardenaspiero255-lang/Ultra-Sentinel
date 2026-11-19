'use strict';
// V7 prospective selection: GitHub REST metadata only. No source blob bodies
// may be fetched, evaluated, logged, or mounted by this program.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const SHA=/^[0-9a-f]{40}$/;
const readJson=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const sha256=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function blobSha(p){
 const bytes=fs.readFileSync(path.join(root,p));
 return crypto.createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
}
function rankRepositoryMetadata(repos){
 if(!Array.isArray(repos)||repos.length===0)throw Error('EMPTY_REPOSITORY_POOL');
 const seen=new Set();
 return repos.map(repo=>{
  if(!repo||!/^[a-z\d_.-]+\/[a-z\d_.-]+$/i.test(repo.full_name||'')||
   !Number.isSafeInteger(repo.stargazers_count)||repo.stargazers_count<0)
   throw Error('INVALID_REPOSITORY_METADATA');
  const key=repo.full_name.toLowerCase();
  if(seen.has(key))throw Error('DUPLICATE_REPOSITORY');
  seen.add(key);
  return repo;
 }).sort((a,b)=>b.stargazers_count-a.stargazers_count||
  (a.full_name.toLowerCase()<b.full_name.toLowerCase()?-1:
   a.full_name.toLowerCase()>b.full_name.toLowerCase()?1:
   a.full_name<b.full_name?-1:a.full_name>b.full_name?1:0));
}
function admitMetadataTree(repo,commitSha,treeSha,body,excludedRepos,excludedBlobs){
 if(!repo||typeof repo.full_name!=='string'||typeof repo.default_branch!=='string')
  throw Error('INVALID_REPOSITORY');
 if(!SHA.test(commitSha)||!SHA.test(treeSha))throw Error('INVALID_SHA');
 if(!body||body.truncated!==false||!Array.isArray(body.tree))throw Error('TRUNCATED_TREE');
 const id=repo.full_name.toLowerCase();
 if(excludedRepos.has(id))return {eligible:false,reason:'EXPOSED_REPOSITORY'};
 if(repo.private||repo.archived||repo.fork)return {eligible:false,reason:'NOT_PUBLIC_SOURCE'};
 const eligible=[],seen=new Set();
 for(const entry of body.tree){
  if(Object.prototype.hasOwnProperty.call(entry,'content'))throw Error('SOURCE_BODY_FORBIDDEN');
  if(typeof entry.path!=='string'||typeof entry.mode!=='string'||typeof entry.type!=='string')
   throw Error('UNTRUSTED_TREE_METADATA');
  if(!/^src\/main\/(?:[^/]+\/)*[^/]+\.kt$/.test(entry.path))continue;
  if(entry.type!=='blob'||entry.mode!=='100644')continue;
  if(!SHA.test(entry.sha)||!Number.isSafeInteger(entry.size)||entry.size<1)
   throw Error('INVALID_SOURCE_BLOB_METADATA');
  if(seen.has(entry.path))throw Error('DUPLICATE_SOURCE_PATH');
  seen.add(entry.path);
  eligible.push({path:entry.path,blobSha:entry.sha,sizeBytes:entry.size});
 }
 eligible.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
 if(eligible.length<1||eligible.length>12)
  return {eligible:false,reason:'SOURCE_COUNT_OUTSIDE_BOUNDS',count:eligible.length};
 const totalBytes=eligible.reduce((n,x)=>n+x.sizeBytes,0);
 if(totalBytes>196608)
  return {eligible:false,reason:'SOURCE_SIZE_OUTSIDE_BOUNDS',totalBytes};
 if(eligible.some(x=>excludedBlobs.has(x.blobSha)))
  return {eligible:false,reason:'EXPOSED_SOURCE_BLOB'};
 return {eligible:true,repository:repo.full_name,defaultBranch:repo.default_branch,
  commitSha,treeSha,files:eligible,totalBytes};
}
function validateFreeze(){
 const freeze=readJson('docs/quality/PHASE2-BLOCK26-V7-FREEZE.json');
 if(freeze.schema!=='ultra-sentinel-block26-v7-prospective-freeze/v1'||
  freeze.engine.sourceCommitSha!=='689583c23277807345edb715d8c2d277a3d4bda7'||
  freeze.newCohortReserved!==false||freeze.newSourceMetadataQueried!==false||
  freeze.newPredictionsExecuted!==false)throw Error('V7_FREEZE_NOT_PROSPECTIVE');
 for(const module of freeze.engine.modules)
  if(blobSha(module.path)!==module.blobSha)throw Error('V7_MODULE_CHANGED:'+module.path);
 if(blobSha(freeze.exclusions.path)!==freeze.exclusions.blobSha)throw Error('V7_EXCLUSIONS_CHANGED');
 const exclude=readJson(freeze.exclusions.path);
 if(exclude.repositories.length!==147||exclude.blobShas.length!==523)
  throw Error('V7_EXCLUSIONS_INCOMPLETE');
 return {freeze,excludedRepos:new Set(exclude.repositories.map(x=>x.toLowerCase())),
  excludedBlobs:new Set(exclude.blobShas)};
}
async function api(url,token){
 if(!url.startsWith('https://api.github.com/'))throw Error('UNSAFE_API_URL');
 const reply=await fetch(url,{headers:{'Authorization':'Bearer '+token,
  'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',
  'User-Agent':'Ultra-Sentinel-v7-metadata-only'},signal:AbortSignal.timeout(30000)});
 if(!reply.ok)throw Error('METADATA_API_HTTP_'+reply.status);
 const data=await reply.json();
 if(data==null||typeof data!=='object')throw Error('INVALID_METADATA_API_RESPONSE');
 return data;
}
async function gatherMetadata(token,query){
 const pages=[],pageCount=3;
 for(let page=1;page<=pageCount;page++){
  const url='https://api.github.com/search/repositories?q='+encodeURIComponent(query)+
   '&per_page=100&page='+page;
  const result=await api(url,token);
  if(result.incomplete_results!==false||!Array.isArray(result.items))
   throw Error('INCOMPLETE_SEARCH_RESULTS');
  pages.push(...result.items.map(r=>({
   full_name:r.full_name,default_branch:r.default_branch,
   stargazers_count:r.stargazers_count
  })));
  if(result.items.length<100)break;
 }
 const refreshed=[];
 for(let pos=0;pos<pages.length;pos+=5){
  const batch=pages.slice(pos,pos+5);
  const results=await Promise.all(batch.map(r=>api(
   'https://api.github.com/repos/'+r.full_name,token)));
  for(const entry of results)refreshed.push({
   full_name:entry.full_name,default_branch:entry.default_branch,
   stargazers_count:entry.stargazers_count,
   private:entry.private,archived:entry.archived,fork:entry.fork
  });
 }
 return rankRepositoryMetadata(refreshed);
}
async function reserve(token,out){
 const {freeze,excludedRepos,excludedBlobs}=validateFreeze();
 const rank=await gatherMetadata(token,freeze.selection.query);
 const selection=[],audit=[];
 for(let i=0;i<rank.length && selection.length<freeze.selection.targetCohorts;i++){
  const repo=rank[i];
  if(excludedRepos.has(repo.full_name.toLowerCase())){
   audit.push({rank:i+1,repository:repo.full_name,reason:'EXPOSED_REPOSITORY'});continue;
  }
  if(repo.private||repo.archived||repo.fork){
   audit.push({rank:i+1,repository:repo.full_name,reason:'NOT_PUBLIC_SOURCE'});continue;
  }
  const commit=await api('https://api.github.com/repos/'+repo.full_name+
   '/commits/'+encodeURIComponent(repo.default_branch),token);
  const commitSha=commit.sha,treeSha=commit.commit&&commit.commit.tree&&commit.commit.tree.sha;
  if(!SHA.test(commitSha)||!SHA.test(treeSha))throw Error('UNPINNED_COMMIT_TREE');
  const tree=await api('https://api.github.com/repos/'+repo.full_name+
   '/git/trees/'+treeSha+'?recursive=1',token);
  const eligible=admitMetadataTree(repo,commitSha,treeSha,tree,excludedRepos,excludedBlobs);
  audit.push({rank:i+1,repository:repo.full_name,reason:eligible.eligible?'SELECTED':eligible.reason});
  if(eligible.eligible)
   selection.push({id:selection.length+1,rank:i+1,source:{
    repository:eligible.repository,commitSha:eligible.commitSha,
    treeSha:eligible.treeSha,files:eligible.files,totalBytes:eligible.totalBytes
   }});
 }
 if(selection.length!==freeze.selection.targetCohorts)
  throw Error('INSUFFICIENT_FRESH_COHORTS:'+selection.length);
 const reservation={schema:'ultra-sentinel-block26-v7-metadata-reservation/v1',
  engine:freeze.engine,previousExclusions:freeze.exclusions,
  selectionQuery:freeze.selection.query,poolCount:rank.length,
  rankedRepositories:rank.map(x=>({repository:x.full_name,stars:x.stargazers_count})),
  audit,cohorts:selection,sourceContentsRead:false,
  predictionsExecuted:false,oracleExecuted:false,originalSourcesNowExposed:false,
  block26Closed:false,block27Allowed:false};
 fs.mkdirSync(out,{recursive:true});
 const file=path.join(out,'metadata-reservation.json');
 const json=JSON.stringify(reservation,null,2)+'\n';
 fs.writeFileSync(file,json,{flag:'wx',mode:0o600});
 console.log('V7_METADATA_REPOSITORIES='+rank.length);
 console.log('V7_FRESH_COHORTS='+selection.length);
 console.log('V7_METADATA_RESERVATION_SHA256='+sha256(Buffer.from(json)));
 const encoded=Buffer.from(json).toString('base64');
 for(let i=0;i<encoded.length;i+=3000)
  console.log('V7_RESERVATION_B64_PART_'+Math.floor(i/3000)+'='+encoded.slice(i,i+3000));
}
if(require.main===module){
 const token=process.env.GH_TOKEN,out=process.argv[2];
 if(!token||!out||!process.env.GITHUB_EVENT_NAME||
  process.env.GITHUB_EVENT_NAME!=='pull_request'){
  console.error('V7_METADATA_SELECTION_BLOCKED');process.exit(1);
 }
 reserve(token,path.resolve(out)).catch(e=>{
  console.error('V7_METADATA_SELECTION_FAILED:'+e.message);process.exitCode=1;
 });
}
module.exports={rankRepositoryMetadata,admitMetadataTree,validateFreeze};
