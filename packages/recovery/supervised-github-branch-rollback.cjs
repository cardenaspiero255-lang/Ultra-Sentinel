'use strict';
/**
 * Trusted-operator-only restoration of an owner-approved, single-commit
 * supervised JARVIS repair. Restore the original Git TREE by appending a
 * new commit to the existing draft PR branch; never force-reset a ref.
 *
 * No GitHub Actions workflow exposes this function to untrusted PR content.
 * Either a separate domain-scoped Ed25519 signature or a NEW live
 * issuer-signed GitHub OIDC owner rollback approval is required. A
 * persistent one-use nonce is mandatory. The legacy Ed25519 path remains.
 */
const crypto=require('node:crypto');
const {authenticateGitHubOwner}=require('./github-owner-identity.cjs');
const {PersistentNonceStore}=require('./owner-authorization.cjs');
const {publishAtomicBranchCommit}=require('./github-atomic-branch-commit.cjs');

const REPO='cardenaspiero255-lang/JARVIS',OWNER='cardenaspiero255-lang',OWNER_ID=322222186;
const DOMAIN='Ultra-Sentinel:github-pr-branch-rollback:v1\n';
const OP='ROLLBACK_EXISTING_DRAFT_PR_BRANCH';
const SHA=/^[a-f0-9]{40}$/,DIGEST=/^[a-f0-9]{64}$/;
const BRANCH=/^fix\/ultra-sentinel-[a-z0-9][a-z0-9-]{3,69}$/;
const FILE=/^apps\/android\/app\/src\/main\/java\/com\/cardenaspiero255\/jarvis\/core\/[A-Za-z0-9_.-]+\.kt$/;
const NONCE=/^[A-Za-z0-9_-]{20,96}$/;
function deny(code){throw Error(code);}
function exact(x,keys){
 return x!==null&&typeof x==='object'&&!Array.isArray(x)&&
  Object.getPrototypeOf(x)===Object.prototype&&
  Object.keys(x).sort().join(',')===keys.slice().sort().join(',');
}
const PLAN_KEYS=['repository','prNumber','branch','operation','expectedMainSha',
 'originalHeadSha','originalTreeSha','repairHeadSha','repairTreeSha','files'];
const FILE_KEYS=['path','beforeBlobSha','afterBlobSha'];
const GRANT_KEYS=['ownerLogin','ownerId','repo','prNumber','branch','headSha',
 'baseSha','planDigest','nonce','expiresAt','operation'];
