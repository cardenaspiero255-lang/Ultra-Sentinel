'use strict';
/* GitHub single approval, live OIDC JWT, exact registered policy and comment.
 * The approval is one GitHub-authorized issue comment; ChatGPT text is NOT a
 * stand-in for cryptographic identity. No keys, tokens or raw source in output.
 */
const fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
const {verifyGitHubSingleApproval,MARKER}=require('../packages/recovery/github-single-approval.cjs');
const {loadRegisteredPlan}=require('../packages/recovery/registered-owner-plans.cjs');
const {verifyUniqueOwnerComment}=require('../packages/recovery/owner-comment-replay-gate.cjs');
const ISSUER='https://token.actions.githubusercontent.com/.well-known/jwks';
const AUD='urn:ultra-sentinel:one-owner-approval:sandbox';
const FLOW='cardenaspiero255-lang/Ultra-Sentinel/.github/workflows/owner-single-approval.yml@refs/heads/main';
function denied(){throw Error('OWNER_SINGLE_WORKFLOW_BLOCKED');}
function readPolicy(root){
 const filename=path.join(root,'docs/quality/owner-single-approval-gamehub-policy.json');
 const contents=fs.readFileSync(filename,'utf8');
 const obj=JSON.parse(contents);
 if(obj.schema!=='ultra-sentinel-single-approval-allowlist/v1'||
  obj.operation!=='SANDBOX_HUNTER_FIXER_JUDGE'||
  obj.targetRepo!=='cardenaspiero255-lang/gamehub-ultra'||
  obj.targetCommit!=='9ad983576c16c6c34d59283979d83c69ede50dce'||
  obj.targetBlob!=='adb11032b9b7f62f865228dfa1c27258ca3fa0df'||
  obj.validation!=='scripts/gamehub-pr151-real-red-green-judge.sh'||
  obj.rollback!=='scripts/gamehub-pr151-real-source-rollback.cjs'||
  obj.scope!=='ONLY_ISOLATED_HISTORICAL_KOTLIN_FIX'||
  obj.remoteWrites!==false||obj.mergeAllowed!==false||
  obj.productionReleaseAllowed!==false)denied();
 return crypto.createHash('sha256').update(contents).digest('hex');
}
function selectOwnerApprovalPlan(root,digest){
 if(typeof digest!=='string'||!/^[0-9a-f]{64}$/.test(digest))denied();
 const legacyDigest=readPolicy(root);
 if(digest===legacyDigest)return Object.freeze({kind:'legacy',
  planId:'gamehub-thermal-historic-pr151',planDigest:digest});
 const registered=loadRegisteredPlan(root,digest);
 return Object.freeze({kind:'registered',planId:registered.plan.id,
  planDigest:registered.planDigest,plan:registered.plan});
}
function parseApprovedComment(body,workflowSha,digest){
 if(typeof body!=='string'||body.length>500)denied();
 const parts=body.split('|');
 if(parts.length!==6||parts[0]!==MARKER||
  parts[1]!=='SANDBOX_HUNTER_FIXER_JUDGE'||
  parts[2]!==workflowSha||parts[3]!==digest||
  !/^[a-zA-Z0-9_-]{20,96}$/.test(parts[4])||
  !/^\d{13}$/.test(parts[5]))denied();
 const expiresAt=Number(parts[5]);
 if(!Number.isSafeInteger(expiresAt))denied();
 return {operation:parts[1],workflowSha:parts[2],planDigest:parts[3],
  nonce:parts[4],expiresAt};
}
async function main({env=process.env,fetchImpl=fetch,root=path.resolve(__dirname,'..')}={}){
 if(env.GITHUB_ACTIONS!=='true'||env.GITHUB_EVENT_NAME!=='issue_comment'||
  env.GITHUB_WORKFLOW_REF!==FLOW||
  env.GITHUB_REPOSITORY!=='cardenaspiero255-lang/Ultra-Sentinel'||
  env.GITHUB_REPOSITORY_ID!=='1418338512'||
  env.GITHUB_ACTOR!=='cardenaspiero255-lang'||env.GITHUB_ACTOR_ID!=='322222186'||
  env.GITHUB_REF!=='refs/heads/main'||env.GITHUB_RUN_ATTEMPT!=='1'||
  !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA||'')||
  !/^[1-9]\d{0,16}$/.test(env.GITHUB_RUN_ID||'')||
  typeof env.GITHUB_EVENT_PATH!=='string'||!path.isAbsolute(env.GITHUB_EVENT_PATH)||
  !env.ACTIONS_ID_TOKEN_REQUEST_TOKEN||!env.ACTIONS_ID_TOKEN_REQUEST_URL)
  denied();
 const event=JSON.parse(fs.readFileSync(env.GITHUB_EVENT_PATH,'utf8'));
 const parts=String(event.comment?.body||'').split('|');
 if(parts.length!==6)denied();
 const selected=selectOwnerApprovalPlan(root,parts[3]);
 const approvedPlan=parseApprovedComment(event.comment?.body,env.GITHUB_SHA,selected.planDigest);
 // Refuse to fetch issuer credentials until local scope/plan inputs pass.
 if(event.action!=='created'||event.issue?.number!==50||
  event.issue?.pull_request!=null||
  event.sender?.id!==322222186||event.comment?.user?.id!==322222186)denied();
 const url=new URL(env.ACTIONS_ID_TOKEN_REQUEST_URL);
 if(url.protocol!=='https:'||url.username||url.password||url.hash||url.port||
  !url.hostname.endsWith('.actions.githubusercontent.com')||
  !url.pathname.startsWith('/'))denied();
 url.searchParams.set('audience',AUD);
 const token=await fetchImpl(url.toString(),{
  headers:{Authorization:'bearer '+env.ACTIONS_ID_TOKEN_REQUEST_TOKEN},
  redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!token?.ok)denied();
 const idToken=(await token.json())?.value;
 const keys=await fetchImpl(ISSUER,{method:'GET',redirect:'error',
  signal:AbortSignal.timeout(15000)});
 if(!keys?.ok)denied();
 const approval=verifyGitHubSingleApproval({
  oidcJwt:idToken,jwks:await keys.json(),
  oidcContext:{
   purpose:'ONE_APPROVAL',sha:env.GITHUB_SHA,runId:env.GITHUB_RUN_ID,
   repoId:env.GITHUB_REPOSITORY_ID,actorId:env.GITHUB_ACTOR_ID,
   audience:AUD,eventName:'issue_comment',approvedOwnerIssueComment:true
  },
  event,approvedPlan
 });
 const unique=await verifyUniqueOwnerComment({
  event,token:env.ULTRA_OWNER_COMMENT_READ_TOKEN,fetchImpl
 });
 if(unique.nonce!==approvedPlan.nonce||unique.commentId!==approval.commentId)denied();
 const receipt={
  schema:'ultra-sentinel-single-approval-github-receipt/v1',
  status:approval.status,workflowSha:approval.workflowSha,
  planDigest:approval.planDigest,nonce:approval.nonce,
  ownerId:322222186,commentId:approval.commentId,runId:approval.runId,
  githubOwnerIdentityVerified:true,ed25519Required:false,
  onlyAllowlistedHistoricSandbox:selected.kind==='legacy',
  registeredPlanId:selected.planId,planKind:selected.kind,
  nonceReplayBlocked:true,remoteWrites:false,mergeAllowed:false,productionReleaseCertified:false
 };
 const dir=env.RUNNER_TEMP;
 if(!dir||!path.isAbsolute(dir))denied();
 const file=path.join(dir,'owner-single-approval-receipt.json');
 fs.writeFileSync(file,JSON.stringify(receipt)+'\n',{flag:'wx',mode:0o600});
 // These are values read from a reviewed, immutable main policy, not issue text.
 if(env.GITHUB_OUTPUT){
  if(!path.isAbsolute(env.GITHUB_OUTPUT))denied();
  const lines=['plan_kind='+selected.kind,'plan_id='+selected.planId];
  if(selected.kind==='registered')lines.push(
   'target_repo='+selected.plan.targetRepo,
   'base_sha='+selected.plan.baseSha,
   'candidate_sha='+selected.plan.candidateSha,
   'oracle='+selected.plan.oracle
  );
  fs.appendFileSync(env.GITHUB_OUTPUT,lines.join('\n')+'\n');
 }
 process.stdout.write('OWNER_SINGLE_GITHUB_SANDBOX_APPROVAL_VERIFIED\n');
 return receipt;
}
if(require.main===module)main().catch(()=>{
 process.stderr.write('OWNER_SINGLE_GITHUB_SANDBOX_BLOCKED\n');process.exitCode=1;
});
module.exports={main,readPolicy,parseApprovedComment,selectOwnerApprovalPlan};
