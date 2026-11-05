'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {runSupervisedGitHubBranchCommit,stableOwnerBranchGrant,digestBranchCandidate}=
 require('../../packages/recovery/supervised-github-branch-commit.cjs');
const {blobSha}=require('../../packages/investigation/novel-kotlin-hypotheses.cjs');
const REPO='cardenaspiero255-lang/JARVIS',OWNER='cardenaspiero255-lang';
const SHA='a'.repeat(40),BASE='b'.repeat(40),TREE='c'.repeat(40);
const NEW_TREE='d'.repeat(40),NEW_COMMIT='e'.repeat(40);
const NOW=1793710000000,BRANCH='fix/ultra-sentinel-gguf-intent';
// The test file runs in its own Node test worker. Only tests control this
// simulated wall clock: production callers cannot provide a clock callback.
let clockNow=NOW;
require('node:test').mock.method(Date,'now',()=>clockNow);
test.beforeEach(()=>{clockNow=NOW;});
const PREFIX='apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/';
const {privateKey,publicKey}=crypto.generateKeyPairSync('ed25519');
const sig=(grant,key=privateKey)=>crypto.sign(null,Buffer.from(
 'Ultra-Sentinel:github-pr-branch-commit:v1\n'+stableOwnerBranchGrant(grant)),key).toString('base64');
