'use strict';
/* GitHub OIDC workload attestation: never logs JWT, runner token or key data.
 * The ID token authorizes a frozen source repair EXPERIMENT in sandbox only. */
const fs=require('node:fs');
const {verifyGitHubOidcApproval,AUDIENCE}=require('../packages/recovery/github-oidc-approval.cjs');
const TRUST='https://token.actions.githubusercontent.com/.well-known/jwks';
async function main({fetchImpl=fetch,env=process.env}={}){
 if(env.GITHUB_REPOSITORY!=='cardenaspiero255-lang/Ultra-Sentinel'||
    env.GITHUB_REPOSITORY_ID!=='1418338512'||
    env.GITHUB_ACTOR_ID!=='322222186'||
    !['workflow_dispatch','issue_comment'].includes(env.GITHUB_EVENT_NAME)||
    env.GITHUB_REF!=='refs/heads/main'||
    env.GITHUB_RUN_ATTEMPT!=='1'||
    !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA||'')||
    !/^[1-9]\d{0,16}$/.test(env.GITHUB_RUN_ID||'')||
    typeof env.ACTIONS_ID_TOKEN_REQUEST_TOKEN!=='string'||
    env.ACTIONS_ID_TOKEN_REQUEST_TOKEN.length<8)
  throw Error('OIDC_WORKFLOW_CONTEXT_DENIED');
 // A comment can trigger this frozen read-only proof only when issued by the
 // same GitHub owner on the pinned single owner-control issue with exact body.
 let approvedOwnerIssueComment=false;
 if(env.GITHUB_EVENT_NAME==='issue_comment'){
  if(typeof env.GITHUB_EVENT_PATH!=='string'||!env.GITHUB_EVENT_PATH.startsWith('/'))
   throw Error('OIDC_OWNER_COMMENT_DENIED');
  const event=JSON.parse(fs.readFileSync(env.GITHUB_EVENT_PATH,'utf8'));
  approvedOwnerIssueComment=event?.action==='created'&&
    event.repository?.id===1418338512&&
    event.issue?.number===50&&event.issue?.pull_request==null&&
    event.comment?.body==='ULTRA_SENTINEL_GAMEHUB_OWNER_OIDC_PR151_V1'&&
    event.comment?.user?.id===322222186&&event.sender?.id===322222186;
  if(!approvedOwnerIssueComment)throw Error('OIDC_OWNER_COMMENT_DENIED');
 }
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
  audience:AUDIENCE,eventName:env.GITHUB_EVENT_NAME,approvedOwnerIssueComment
 }});
 process.stdout.write(JSON.stringify(claim)+'\n');
 return claim;
}
if(require.main===module)main().catch(()=>{
 process.stderr.write('OIDC_OWNER_SANDBOX_APPROVAL_DENIED\n');process.exitCode=1;
});
module.exports={main};
