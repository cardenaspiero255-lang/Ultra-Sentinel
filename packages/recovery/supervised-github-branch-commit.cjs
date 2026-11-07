'use strict';
/**
 * Owner-authorized commit of exactly two Kotlin files to an EXISTING
 * draft GitHub PR branch. Either a validated Ed25519 signature or a LIVE
 * issuer-signed GitHub OIDC approval of exact PR #105 is required.
 * Never calls merge, creates a PR, writes main or
 * bypasses GitHub branch protection. GitHub Actions' own GITHUB_TOKEN
 * stays read-only; optional JARVIS write credentials must be explicitly
 * configured as an owner secret and are never passed to the Kotlin sandbox.
 *
 * Security boundary: this module and its verifyOriginalJVM callback must run
 * in a trusted operator, NOT inside untrusted PR/workflow code. The public key
 * is pinned operator configuration, NEVER supplied from the PR or a comment.
 * The callback must execute an independent original-source Kotlin/JVM oracle
 * in a real sandbox (not merely replay a JSON boolean receipt). The local
 * Git Judge and exact rollback are recomputed here, not supplied by a caller.
 */
const crypto=require('node:crypto');
const {authenticateGitHubOwner}=require('./github-owner-identity.cjs');
const {PersistentNonceStore}=require('./owner-authorization.cjs');
const {drillTwoSourceKotlinSandbox}=require('./two-source-kotlin-sandbox.cjs');
const {digestRollbackPlan,treeEntries,verifyExactRepairDelta}=require('./supervised-github-branch-rollback.cjs');
const {publishAtomicBranchCommit}=require('./github-atomic-branch-commit.cjs');