const response=(status,obj)=>({status,ok:status>=200&&status<300,json:async()=>obj});
function sample(){
 const files=['OfflineVoiceQuestionGate.kt','LocalGgufPolicy.kt'].map((name,i)=>{
  const before='package com.test\nclass X'+i+' { fun rule() = false }\n';
  const after=before.replace('false','true');
  return {path:PREFIX+name,before,after,beforeBlobSha:blobSha(before),afterBlobSha:blobSha(after)};
 });
 const plan={repository:REPO,prNumber:205,branch:BRANCH,expectedHeadSha:SHA,
  expectedMainSha:BASE,expectedTreeSha:TREE,operation:'COMMIT_TO_EXISTING_DRAFT_PR_BRANCH'};
 const planDigest=digestBranchCandidate(plan,files);
 const grant={ownerLogin:OWNER,ownerId:322222186,repo:REPO,prNumber:plan.prNumber,
  branch:BRANCH,headSha:SHA,baseSha:BASE,planDigest,
  nonce:'one-unique-owner-approval-123456',expiresAt:NOW+600000,
  operation:plan.operation};
 return {files,plan,grant};
}
function oracleFor({plan,files}){
 files=[...files].sort((a,b)=>a.path.localeCompare(b.path));
 return {status:'TRUSTED_ORIGINAL_KOTLIN_JVM_RED_GREEN',baselineHeadSha:plan.expectedHeadSha,
  planDigest:digestBranchCandidate(plan,files),sourceBlobs:files.map(f=>f.beforeBlobSha),
  candidateBlobs:files.map(f=>f.afterBlobSha),genuineOriginalRed:true,
  originalJVMGreen:true,benignControlsPassed:true,isolatedExecution:true,
  remoteWrites:false,mergeAllowed:false};
}
test('repair digest uses the same ASCII path order on different locales',()=>{
 const {plan,files}=sample();
 files[0].path=PREFIX+'I.kt';files[1].path=PREFIX+'i.kt';
 const expected=digestBranchCandidate(plan,files);
 assert.equal(digestBranchCandidate(plan,[...files].reverse()),expected);
 const {spawnSync}=require('node:child_process');
 for(const locale of ['en_US.UTF-8','tr_TR.UTF-8']){
  const child=spawnSync(process.execPath,['-e',
   'const m=require(process.argv[1]);const x=JSON.parse(process.argv[2]);process.stdout.write(m.digestBranchCandidate(x.plan,x.files))',
   require.resolve('../../packages/recovery/supervised-github-branch-commit.cjs'),JSON.stringify({plan,files})],
   {encoding:'utf8',env:{...process.env,LANG:locale,LC_ALL:locale}});
  assert.equal(child.status,0,child.stderr);
  assert.equal(child.stdout,expected);
 }
});
function fakeGitHub({plan,files,stale=false,staleMain=false,symlink=false,truncated=false,oversized=false,duplicate=false,patchFailure=false,raceHead,
  prBecameReady=false,mainMoved=false,lostResponse=false,wrongPublishedTree=false,onRequest}={}){
 const calls=[],refPath='/repos/'+REPO+'/git/ref/heads/'+BRANCH;
 let current=stale?'f'.repeat(40):SHA,prReads=0,mainReads=0;
 async function fetchImpl(url,options={}){
  const uri=new URL(url),route=uri.pathname,method=options.method||'GET';
  calls.push({route,method,body:options.body&&JSON.parse(options.body)});
  if(typeof onRequest==='function')onRequest({route,method,calls});
  if(uri.origin!=='https://api.github.com')throw Error('BAD_ORIGIN');
  if(route==='/user'&&method==='GET')return response(200,{login:OWNER,id:322222186});
  if(route==='/repos/'+REPO+'/pulls/205')return response(200,{
   number:205,state:'open',draft:!(prBecameReady&&prReads++>0),merged:false,
   user:{login:OWNER,id:322222186},
   head:{ref:BRANCH,sha:current,repo:{full_name:REPO}},
   base:{ref:'main',sha:BASE,repo:{full_name:REPO}}});
  if(route==='/repos/'+REPO+'/git/ref/heads/main')
   return response(200,{ref:'refs/heads/main',object:{type:'commit',sha:(staleMain||(mainMoved&&mainReads++>0))?'f'.repeat(40):BASE}});
  if(route===refPath&&method==='GET')
   return response(200,{ref:'refs/heads/'+BRANCH,object:{type:'commit',sha:current}});
  if(route==='/repos/'+REPO+'/git/commits/'+SHA&&method==='GET')
   return response(200,{sha:SHA,tree:{sha:TREE}});
  if(route==='/repos/'+REPO+'/git/commits/'+NEW_COMMIT&&method==='GET')
   return response(200,{sha:NEW_COMMIT,tree:{sha:NEW_TREE},parents:[{sha:SHA}]});
  if(route==='/repos/'+REPO+'/git/trees/'+TREE&&uri.search==='?recursive=1'&&method==='GET')
   return response(200,{sha:TREE,truncated,tree:[...files.map((f,i)=>({
    path:f.path,type:'blob',mode:symlink&&i===0?'120000':'100644',sha:f.beforeBlobSha
   })),...(oversized?Array.from({length:20001},(_,i)=>({path:'extra/'+i,type:'blob',mode:'100644',sha:'1'.repeat(40)})):[]),
   ...(duplicate?[{path:files[0].path,type:'blob',mode:'100644',sha:files[0].beforeBlobSha}]:[])]});
  if(route==='/repos/'+REPO+'/git/trees/'+NEW_TREE&&uri.search==='?recursive=1'&&method==='GET')
   return response(200,{sha:NEW_TREE,truncated:false,tree:files.map(f=>({
    path:f.path,type:'blob',mode:'100644',sha:wrongPublishedTree?f.beforeBlobSha:f.afterBlobSha
   }))});
  if(route==='/repos/'+REPO+'/git/blobs'&&method==='POST')
   return response(201,{sha:blobSha(Buffer.from(options.body&&JSON.parse(options.body).content||'','base64').toString('utf8'))});
  if(route==='/repos/'+REPO+'/git/trees'&&method==='POST')
   return response(201,{sha:NEW_TREE});
  if(route==='/repos/'+REPO+'/git/commits'&&method==='POST')
   return response(201,{sha:NEW_COMMIT});
  if(route==='/graphql'&&method==='POST'){
   const input=JSON.parse(options.body).variables.input;
   if(raceHead)current=raceHead;
   if(patchFailure||current!==input.expectedHeadOid)return response(200,{errors:[{message:'stale'}]});
   current=NEW_COMMIT;
   if(lostResponse)throw Error('RESPONSE_LOST_AFTER_PUBLICATION');
   return response(200,{data:{createCommitOnBranch:{commit:{oid:NEW_COMMIT}}}});
  }
  throw Error('UNEXPECTED_GITHUB_API '+method+' '+route);
 }
 return {calls,fetchImpl};
}
async function execute({mutate=()=>{},apply=false,now=NOW,mockOptions={},oracle=oracleFor,
  store,alternateKey,inspectRemote}={}){
 const s=sample(),signedGrant=sig(s.grant);mutate(s);
 const remote=fakeGitHub({plan:s.plan,files:s.files,...mockOptions});
 if(typeof inspectRemote==='function')inspectRemote(remote);
 const dir=store||fs.mkdtempSync(path.join(os.tmpdir(),'us-owner-pr-'));
 const options={plan:s.plan,files:s.files,ownerGrant:s.grant,
  ownerSignature:signedGrant,trustedOwnerPublicKey:alternateKey||publicKey,
  token:'gh-authenticated-owner-token-for-tests',now,
  fetchImpl:remote.fetchImpl,verifyOriginalJVM:async()=>oracle(s),
  nonceStorePath:path.join(dir,'spent-nonces'),apply};
 try{
  const result=await runSupervisedGitHubBranchCommit(options);
  return {result,remote,options};
 }finally{if(!store)fs.rmSync(dir,{recursive:true,force:true});}
}
test('signed immutable plan, original Kotlin oracle and local Judge/rollback: preview performs zero GitHub writes',async()=>{
 const {result,remote}=await execute();
 assert.equal(result.status,'OWNER_AUTHENTICATED_DRAFT_PR_READY');
 assert.equal(result.originalJVMVerified,true);
 assert.equal(result.localJudgeAndRollbackVerified,true);
 assert.equal(result.remoteWrites,false);
 assert.equal(result.ownerNonceChecked,false);
 assert.equal(result.mergeAllowed,false);
 assert.equal(remote.calls.some(c=>c.method!=='GET'),false);
});
test('separately approved commit publishes with the exact expected branch SHA',async()=>{
 const {result,remote}=await execute({apply:true});
 assert.equal(result.status,'OWNER_APPROVED_PR_BRANCH_COMMIT_CREATED');
 assert.equal(result.commitSha,NEW_COMMIT);
 assert.equal(result.remoteWrites,true);
 assert.equal(result.mergeAllowed,false);
 assert.equal(result.remoteRollbackExecuted,false);
 assert.equal(result.rollbackPlan.operation,'ROLLBACK_EXISTING_DRAFT_PR_BRANCH');
 assert.equal(result.rollbackPlan.repository,REPO);
 assert.equal(result.rollbackPlan.prNumber,205);
 assert.equal(result.rollbackPlan.branch,BRANCH);
 assert.equal(result.rollbackPlan.expectedMainSha,BASE);
 assert.equal(result.rollbackPlan.originalHeadSha,SHA);
 assert.equal(result.rollbackPlan.originalTreeSha,TREE);
 assert.equal(result.rollbackPlan.repairHeadSha,NEW_COMMIT);
 assert.equal(result.rollbackPlan.repairTreeSha,NEW_TREE);
 assert.equal(result.rollbackPlan.files.length,2);
 assert.match(result.rollbackPlanDigest,/^[a-f0-9]{64}$/);
 const {digestRollbackPlan}=require('../../packages/recovery/supervised-github-branch-rollback.cjs');
 assert.equal(result.rollbackPlanDigest,digestRollbackPlan(result.rollbackPlan));
 const writes=remote.calls.filter(x=>x.method!=='GET');
 assert.equal(writes.length,1);
 assert.equal(writes[0].route,'/graphql');
 assert.equal(writes[0].body.variables.input.expectedHeadOid,SHA);
 assert.equal(writes[0].body.variables.input.branch.branchName,BRANCH);
 assert.equal(writes.some(x=>/pulls\/|\/merge|git\/ref\/heads\/main/.test(x.route)),false);
 assert.equal(writes[0].body.variables.input.fileChanges.additions.length,2);
});
test('all plan, scope, content and owner-signature manipulations fail before GitHub writes',async()=>{
 const attacks=[
  s=>s.grant.nonce='tampered-explicit-consent-123456',
  s=>s.grant.expiresAt=NOW-1,
  s=>s.grant.branch='main',
  s=>s.plan.branch='main',
  s=>s.plan.expectedHeadSha='f'.repeat(40),
  s=>s.plan.expectedMainSha='f'.repeat(40),
  s=>s.files[0].path='../evil.kt',
  s=>s.files[1].path=s.files[0].path,
  s=>s.files[0].after+='//unapproved\n',
  s=>s.files[1].beforeBlobSha='f'.repeat(40),
  s=>s.plan.operation='MERGE_TO_MAIN'
 ];
 for(const mutate of attacks){
  await assert.rejects(()=>execute({mutate,apply:true}),/DENIED|INVALID|MISMATCH|STALE|SIGNATURE|SCOPE|HASH|BLOB|PLAN|EXPIRED/);
 }
 await assert.rejects(()=>execute({apply:true,alternateKey:crypto.generateKeyPairSync('ed25519').publicKey}),/SIGNATURE|DENIED/);
});
test('trusted oracle veto and missing independent oracle prevent any write',async()=>{
 for(const oracle of [
  ()=>({status:'FAKE_ORACLE',originalJVMGreen:true}),
  s=>({...oracleFor(s),genuineOriginalRed:false}),
  s=>({...oracleFor(s),planDigest:'f'.repeat(64)}),
  s=>({...oracleFor(s),isolatedExecution:false})
 ]){
  await assert.rejects(()=>execute({apply:true,oracle}),/ORACLE|DENIED|PROOF/);
 }
});
test('remote SHA, protected main and symlink/truncated tree invalidate branch preparation',async()=>{
 for(const mockOptions of [{stale:true},{staleMain:true},{symlink:true},{truncated:true}]){
  await assert.rejects(()=>execute({apply:true,mockOptions}),/REMOTE|STALE|TREE|BLOB|SCOPE|DENIED/);
 }
});
test('oversized and duplicate original trees fail before dry-run readiness or any publication',async()=>{
 for(const mockOptions of [{oversized:true},{duplicate:true}]){
  for(const apply of [false,true]){
   let remote;
   await assert.rejects(()=>execute({apply,mockOptions,inspectRemote:r=>{remote=r;}}),/TREE_UNTRUSTED/);
   assert.ok(remote.calls.every(c=>c.method==='GET'));
  }
 }
});
test('non-fast-forward refusal does not assert a successful remote write or merge',async()=>{
 await assert.rejects(()=>execute({apply:true,mockOptions:{patchFailure:true}}),/PUBLICATION_UNCERTAIN/);
});
test('branch advance, rewind or deletion at publication is rejected by the expected HEAD',async()=>{
 for(const raceHead of [BASE,'f'.repeat(40),'deleted']){
  let remote;
  await assert.rejects(()=>execute({apply:true,mockOptions:{raceHead},inspectRemote:r=>{remote=r;}}),/PUBLICATION_UNCERTAIN/);
  assert.equal(remote.calls.filter(x=>x.route==='/graphql').length,1);
 }
});
test('a lost mutation response or incorrect published tree never reports success',async()=>{
 for(const mockOptions of [{lostResponse:true},{wrongPublishedTree:true}]){
  let remote;
  await assert.rejects(()=>execute({apply:true,mockOptions,inspectRemote:r=>{remote=r;}}),/UNCERTAIN/);
  assert.equal(remote.calls.filter(c=>c.route==='/graphql').length,1);
 }
});
test('persistent owner nonce is single-use across independent successful attempts',async()=>{
 const store=fs.mkdtempSync(path.join(os.tmpdir(),'us-owner-nonce-'));
 try{
  const x=await execute({apply:true,store});
  assert.equal(x.result.remoteWrites,true);
  await assert.rejects(()=>execute({apply:true,store}),/NONCE_REPLAY|DENIED/);
 }finally{fs.rmSync(store,{recursive:true,force:true});}
});

