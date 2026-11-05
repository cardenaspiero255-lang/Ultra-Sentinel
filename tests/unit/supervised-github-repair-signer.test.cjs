'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const {signRepairIntent,isSafeAncestor}=require('../../scripts/sign-supervised-github-repair.cjs');
function signOwnerOffline(...args){
 // Only ephemeral test keys: simulate the owner's non-CI workstation.
 const previous=process.env.GITHUB_ACTIONS;
 try{delete process.env.GITHUB_ACTIONS;return signRepairIntent(...args);}
 finally{if(previous===undefined)delete process.env.GITHUB_ACTIONS;else process.env.GITHUB_ACTIONS=previous;}
}
const {digestBranchCandidate,stableOwnerBranchGrant}=
 require('../../packages/recovery/supervised-github-branch-commit.cjs');
const gitBlob=s=>{const b=Buffer.from(s);return crypto.createHash('sha1')
 .update('blob '+b.length+'\0').update(b).digest('hex');};
const {privateKey,publicKey}=crypto.generateKeyPairSync('ed25519');
const pin=crypto.createHash('sha256').update(publicKey.export({type:'spki',format:'der'})).digest('hex');
const prefix='apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/';
function sample(){
 const files=['Alpha.kt','Beta.kt'].map((name,i)=>{
  const before='package example\nclass Before'+i+' {}\n';
  const after='package example\nclass After'+i+' {}\n';
  return {path:prefix+name,before,after,beforeBlobSha:gitBlob(before),afterBlobSha:gitBlob(after)};
 });
 const plan={repository:'cardenaspiero255-lang/JARVIS',prNumber:123,
  branch:'fix/ultra-sentinel-example',expectedHeadSha:'a'.repeat(40),
  expectedMainSha:'b'.repeat(40),expectedTreeSha:'c'.repeat(40),
  operation:'COMMIT_TO_EXISTING_DRAFT_PR_BRANCH'};
 const ownerGrant={ownerLogin:'cardenaspiero255-lang',ownerId:322222186,
  repo:plan.repository,prNumber:plan.prNumber,branch:plan.branch,
  headSha:plan.expectedHeadSha,baseSha:plan.expectedMainSha,
  planDigest:digestBranchCandidate(plan,files),
  nonce:'synthetic-nonce-for-tests-123456789',expiresAt:Date.now()+300000,
  operation:plan.operation};
 return {plan,files,ownerGrant};
}
test('signs exactly the executor canonical repair grant with its own domain',()=>{
 const request=sample(),signature=signOwnerOffline(request,privateKey,pin);
 const grant=stableOwnerBranchGrant(request.ownerGrant);
 assert.equal(crypto.verify(null,Buffer.from('Ultra-Sentinel:github-pr-branch-commit:v1\n'+grant),
  publicKey,Buffer.from(signature,'base64')),true);
 assert.equal(crypto.verify(null,Buffer.from('Ultra-Sentinel:github-pr-branch-rollback:v1\n'+grant),
  publicKey,Buffer.from(signature,'base64')),false);
});
test('rejects every mismatched signed scope, missing or extra fields and altered candidate',()=>{
 for(const mutate of [
  r=>{r.ownerGrant.planDigest='d'.repeat(64);},r=>{r.ownerGrant.branch='fix/ultra-sentinel-other';},
  r=>{r.ownerGrant.headSha='d'.repeat(40);},r=>{r.ownerGrant.baseSha='d'.repeat(40);},
  r=>{r.ownerGrant.prNumber++;},r=>{r.plan.expectedTreeSha='d'.repeat(40);},
  r=>{r.files[0].after+='//tampers\n';},r=>{r.files[0].path='../escape.kt';},
  r=>{r.ownerGrant.operation='ROLLBACK_EXISTING_DRAFT_PR_BRANCH';},
  r=>{r.plan.unreviewed=true;},r=>{r.ownerGrant.unreviewed=true;},
  r=>{r.unreviewed=true;},r=>{delete r.ownerGrant.nonce;}
 ]){const request=sample();mutate(request);assert.throws(()=>signOwnerOffline(request,privateKey,pin));}
});
test('rejects expired or too-long grants, wrong key, wrong public pin and CI',()=>{
 for(const expiry of [Date.now()-1000,Date.now()+905000]){
  const request=sample();request.ownerGrant.expiresAt=expiry;
  assert.throws(()=>signOwnerOffline(request,privateKey,pin),/NOT_SIGNABLE/);
 }
 assert.throws(()=>signOwnerOffline(sample(),privateKey,'0'.repeat(64)),/PIN_MISMATCH/);
 assert.throws(()=>signOwnerOffline(sample(),crypto.generateKeyPairSync('rsa',{modulusLength:1024}).privateKey,pin),/INVALID_KEY/);
 const previous=process.env.GITHUB_ACTIONS;
 try{process.env.GITHUB_ACTIONS='true';assert.throws(()=>signRepairIntent(sample(),privateKey,pin),/FORBIDDEN_IN_CI/);}
 finally{if(previous===undefined)delete process.env.GITHUB_ACTIONS;else process.env.GITHUB_ACTIONS=previous;}
});
test('ancestor policy accepts only root or owner and non-writable real directories',()=>{
 const directory=(uid,mode,isDir=true,isLink=false)=>({uid,mode,isDirectory:()=>isDir,isSymbolicLink:()=>isLink});
 assert.equal(isSafeAncestor(directory(0,0o755),1234),true);
 assert.equal(isSafeAncestor(directory(1234,0o700),1234),true);
 assert.equal(isSafeAncestor(directory(4567,0o700),1234),false);
 assert.equal(isSafeAncestor(directory(0,0o777),1234),false);
 assert.equal(isSafeAncestor(directory(1234,0o720),1234),false);
 assert.equal(isSafeAncestor(directory(0,0o755,false),1234),false);
 assert.equal(isSafeAncestor(directory(0,0o755,true,true),1234),false);
});
test('POSIX CLI reads only private owner key files and refuses symlinks and exposed modes',
 {skip:process.platform==='win32'},()=>{
 const dir=fs.mkdtempSync(path.join(process.cwd(),'us-repair-signer-test-'));
 try{
  const intent=path.join(dir,'intent.json'),keyFile=path.join(dir,'key.pem'),link=path.join(dir,'key-link');
  fs.writeFileSync(intent,JSON.stringify(sample()),{mode:0o600});
  fs.writeFileSync(keyFile,privateKey.export({type:'pkcs8',format:'pem'}),{mode:0o600});
  const script=path.join(__dirname,'../../scripts/sign-supervised-github-repair.cjs');
  // Ephemeral test keys and a simulated owner workstation only.
  const env={PATH:process.env.PATH,ULTRA_SENTINEL_OWNER_SIGNING_KEY_FILE:keyFile,
   ULTRA_SENTINEL_OWNER_SIGNING_PUBKEY_SHA256:pin};
  const run=()=>spawnSync(process.execPath,[script,intent],{env,encoding:'utf8'});
  const ok=run();assert.equal(ok.status,0);assert.match(ok.stdout,/^[A-Za-z0-9+/]{86}==\n$/);
  fs.chmodSync(dir,0o777);assert.notEqual(run().status,0);fs.chmodSync(dir,0o700);
  const intentJSON=fs.readFileSync(intent,'utf8');
  fs.writeFileSync(intent,intentJSON.slice(0,-1)+',"plan":'+JSON.stringify(sample().plan)+'}');
  assert.notEqual(run().status,0);fs.writeFileSync(intent,intentJSON);
  fs.chmodSync(keyFile,0o644);assert.notEqual(run().status,0);fs.chmodSync(keyFile,0o600);
  fs.symlinkSync(keyFile,link);env.ULTRA_SENTINEL_OWNER_SIGNING_KEY_FILE=link;
  assert.notEqual(run().status,0);
  env.ULTRA_SENTINEL_OWNER_SIGNING_KEY_FILE=keyFile;fs.chmodSync(intent,0o666);
  assert.notEqual(run().status,0);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