const REPO='cardenaspiero255-lang/JARVIS',OWNER='cardenaspiero255-lang';
const OWNER_ID=322222186;
const DOMAIN='Ultra-Sentinel:github-pr-branch-commit:v1\n';
const OP='COMMIT_TO_EXISTING_DRAFT_PR_BRANCH';
const SHA=/^[a-f0-9]{40}$/,DIGEST=/^[a-f0-9]{64}$/;
const BRANCH=/^fix\/ultra-sentinel-[a-z0-9][a-z0-9-]{3,69}$/;
const FILE=/^apps\/android\/app\/src\/main\/java\/com\/cardenaspiero255\/jarvis\/core\/[A-Za-z0-9_.-]+\.kt$/;
const NONCE=/^[a-zA-Z0-9_-]{20,96}$/;
function deny(code){throw Error(code);}
function blobSha(value){
 const b=Buffer.from(value,'utf8');
 return crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
}
function validPlan(p){
 return p&&Object.getPrototypeOf(p)===Object.prototype&&
  p.repository===REPO&&p.operation===OP&&
  Number.isSafeInteger(p.prNumber)&&p.prNumber>0&&
  BRANCH.test(p.branch||'')&&SHA.test(p.expectedHeadSha||'')&&
  SHA.test(p.expectedMainSha||'')&&SHA.test(p.expectedTreeSha||'')&&
  p.expectedHeadSha!==p.expectedMainSha;
}
function validFile(f){
 if(!f||Object.getPrototypeOf(f)!==Object.prototype||
  Object.keys(f).sort().join(',')!=='after,afterBlobSha,before,beforeBlobSha,path'||
  typeof f.path!=='string'||!FILE.test(f.path)||f.path.includes('..')||
  !SHA.test(f.beforeBlobSha||'')||!SHA.test(f.afterBlobSha||'')||
  f.beforeBlobSha===f.afterBlobSha)return false;
 for(const key of ['before','after']){
  if(typeof f[key]!=='string'||f[key].length<10||
   Buffer.byteLength(f[key],'utf8')>60000||!f[key].endsWith('\n')||
   f[key].includes('\r')||f[key].includes('\0'))return false;
 }
 return f.before!==f.after&&blobSha(f.before)===f.beforeBlobSha&&
  blobSha(f.after)===f.afterBlobSha;
}
function canonicalFiles(files){
 if(!Array.isArray(files)||files.length!==2||!files.every(validFile)||
  files[0].path===files[1].path)deny('INVALID_TWO_FILE_CANDIDATE');
 // Paths are ASCII by contract; ordinal ordering is identical on all hosts.
 const sorted=[...files].sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
 if(sorted.reduce((sum,f)=>sum+Buffer.byteLength(f.after,'utf8'),0)>100000)
  deny('PATCH_SIZE_DENIED');
 return sorted;
}
function digestBranchCandidate(plan,files){
 if(!validPlan(plan))deny('INVALID_PR_BRANCH_PLAN');
 const sorted=canonicalFiles(files);
 return crypto.createHash('sha256').update(JSON.stringify({
  repository:plan.repository,prNumber:plan.prNumber,branch:plan.branch,
  baseSha:plan.expectedMainSha,headSha:plan.expectedHeadSha,
  treeSha:plan.expectedTreeSha,operation:plan.operation,
  files:sorted.map(f=>({path:f.path,beforeBlobSha:f.beforeBlobSha,
   afterBlobSha:f.afterBlobSha,afterBytes:Buffer.byteLength(f.after,'utf8')}))
 })).digest('hex');
}
function stableOwnerBranchGrant(g){
 if(!g||Object.getPrototypeOf(g)!==Object.prototype||
  g.ownerLogin!==OWNER||g.ownerId!==OWNER_ID||g.repo!==REPO||
  g.operation!==OP||!Number.isSafeInteger(g.prNumber)||g.prNumber<=0||
  !BRANCH.test(g.branch||'')||!SHA.test(g.headSha||'')||
  !SHA.test(g.baseSha||'')||!DIGEST.test(g.planDigest||'')||
  !NONCE.test(g.nonce||'')||!Number.isSafeInteger(g.expiresAt))
  deny('INVALID_OWNER_BRANCH_GRANT');
 return JSON.stringify({ownerLogin:g.ownerLogin,ownerId:g.ownerId,
  repo:g.repo,prNumber:g.prNumber,branch:g.branch,headSha:g.headSha,
  baseSha:g.baseSha,planDigest:g.planDigest,nonce:g.nonce,
  expiresAt:g.expiresAt,operation:g.operation});
}
function verifyGrant({grant,signature,trustedOwnerPublicKey,plan,digest,now}){
 const canonical=stableOwnerBranchGrant(grant);
 if(grant.repo!==plan.repository||grant.prNumber!==plan.prNumber||
  grant.branch!==plan.branch||grant.headSha!==plan.expectedHeadSha||
  grant.baseSha!==plan.expectedMainSha||grant.planDigest!==digest)
  deny('OWNER_GRANT_PLAN_MISMATCH');
 if(!Number.isSafeInteger(now)||grant.expiresAt<=now||
  grant.expiresAt-now>900000)deny('OWNER_GRANT_EXPIRED');
 if(typeof signature!=='string'||! /^[A-Za-z0-9+/]{86}==$/.test(signature)||
  !trustedOwnerPublicKey)deny('OWNER_SIGNATURE_REQUIRED');
 let key;
 try{key=trustedOwnerPublicKey instanceof crypto.KeyObject?
  trustedOwnerPublicKey:crypto.createPublicKey(trustedOwnerPublicKey);}
 catch{deny('OWNER_SIGNATURE_TRUST_ANCHOR_INVALID');}
 if(key.type!=='public'||key.asymmetricKeyType!=='ed25519'||
  !crypto.verify(null,Buffer.from(DOMAIN+canonical),key,Buffer.from(signature,'base64')))
  deny('OWNER_SIGNATURE_INVALID');
}
function exactStrings(actual,expected){
 return Array.isArray(actual)&&actual.length===expected.length&&
  actual.every((value,i)=>value===expected[i]);
}
/**
 * APPLY is intentionally false by default, including under GitHub Actions.
 * A trusted harness supplies a sandboxed original-JVM callback. Merely
 * copying approval text from JARVIS PR #103/#104 cannot sign this plan.
 */