test('new GitHub owner evidence is required again if PR stops being draft during verification',async()=>{
 await assert.rejects(()=>execute({apply:true,mockOptions:{prBecameReady:true}}),
  /UNTRUSTED_OR_STALE_DRAFT_PR/);
});
test('do not publish candidate when protected main advances after trusted original JVM verification',async()=>{
 await assert.rejects(()=>execute({apply:true,mockOptions:{mainMoved:true}}),
  /STALE_MAIN_HEAD/);
});

test('P1: async grant nonce mutation must consume only the Ed25519-signed snapshot',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'us-owner-snapshot-'));
 try{
  const s=sample(),signedNonce=s.grant.nonce;
  const signed=sig(s.grant),remote=fakeGitHub({plan:s.plan,files:s.files});
  const pending=runSupervisedGitHubBranchCommit({
   plan:s.plan,files:s.files,ownerGrant:s.grant,ownerSignature:signed,
   trustedOwnerPublicKey:publicKey,token:'gh-authenticated-owner-token-for-tests',
   nonceStorePath:path.join(dir,'spent-nonces'),
   verifyOriginalJVM:async()=>oracleFor(s),
   fetchImpl:remote.fetchImpl,now:NOW,apply:true
  });
  s.grant.nonce='attacker-swapped-nonce-after-signed-check-123456';
  const result=await pending;
  assert.equal(result.status,'OWNER_APPROVED_PR_BRANCH_COMMIT_CREATED');
  assert.equal(result.ownerNonceConsumed,true);
  assert.notEqual(s.grant.nonce,signedNonce);
  await assert.rejects(()=>execute({apply:true,store:dir}),
   /NONCE_REPLAY_DENIED/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('P2: grant expiry during original Kotlin oracle vetoes remote writes',async()=>{
 let observed;
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'us-expiring-oracle-'));
 try{
  await assert.rejects(()=>execute({
   apply:true,store:dir,
   inspectRemote:r=>{observed=r;},
   oracle:s=>{clockNow=NOW+600001;return oracleFor(s);}
  }),/OWNER_GRANT_EXPIRED/);
  assert.ok(observed);
  assert.equal(observed.calls.some(c=>c.method!=='GET'),false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('P2: grant expiry immediately before publication vetoes remote write',async()=>{
 let observed;
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'us-expiring-publish-'));
 try{
  await assert.rejects(()=>execute({
   apply:true,store:dir,
   inspectRemote:r=>{observed=r;},
   mockOptions:{onRequest:({route,method,calls})=>{
    const reads=calls.filter(c=>c.method==='GET'&&c.route==='/repos/'+REPO+'/git/ref/heads/'+BRANCH).length;
    if(method==='GET'&&route==='/repos/'+REPO+'/git/ref/heads/'+BRANCH&&reads===2)
     clockNow=NOW+600001;
   }}
  }),/OWNER_GRANT_EXPIRED/);
  assert.equal(observed.calls.some(c=>c.method==='POST'),false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
