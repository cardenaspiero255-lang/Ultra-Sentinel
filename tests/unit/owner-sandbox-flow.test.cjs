'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const crypto=require('node:crypto'),{execFileSync,spawn}=require('node:child_process');
const {once}=require('node:events');
const {setTimeout:delay}=require('node:timers/promises');
const {runOwnerAuthorizedSandboxRepair,digestPlan,recoverInterruptedSandboxRepair}=require('../../packages/recovery/owner-sandbox-flow.cjs');
const {stableAuthorization}=require('../../packages/recovery/owner-authorization.cjs');
function git(cwd,...args){return execFileSync('git',args,{cwd,encoding:'utf8'}).trim();}
function blob(data){const b=Buffer.from(data);return crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex');}
function fixture(){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'ultra-flow-'));
 git(directory,'init','-q','-b','main');
 git(directory,'config','user.name','Fixture');git(directory,'config','user.email','fixture@example.invalid');
 const file='app/src/main/Engine.kt';fs.mkdirSync(path.dirname(path.join(directory,file)),{recursive:true});
 fs.writeFileSync(path.join(directory,file),'before\n');git(directory,'add','.');git(directory,'commit','-qm','baseline');
 git(directory,'switch','-q','-c','sandbox/repair');
 const head=git(directory,'rev-parse','HEAD'),nonce='nonce-value-12345678901234';
 const changes=[{path:file,content:'after\n'}],plan={status:'REVIEW_READY_NO_EXECUTOR',
 commitAllowed:false,mergeAllowed:false,branch:'sandbox/repair',
 expectedHeadSha:head,authorizationNonce:nonce,patchBytes:100,
 changes:[{path:file,beforeBlobSha:blob('before\n'),afterBlobSha:blob('after\n'),patchBytes:10}]};
 const authorization={ownerLogin:'cardenaspiero255-lang',repo:'cardenaspiero255-lang/Ultra-Sentinel',
 branch:'sandbox/repair',headSha:head,nonce,expiresAt:Date.now()+60000,
 planDigest:digestPlan(plan,changes)};
 const {privateKey,publicKey}=crypto.generateKeyPairSync('ed25519');
 const authorizationSignature=crypto.sign(null,Buffer.from('Ultra-Sentinel:owner-authorization:v1\n'+stableAuthorization(authorization)),privateKey).toString('base64');
 const options={authorizationSignature,trustedPublicKey:publicKey,token:'token-with-length-12345',expectedOwner:'cardenaspiero255-lang',
 expectedOwnerId:12345,authorization,nonceStorePath:path.join(fs.mkdtempSync(path.join(os.tmpdir(),'ultra-flow-nonces-')),'ledger'),
 directory,plan,changes,expectedHeadSha:head,
 fetchImpl:async()=>({status:200,json:async()=>({login:'cardenaspiero255-lang',id:12345})})};
 return {directory,file,options};
}
test('owner-authorized integration succeeds and rejects replay after reset',async()=>{
 const f=fixture();
 try{
  const result=await runOwnerAuthorizedSandboxRepair({...f.options,verifyRepair:async()=>true});
  assert.equal(result.status,'SANDBOX_REPAIR_VERIFIED');
  assert.equal(result.remoteWrites,false);
  assert.equal(fs.readFileSync(path.join(f.directory,f.file),'utf8'),'after\n');
  git(f.directory,'reset','--hard',f.options.expectedHeadSha);
  await assert.rejects(runOwnerAuthorizedSandboxRepair({...f.options,verifyRepair:async()=>true}),/NONCE_REPLAY/);
 }finally{fs.rmSync(f.directory,{recursive:true,force:true});fs.rmSync(path.dirname(f.options.nonceStorePath),{recursive:true,force:true});}
});
test('failed verification restores exact baseline tree',async()=>{
 const f=fixture();
 try{
  const result=await runOwnerAuthorizedSandboxRepair({...f.options,verifyRepair:async()=>false});
  assert.equal(result.status,'SANDBOX_REPAIR_ROLLED_BACK');
  assert.equal(result.rollback.status,'ROLLBACK_VERIFIED');
  assert.equal(fs.readFileSync(path.join(f.directory,f.file),'utf8'),'before\n');
  assert.equal(git(f.directory,'rev-parse','HEAD^{tree}'),git(f.directory,'rev-parse',f.options.expectedHeadSha+'^{tree}'));
 }finally{fs.rmSync(f.directory,{recursive:true,force:true});fs.rmSync(path.dirname(f.options.nonceStorePath),{recursive:true,force:true});}
});
test('wrong owner is rejected before nonce consumption and writes',async()=>{
 const f=fixture();
 try{
  await assert.rejects(runOwnerAuthorizedSandboxRepair({...f.options,
   fetchImpl:async()=>({status:200,json:async()=>({login:'attacker',id:222})}),
   verifyRepair:async()=>true}),/OWNER_IDENTITY_MISMATCH/);
  assert.equal(fs.readFileSync(path.join(f.directory,f.file),'utf8'),'before\n');
 }finally{fs.rmSync(f.directory,{recursive:true,force:true});fs.rmSync(path.dirname(f.options.nonceStorePath),{recursive:true,force:true});}
});


