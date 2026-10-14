'use strict';
/* Only the GitHub /user endpoint authenticates the bearer token. Never accept
   actor identity from an untrusted repair plan or PR payload. */
async function authenticateGitHubOwner({token,expectedOwner,fetchImpl=globalThis.fetch}={}){
 if(typeof token!=='string'||token.length<16||!expectedOwner||
  typeof fetchImpl!=='function')throw Error('AUTHENTICATION_UNAVAILABLE');
 const response=await fetchImpl('https://api.github.com/user',{
  method:'GET',redirect:'error',signal:AbortSignal.timeout(10000),
  headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
   'X-GitHub-Api-Version':'2022-11-28','User-Agent':'Ultra-Sentinel-Owner-Verification'}});
 if(!response||response.status!==200)throw Error('GITHUB_AUTHENTICATION_FAILED');
 const user=await response.json();
 if(!user||typeof user.login!=='string'||user.login.toLowerCase()!==expectedOwner.toLowerCase()||
  !Number.isSafeInteger(user.id)||user.id<1)throw Error('OWNER_IDENTITY_MISMATCH');
 return Object.freeze({source:'github-authenticated-session',login:expectedOwner,userId:user.id});
}
module.exports={authenticateGitHubOwner};
