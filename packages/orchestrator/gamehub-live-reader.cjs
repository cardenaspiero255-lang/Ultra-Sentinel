'use strict';
/* GitHub public PR reader. The ONLY network operations are pinned, read-only
 * GET requests to the official GitHub API for the allowlisted GameHub repo.
 * This is not an author, CI, or repair attestation authority. */
const {reviewGithubPrEvidence}=require('./gamehub-github-evidence.cjs');
const {sourcePathAllowed,decodePinnedGithubSource}=require('./github-pinned-full-source.cjs');
const {verifyPinnedDiff,decodeDiffSource,sourcePath}=require('./pinned-diff.cjs');
const {createApiBudget,rateLimitedResponse}=require('./github-api-budget.cjs');
const REPO='cardenaspiero255-lang/gamehub-ultra';
const API='https://api.github.com/repos/'+REPO;
const SHA=/^[a-f0-9]{40}$/;
const MAX_FILES=300,PER_PAGE=100,MAX_JSON=8*1024*1024;
function fail(code){throw Error(code);}
function validToken(token){
 return typeof token==='string'&&token.length>=8&&token.length<=2048&&
  /^[\x21-\x7e]+$/.test(token);
}
function checkPR(data,number){
 if(!data||typeof data!=='object'||Array.isArray(data)||
  data.number!==number||data.base?.repo?.full_name!==REPO||
  !Number.isSafeInteger(data.base.repo.id)||data.base.repo.id<1||
  !SHA.test(data.head?.sha||'')||!SHA.test(data.base?.sha||'')||
  !Number.isSafeInteger(data.changed_files)||data.changed_files<1||
  data.changed_files>MAX_FILES||!['open','closed'].includes(data.state))
  fail('INVALID_PR_METADATA');
 return {number,repository:REPO,repositoryId:data.base.repo.id,
  headSha:data.head.sha,baseSha:data.base.sha,
  count:data.changed_files,draft:data.draft===true,state:data.state};
}
function checkPatch(item){
 if(typeof item.filename!=='string'||!item.filename||
  item.filename.length>1024||!['added','modified','removed','renamed'].includes(item.status)||
  !Number.isSafeInteger(item.additions)||item.additions<0||
  !Number.isSafeInteger(item.deletions)||item.deletions<0||
  !Number.isSafeInteger(item.changes)||item.changes!==item.additions+item.deletions||
  item.changes<1||typeof item.patch!=='string'||
  Buffer.byteLength(item.patch,'utf8')>320000||!item.patch.startsWith('@@ '))
  fail('INCOMPLETE_PR_DIFF');
 let plus=0,minus=0,hunks=0,oldNeed=0,newNeed=0,oldSeen=0,newSeen=0;
 const rows=item.patch.split('\n');
 for(let i=0;i<rows.length;i++){
  const line=rows[i].endsWith('\r')?rows[i].slice(0,-1):rows[i];
  if(line===''&&i===rows.length-1)continue;
  const h=line.match(/^@@ -\d+(?:,(\d+))? \+\d+(?:,(\d+))? @@/);
  if(h){
   if(hunks&&(oldSeen!==oldNeed||newSeen!==newNeed))fail('INCOMPLETE_PR_DIFF');
   oldNeed=Number(h[1]===undefined?1:h[1]);newNeed=Number(h[2]===undefined?1:h[2]);
   if(!Number.isSafeInteger(oldNeed)||!Number.isSafeInteger(newNeed))fail('INCOMPLETE_PR_DIFF');
   oldSeen=0;newSeen=0;hunks++;continue;
  }
  if(!hunks)fail('INCOMPLETE_PR_DIFF');
  if(line==='\\ No newline at end of file')continue;
  // The frozen Core's parser treats these valid source rows as headers.
  // Quarantine the diff until an upgraded parser can analyze it safely.
  if(line.startsWith('+++')||line.startsWith('---'))fail('INCOMPLETE_PR_DIFF');
  if(line.startsWith('+')){newSeen++;plus++;}
  else if(line.startsWith('-')){oldSeen++;minus++;}
  else if(line.startsWith(' ')){oldSeen++;newSeen++;}
  else fail('INCOMPLETE_PR_DIFF');
  if(oldSeen>oldNeed||newSeen>newNeed)fail('INCOMPLETE_PR_DIFF');
 }
 if(!hunks||oldSeen!==oldNeed||newSeen!==newNeed||
    plus!==item.additions||minus!==item.deletions)
  fail('INCOMPLETE_PR_DIFF');
}
async function loadGameHubPullRequest(prNumber,{token,fetchImpl=globalThis.fetch,hydrateSource=false}={}){
 if(!Number.isSafeInteger(prNumber)||prNumber<1||prNumber>2147483647)
  fail('INVALID_PR_NUMBER');
 if(!validToken(token)||typeof fetchImpl!=='function')fail('AUTHENTICATION_REQUIRED');
 let transferred=0;
 const budget=createApiBudget({maxRequests:MAX_FILES*2+8,maxMemoized:MAX_FILES*2});
 async function getJson(path){
  return budget.run(path,async()=>{
  const url=API+path;
  let response;
  try{
   response=await fetchImpl(url,{
    method:'GET',redirect:'error',signal:AbortSignal.timeout(15000),
    headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
     'X-GitHub-Api-Version':'2022-11-28','User-Agent':'Ultra-Sentinel-ReadOnly'}
   });
  }catch{fail('GITHUB_TRANSPORT_UNAVAILABLE');}
  if(rateLimitedResponse(response))fail('GITHUB_RATE_LIMITED');
  if(response?.status!==200)fail('GITHUB_API_UNAVAILABLE');
  if(response.url&&response.url!==url)fail('GITHUB_REDIRECT_REJECTED');
  const kind=response.headers?.get?.('content-type')||'';
  if(!/application\/(?:json|vnd\.github\+json)/i.test(kind))
   fail('GITHUB_INVALID_CONTENT_TYPE');
  let textBody;
  try{textBody=await response.text();}catch{fail('GITHUB_INVALID_RESPONSE');}
  if(typeof textBody!=='string'||Buffer.byteLength(textBody,'utf8')>MAX_JSON)
   fail('GITHUB_RESPONSE_TOO_LARGE');
  transferred+=Buffer.byteLength(textBody,'utf8');
  if(transferred>MAX_JSON*5)fail('GITHUB_TOTAL_RESPONSE_TOO_LARGE');
  try{return JSON.parse(textBody);}catch{fail('GITHUB_INVALID_JSON');}
  },{immutable:path.startsWith('/contents/')});
 }
 const first=checkPR(await getJson('/pulls/'+prNumber),prNumber);
 const files=[],seen=new Set(),seenBlobs=new Map(),oldPaths=new Map();
 const pageLimit=Math.ceil(first.count/PER_PAGE)+1;
 for(let page=1;page<=pageLimit;page++){
  const entries=await getJson('/pulls/'+prNumber+'/files?per_page='+PER_PAGE+'&page='+page);
  if(!Array.isArray(entries)||entries.length>PER_PAGE)fail('INVALID_PR_FILE_PAGE');
  for(const item of entries){
   if(!item||typeof item!=='object'||Array.isArray(item)||
    typeof item.filename!=='string'||seen.has(item.filename))
    fail('INVALID_PR_FILE_PAGE');
   seen.add(item.filename);
   seenBlobs.set(item.filename,item.sha);
   oldPaths.set(item.filename,item.status==='renamed'?item.previous_filename:item.filename);
   checkPatch(item);
   files.push({filename:item.filename,status:item.status,changes:item.changes,
    additions:item.additions,deletions:item.deletions,patch:item.patch});
  }
  if(files.length>first.count||files.length>MAX_FILES)fail('PR_FILES_MISMATCH');
  if(entries.length<PER_PAGE){
   if(files.length!==first.count)fail('PR_FILES_MISMATCH');
   break;
  }
  if(page===pageLimit)fail('PR_PAGINATION_UNBOUNDED');
 }
 if(files.length!==first.count)fail('PR_FILES_MISMATCH');
 // PR patches are three-dot diffs: the old source is the merge-base,
 // which can differ from the current base branch tip. Never use mutable refs.
 const comparison=await getJson('/compare/'+first.baseSha+'...'+first.headSha);
 if(comparison?.base_commit?.sha!==first.baseSha||
  !SHA.test(comparison?.merge_base_commit?.sha||''))fail('UNVERIFIED_DIFF_BASE');
 const mergeBaseSha=comparison.merge_base_commit.sha;
 async function readSource(filename,ref,blobSha){
  if(!sourcePath(filename))fail('UNVERIFIED_PINNED_SOURCE');
  const apiPath=filename.split('/').map(encodeURIComponent).join('/');
  return decodeDiffSource(await getJson('/contents/'+apiPath+'?ref='+ref),
   {path:filename,blobSha});
 }
 for(const f of files){
  const blobSha=seenBlobs.get(f.filename);
  if(!SHA.test(blobSha||''))fail('UNVERIFIED_PINNED_SOURCE');
  const before=f.status==='added'?'':await readSource(oldPaths.get(f.filename),mergeBaseSha);
  const after=f.status==='removed'?'':await readSource(f.filename,first.headSha,blobSha);
  verifyPinnedDiff(f.patch,before,after);
  // Keep optional full-file semantic hydration and its original narrower policy.
  if(hydrateSource===true&&sourcePathAllowed(f.filename)&&f.status!=='removed'){
   const apiPath=f.filename.split('/').map(encodeURIComponent).join('/');
   const raw=await getJson('/contents/'+apiPath+'?ref='+first.headSha);
   f.fullSource=decodePinnedGithubSource(raw,{path:f.filename,blobSha});
  }
 }
 const second=checkPR(await getJson('/pulls/'+prNumber),prNumber);
 if(first.headSha!==second.headSha||first.baseSha!==second.baseSha||
  first.repositoryId!==second.repositoryId||first.count!==second.count||
  first.state!==second.state)fail('STALE_PR_SHA');
 // Rechecking GH head and base prevents mixing one PR's immutable files with
 // another commit during pagination, but cannot independently attest CI status.
 const reviewed=reviewGithubPrEvidence({repository:REPO,number:prNumber,
  headSha:first.headSha,files,hasMorePages:false});
 return Object.freeze({...reviewed,source:'github-api-authenticated-readonly',
  authenticated:true,headStable:true,completeDiff:true,mergeAllowed:false,
  baseSha:first.baseSha,mergeBaseSha,diffContentVerified:true,changedFiles:first.count,draft:first.draft,state:first.state});
}
module.exports={loadGameHubPullRequest};
