'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {verifyGameHubReadOnly}=require('../../scripts/verify-gamehub-readonly.cjs');
const token='test-token-secret-value-123';
function mockFetch({login='cardenaspiero255-lang',userId=322222186,
 repoId=1375408706,repoName='cardenaspiero255-lang/gamehub-ultra',status=200}={}){
 return async(url,opts)=>{
  assert.equal(opts.method,'GET');
  assert.equal(opts.redirect,'error');
  assert.equal(opts.headers.Authorization,'Bearer '+token);
  if(url==='https://api.github.com/user')
   return {status:200,json:async()=>({login,id:userId})};
  assert.equal(url,'https://api.github.com/repos/cardenaspiero255-lang/gamehub-ultra');
  return {status,json:async()=>({id:repoId,full_name:repoName,owner:{id:322222186}})};
 };
}
test('GameHub probe verifies authenticated owner and immutable repository identity',async()=>{
 const result=await verifyGameHubReadOnly({token,fetchImpl:mockFetch()});
 assert.equal(result.status,'GAMEHUB_READONLY_VERIFIED');
 assert.equal(result.remoteWrites,false);
 assert.equal(result.mergeAllowed,false);
});
test('GameHub probe rejects wrong owner, wrong repository or failed GitHub API',async()=>{
 await assert.rejects(verifyGameHubReadOnly({token,fetchImpl:mockFetch({userId:123})}),
  /OWNER_IDENTITY_MISMATCH/);
 await assert.rejects(verifyGameHubReadOnly({token,fetchImpl:mockFetch({repoId:999})}),
  /GAMEHUB_REPOSITORY_IDENTITY_MISMATCH/);
 await assert.rejects(verifyGameHubReadOnly({token,fetchImpl:mockFetch({repoName:'attacker/repo'})}),
  /GAMEHUB_REPOSITORY_IDENTITY_MISMATCH/);
 await assert.rejects(verifyGameHubReadOnly({token,fetchImpl:mockFetch({status:403})}),
  /GAMEHUB_READ_ACCESS_FAILED/);
});