test('parallel repair is denied while transaction remains pending',async()=>{
 const f=fixture();
 let release;
 const waitForVerify=new Promise(resolve=>{release=resolve;});
 try{
  const first=runOwnerAuthorizedSandboxRepair({...f.options,verifyRepair:async()=>{await waitForVerify;return true;}});
  for(let i=0;i<100&&!fs.existsSync(f.options.nonceStorePath+'.txn');i++)await delay(20);
  assert.equal(fs.existsSync(f.options.nonceStorePath+'.txn'),true);
  await assert.rejects(runOwnerAuthorizedSandboxRepair({...f.options,verifyRepair:async()=>true}),
   /PENDING_RECOVERY_REQUIRED|STALE_OR_DIRTY_SANDBOX/);
  assert.throws(()=>recoverInterruptedSandboxRepair({directory:f.directory,
   nonceStorePath:f.options.nonceStorePath}),/TRANSACTION_OWNER_STILL_ACTIVE/);
  release();
  assert.equal((await first).status,'SANDBOX_REPAIR_VERIFIED');
  assert.equal(fs.existsSync(f.options.nonceStorePath+'.txn'),false);
 }finally{
  release?.();
  fs.rmSync(f.directory,{recursive:true,force:true});
  fs.rmSync(path.dirname(f.options.nonceStorePath),{recursive:true,force:true});
 }
});
test('SIGKILL between commit and verification is recovered to exact baseline tree',async()=>{
 const f=fixture();
 let child;
 try{
  const input={...f.options,
   trustedPublicKey:f.options.trustedPublicKey.export({type:'spki',format:'pem'})};
  delete input.fetchImpl;
  const modulePath=require.resolve('../../packages/recovery/owner-sandbox-flow.cjs');
  const script=[
   "const {runOwnerAuthorizedSandboxRepair}=require(process.argv[1]);",
   "const options=JSON.parse(process.argv[2]);",
   "options.fetchImpl=async()=>({status:200,json:async()=>({login:'cardenaspiero255-lang',id:12345})});",
   "options.verifyRepair=async()=>new Promise(()=>setInterval(()=>{},1000));",
   "runOwnerAuthorizedSandboxRepair(options).catch(e=>{console.error(e);process.exitCode=1;});"
  ].join('\n');
  child=spawn(process.execPath,['-e',script,modulePath,JSON.stringify(input)],{stdio:'ignore'});
  const txn=f.options.nonceStorePath+'.txn';
  let reached=false;
  for(let i=0;i<200;i++){
   if(fs.existsSync(txn)&&git(f.directory,'rev-parse','HEAD')!==f.options.expectedHeadSha){
    reached=true;break;
   }
   if(child.exitCode!==null)break;
   await delay(25);
  }
  assert.equal(reached,true,'child must create repair commit before kill');
  child.kill('SIGKILL');
  await once(child,'exit');
  child=null;
  // Simulate a nonce lock left behind by the same killed process.
  const owner=JSON.parse(fs.readFileSync(txn,'utf8'));
  const orphanLock=f.options.nonceStorePath+'.lock';
  fs.writeFileSync(orphanLock,JSON.stringify({version:1,pid:owner.pid})+'\n',{flag:'wx',mode:0o600});
  const result=recoverInterruptedSandboxRepair({directory:f.directory,
   nonceStorePath:f.options.nonceStorePath});
  assert.equal(result.status,'RECOVERY_VERIFIED');
  assert.equal(result.disposition,'REVERTED_INTERRUPTED_REPAIR');
  assert.equal(fs.existsSync(txn),false);
  assert.equal(fs.existsSync(orphanLock),false);
  assert.equal(git(f.directory,'rev-parse','HEAD^{tree}'),
   git(f.directory,'rev-parse',f.options.expectedHeadSha+'^{tree}'));
  assert.equal(git(f.directory,'status','--porcelain'),'');
  git(f.directory,'reset','--hard',f.options.expectedHeadSha);
  await assert.rejects(runOwnerAuthorizedSandboxRepair({...f.options,verifyRepair:async()=>true}),/NONCE_REPLAY/);
 }finally{
  if(child?.exitCode===null){child.kill('SIGKILL');await once(child,'exit');}
  fs.rmSync(f.directory,{recursive:true,force:true});
  fs.rmSync(path.dirname(f.options.nonceStorePath),{recursive:true,force:true});
 }
});

test('untrusted Git pre-commit hooks cannot execute during isolated repair',async()=>{
 const f=fixture();
 try{
  const hook=path.join(f.directory,'.git','hooks','pre-commit');
  const marker=path.join(f.directory,'hook-ran');
  fs.writeFileSync(hook,'#!/bin/sh\nexit 99\n',{mode:0o700});
  fs.chmodSync(hook,0o700);
  const result=await runOwnerAuthorizedSandboxRepair({...f.options,verifyRepair:async()=>true});
  assert.equal(result.status,'SANDBOX_REPAIR_VERIFIED');
  assert.equal(fs.existsSync(marker),false);
  assert.equal(fs.existsSync(f.options.nonceStorePath+'.txn'),false);
 }finally{
  fs.rmSync(f.directory,{recursive:true,force:true});
  fs.rmSync(path.dirname(f.options.nonceStorePath),{recursive:true,force:true});
 }
});