async function runSupervisedGitHubBranchCommit({
 plan,files,ownerGrant,ownerSignature,trustedOwnerPublicKey,token,
 nonceStorePath,verifyOriginalJVM,fetchImpl=globalThis.fetch,
 now=Date.now(),apply=false,githubOwnerSingleApproval=false
}={}){
 if(!validPlan(plan)||!Array.isArray(files)||typeof token!=='string'||
  token.length<16||typeof fetchImpl!=='function'||
  typeof verifyOriginalJVM!=='function'||typeof nonceStorePath!=='string'||
  !Number.isSafeInteger(now)||
  apply!==false&&apply!==true)deny('INVALID_SUPERVISED_EXECUTOR_INPUT');
 if(githubOwnerSingleApproval!==true&&githubOwnerSingleApproval!==false)
  deny('INVALID_GITHUB_APPROVAL_MODE');
 if(githubOwnerSingleApproval===true&&
   (ownerGrant!==undefined||ownerSignature!==undefined||
    trustedOwnerPublicKey!==undefined))
  deny('AMBIGUOUS_OWNER_AUTHORIZATION_MODES');
 // Freeze write-relevant plan and Kotlin bytes before any async approval call.
 plan=Object.freeze({...plan});
 const sorted=Object.freeze(canonicalFiles(files).map(f=>Object.freeze({...f})));
 const digest=digestBranchCandidate(plan,sorted);
 let approvedRemoteCommentId=null;
 if(githubOwnerSingleApproval===true){
  // Reissue and verify GitHub issuer-signed OIDC + owner issue_comment
  // against LIVE GitHub refs and global nonce uniqueness. No receipt JSON,
  // spoofable caller boolean, or GitHub Actions env string is sufficient.
  const {main:verifyLiveGitHubApproval}=
   require('../../scripts/verify-remote-jarvis-owner-workflow.cjs');
  const approval=await verifyLiveGitHubApproval({fetchImpl,writeReceipt:false});
  if(approval.status!=='REMOTE_OWNER_GITHUB_APPROVAL_VERIFIED'||
   approval.githubOIDCVerified!==true||
   approval.nonceReplayBlocked!==true||
   approval.sourceAuthenticatedAtCheck!==true||
   approval.requiresSeparateWriteExecutor!==true||
   approval.planDigest!==digest||
   approval.targetRepo!==REPO||approval.prNumber!==plan.prNumber||
   approval.branch!==plan.branch||
   approval.sourceHeadSha!==plan.expectedHeadSha||
   approval.sourceMainSha!==plan.expectedMainSha||
   approval.sourceTreeSha!==plan.expectedTreeSha||
   approval.rollbackAuthorized!==false||approval.mergeAllowed!==false||
   approval.remoteWrites!==false)
   deny('REMOTE_GITHUB_APPROVAL_SCOPE_MISMATCH');
  approvedRemoteCommentId=approval.commentId;
  ownerGrant={
   ownerLogin:OWNER,ownerId:OWNER_ID,repo:REPO,prNumber:plan.prNumber,
   branch:plan.branch,headSha:plan.expectedHeadSha,
   baseSha:plan.expectedMainSha,planDigest:digest,
   nonce:approval.nonce,expiresAt:approval.expiresAt,
   operation:plan.operation
  };
 }
 ownerGrant=Object.freeze(JSON.parse(stableOwnerBranchGrant(ownerGrant)));
 let lastTime=now;
 function requireLiveGrant(){
  let current;
  // The system wall clock is part of the trusted execution environment.
  // Never accept a clock callback or timestamp from PR files or grants.
  try{current=Date.now();}catch{deny('OWNER_TRUSTED_CLOCK_UNAVAILABLE');}
  if(!Number.isSafeInteger(current)||current<lastTime)
   deny('OWNER_TRUSTED_CLOCK_INVALID');
  lastTime=current;
  if(ownerGrant.expiresAt<=current)deny('OWNER_GRANT_EXPIRED');
  return current;
 }
 if(githubOwnerSingleApproval!==true)
  verifyGrant({grant:ownerGrant,signature:ownerSignature,trustedOwnerPublicKey,
   plan,digest,now:requireLiveGrant()});
 else requireLiveGrant();
 // A *read-only* GitHub owner preview is already authenticated via the
 // issuer-signed OIDC JWT and the live issue comment. It must neither
 // require nor touch the powerful JARVIS PAT. Actual branch writes MUST
 // authenticate that PAT independently using /user.
 if(githubOwnerSingleApproval!==true||apply===true)
  await authenticateGitHubOwner({token,expectedOwner:OWNER,
   expectedOwnerId:OWNER_ID,fetchImpl});
 const repoApi='/repos/'+REPO;
 const headers={Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
  'X-GitHub-Api-Version':'2022-11-28','User-Agent':'Ultra-Sentinel-Owner-Branch-Executor'};
 async function api(method,route,body){
  // Detached blobs/trees/commits are writes too. A delayed original oracle,
  // network round trip, or expired grant must not permit any subsequent write.
  if(method!=='GET')requireLiveGrant();
  let response;
  try{response=await fetchImpl('https://api.github.com'+route,{
   method,redirect:'error',signal:AbortSignal.timeout(15000),
   headers:body===undefined?headers:{...headers,'Content-Type':'application/json'},
   ...(body===undefined?{}:{body:JSON.stringify(body)})
  });}catch{deny('GITHUB_API_TRANSPORT_UNCERTAIN');}
  if(!response||response.status!==(method==='POST'?201:200))
   deny(method==='PATCH'?'REF_UPDATE_REFUSED_OR_NON_FAST_FORWARD':'GITHUB_API_REFUSED');
  let value;try{value=await response.json();}catch{deny('GITHUB_API_INVALID_RESPONSE');}
  if(!value||typeof value!=='object'||Array.isArray(value))
   deny('GITHUB_API_INVALID_RESPONSE');
  return value;
 }
 async function verifyDraftAndMain(){
  const pr=await api('GET',repoApi+'/pulls/'+plan.prNumber);
  if(pr.state!=='open'||pr.draft!==true||pr.merged!==false||
   pr.number!==plan.prNumber||pr.user?.login!==OWNER||
   pr.user?.id!==OWNER_ID||pr.head?.repo?.full_name!==REPO||
   pr.head?.ref!==plan.branch||pr.head?.sha!==plan.expectedHeadSha||
   pr.base?.repo?.full_name!==REPO||pr.base?.ref!=='main'||
   pr.base?.sha!==plan.expectedMainSha)deny('UNTRUSTED_OR_STALE_DRAFT_PR');
  const main=await api('GET',repoApi+'/git/ref/heads/main');
  if(main.ref!=='refs/heads/main'||main.object?.type!=='commit'||
   main.object.sha!==plan.expectedMainSha)deny('STALE_MAIN_HEAD');
 }
 await verifyDraftAndMain();
 const refPath=repoApi+'/git/ref/heads/'+plan.branch;
 const head=await api('GET',refPath);
 if(head.ref!=='refs/heads/'+plan.branch||head.object?.type!=='commit'||
  head.object.sha!==plan.expectedHeadSha)deny('STALE_REMOTE_BRANCH_HEAD');
 const commit=await api('GET',repoApi+'/git/commits/'+plan.expectedHeadSha);
 if(commit.sha!==plan.expectedHeadSha||
  commit.tree?.sha!==plan.expectedTreeSha)deny('REMOTE_BASELINE_TREE_MISMATCH');
 const tree=await api('GET',repoApi+'/git/trees/'+plan.expectedTreeSha+'?recursive=1');
 if(tree.sha!==plan.expectedTreeSha||tree.truncated!==false||
  !Array.isArray(tree.tree))deny('UNTRUSTED_REMOTE_GIT_TREE');
 // Apply the same complete-tree validation that post-publication and the
 // rollback require, before declaring READY or consuming the owner nonce.
 const originalTree=treeEntries(tree,plan.expectedTreeSha);
 for(const file of sorted){
  const matching=tree.tree.filter(t=>t.path===file.path);
  if(matching.length!==1||matching[0].type!=='blob'||
   matching[0].mode!=='100644'||matching[0].sha!==file.beforeBlobSha)
   deny('REMOTE_SOURCE_BLOB_MISMATCH');
 }
 // Trusted runner callback must compile/run the independently authored
 // original Kotlin oracle in a mandatory isolated JVM. Never accept a
 // receipt from PR content as the verifier implementation.
 const proof=await verifyOriginalJVM({plan:Object.freeze({...plan}),
  files:Object.freeze(sorted.map(f=>Object.freeze({...f}))),planDigest:digest});
 if(!proof||proof.status!=='TRUSTED_ORIGINAL_KOTLIN_JVM_RED_GREEN'||
  proof.baselineHeadSha!==plan.expectedHeadSha||proof.planDigest!==digest||
  !exactStrings(proof.sourceBlobs,sorted.map(f=>f.beforeBlobSha))||
  !exactStrings(proof.candidateBlobs,sorted.map(f=>f.afterBlobSha))||
  proof.genuineOriginalRed!==true||proof.originalJVMGreen!==true||
  proof.benignControlsPassed!==true||proof.isolatedExecution!==true||
  proof.remoteWrites!==false||proof.mergeAllowed!==false)
  deny('TRUSTED_ORIGINAL_ORACLE_VETO');
 // The Judge/rollback is executed here against actual candidate files; no
 // externally asserted booleans can bypass the Git tree comparison.
 const local=drillTwoSourceKotlinSandbox({files:sorted});
 if(local.status!=='TWO_SOURCE_SANDBOX_JUDGE_AND_ROLLBACK_VERIFIED'||
  local.checkedFiles!==2||local.exactTreeRollbackVerified!==true||
  local.remoteWrites!==false||local.mergeAllowed!==false)
  deny('LOCAL_JUDGE_OR_EXACT_ROLLBACK_VETO');
 const shared=Object.freeze({repository:REPO,prNumber:plan.prNumber,
  initialHeadSha:plan.expectedHeadSha,planDigest:digest,
  originalJVMVerified:true,localJudgeAndRollbackVerified:true,
  mergeAllowed:false,productionReleaseCertified:false});
 // A GitHub comment may be edited or deleted during the independent
 // Kotlin/JVM oracle. Reauthenticate OIDC and the LIVE comment immediately
 // before applying. A stale grant cannot become a remote write.
 async function reverifyGitHubRemoteOwner(){
  if(githubOwnerSingleApproval!==true)return;
  const {main:verifyLiveGitHubApproval}=
   require('../../scripts/verify-remote-jarvis-owner-workflow.cjs');
  const fresh=await verifyLiveGitHubApproval({fetchImpl,writeReceipt:false});
  if(fresh.status!=='REMOTE_OWNER_GITHUB_APPROVAL_VERIFIED'||
   fresh.commentId!==approvedRemoteCommentId||
   fresh.nonce!==ownerGrant.nonce||
   fresh.planDigest!==digest||
   fresh.expiresAt!==ownerGrant.expiresAt||
   fresh.sourceHeadSha!==plan.expectedHeadSha||
   fresh.sourceMainSha!==plan.expectedMainSha||
   fresh.sourceTreeSha!==plan.expectedTreeSha||
   fresh.nonceReplayBlocked!==true||fresh.rollbackAuthorized!==false||
   fresh.remoteWrites!==false)deny('STALE_OR_REVOKED_GITHUB_OWNER_APPROVAL');
 }
 if(apply!==true)return Object.freeze({...shared,
  status:'OWNER_AUTHENTICATED_DRAFT_PR_READY',remoteWrites:false,
  commitCreated:false,ownerNonceConsumed:false,ownerNonceChecked:false,
  limitation:'Preview does not check the persistent nonce ledger. Authorization, ledger availability, PR/main and branch state must be rechecked for publication.'});
 // All approval and verification gates preceded the first GitHub write.
 // Consume persistently before creating any object, including unattached
 // blobs, to prevent replay across processes/workflow attempts.
 await reverifyGitHubRemoteOwner();
 await verifyDraftAndMain();
 // The nonce must be the exact one captured before /user and verified by
 // Ed25519, never a mutable reference to the original caller grant.
 requireLiveGrant();
 const store=new PersistentNonceStore(nonceStorePath);
 if(store.consume(ownerGrant.nonce)!==true)deny('NONCE_REPLAY_DENIED');
 // The GraphQL mutation creates the commit and compares expectedHeadOid
 // against the branch HEAD atomically. A fast-forward REST PATCH is not CAS.
 await verifyDraftAndMain();
 const rechecked=await api('GET',refPath);
 if(rechecked.ref!==head.ref||rechecked.object?.sha!==plan.expectedHeadSha)
  deny('STALE_REMOTE_BRANCH_BEFORE_REF_UPDATE');
 await reverifyGitHubRemoteOwner();
 // Re-read the trusted clock at the point of publication; an expired grant
 // may leave unattached objects but must not move the protected PR branch.
 requireLiveGrant();
 const newCommitSha=await publishAtomicBranchCommit({repository:REPO,branch:plan.branch,
  expectedHeadSha:plan.expectedHeadSha,
  files:sorted.map(f=>({path:f.path,contents:Buffer.from(f.after,'utf8').toString('base64')})),
  message:'fix(android): owner-approved Ultra Sentinel supervised repair (PR #'+plan.prNumber+')',
  token,fetchImpl,beforePublish:requireLiveGrant});
 const confirmed=await api('GET',refPath);
 if(confirmed.ref!==head.ref||confirmed.object?.type!=='commit'||confirmed.object.sha!==newCommitSha)
  deny('REMOTE_COMMIT_STATE_UNCERTAIN');
 const newCommit=await api('GET',repoApi+'/git/commits/'+newCommitSha);
 if(newCommit.sha!==newCommitSha||!SHA.test(newCommit.tree?.sha||'')||
  newCommit.tree.sha===plan.expectedTreeSha||!Array.isArray(newCommit.parents)||
  newCommit.parents.length!==1||newCommit.parents[0]?.sha!==plan.expectedHeadSha)
  deny('REMOTE_COMMIT_STATE_UNCERTAIN');
 const newTree=await api('GET',repoApi+'/git/trees/'+newCommit.tree.sha+'?recursive=1');
 try{verifyExactRepairDelta(originalTree,
  treeEntries(newTree,newCommit.tree.sha),sorted);}catch{deny('REMOTE_COMMIT_STATE_UNCERTAIN');}
 const finalPr=await api('GET',repoApi+'/pulls/'+plan.prNumber);
 const finalMain=await api('GET',repoApi+'/git/ref/heads/main');
 if(finalPr.number!==plan.prNumber||finalPr.state!=='open'||finalPr.draft!==true||
  finalPr.merged!==false||finalPr.user?.login!==OWNER||finalPr.user?.id!==OWNER_ID||
  finalPr.head?.repo?.full_name!==REPO||finalPr.head?.ref!==plan.branch||
  finalPr.head?.sha!==newCommitSha||finalPr.base?.repo?.full_name!==REPO||
  finalPr.base?.ref!=='main'||finalPr.base?.sha!==plan.expectedMainSha||
  finalMain.ref!=='refs/heads/main'||finalMain.object?.type!=='commit'||
  finalMain.object.sha!==plan.expectedMainSha)deny('REMOTE_COMMIT_STATE_UNCERTAIN');
 // This exact plan is DATA, not a rollback authorization. It requires a
 // fresh Ed25519 signature under the distinct rollback domain and nonce.
 const rollbackPlan=Object.freeze({
  repository:REPO,prNumber:plan.prNumber,branch:plan.branch,
  operation:'ROLLBACK_EXISTING_DRAFT_PR_BRANCH',
  expectedMainSha:plan.expectedMainSha,
  originalHeadSha:plan.expectedHeadSha,
  originalTreeSha:plan.expectedTreeSha,
  repairHeadSha:newCommitSha,repairTreeSha:newCommit.tree.sha,
  files:Object.freeze(sorted.map(f=>Object.freeze({
   path:f.path,beforeBlobSha:f.beforeBlobSha,afterBlobSha:f.afterBlobSha
  })))
 });
 const rollbackPlanDigest=digestRollbackPlan(rollbackPlan);
 return Object.freeze({...shared,status:'OWNER_APPROVED_PR_BRANCH_COMMIT_CREATED',
  commitSha:newCommitSha,remoteWrites:true,commitCreated:true,
  ownerNonceConsumed:true,mergeAllowed:false,
  rollbackPlan,rollbackPlanDigest,remoteRollbackExecuted:false,
  limitation:'Remote repair committed, not yet rolled back. A new owner-signed rollback grant, an unchanged draft PR and a separate non-forced restoring commit are required for remote recovery; CI and merge checks remain separate.'});
}
module.exports={runSupervisedGitHubBranchCommit,stableOwnerBranchGrant,digestBranchCandidate};
