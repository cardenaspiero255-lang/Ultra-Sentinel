'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const {runOwnerAuthorizedSandboxRepair,digestPlan}=require('../../packages/recovery/owner-sandbox-flow.cjs');
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
