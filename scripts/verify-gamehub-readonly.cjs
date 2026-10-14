'use strict';
// Read-only production connectivity probe; never changes GameHub or Ultra Sentinel.
// Requires a real authenticated owner token from an operator-controlled secret store.
const {authenticateGitHubOwner}=require('../packages/recovery/github-owner-identity.cjs');
const REPO='cardenaspiero255-lang/gamehub-ultra';
const REPO_ID=1375408706;
const OWNER_ID=322222186;
async function verifyGameHubReadOnly({token,fetchImpl=globalThis.fetch}={}){
 await authenticateGitHubOwner({token,expectedOwner:'cardenaspiero255-lang',
  expectedOwnerId:OWNER_ID,fetchImpl});
 const response=await fetchImpl('https://api.github.com/repos/'+REPO,{
  method:'GET',redirect:'error',signal:AbortSignal.timeout(10000),
  headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
   'X-GitHub-Api-Version':'2022-11-28','User-Agent':'Ultra-Sentinel-GameHub-ReadOnly'}
 });
 if(!response||response.status!==200)throw Error('GAMEHUB_READ_ACCESS_FAILED');
 const repo=await response.json();
 if(!repo||repo.full_name!==REPO||repo.id!==REPO_ID||repo.owner?.id!==OWNER_ID)
  throw Error('GAMEHUB_REPOSITORY_IDENTITY_MISMATCH');
 return Object.freeze({status:'GAMEHUB_READONLY_VERIFIED',
  ownerId:OWNER_ID,repository:REPO,remoteWrites:false,mergeAllowed:false});
}
async function main(){
 const token=process.env.ULTRA_SENTINEL_OWNER_GITHUB_TOKEN;
 if(!token)throw Error('OWNER_TOKEN_NOT_CONFIGURED');
 const result=await verifyGameHubReadOnly({token});
 if(result.status!=='GAMEHUB_READONLY_VERIFIED')throw Error('GAMEHUB_UNVERIFIED');
 process.stdout.write('GAMEHUB_READONLY_VERIFIED\n');
}
if(require.main===module){
 main().catch(()=>{process.stderr.write('GAMEHUB_READONLY_PROBE_FAILED\n');process.exitCode=1;});
}
module.exports={verifyGameHubReadOnly};
