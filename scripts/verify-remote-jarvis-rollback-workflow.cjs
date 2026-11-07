'use strict';
/**
 * Read-only GitHub Actions verifier of one owner issue_comment authorizing a
 * precise remote rollback, independent of the original repair approval.
 * The rollback is permitted only if an actual single repair commit exists,
 * parented by the pinned JARVIS #105 baseline with EXACTLY two Kotlin edits.
 */
const fs=require('node:fs'),path=require('node:path');
const {createPinnedRollbackPlan,verifyRollbackOwnerApproval,
 verifyRollbackNonce,WORKFLOW,AUDIENCE,MARKER}=
 require('../packages/recovery/github-remote-owner-rollback.cjs');
const {digestRollbackPlan,treeEntries,verifyExactRepairDelta}=
 require('../packages/recovery/supervised-github-branch-rollback.cjs');
const REPO='cardenaspiero255-lang/Ultra-Sentinel';
const TARGET='cardenaspiero255-lang/JARVIS';
const JWKS='https://token.actions.githubusercontent.com/.well-known/jwks';
function deny(){throw Error('OWNER_REMOTE_ROLLBACK_WORKFLOW_BLOCKED');}
function context(env){
 if(env.GITHUB_ACTIONS!=='true'||env.GITHUB_EVENT_NAME!=='issue_comment'||
  env.GITHUB_WORKFLOW_REF!==WORKFLOW||
  env.GITHUB_REPOSITORY!==REPO||env.GITHUB_REPOSITORY_ID!=='1418338512'||
  env.GITHUB_ACTOR!=='cardenaspiero255-lang'||env.GITHUB_ACTOR_ID!=='322222186'||
  env.GITHUB_REF!=='refs/heads/main'||env.GITHUB_RUN_ATTEMPT!=='1'||
  !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA||'')||
  !/^[1-9]\d{0,16}$/.test(env.GITHUB_RUN_ID||'')||
  !path.isAbsolute(env.GITHUB_EVENT_PATH||'')||
  !path.isAbsolute(env.RUNNER_TEMP||'')||
  typeof env.ULTRA_OWNER_COMMENT_READ_TOKEN!=='string'||
  env.ULTRA_OWNER_COMMENT_READ_TOKEN.length<16||
  typeof env.ACTIONS_ID_TOKEN_REQUEST_TOKEN!=='string'||
  env.ACTIONS_ID_TOKEN_REQUEST_TOKEN.length<8||
  typeof env.ACTIONS_ID_TOKEN_REQUEST_URL!=='string')deny();
 return {sha:env.GITHUB_SHA,runId:env.GITHUB_RUN_ID,repoId:env.GITHUB_REPOSITORY_ID,
  actorId:env.GITHUB_ACTOR_ID,audience:AUDIENCE,workflowRef:WORKFLOW,
  eventName:'issue_comment',runAttempt:'1'};
}
function parseRollbackComment(text,sha){
 if(typeof text!=='string'||text.length>500)deny();
 const p=text.split('|');
 if(p.length!==7||p[0]!==MARKER||p[1]!=='ROLLBACK_EXISTING_DRAFT_PR_BRANCH'||
  p[2]!==sha||!/^[a-f0-9]{64}$/.test(p[3]||'')||
  !/^[a-f0-9]{40}$/.test(p[4]||'')||
  !/^[A-Za-z0-9_-]{20,96}$/.test(p[5]||'')||
  !/^\d{13}$/.test(p[6]||''))deny();
 const expiresAt=Number(p[6]);
 if(!Number.isSafeInteger(expiresAt))deny();
 return {workflowSha:p[2],planDigest:p[3],repairHeadSha:p[4],
  nonce:p[5],expiresAt,operation:p[1]};
}
async function apiGet(pathname,token,fetchImpl){
 const response=await fetchImpl('https://api.github.com'+pathname,{
  method:'GET',redirect:'error',signal:AbortSignal.timeout(15000),
  headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
   'X-GitHub-Api-Version':'2022-11-28'}});
 if(!response||response.status!==200)deny();
 const value=await response.json();
 if(!value||typeof value!=='object'||Array.isArray(value))deny();
 return value;
}
async function loadVerifiedRemotePlan({workflowSha,expectedRepairSha,readToken,fetchImpl=fetch}){
 if(!/^[a-f0-9]{40}$/.test(workflowSha||'')||
  !/^[a-f0-9]{40}$/.test(expectedRepairSha||'')||typeof readToken!=='string'||
  readToken.length<16)deny();
 const prefix='/repos/'+TARGET;
 const [usRef,jarvisRepo,jarvisMain,pr,repair,original]=await Promise.all([
  apiGet('/repos/'+REPO+'/git/ref/heads/main',readToken,fetchImpl),
  apiGet(prefix,readToken,fetchImpl),
  apiGet(prefix+'/git/ref/heads/main',readToken,fetchImpl),
  apiGet(prefix+'/pulls/105',readToken,fetchImpl),
  apiGet(prefix+'/git/commits/'+expectedRepairSha,readToken,fetchImpl),
  apiGet(prefix+'/git/commits/a88a29ba4119d3f68b2268367f594a0ac1168f9e',
   readToken,fetchImpl)
 ]);
 if(usRef.ref!=='refs/heads/main'||usRef.object?.type!=='commit'||
  usRef.object.sha!==workflowSha||jarvisRepo.id!==1349889592||
  jarvisRepo.full_name!==TARGET||jarvisMain.ref!=='refs/heads/main'||
  jarvisMain.object?.type!=='commit'||
  jarvisMain.object.sha!=='747c14b5d97750a7b2736968e2d516f02448558d'||
  pr.number!==105||pr.state!=='open'||pr.draft!==true||
  pr.merged!==false||pr.user?.id!==322222186||
  pr.user?.login!=='cardenaspiero255-lang'||
  pr.head?.repo?.full_name!==TARGET||pr.head?.ref!=='fix/ultra-sentinel-polite-voice-20261106'||
  pr.head?.sha!==expectedRepairSha||pr.base?.repo?.full_name!==TARGET||
  pr.base?.ref!=='main'||pr.base?.sha!==jarvisMain.object.sha||
  repair.sha!==expectedRepairSha||!Array.isArray(repair.parents)||
  repair.parents.length!==1||
  repair.parents[0]?.sha!=='a88a29ba4119d3f68b2268367f594a0ac1168f9e'||
  !/^[a-f0-9]{40}$/.test(repair.tree?.sha||'')||
  original.sha!=='a88a29ba4119d3f68b2268367f594a0ac1168f9e'||
  original.tree?.sha!=='b48da9292d1f26669eb30b483ee19e59944041e5')deny();
 const plan=createPinnedRollbackPlan({repairHeadSha:repair.sha,repairTreeSha:repair.tree.sha});
 const [oldTree,newTree]=await Promise.all([
  apiGet(prefix+'/git/trees/'+plan.originalTreeSha+'?recursive=1',readToken,fetchImpl),
  apiGet(prefix+'/git/trees/'+plan.repairTreeSha+'?recursive=1',readToken,fetchImpl)
 ]);
 verifyExactRepairDelta(treeEntries(oldTree,plan.originalTreeSha),
  treeEntries(newTree,plan.repairTreeSha),plan.files);
 return Object.freeze({plan,planDigest:digestRollbackPlan(plan),
  authenticatedLiveSource:true});
}
async function main({env=process.env,fetchImpl=fetch,writeReceipt=true}={}){
 try{
  const ctx=context(env);
  const event=JSON.parse(fs.readFileSync(env.GITHUB_EVENT_PATH,'utf8'));
  const request=parseRollbackComment(event.comment?.body,ctx.sha);
  if(event.action!=='created'||event.repository?.id!==1418338512||
   event.issue?.number!==50||event.issue?.pull_request!=null||
   event.sender?.id!==322222186||event.comment?.user?.id!==322222186)deny();
  // Before issuer JWT issuance reject mismatched plan, PR, sha and tree.
  const live=await loadVerifiedRemotePlan({workflowSha:ctx.sha,
   expectedRepairSha:request.repairHeadSha,
   readToken:env.ULTRA_OWNER_COMMENT_READ_TOKEN,fetchImpl});
  if(live.planDigest!==request.planDigest)deny();
  const url=new URL(env.ACTIONS_ID_TOKEN_REQUEST_URL);
  if(url.protocol!=='https:'||url.username||url.password||url.port||url.hash||
   !url.hostname.endsWith('.actions.githubusercontent.com')||
   !url.pathname.startsWith('/'))deny();
  url.searchParams.set('audience',AUDIENCE);
  const token=await fetchImpl(url.toString(),{method:'GET',redirect:'error',
   signal:AbortSignal.timeout(15000),
   headers:{Authorization:'bearer '+env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}});
  if(!token?.ok)deny();
  const jwt=(await token.json())?.value;
  const keys=await fetchImpl(JWKS,{method:'GET',redirect:'error',
   signal:AbortSignal.timeout(15000)});
  if(!keys?.ok)deny();
  const approval=verifyRollbackOwnerApproval({jwt,jwks:await keys.json(),
   context:ctx,event,request,plan:live.plan});
  const nonce=await verifyRollbackNonce({event,
   token:env.ULTRA_OWNER_COMMENT_READ_TOKEN,fetchImpl});
  if(nonce.commentId!==approval.commentId||nonce.nonce!==approval.nonce)deny();
  const receipt=Object.freeze({...approval,
   authenticatedLiveSource:true,nonceReplayBlocked:true,
   remoteWrites:false,mergeAllowed:false,
   rollbackPlan:live.plan,requiresSeparateWriteExecutor:true});
  if(writeReceipt!==true&&writeReceipt!==false)deny();
  if(writeReceipt)fs.writeFileSync(path.join(env.RUNNER_TEMP,
   'owner-remote-rollback-approval-receipt.json'),
   JSON.stringify(receipt)+'\n',{flag:'wx',mode:0o600});
  process.stdout.write('OWNER_GITHUB_ROLLBACK_APPROVAL_VERIFIED_NO_WRITE\n');
  return receipt;
 }catch{deny();}
}
if(require.main===module)main().catch(()=>{
 process.stderr.write('OWNER_REMOTE_ROLLBACK_WORKFLOW_BLOCKED\n');
 process.exitCode=1;
});
module.exports={main,context,parseRollbackComment,loadVerifiedRemotePlan};
