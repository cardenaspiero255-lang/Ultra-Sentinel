'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {stableAuthorization,verifyOwnerAuthorization}=require('../../packages/recovery/owner-authorization.cjs');
const {signAuthorization}=require('../../scripts/sign-owner-authorization.cjs');
const {verifierFromTrustedEnvironment,bubblewrapCommand}=require('../../scripts/run-owner-sandbox-repair.cjs');
test('offline owner signing verifies against pinned key; changes invalidate signature',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ultra-owner-sign-'));
 try{
  const {privateKey,publicKey}=crypto.generateKeyPairSync('ed25519');
  const filename=path.join(dir,'owner.pem');
  fs.writeFileSync(filename,privateKey.export({type:'pkcs8',format:'pem'}),{mode:0o600});
  const authorization={ownerLogin:'cardenaspiero255-lang',repo:'cardenaspiero255-lang/Ultra-Sentinel',
   branch:'sandbox/test',headSha:'a'.repeat(40),nonce:'owner-once-1234567890',
   expiresAt:Date.now()+60000,planDigest:'b'.repeat(64)};
  const signature=signAuthorization(authorization,filename);
  const ctx={verifiedActor:{source:'github-authenticated-session',login:authorization.ownerLogin,userId:322222186},
   expectedOwner:authorization.ownerLogin,expectedOwnerId:322222186,signature,trustedPublicKey:publicKey};
  assert.equal(verifyOwnerAuthorization({authorization,...ctx}).authorized,true);
  assert.equal(verifyOwnerAuthorization({authorization:{...authorization,nonce:'forged-nonce-12345678'},...ctx}).authorized,false);
  fs.chmodSync(filename,0o644);
  assert.throws(()=>signAuthorization(authorization,filename),/UNSAFE_PRIVATE_KEY_PERMISSIONS/);
  const symlink=path.join(dir,'link.pem');fs.symlinkSync(filename,symlink);
  assert.throws(()=>signAuthorization(authorization,symlink));
  assert.match(stableAuthorization(authorization),/sandbox\/test/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('operator commands refuse to start without required configuration',()=>{
 for(const script of ['verify-github-owner.cjs','run-owner-sandbox-repair.cjs','recover-owner-sandbox.cjs']){
  const run=spawnSync(process.execPath,[path.resolve(__dirname,'../../scripts',script)],{
   encoding:'utf8',timeout:10000,
   env:{PATH:process.env.PATH,HOME:os.tmpdir(),
    ULTRA_SENTINEL_OWNER_GITHUB_TOKEN:'',ULTRA_SENTINEL_OWNER_PUBLIC_KEY_FILE:'',
    ULTRA_SENTINEL_NONCE_LEDGER:'',ULTRA_SENTINEL_SANDBOX_DIR:''}
  });
  assert.equal(run.status,1,script);
  assert.equal(run.stdout,'');
  assert.doesNotMatch(run.stderr,/token-with-length|BEGIN PRIVATE KEY/);
 }
});
test('untrusted validator command is blocked before running a process',()=>{
 const previous=process.env.ULTRA_SENTINEL_VALIDATOR_ARGV_JSON;
 try{
  delete process.env.ULTRA_SENTINEL_VALIDATOR_ARGV_JSON;
  assert.throws(()=>verifierFromTrustedEnvironment(os.tmpdir()),/VALIDATOR_CONFIGURATION_REQUIRED/);
  process.env.ULTRA_SENTINEL_VALIDATOR_ARGV_JSON=JSON.stringify(['sh','-c','echo unsafe']);
  assert.throws(()=>verifierFromTrustedEnvironment(os.tmpdir()),/INVALID_TRUSTED_VALIDATOR/);
  process.env.ULTRA_SENTINEL_VALIDATOR_ARGV_JSON=JSON.stringify(['npm','test']);
  assert.throws(()=>verifierFromTrustedEnvironment(os.tmpdir()),/OS_VALIDATOR_SANDBOX_REQUIRED/);
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'ultra-isolation-'));
  const prevIsolation=process.env.ULTRA_SENTINEL_VALIDATOR_ISOLATION;
  try{
   process.env.ULTRA_SENTINEL_VALIDATOR_ISOLATION='bubblewrap';
   assert.equal(typeof verifierFromTrustedEnvironment(root),'function');
   const sandbox=bubblewrapCommand(root,['npm','test']);
   assert.equal(sandbox.binary,'/usr/bin/bwrap');
   assert.ok(sandbox.args.includes('--unshare-all'));
   assert.ok(sandbox.args.includes('--clearenv'));
   assert.ok(sandbox.args.includes('--die-with-parent'));
   assert.ok(sandbox.args.includes('--bind'));
   assert.ok(sandbox.args.includes('--ro-bind'));
   assert.ok(sandbox.args.includes('--tmpfs'));
   assert.equal(sandbox.args.at(-2),'npm');
   assert.equal(sandbox.args.at(-1),'test');
  }finally{
   fs.rmSync(root,{recursive:true,force:true});
   if(prevIsolation===undefined)delete process.env.ULTRA_SENTINEL_VALIDATOR_ISOLATION;
   else process.env.ULTRA_SENTINEL_VALIDATOR_ISOLATION=prevIsolation;
  }
 }finally{
  if(previous===undefined)delete process.env.ULTRA_SENTINEL_VALIDATOR_ARGV_JSON;
  else process.env.ULTRA_SENTINEL_VALIDATOR_ARGV_JSON=previous;
 }
});
