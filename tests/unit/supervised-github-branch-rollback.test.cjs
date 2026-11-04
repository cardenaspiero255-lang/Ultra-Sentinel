'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {runSupervisedGitHubBranchRollback,stableOwnerRollbackGrant,digestRollbackPlan}=
 require('../../packages/recovery/supervised-github-branch-rollback.cjs');
const {blobSha}=require('../../packages/investigation/novel-kotlin-hypotheses.cjs');

const REPO='cardenaspiero255-lang/JARVIS',OWNER='cardenaspiero255-lang';
const ORIGINAL='a'.repeat(40),BASE='b'.repeat(40),ORIGINAL_TREE='c'.repeat(40);
const REPAIR='d'.repeat(40),REPAIR_TREE='e'.repeat(40),RESTORE='f'.repeat(40);
const NOW=1793710000000,BRANCH='fix/ultra-sentinel-gguf-intent';
const PREFIX='apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/';
const {privateKey,publicKey}=crypto.generateKeyPairSync('ed25519');
let now=NOW;
require('node:test').mock.method(Date,'now',()=>now);
test.beforeEach(()=>{now=NOW;});
const response=(status,data)=>({status,json:async()=>data});

function sample(){
 const files=['OfflineVoiceQuestionGate.kt','LocalGgufPolicy.kt'].map((name,i)=>{
  const before='package sample\nclass Gate'+i+' { fun safe() = false }\n';
  const after=before.replace('false','true');
  return {path:PREFIX+name,beforeBlobSha:blobSha(before),afterBlobSha:blobSha(after)};
 });
 const plan={repository:REPO,prNumber:205,branch:BRANCH,operation:'ROLLBACK_EXISTING_DRAFT_PR_BRANCH',
  expectedMainSha:BASE,originalHeadSha:ORIGINAL,originalTreeSha:ORIGINAL_TREE,
  repairHeadSha:REPAIR,repairTreeSha:REPAIR_TREE,files};
 const grant={ownerLogin:OWNER,ownerId:322222186,repo:REPO,prNumber:205,branch:BRANCH,
  headSha:REPAIR,baseSha:BASE,planDigest:digestRollbackPlan(plan),
  nonce:'remote-rollback-unique-owner-12345',expiresAt:NOW+600000,
  operation:'ROLLBACK_EXISTING_DRAFT_PR_BRANCH'};
 return {plan,grant};
}
function signature(grant,key=privateKey,domain='Ultra-Sentinel:github-pr-branch-rollback:v1\n'){
 return crypto.sign(null,Buffer.from(domain+stableOwnerRollbackGrant(grant)),key).toString('base64');
}
function fakeGitHub({plan,stale=false,staleMain=false,prReady=false,extraChange=false,
 changedMode=false,wrongParent=false,patchFailure=false,patchResponseLost=false,
 folderTrees=false,unrelatedTreeChange=false,
 onRequest}={}){
 const calls=[],root='/repos/'+REPO,refPath=root+'/git/ref/heads/'+BRANCH;
 const patchPath=root+'/git/refs/heads/'+BRANCH;
 let current=stale?'9'.repeat(40):REPAIR,prReads=0;
 const unchanged={path:'README.md',mode:'100644',type:'blob',sha:'1'.repeat(40)};
 const original=[unchanged,...plan.files.map(f=>({path:f.path,mode:'100644',type:'blob',sha:f.beforeBlobSha}))];
 const repaired=[unchanged,...plan.files.map((f,i)=>({path:f.path,mode:changedMode&&i===0?'100755':'100644',
  type:'blob',sha:f.afterBlobSha}))];
 if(extraChange)repaired.push({path:'injected.kt',mode:'100644',type:'blob',sha:'2'.repeat(40)});
 if(folderTrees){
  const parent='apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core';
  original.push({path:parent,type:'tree',mode:'040000',sha:'3'.repeat(40)});
  repaired.push({path:parent,type:'tree',mode:'040000',sha:'4'.repeat(40)});
 }
 if(unrelatedTreeChange){
  original.push({path:'docs',type:'tree',mode:'040000',sha:'5'.repeat(40)});
  repaired.push({path:'docs',type:'tree',mode:'040000',sha:'6'.repeat(40)});
 }
 async function fetchImpl(url,opts={}){
  const u=new URL(url),method=opts.method||'GET',route=u.pathname;
  calls.push({method,route,body:opts.body?JSON.parse(opts.body):undefined});
  if(onRequest)onRequest({method,route,calls});
  if(u.origin!=='https://api.github.com')throw Error('BAD_ORIGIN');
  if(route==='/user'&&method==='GET')return response(200,{login:OWNER,id:322222186});
  if(route===root+'/pulls/205'&&method==='GET')return response(200,{
   number:205,state:'open',draft:!(prReady&&prReads++>=0),merged:false,
   user:{login:OWNER,id:322222186},
   head:{repo:{full_name:REPO},ref:BRANCH,sha:current},
   base:{repo:{full_name:REPO},ref:'main',sha:BASE}});
  if(route===root+'/git/ref/heads/main'&&method==='GET')return response(200,{
   ref:'refs/heads/main',object:{type:'commit',sha:staleMain?'8'.repeat(40):BASE}});
  if(route===refPath&&method==='GET')return response(200,{
   ref:'refs/heads/'+BRANCH,object:{type:'commit',sha:current}});
  if(route===root+'/git/commits/'+REPAIR&&method==='GET')return response(200,{
   sha:REPAIR,tree:{sha:REPAIR_TREE},parents:[{sha:wrongParent?'7'.repeat(40):ORIGINAL}]});
  if(route===root+'/git/commits/'+ORIGINAL&&method==='GET')return response(200,{
   sha:ORIGINAL,tree:{sha:ORIGINAL_TREE},parents:[{sha:BASE}]});
  if(route===root+'/git/commits/'+RESTORE&&method==='GET')return response(200,{
   sha:RESTORE,tree:{sha:ORIGINAL_TREE},parents:[{sha:REPAIR}]});
  if(route===root+'/git/trees/'+ORIGINAL_TREE&&method==='GET'&&u.search==='?recursive=1')
   return response(200,{sha:ORIGINAL_TREE,truncated:false,tree:original});
  if(route===root+'/git/trees/'+REPAIR_TREE&&method==='GET'&&u.search==='?recursive=1')
   return response(200,{sha:REPAIR_TREE,truncated:false,tree:repaired});
  if(route===root+'/git/commits'&&method==='POST')return response(201,{sha:RESTORE});
  if(route===patchPath&&method==='PATCH'){
   if(patchFailure)return response(422,{message:'non-fast-forward'});
   current=RESTORE;
   if(patchResponseLost)throw Error('NETWORK_LOST_AFTER_ACCEPTED_REF');
   return response(200,{ref:'refs/heads/'+BRANCH,object:{type:'commit',sha:RESTORE}});
  }
  throw Error('UNEXPECTED_REQUEST '+method+' '+route);
 }
 return {calls,fetchImpl};
}
async function execute({apply=false,mutate=()=>{},fake={},wrongKey=false,alternateDomain=false,
 store,inspect}={}){
 const {plan,grant}=sample(),signed=signature(grant,alternateDomain?privateKey:privateKey,
  alternateDomain?'Ultra-Sentinel:github-pr-branch-commit:v1\n':undefined);
 mutate({plan,grant});
 const remote=fakeGitHub({plan,...fake});
 if(inspect)inspect(remote);
 const directory=store||fs.mkdtempSync(path.join(os.tmpdir(),'ultra-remote-rollback-'));
 try{
  const result=await runSupervisedGitHubBranchRollback({
   plan,ownerGrant:grant,ownerSignature:signed,
   trustedOwnerPublicKey:wrongKey?crypto.generateKeyPairSync('ed25519').publicKey:publicKey,
   token:'a-fake-owner-token-for-unit-tests',nonceStorePath:path.join(directory,'nonces'),
   fetchImpl:remote.fetchImpl,apply});
  return {result,remote};
 }finally{if(!store)fs.rmSync(directory,{recursive:true,force:true});}
}

