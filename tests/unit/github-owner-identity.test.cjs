'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {authenticateGitHubOwner}=require('../../packages/recovery/github-owner-identity.cjs');
test('authenticated GitHub owner succeeds and identity is server-derived',async()=>{
 const actor=await authenticateGitHubOwner({token:'token-with-length-12345',
 expectedOwner:'cardenaspiero255-lang',fetchImpl:async(url,options)=>{
 assert.equal(url,'https://api.github.com/user');
 assert.equal(options.headers.Authorization,'Bearer token-with-length-12345');
 return {status:200,json:async()=>({login:'cardenaspiero255-lang',id:12345})};
 }});
 assert.equal(actor.login,'cardenaspiero255-lang');assert.equal(actor.userId,12345);
});
test('unverified identity and failed API deny access',async()=>{
 await assert.rejects(authenticateGitHubOwner({token:'token-with-length-12345',
 expectedOwner:'cardenaspiero255-lang',fetchImpl:async()=>({status:200,json:async()=>({login:'attacker',id:12})})}),/OWNER_IDENTITY_MISMATCH/);
 await assert.rejects(authenticateGitHubOwner({token:'token-with-length-12345',
 expectedOwner:'cardenaspiero255-lang',fetchImpl:async()=>({status:401})}),/GITHUB_AUTHENTICATION_FAILED/);
});