function canonicalFiles(files){
 if(!Array.isArray(files)||files.length!==2)deny('INVALID_TWO_FILE_ROLLBACK_PLAN');
 const ordered=files.map(f=>{
  if(!exact(f,FILE_KEYS)||typeof f.path!=='string'||
   !FILE.test(f.path)||f.path.includes('..')||
   !SHA.test(f.beforeBlobSha||'')||!SHA.test(f.afterBlobSha||'')||
   f.beforeBlobSha===f.afterBlobSha)deny('INVALID_TWO_FILE_ROLLBACK_PLAN');
  // Canonical JSON must not depend on incoming property insertion order.
  return Object.freeze({path:f.path,beforeBlobSha:f.beforeBlobSha,afterBlobSha:f.afterBlobSha});
 }).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
 if(ordered[0].path===ordered[1].path)deny('DUPLICATE_ROLLBACK_PATH');
 return Object.freeze(ordered);
}
function canonicalPlan(p){
 if(!exact(p,PLAN_KEYS)||p.repository!==REPO||p.operation!==OP||
  !Number.isSafeInteger(p.prNumber)||p.prNumber<=0||
  !BRANCH.test(p.branch||'')||
  ![p.expectedMainSha,p.originalHeadSha,p.originalTreeSha,
    p.repairHeadSha,p.repairTreeSha].every(x=>SHA.test(x||''))||
  p.originalHeadSha===p.repairHeadSha||p.originalTreeSha===p.repairTreeSha)
  deny('INVALID_REMOTE_ROLLBACK_PLAN');
 return Object.freeze({...p,files:canonicalFiles(p.files)});
}
function digestRollbackPlan(input){
 const p=canonicalPlan(input);
 return crypto.createHash('sha256').update(JSON.stringify({
  repository:p.repository,prNumber:p.prNumber,branch:p.branch,operation:p.operation,
  baseSha:p.expectedMainSha,originalHeadSha:p.originalHeadSha,
  originalTreeSha:p.originalTreeSha,repairHeadSha:p.repairHeadSha,
  repairTreeSha:p.repairTreeSha,files:p.files
 })).digest('hex');
}
function stableOwnerRollbackGrant(g){
 if(!exact(g,GRANT_KEYS)||g.ownerLogin!==OWNER||g.ownerId!==OWNER_ID||
  g.repo!==REPO||g.operation!==OP||!Number.isSafeInteger(g.prNumber)||
  g.prNumber<=0||!BRANCH.test(g.branch||'')||!SHA.test(g.headSha||'')||
  !SHA.test(g.baseSha||'')||!DIGEST.test(g.planDigest||'')||
  !NONCE.test(g.nonce||'')||!Number.isSafeInteger(g.expiresAt))
  deny('INVALID_OWNER_ROLLBACK_GRANT');
 return JSON.stringify({ownerLogin:g.ownerLogin,ownerId:g.ownerId,
  repo:g.repo,prNumber:g.prNumber,branch:g.branch,headSha:g.headSha,
  baseSha:g.baseSha,planDigest:g.planDigest,nonce:g.nonce,
  expiresAt:g.expiresAt,operation:g.operation});
}
function verifySignature(grant,signature,pinnedKey,plan,digest,now){
 const canonical=stableOwnerRollbackGrant(grant);
 if(grant.repo!==plan.repository||grant.prNumber!==plan.prNumber||
  grant.branch!==plan.branch||grant.headSha!==plan.repairHeadSha||
  grant.baseSha!==plan.expectedMainSha||grant.planDigest!==digest)
  deny('OWNER_ROLLBACK_SCOPE_MISMATCH');
 if(!Number.isSafeInteger(now)||grant.expiresAt<=now||
  grant.expiresAt-now>900000)deny('OWNER_GRANT_EXPIRED');
 if(typeof signature!=='string'||!/^[A-Za-z0-9+/]{86}==$/.test(signature)||
  !pinnedKey)deny('OWNER_ROLLBACK_SIGNATURE_REQUIRED');
 let key;
 try{key=pinnedKey instanceof crypto.KeyObject?
  pinnedKey:crypto.createPublicKey(pinnedKey);}
 catch{deny('OWNER_ROLLBACK_TRUST_ANCHOR_INVALID');}
 if(key.type!=='public'||key.asymmetricKeyType!=='ed25519'||
  !crypto.verify(null,Buffer.from(DOMAIN+canonical),key,Buffer.from(signature,'base64')))
  deny('OWNER_ROLLBACK_SIGNATURE_INVALID');
}
function treeEntries(reply,expectedSha){
 if(reply.sha!==expectedSha||reply.truncated!==false||
  !Array.isArray(reply.tree)||reply.tree.length>20000)
  deny('REMOTE_ROLLBACK_TREE_UNTRUSTED');
 const map=new Map();
 for(const item of reply.tree){
  if(!item||typeof item.path!=='string'||!item.path||
   typeof item.mode!=='string'||typeof item.type!=='string'||
   !SHA.test(item.sha||'')||map.has(item.path))
   deny('REMOTE_ROLLBACK_TREE_UNTRUSTED');
  map.set(item.path,Object.freeze({sha:item.sha,mode:item.mode,type:item.type}));
 }
 return map;
}
function verifyExactRepairDelta(original,repaired,files){
 const permitted=new Map(files.map(f=>[f.path,f]));
 const allPaths=new Set([...original.keys(),...repaired.keys()]);
 let changes=0;
 for(const path of allPaths){
  const before=original.get(path),after=repaired.get(path),f=permitted.get(path);
  if(f){
   if(!before||!after||before.sha!==f.beforeBlobSha||
    after.sha!==f.afterBlobSha||before.mode!=='100644'||
    after.mode!=='100644'||before.type!=='blob'||after.type!=='blob')
    deny('REMOTE_ROLLBACK_SOURCE_BLOB_MISMATCH');
   changes++;
  }else if(!before||!after||before.mode!==after.mode||
   before.type!==after.type)
   deny('UNEXPECTED_REMOTE_REPAIR_TREE_DELTA');
  else if(before.type==='tree'){
   // Git's recursive tree listing includes parent directory tree SHA values.
   // Those necessarily change when a nested Kotlin blob changes, even when
   // the only actual file edits are the two signed leaves.
   if(before.sha!==after.sha&&!files.some(f=>f.path.startsWith(path+'/')))
    deny('UNEXPECTED_REMOTE_REPAIR_TREE_DELTA');
  }else if(before.sha!==after.sha)
   deny('UNEXPECTED_REMOTE_REPAIR_TREE_DELTA');
 }
 if(changes!==2)deny('INVALID_REMOTE_REPAIR_TREE_DELTA');
}
/** Default dry-run; this module never creates a PR, merges or touches main. */
async function runSupervisedGitHubBranchRollback({
 plan,ownerGrant,ownerSignature,trustedOwnerPublicKey,token,
 nonceStorePath,fetchImpl=globalThis.fetch,apply=false,
 githubOwnerRollbackApproval=false
}={}){
 if(typeof token!=='string'||token.length<16||
  typeof nonceStorePath!=='string'||typeof fetchImpl!=='function'||
  (apply!==true&&apply!==false))deny('INVALID_REMOTE_ROLLBACK_INPUT');
 if(githubOwnerRollbackApproval!==true&&githubOwnerRollbackApproval!==false)
  deny('INVALID_GITHUB_OWNER_ROLLBACK_MODE');
 if(githubOwnerRollbackApproval===true&&
  (ownerGrant!==undefined||ownerSignature!==undefined||
   trustedOwnerPublicKey!==undefined))
  deny('AMBIGUOUS_ROLLBACK_AUTHORIZATION');
 plan=canonicalPlan(plan);
 const digest=digestRollbackPlan(plan);
 let approvalCommentId=null;
 if(githubOwnerRollbackApproval===true){
  const {main:verifyLiveOwnerRollback}=
   require('../../scripts/verify-remote-jarvis-rollback-workflow.cjs');
  const verified=await verifyLiveOwnerRollback({fetchImpl,writeReceipt:false});
  if(verified.status!=='GITHUB_REMOTE_ROLLBACK_OWNER_VERIFIED'||
   verified.authenticatedLiveSource!==true||
   verified.nonceReplayBlocked!==true||
   verified.requiresSeparateWriteExecutor!==true||
   verified.planDigest!==digest||
   verified.repairHeadSha!==plan.repairHeadSha||
   verified.originalHeadSha!==plan.originalHeadSha||
   verified.prNumber!==plan.prNumber||verified.branch!==plan.branch||
   verified.targetRepo!==plan.repository||
   verified.rollbackAuthorized!==true||
   verified.remoteWrites!==false||verified.mergeAllowed!==false||
   digestRollbackPlan(verified.rollbackPlan)!==digest)
   deny('GITHUB_ROLLBACK_PLAN_MISMATCH');
  approvalCommentId=verified.commentId;
  ownerGrant={
   ownerLogin:OWNER,ownerId:OWNER_ID,repo:REPO,prNumber:plan.prNumber,
   branch:plan.branch,headSha:plan.repairHeadSha,
   baseSha:plan.expectedMainSha,planDigest:digest,
   nonce:verified.nonce,expiresAt:verified.expiresAt,operation:OP
  };
 }
 ownerGrant=Object.freeze(JSON.parse(stableOwnerRollbackGrant(ownerGrant)));
 let lastTime=0;
 function liveGrantClock(){
  let current;
  try{current=Date.now();}catch{deny('OWNER_TRUSTED_CLOCK_UNAVAILABLE');}
  if(!Number.isSafeInteger(current)||current<lastTime)
   deny('OWNER_TRUSTED_CLOCK_INVALID');
  lastTime=current;
  if(ownerGrant.expiresAt<=current)deny('OWNER_GRANT_EXPIRED');
  return current;
 }
 if(githubOwnerRollbackApproval!==true)
  verifySignature(ownerGrant,ownerSignature,trustedOwnerPublicKey,plan,digest,
   liveGrantClock());
 else liveGrantClock();
 await authenticateGitHubOwner({token,expectedOwner:OWNER,
  expectedOwnerId:OWNER_ID,fetchImpl});
 const apiRoot='/repos/'+REPO;
 const headers=Object.freeze({Authorization:'Bearer '+token,
  Accept:'application/vnd.github+json',
  'X-GitHub-Api-Version':'2022-11-28',
  'User-Agent':'Ultra-Sentinel-Owner-Rollback'});
 async function api(method,route,body){
  if(method!=='GET')liveGrantClock();
  let response;
  try{
   response=await fetchImpl('https://api.github.com'+route,{
    method,redirect:'error',signal:AbortSignal.timeout(15000),
    headers:body===undefined?headers:{...headers,'Content-Type':'application/json'},
    ...(body===undefined?{}:{body:JSON.stringify(body)})
   });
  }catch{deny('GITHUB_API_TRANSPORT_UNCERTAIN');}
  if(!response||response.status!==(method==='POST'?201:200))
   deny(method==='PATCH'?'REMOTE_REF_UPDATE_REFUSED_OR_UNCERTAIN':'GITHUB_API_REFUSED');
  let value;
  try{value=await response.json();}catch{deny('GITHUB_API_RESPONSE_UNCERTAIN');}
  if(!value||typeof value!=='object'||Array.isArray(value))
   deny('GITHUB_API_RESPONSE_UNCERTAIN');
  return value;
 }
 async function verifyDraftAndMain(){
  const pr=await api('GET',apiRoot+'/pulls/'+plan.prNumber);
  if(pr.number!==plan.prNumber||pr.state!=='open'||pr.draft!==true||
   pr.merged!==false||pr.user?.login!==OWNER||pr.user?.id!==OWNER_ID||
   pr.head?.repo?.full_name!==REPO||pr.head?.ref!==plan.branch||
   pr.head?.sha!==plan.repairHeadSha||pr.base?.repo?.full_name!==REPO||
   pr.base?.ref!=='main'||pr.base?.sha!==plan.expectedMainSha)
   deny('UNTRUSTED_OR_STALE_DRAFT_PR');
  const main=await api('GET',apiRoot+'/git/ref/heads/main');
  if(main.ref!=='refs/heads/main'||main.object?.type!=='commit'||
   main.object.sha!==plan.expectedMainSha)deny('STALE_MAIN_HEAD');
 }
 const branchRef=apiRoot+'/git/ref/heads/'+plan.branch;
 await verifyDraftAndMain();
 const head=await api('GET',branchRef);
 if(head.ref!=='refs/heads/'+plan.branch||head.object?.type!=='commit'||
  head.object.sha!==plan.repairHeadSha)deny('STALE_REMOTE_ROLLBACK_BRANCH');
 const repair=await api('GET',apiRoot+'/git/commits/'+plan.repairHeadSha);
 if(repair.sha!==plan.repairHeadSha||repair.tree?.sha!==plan.repairTreeSha||
  !Array.isArray(repair.parents)||repair.parents.length!==1||
  repair.parents[0]?.sha!==plan.originalHeadSha)
  deny('REMOTE_REPAIR_PARENT_OR_TREE_MISMATCH');
 const original=await api('GET',apiRoot+'/git/commits/'+plan.originalHeadSha);
 if(original.sha!==plan.originalHeadSha||
  original.tree?.sha!==plan.originalTreeSha)
  deny('REMOTE_BASELINE_TREE_MISMATCH');
 const [originalTree,repairTree]=await Promise.all([
  api('GET',apiRoot+'/git/trees/'+plan.originalTreeSha+'?recursive=1'),
  api('GET',apiRoot+'/git/trees/'+plan.repairTreeSha+'?recursive=1')
 ]);
 verifyExactRepairDelta(treeEntries(originalTree,plan.originalTreeSha),
  treeEntries(repairTree,plan.repairTreeSha),plan.files);
 const shared=Object.freeze({repository:REPO,prNumber:plan.prNumber,
  repairHeadSha:plan.repairHeadSha,restoredTreeSha:plan.originalTreeSha,
  planDigest:digest,mergeAllowed:false,productionReleaseCertified:false});
 // Retrieve and hash the exact original blobs before publication. The API
 // expects contents rather than blob OIDs in its atomic commit mutation.
 const additions=[];
 for(const file of plan.files){
  const blob=await api('GET',apiRoot+'/git/blobs/'+file.beforeBlobSha);
  if(blob.sha!==file.beforeBlobSha||blob.encoding!=='base64'||
   !Number.isSafeInteger(blob.size)||blob.size<1||blob.size>60000||
   typeof blob.content!=='string')deny('REMOTE_ROLLBACK_BLOB_UNTRUSTED');
  const encoded=blob.content.replace(/\n/g,'');
  if(!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded))
   deny('REMOTE_ROLLBACK_BLOB_UNTRUSTED');
  const bytes=Buffer.from(encoded,'base64');
  const actual=crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
  if(bytes.length!==blob.size||bytes.toString('base64')!==encoded||actual!==file.beforeBlobSha)
   deny('REMOTE_ROLLBACK_BLOB_UNTRUSTED');
  additions.push({path:file.path,contents:encoded});
 }
 async function reverifyGitHubRollback(){
  if(githubOwnerRollbackApproval!==true)return;
  const {main:verifyLiveOwnerRollback}=
   require('../../scripts/verify-remote-jarvis-rollback-workflow.cjs');
  const fresh=await verifyLiveOwnerRollback({fetchImpl,writeReceipt:false});
  if(fresh.status!=='GITHUB_REMOTE_ROLLBACK_OWNER_VERIFIED'||
   fresh.commentId!==approvalCommentId||
   fresh.nonce!==ownerGrant.nonce||fresh.expiresAt!==ownerGrant.expiresAt||
   fresh.planDigest!==digest||fresh.repairHeadSha!==plan.repairHeadSha||
   fresh.rollbackAuthorized!==true||fresh.remoteWrites!==false||
   fresh.nonceReplayBlocked!==true||
   digestRollbackPlan(fresh.rollbackPlan)!==digest)
   deny('GITHUB_ROLLBACK_AUTHORIZATION_REVOKED');
 }
 if(apply===false)return Object.freeze({...shared,
  status:'OWNER_SIGNED_REMOTE_ROLLBACK_READY',remoteWrites:false,
  ownerNonceConsumed:false,ownerNonceChecked:false,
  limitation:'Preview does not check the persistent nonce ledger. Authorization, ledger availability, PR/main and branch state must be rechecked for publication.'});
 await reverifyGitHubRollback();
 await verifyDraftAndMain();
 const current=await api('GET',branchRef);
 if(current.ref!==head.ref||current.object?.sha!==plan.repairHeadSha)
  deny('STALE_REMOTE_ROLLBACK_BRANCH');
 liveGrantClock();
 const store=new PersistentNonceStore(nonceStorePath);
 if(store.consume(ownerGrant.nonce)!==true)deny('NONCE_REPLAY_DENIED');
 // A GraphQL expectedHeadOid check is atomic with creating the child commit.
 // PR/main state is separate and is rechecked before and after publication.
 await verifyDraftAndMain();
 const beforeUpdate=await api('GET',branchRef);
 if(beforeUpdate.ref!==head.ref||beforeUpdate.object?.sha!==plan.repairHeadSha)
  deny('STALE_REMOTE_ROLLBACK_BRANCH');
 await reverifyGitHubRollback();
 liveGrantClock();
 const restoredSha=await publishAtomicBranchCommit({repository:REPO,branch:plan.branch,
  expectedHeadSha:plan.repairHeadSha,files:additions,
  message:'revert(android): owner-approved Ultra Sentinel remote rollback (PR #'+plan.prNumber+')',
  token,fetchImpl,beforePublish:liveGrantClock});
 if(restoredSha===plan.originalHeadSha)deny('REMOTE_ROLLBACK_STATE_UNCERTAIN');
 const confirmed=await api('GET',branchRef);
 if(confirmed.ref!=='refs/heads/'+plan.branch||
  confirmed.object?.type!=='commit'||confirmed.object?.sha!==restoredSha)
  deny('REMOTE_ROLLBACK_STATE_UNCERTAIN');
 const restoredCommit=await api('GET',apiRoot+'/git/commits/'+restoredSha);
 if(restoredCommit.sha!==restoredSha||
  restoredCommit.tree?.sha!==plan.originalTreeSha||
  !Array.isArray(restoredCommit.parents)||
  restoredCommit.parents.length!==1||
  restoredCommit.parents[0]?.sha!==plan.repairHeadSha)
  deny('REMOTE_ROLLBACK_STATE_UNCERTAIN');
 // A ref update is not proof that the PR stayed unmerged. Recheck the live
 // PR and protected base after publication before claiming restoration.
 const finalPr=await api('GET',apiRoot+'/pulls/'+plan.prNumber);
 const finalMain=await api('GET',apiRoot+'/git/ref/heads/main');
 if(finalPr.number!==plan.prNumber||finalPr.state!=='open'||
  finalPr.draft!==true||finalPr.merged!==false||
  finalPr.head?.repo?.full_name!==REPO||
  finalPr.head?.ref!==plan.branch||
  finalPr.head?.sha!==restoredSha||
  finalPr.base?.ref!=='main'||finalPr.base?.repo?.full_name!==REPO||
  finalPr.base?.sha!==plan.expectedMainSha||
  finalMain.ref!=='refs/heads/main'||
  finalMain.object?.type!=='commit'||
  finalMain.object.sha!==plan.expectedMainSha)
  deny('REMOTE_ROLLBACK_STATE_UNCERTAIN');
 return Object.freeze({...shared,status:'OWNER_APPROVED_REMOTE_ROLLBACK_VERIFIED',
  commitSha:restoredSha,remoteWrites:true,ownerNonceConsumed:true,
  limitation:'The original Git tree is restored by a new commit to the signed draft PR branch; history is not rewritten. Separate CI, PR review and release checks remain mandatory.'});
}
module.exports={runSupervisedGitHubBranchRollback,stableOwnerRollbackGrant,digestRollbackPlan,treeEntries,verifyExactRepairDelta};
