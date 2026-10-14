'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {readJarvisRepositoryState}=require('../../adapters/jarvis/jarvis-readonly.cjs');
const token='read-only-test-token';
const id=1349889592,owner=322222186,repo='cardenaspiero255-lang/JARVIS';
function mock({repoId=id,ownerId=owner,pulls=[],status=200}={}){
 const calls=[];
 const fetchImpl=async(url,request)=>{
  calls.push({url,method:request.method});
  assert.equal(request.method,'GET');assert.equal(request.redirect,'error');
  assert.equal(request.headers.Authorization,'Bearer '+token);
  const content=url.endsWith('/pulls?state=open&per_page=30&page=1')?pulls:
   {id:repoId,full_name:repo,owner:{id:ownerId},default_branch:'main',archived:false};
  return {status,url,headers:{get:()=> 'application/vnd.github+json'},
   text:async()=>JSON.stringify(content)};
 };
 return {fetchImpl,calls};
}
test('JARVIS authenticates immutable repo identity and reports bounded open PR heads',async()=>{
 const {fetchImpl,calls}=mock({pulls:[{number:2,state:'open',
  head:{sha:'a'.repeat(40)},base:{repo:{id}},draft:true}]});
 const result=await readJarvisRepositoryState({token,fetchImpl});
 assert.equal(result.repository,repo);
 assert.equal(result.openPrs.length,1);
 assert.equal(result.openPrs[0].pr,2);
 assert.equal(result.remoteWrites,false);
 assert.equal(result.autoMerge,false);
 assert.equal(result.monitor24x7Deployed,false);
 assert.equal(calls.length,2);
 assert.ok(calls.every(x=>x.method==='GET'));
});
test('JARVIS rejects repo impersonation and duplicate or forged PR metadata',async()=>{
 for(const params of [{repoId:99},{ownerId:1234},
  {pulls:[{number:2,state:'closed',head:{sha:'a'.repeat(40)},base:{repo:{id}}}]},
  {pulls:Array.from({length:30},(_,i)=>({number:i+1,state:'open',
   head:{sha:'a'.repeat(40)},base:{repo:{id}}}))}
 ]){
  await assert.rejects(()=>readJarvisRepositoryState({token,fetchImpl:mock(params).fetchImpl}));
 }
});
test('JARVIS rejects missing credentials and HTTP errors',async()=>{
 await assert.rejects(()=>readJarvisRepositoryState({token:'',fetchImpl:mock().fetchImpl}),
 /JARVIS_TOKEN_REQUIRED/);
 await assert.rejects(()=>readJarvisRepositoryState({token,fetchImpl:mock({status:403}).fetchImpl}),
 /JARVIS_GITHUB_API_UNAVAILABLE/);
});
