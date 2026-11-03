'use strict';
/**
 * Explicitly owner-signed commit of exactly two Kotlin files to an EXISTING
 * draft GitHub PR branch. Never calls merge, creates a PR, writes main or
 * bypasses GitHub branch protection. No Actions entrypoint has write scope.
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
 const sorted=[...files].sort((a,b)=>a.path.localeCompare(b.path));
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
 now=Date.now(),apply=false
}={}){
 if(!validPlan(plan)||!Array.isArray(files)||typeof token!=='string'||
  token.length<16||typeof fetchImpl!=='function'||
  typeof verifyOriginalJVM!=='function'||typeof nonceStorePath!=='string'||
  apply!==false&&apply!==true)deny('INVALID_SUPERVISED_EXECUTOR_INPUT');
 const sorted=canonicalFiles(files),digest=digestBranchCandidate(plan,sorted);
 verifyGrant({grant:ownerGrant,signature:ownerSignature,trustedOwnerPublicKey,
  plan,digest,now});
 // Verify the token against /user; never trust repository event.actor text.
 await authenticateGitHubOwner({token,expectedOwner:OWNER,
  expectedOwnerId:OWNER_ID,fetchImpl});
 const repoApi='/repos/'+REPO;
 const headers={Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
  'X-GitHub-Api-Version':'2022-11-28','User-Agent':'Ultra-Sentinel-Owner-Branch-Executor'};
 async function api(method,route,body){
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
 if(apply!==true)return Object.freeze({...shared,
  status:'OWNER_AUTHENTICATED_DRAFT_PR_READY',remoteWrites:false,
  commitCreated:false,ownerNonceConsumed:false});
 // All approval and verification gates preceded the first GitHub write.
 // Consume persistently before creating any object, including unattached
 // blobs, to prevent replay across processes/workflow attempts.
 await verifyDraftAndMain();
 const store=new PersistentNonceStore(nonceStorePath);
 if(store.consume(ownerGrant.nonce)!==true)deny('NONCE_REPLAY_DENIED');
 const objects=[];
 for(const file of sorted){
  const blob=await api('POST',repoApi+'/git/blobs',{
   content:Buffer.from(file.after,'utf8').toString('base64'),encoding:'base64'});
  if(blob.sha!==file.afterBlobSha)
   deny('REMOTE_CREATED_BLOB_MISMATCH');
  objects.push({path:file.path,mode:'100644',type:'blob',sha:blob.sha});
 }
 const newTree=await api('POST',repoApi+'/git/trees',{
  base_tree:plan.expectedTreeSha,tree:objects});
 if(!SHA.test(newTree.sha||'')||newTree.sha===plan.expectedTreeSha)
  deny('REMOTE_CANDIDATE_TREE_INVALID');
 const newCommit=await api('POST',repoApi+'/git/commits',{
  message:'fix(android): owner-approved Ultra Sentinel supervised repair (PR #'+plan.prNumber+')',
  tree:newTree.sha,parents:[plan.expectedHeadSha]});
 if(!SHA.test(newCommit.sha||'')||newCommit.sha===plan.expectedHeadSha)
  deny('REMOTE_CANDIDATE_COMMIT_INVALID');
 // The only ref write in this module. GitHub rejects non-fast-forwards.
 // Never force; never write to main, delete branches, or call merge.
 await verifyDraftAndMain();
 const rechecked=await api('GET',refPath);
 if(rechecked.ref!==head.ref||rechecked.object?.sha!==plan.expectedHeadSha)
  deny('STALE_REMOTE_BRANCH_BEFORE_REF_UPDATE');
 const updated=await api('PATCH',repoApi+'/git/refs/heads/'+plan.branch,
  {sha:newCommit.sha,force:false});
 if(updated.ref!=='refs/heads/'+plan.branch||
  updated.object?.sha!==newCommit.sha)
  deny('REMOTE_COMMIT_STATE_UNCERTAIN');
 const confirmed=await api('GET',refPath);
 if(confirmed.object?.sha!==newCommit.sha)
  deny('REMOTE_COMMIT_STATE_UNCERTAIN');
 return Object.freeze({...shared,status:'OWNER_APPROVED_PR_BRANCH_COMMIT_CREATED',
  commitSha:newCommit.sha,remoteWrites:true,commitCreated:true,
  ownerNonceConsumed:true,mergeAllowed:false,
  limitation:'Remote Git ref changed; exact local rollback was only a pre-commit drill. Remote rollback, PR checks and merge still require separate authenticated operations.'});
}
module.exports={runSupervisedGitHubBranchCommit,stableOwnerBranchGrant,digestBranchCandidate};