test('dry-run proves exact baseline restoration but never consumes nonce or writes',async()=>{
 const {result,remote}=await execute();
 assert.equal(result.status,'OWNER_SIGNED_REMOTE_ROLLBACK_READY');
 assert.equal(result.remoteWrites,false);
 assert.equal(result.restoredTreeSha,ORIGINAL_TREE);
 assert.equal(result.ownerNonceConsumed,false);
 assert.equal(result.mergeAllowed,false);
 assert.ok(remote.calls.every(c=>c.method==='GET'));
});
test('signed rollback appends only one restoring commit and atomically fast-forwards the draft branch',async()=>{
 const {result,remote}=await execute({apply:true});
 assert.equal(result.status,'OWNER_APPROVED_REMOTE_ROLLBACK_VERIFIED');
 assert.equal(result.commitSha,RESTORE);
 assert.equal(result.restoredTreeSha,ORIGINAL_TREE);
 assert.equal(result.ownerNonceConsumed,true);
 assert.equal(result.mergeAllowed,false);
 const writes=remote.calls.filter(c=>c.method!=='GET');
 assert.equal(writes.filter(c=>c.method==='POST').length,1);
 assert.deepEqual(writes[0].body.tree,ORIGINAL_TREE);
 assert.deepEqual(writes[0].body.parents,[REPAIR]);
 assert.equal(writes[1].method,'PATCH');
 assert.deepEqual(writes[1].body,{sha:RESTORE,force:false});
 assert.equal(writes.some(c=>/merge|\/git\/refs\/heads\/main/.test(c.route)),false);
});
test('fresh rollback-specific signature and immutable head, tree, branch, base and plan digest are mandatory',async()=>{
 const attacks=[
  {wrongKey:true},{alternateDomain:true},
  {mutate:({grant})=>{grant.nonce='a-reused-commit-grant-12345';}},
  {mutate:({grant})=>{grant.expiresAt=NOW-1;}},
  {mutate:({plan})=>{plan.branch='main';}},
  {mutate:({plan})=>{plan.repairTreeSha='6'.repeat(40);}},
  {mutate:({plan})=>{plan.originalTreeSha='6'.repeat(40);}},
  {mutate:({plan})=>{plan.files[0].afterBlobSha='6'.repeat(40);}},
 ];
 for(const attack of attacks)await assert.rejects(()=>execute({...attack,apply:true}),
  /INVALID|EXPIRED|SIGNATURE|MISMATCH|DENIED|BASELINE|TREE|SCOPE|PLAN/);
});
test('stale PR, main, branch, unexpected file or mode, and forged parent all veto writes',async()=>{
 for(const fake of [{stale:true},{staleMain:true},{prReady:true},{extraChange:true},
   {changedMode:true},{wrongParent:true}]){
  let remote;
  await assert.rejects(()=>execute({apply:true,fake,inspect:r=>{remote=r;}}),
   /STALE|UNTRUSTED|MISMATCH|UNEXPECTED|INVALID|DENIED|TREE/);
  assert.equal(remote.calls.some(c=>c.method!=='GET'),false);
 }
});
test('ref refusal and uncertainty never claim remote rollback success',async()=>{
 for(const fake of [{patchFailure:true},{patchResponseLost:true}]){
  let remote;
  await assert.rejects(()=>execute({apply:true,fake,inspect:r=>{remote=r;}}),
   /UNCERTAIN|REF_UPDATE|GITHUB_API|TRANSPORT/);
  assert.equal(remote.calls.filter(c=>c.method==='PATCH').length,1);
 }
});
test('one-time rollback nonce cannot be replayed even after a successful rollback',async()=>{
 const store=fs.mkdtempSync(path.join(os.tmpdir(),'ultra-rollback-replay-'));
 try{
  assert.equal((await execute({apply:true,store})).result.ownerNonceConsumed,true);
  await assert.rejects(()=>execute({apply:true,store}),/NONCE_REPLAY_DENIED/);
 }finally{fs.rmSync(store,{recursive:true,force:true});}
});
test('expired owner grant after detached restore commit vetoes ref publication',async()=>{
 let remote;
 const fake={onRequest:({method,route,calls})=>{
  if(method==='GET'&&route.endsWith('/git/ref/heads/'+BRANCH)&&
   calls.some(c=>c.method==='POST'))now=NOW+600001;
 }};
 await assert.rejects(()=>execute({apply:true,fake,inspect:r=>{remote=r;}}),
  /OWNER_GRANT_EXPIRED/);
 assert.equal(remote.calls.filter(c=>c.method==='POST').length,1);
 assert.equal(remote.calls.filter(c=>c.method==='PATCH').length,0);
});

test('Git recursive tree hashes may change for ancestors of the two signed Kotlin blobs',async()=>{
 const {result}=await execute({apply:true,fake:{folderTrees:true}});
 assert.equal(result.status,'OWNER_APPROVED_REMOTE_ROLLBACK_VERIFIED');
});
test('unrelated directory tree mutations still veto rollback',async()=>{
 let remote;
 await assert.rejects(()=>execute({apply:true,fake:{unrelatedTreeChange:true},
  inspect:r=>{remote=r;}}),/UNEXPECTED_REMOTE_REPAIR_TREE_DELTA/);
 assert.ok(remote.calls.every(x=>x.method==='GET'));
});
