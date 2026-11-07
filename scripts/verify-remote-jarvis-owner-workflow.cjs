'use strict';
/**
 * GitHub-hosted, read-only proof of one owner's GitHub-signed remote repair
 * approval request. Does not grant any GitHub write token or execute a repair.
 * Never use a receipt from a PR as an authorization to skip Ed25519.
 */
const fs=require('node:fs'),path=require('node:path');
const {TARGET_PLAN_DIGEST,REMOTE_AUDIENCE,REMOTE_WORKFLOW,
 verifyRemoteOwnerApproval,verifyUniqueRemoteOwnerComment}=
 require('../packages/recovery/github-remote-owner-approval.cjs');
const OWNER_REPO='cardenaspiero255-lang/Ultra-Sentinel';
const TARGET='cardenaspiero255-lang/JARVIS';
const SOURCE_HEAD='a88a29ba4119d3f68b2268367f594a0ac1168f9e';
const SOURCE_MAIN='747c14b5d97750a7b2736968e2d516f02448558d';
const SOURCE_TREE='b48da9292d1f26669eb30b483ee19e59944041e5';
const PINNED_BRANCH='fix/ultra-sentinel-polite-voice-20261106';
const ISSUER_JWKS='https://token.actions.githubusercontent.com/.well-known/jwks';
function denied(){throw Error('REMOTE_OWNER_WORKFLOW_BLOCKED');}
function parseComment(body,workflowSha){
 if(typeof body!=='string'||body.length>450)denied();
 const a=body.split('|');
 if(a.length!==6||a[0]!=='ULTRA_SENTINEL_REMOTE_APPROVAL_V1'||
  a[1]!=='COMMIT_TO_EXISTING_DRAFT_PR_BRANCH'||
  a[2]!==workflowSha||a[3]!==TARGET_PLAN_DIGEST||
  !/^[A-Za-z0-9_-]{20,96}$/.test(a[4]||'')||
  !/^\d{13}$/.test(a[5]))denied();
 const expiresAt=Number(a[5]);
 if(!Number.isSafeInteger(expiresAt))denied();
 return {operation:a[1],workflowSha:a[2],planDigest:a[3],
  nonce:a[4],expiresAt};
}
function trustedContext(env){
 if(env.GITHUB_ACTIONS!=='true'||env.GITHUB_EVENT_NAME!=='issue_comment'||
  env.GITHUB_WORKFLOW_REF!==REMOTE_WORKFLOW||
  env.GITHUB_REPOSITORY!==OWNER_REPO||
  env.GITHUB_REPOSITORY_ID!=='1418338512'||
  env.GITHUB_ACTOR!=='cardenaspiero255-lang'||
  env.GITHUB_ACTOR_ID!=='322222186'||
  env.GITHUB_REF!=='refs/heads/main'||env.GITHUB_RUN_ATTEMPT!=='1'||
  !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA||'')||
  !/^[1-9]\d{0,16}$/.test(env.GITHUB_RUN_ID||'')||
  !path.isAbsolute(env.GITHUB_EVENT_PATH||'')||
  !path.isAbsolute(env.RUNNER_TEMP||'')||
  typeof env.ULTRA_OWNER_COMMENT_READ_TOKEN!=='string'||
  env.ULTRA_OWNER_COMMENT_READ_TOKEN.length<16||
  typeof env.ACTIONS_ID_TOKEN_REQUEST_TOKEN!=='string'||
  env.ACTIONS_ID_TOKEN_REQUEST_TOKEN.length<8||
  typeof env.ACTIONS_ID_TOKEN_REQUEST_URL!=='string')denied();
 return {sha:env.GITHUB_SHA,runId:env.GITHUB_RUN_ID,
  repoId:env.GITHUB_REPOSITORY_ID,actorId:env.GITHUB_ACTOR_ID,
  audience:REMOTE_AUDIENCE,workflowRef:REMOTE_WORKFLOW,
  eventName:'issue_comment',runAttempt:'1'};
}
async function getJson(url,token,fetchImpl){
 const resp=await fetchImpl(url,{method:'GET',redirect:'error',
  signal:AbortSignal.timeout(15000),
  headers:{Accept:'application/vnd.github+json',
   'X-GitHub-Api-Version':'2022-11-28',
   Authorization:'Bearer '+token}});
 if(!resp?.ok)denied();
 const value=await resp.json();
 if(!value||typeof value!=='object'||Array.isArray(value))denied();
 return value;
}
async function verifyLiveTargetAndSource({fetchImpl,readToken,workflowSha}){
 const [usRef,jarvisRef,pr,headCommit,jarvisRepo]=await Promise.all([
  getJson('https://api.github.com/repos/'+OWNER_REPO+'/git/ref/heads/main',readToken,fetchImpl),
  getJson('https://api.github.com/repos/'+TARGET+'/git/ref/heads/main',readToken,fetchImpl),
  getJson('https://api.github.com/repos/'+TARGET+'/pulls/105',readToken,fetchImpl),
  getJson('https://api.github.com/repos/'+TARGET+'/git/commits/'+SOURCE_HEAD,readToken,fetchImpl),
  getJson('https://api.github.com/repos/'+TARGET,readToken,fetchImpl)
 ]);
 if(usRef.ref!=='refs/heads/main'||usRef.object?.sha!==workflowSha||
   jarvisRef.ref!=='refs/heads/main'||jarvisRef.object?.sha!==SOURCE_MAIN||
   jarvisRepo.id!==1349889592||jarvisRepo.full_name!==TARGET||
   pr.number!==105||pr.state!=='open'||pr.draft!==true||
   pr.merged!==false||pr.user?.id!==322222186||
   pr.user?.login!=='cardenaspiero255-lang'||
   pr.head?.repo?.full_name!==TARGET||
   pr.head?.ref!==PINNED_BRANCH||pr.head?.sha!==SOURCE_HEAD||
   pr.base?.repo?.full_name!==TARGET||pr.base?.ref!=='main'||
   pr.base?.sha!==SOURCE_MAIN||
   headCommit.sha!==SOURCE_HEAD||headCommit.tree?.sha!==SOURCE_TREE)
   denied();
 return Object.freeze({sourceAuthenticatedAtCheck:true,sourceHeadSha:SOURCE_HEAD,
  sourceMainSha:SOURCE_MAIN,sourceTreeSha:SOURCE_TREE});
}
async function main({env=process.env,fetchImpl=fetch}={}){
 try{
  const context=trustedContext(env);
  const event=JSON.parse(fs.readFileSync(env.GITHUB_EVENT_PATH,'utf8'));
  const request=parseComment(event.comment?.body,env.GITHUB_SHA);
  // Fail before issuer token request on an unrelated actor/issue.
  if(event.action!=='created'||event.repository?.id!==1418338512||
   event.issue?.number!==50||event.issue?.pull_request!=null||
   event.sender?.id!==322222186||event.comment?.user?.id!==322222186)
   denied();
  const url=new URL(env.ACTIONS_ID_TOKEN_REQUEST_URL);
  if(url.protocol!=='https:'||url.username||url.password||url.port||url.hash||
   !url.hostname.endsWith('.actions.githubusercontent.com')||
   !url.pathname.startsWith('/'))denied();
  url.searchParams.set('audience',REMOTE_AUDIENCE);
  const tokenResponse=await fetchImpl(url.toString(),{
   method:'GET',redirect:'error',signal:AbortSignal.timeout(15000),
   headers:{Authorization:'bearer '+env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}});
  if(!tokenResponse?.ok)denied();
  const idToken=(await tokenResponse.json())?.value;
  // JWKS is fetched ONLY from GitHub's fixed issuer, never an event header.
  const keys=await fetchImpl(ISSUER_JWKS,{method:'GET',redirect:'error',
   signal:AbortSignal.timeout(15000)});
  if(!keys?.ok)denied();
  const approval=verifyRemoteOwnerApproval({
   jwt:idToken,jwks:await keys.json(),context,event,request});
  const unique=await verifyUniqueRemoteOwnerComment({
   event,token:env.ULTRA_OWNER_COMMENT_READ_TOKEN,fetchImpl});
  if(unique.nonce!==approval.nonce||unique.commentId!==approval.commentId)
   denied();
  const pinned=await verifyLiveTargetAndSource({
   fetchImpl,readToken:env.ULTRA_OWNER_COMMENT_READ_TOKEN,
   workflowSha:context.sha});
  // This artifact is NOT a signed grant for the legacy Ed25519 executor.
  const receipt=Object.freeze({
   ...approval,...pinned,nonceReplayBlocked:true,
   remoteWrites:false,remoteWriteExecuted:false,rollbackAuthorized:false,
   mergeAllowed:false,releaseAuthorized:false,
   requiresSeparateWriteExecutor:true
  });
  fs.writeFileSync(path.join(env.RUNNER_TEMP,'owner-remote-approval-receipt.json'),
   JSON.stringify(receipt)+'\n',{flag:'wx',mode:0o600});
  process.stdout.write('OWNER_REMOTE_APPROVAL_VERIFIED_NO_REMOTE_WRITE\n');
  return receipt;
 }catch{denied();}
}
if(require.main===module)main().catch(()=>{
 process.stderr.write('REMOTE_OWNER_WORKFLOW_BLOCKED\n');process.exitCode=1;
});
module.exports={main,trustedContext,parseComment,verifyLiveTargetAndSource};
