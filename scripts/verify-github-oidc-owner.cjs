'use strict';
/* GitHub OIDC workload attestation: never logs JWT, runner token or key data.
 * The ID token authorizes a frozen source repair EXPERIMENT in sandbox only. */
const {verifyGitHubOidcApproval,AUDIENCE}=require('../packages/recovery/github-oidc-approval.cjs');
const TRUST='https://token.actions.githubusercontent.com/.well-known/jwks';
async function main({fetchImpl=fetch,env=process.env}={}){
 if(env.GITHUB_REPOSITORY!=='cardenaspiero255-lang/Ultra-Sentinel'||
    env.GITHUB_REPOSITORY_ID!=='1418338512'||
    env.GITHUB_ACTOR_ID!=='322222186'||
    env.GITHUB_EVENT_NAME!=='workflow_dispatch'||
    env.GITHUB_REF!=='refs/heads/main'||
    env.GITHUB_RUN_ATTEMPT!=='1'||
    !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA||'')||
    !/^[1-9]\d{0,16}$/.test(env.GITHUB_RUN_ID||'')||
    typeof env.ACTIONS_ID_TOKEN_REQUEST_TOKEN!=='string'||
    env.ACTIONS_ID_TOKEN_REQUEST_TOKEN.length<8)
  throw Error('OIDC_WORKFLOW_CONTEXT_DENIED');
 const u=new URL(env.ACTIONS_ID_TOKEN_REQUEST_URL);
 if(u.protocol!=='https:'||u.username||u.password||u.hash||
  !u.hostname.endsWith('.actions.githubusercontent.com')||
  u.port||!u.pathname.startsWith('/'))throw Error('OIDC_ISSUER_URL_DENIED');
 u.searchParams.set('audience',AUDIENCE);
 const headers={Authorization:'bearer '+env.ACTIONS_ID_TOKEN_REQUEST_TOKEN};
 const tokenResponse=await fetchImpl(u.toString(),{
  headers,redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!tokenResponse.ok)throw Error('OIDC_TOKEN_NOT_ISSUED');
 const data=await tokenResponse.json();
 const jwt=data?.value;
 if(typeof jwt!=='string'||jwt.length>25000)throw Error('OIDC_INVALID_ISSUANCE');
 const keyResponse=await fetchImpl(TRUST,{
  redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!keyResponse.ok)throw Error('OIDC_JWKS_UNAVAILABLE');
 const jwks=await keyResponse.json();
 const claim=verifyGitHubOidcApproval({jwt,jwks,context:{
  sha:env.GITHUB_SHA,runId:env.GITHUB_RUN_ID,
  actorId:env.GITHUB_ACTOR_ID,repoId:env.GITHUB_REPOSITORY_ID,
  audience:AUDIENCE
 }});
 process.stdout.write(JSON.stringify(claim)+'\n');
 return claim;
}
if(require.main===module)main().catch(()=>{
 process.stderr.write('OIDC_OWNER_SANDBOX_APPROVAL_DENIED\n');process.exitCode=1;
});
module.exports={main};
