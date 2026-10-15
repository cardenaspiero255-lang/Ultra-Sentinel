'use strict';
// Operator-only real GitHub identity check. No token is persisted or printed.
// Supply ULTRA_SENTINEL_OWNER_GITHUB_TOKEN via a secret store, not a CLI argument.
const {authenticateGitHubOwner}=require('../packages/recovery/github-owner-identity.cjs');
async function main(){
 const token=process.env.ULTRA_SENTINEL_OWNER_GITHUB_TOKEN;
 if(!token)throw Error('OWNER_TOKEN_NOT_CONFIGURED');
 const actor=await authenticateGitHubOwner({
  token,expectedOwner:'cardenaspiero255-lang',expectedOwnerId:322222186
 });
 if(actor.source!=='github-authenticated-session')throw Error('OWNER_NOT_VERIFIED');
 process.stdout.write('OWNER_IDENTITY_VERIFIED\n');
}
if(require.main===module){
 main().catch(error=>{
  // Do not leak network response bodies or token-bearing error objects.
  process.stderr.write('OWNER_IDENTITY_VERIFICATION_FAILED\n');
  process.exitCode=1;
 });
}
module.exports={main};
