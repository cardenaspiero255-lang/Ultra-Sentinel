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
function fakeGitHub({plan,files,stale=false,staleMain=false,symlink=false,truncated=false,patchFailure=false}={}){
 const calls=[],refPath='/repos/'+REPO+'/git/ref/heads/'+BRANCH;
 let current=stale?'f'.repeat(40):SHA;
 async function fetchImpl(url,options={}){
  const uri=new URL(url),route=uri.pathname,method=options.method||'GET';
  calls.push({route,method,body:options.body&&JSON.parse(options.body)});
  if(uri.origin!=='https://api.github.com')throw Error('BAD_ORIGIN');
  if(route==='/user'&&method==='GET')return response(200,{login:OWNER,id:322222186});
  if(route==='/repos/'+REPO+'/pulls/205')return response(200,{
   number:205,state:'open',draft:true,merged:false,
   user:{login:OWNER,id:322222186},
   head:{ref:BRANCH,sha:SHA,repo:{full_name:REPO}},
   base:{ref:'main',sha:BASE,repo:{full_name:REPO}}});
  if(route==='/repos/'+REPO+'/git/ref/heads/main')
   return response(200,{ref:'refs/heads/main',object:{type:'commit',sha:staleMain?'f'.repeat(40):BASE}});
  if(route===refPath&&method==='GET')
   return response(200,{ref:'refs/heads/'+BRANCH,object:{type:'commit',sha:current}});
  if(route==='/repos/'+REPO+'/git/commits/'+SHA&&method==='GET')
   return response(200,{sha:SHA,tree:{sha:TREE}});
  if(route==='/repos/'+REPO+'/git/trees/'+TREE&&uri.search==='?recursive=1'&&method==='GET')
   return response(200,{sha:TREE,truncated,tree:files.map((f,i)=>({
    path:f.path,type:'blob',mode:symlink&&i===0?'120000':'100644',sha:f.beforeBlobSha
   }))});
  if(route==='/repos/'+REPO+'/git/blobs'&&method==='POST')
   return response(201,{sha:blobSha(Buffer.from(options.body&&JSON.parse(options.body).content||'','base64').toString('utf8'))});
  if(route==='/repos/'+REPO+'/git/trees'&&method==='POST')
   return response(201,{sha:NEW_TREE});
  if(route==='/repos/'+REPO+'/git/commits'&&method==='POST')
   return response(201,{sha:NEW_COMMIT});
  if(route===refPath&&method==='PATCH'){
   if(patchFailure)return response(422,{message:'non-fast-forward'});
   current=NEW_COMMIT;
   return response(200,{ref:'refs/heads/'+BRANCH,object:{type:'commit',sha:NEW_COMMIT}});
  }
  throw Error('UNEXPECTED_GITHUB_API '+method+' '+route);
 }
 return {calls,fetchImpl};
}
async function execute({mutate=()=>{},apply=false,now=NOW,mockOptions={},oracle=oracleFor,
  store,alternateKey}={}){
 const s=sample();mutate(s);
 const remote=fakeGitHub({plan:s.plan,files:s.files,...mockOptions});
 const dir=store||fs.mkdtempSync(path.join(os.tmpdir(),'us-owner-pr-'));
 const options={plan:s.plan,files:s.files,ownerGrant:s.grant,
  ownerSignature:sig(s.grant),trustedOwnerPublicKey:alternateKey||publicKey,
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
 assert.equal(result.mergeAllowed,false);
 assert.equal(remote.calls.some(c=>c.method!=='GET'),false);
});
test('separately approved commit writes only to existing draft PR branch via atomic non-forced fast-forward',async()=>{
 const {result,remote}=await execute({apply:true});
 assert.equal(result.status,'OWNER_APPROVED_PR_BRANCH_COMMIT_CREATED');
 assert.equal(result.commitSha,NEW_COMMIT);
 assert.equal(result.remoteWrites,true);
 assert.equal(result.mergeAllowed,false);
 const writes=remote.calls.filter(x=>x.method!=='GET');
 assert.equal(writes.filter(x=>x.method==='PATCH').length,1);
 assert.equal(writes.at(-1).route,'/repos/'+REPO+'/git/ref/heads/'+BRANCH);
 assert.deepEqual(writes.at(-1).body,{sha:NEW_COMMIT,force:false});
 assert.equal(writes.some(x=>/pulls\/|\/merge|git\/ref\/heads\/main/.test(x.route)),false);
 assert.equal(writes.filter(x=>x.method==='POST'&&x.route.endsWith('/git/blobs')).length,2);
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
  await assert.rejects(()=>execute({mutate,apply:true}),/DENIED|INVALID|MISMATCH|STALE|SIGNATURE|SCOPE|HASH|BLOB|PLAN/);
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
test('non-fast-forward refusal does not assert a successful remote write or merge',async()=>{
 await assert.rejects(()=>execute({apply:true,mockOptions:{patchFailure:true}}),/REF_UPDATE|REMOTE|GITHUB/);
});
test('persistent owner nonce is single-use across independent successful attempts',async()=>{
 const store=fs.mkdtempSync(path.join(os.tmpdir(),'us-owner-nonce-'));
 try{
  const x=await execute({apply:true,store});
  assert.equal(x.result.remoteWrites,true);
  await assert.rejects(()=>execute({apply:true,store}),/NONCE_REPLAY|DENIED/);
 }finally{fs.rmSync(store,{recursive:true,force:true});}
});
