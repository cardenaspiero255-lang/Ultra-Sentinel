'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const crypto=require('node:crypto');
const {stableAuthorization,verifyOwnerAuthorization,PersistentNonceStore}=require('../../packages/recovery/owner-authorization.cjs');
const base={ownerLogin:'cardenaspiero255-lang',repo:'cardenaspiero255-lang/Ultra-Sentinel',
 branch:'sandbox/repair',headSha:'a'.repeat(40),nonce:'12345678901234567890',
 expiresAt:Date.now()+60000,planDigest:'b'.repeat(64)};
const {privateKey,publicKey}=crypto.generateKeyPairSync('ed25519');
const signature=crypto.sign(null,Buffer.from('Ultra-Sentinel:owner-authorization:v1\n'+stableAuthorization(base)),privateKey).toString('base64');
const opts={expectedOwner:base.ownerLogin,expectedOwnerId:12345,signature,trustedPublicKey:publicKey};
test('owner authorization rejects absent or wrong actor',()=>{
 assert.equal(verifyOwnerAuthorization({authorization:base,...opts}).authorized,false);
 assert.equal(verifyOwnerAuthorization({authorization:base,...opts,
 verifiedActor:{source:'github-authenticated-session',login:'someone-else',userId:12345}}).authorized,false);
});
test('owner authorization checks expiration and scope',()=>{
 const actor={source:'github-authenticated-session',login:base.ownerLogin,userId:12345};
 assert.equal(verifyOwnerAuthorization({authorization:base,...opts,verifiedActor:actor}).authorized,true);
 assert.equal(verifyOwnerAuthorization({authorization:{...base,expiresAt:Date.now()-1},
 ...opts,verifiedActor:actor}).authorized,false);
 assert.equal(verifyOwnerAuthorization({authorization:{...base,branch:'main'},
 ...opts,verifiedActor:actor}).authorized,false);
});
test('owner authorization requires valid signature and pinned public key',()=>{
 const actor={source:'github-authenticated-session',login:base.ownerLogin,userId:12345};
 assert.equal(verifyOwnerAuthorization({authorization:base,...opts,verifiedActor:actor}).authorized,true);
 assert.equal(verifyOwnerAuthorization({authorization:base,...opts,signature:undefined,verifiedActor:actor}).authorized,false);
 assert.equal(verifyOwnerAuthorization({authorization:base,...opts,signature:'invalid',verifiedActor:actor}).authorized,false);
 assert.equal(verifyOwnerAuthorization({authorization:{...base,nonce:'an-other-long-nonce-123'},...opts,verifiedActor:actor}).authorized,false);
 const {publicKey:wrongKey}=crypto.generateKeyPairSync('ed25519');
 assert.equal(verifyOwnerAuthorization({authorization:base,...opts,trustedPublicKey:wrongKey,verifiedActor:actor}).authorized,false);
 assert.equal(verifyOwnerAuthorization({authorization:base,...opts,expectedOwnerId:222,verifiedActor:actor}).authorized,false);
});
test('nonce replay is rejected across store instances',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ultra-nonces-'));
 try{
  const file=path.join(dir,'nonces');
  assert.equal(new PersistentNonceStore(file).consume(base.nonce),true);
  assert.equal(new PersistentNonceStore(file).consume(base.nonce),false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('nonce ledger refuses concurrent lock rather than racing',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ultra-nonce-lock-'));
 try{
  const file=path.join(dir,'ledger');
  const store=new PersistentNonceStore(file);
  fs.writeFileSync(file+'.lock','busy');
  assert.equal(store.consume(base.nonce),false);
  fs.unlinkSync(file+'.lock');
  assert.equal(store.consume(base.nonce),true);
  assert.equal(store.consume(base.nonce),false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('nonce ledger rejects symlink targets and insecure existing permissions',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ultra-nonce-hardening-'));
 try{
  const victim=path.join(dir,'victim');fs.writeFileSync(victim,'do-not-touch');
  const link=path.join(dir,'ledger-link');fs.symlinkSync(victim,link);
  assert.throws(()=>new PersistentNonceStore(link),/NONCE_STORE_UNSAFE/);
  assert.equal(fs.readFileSync(victim,'utf8'),'do-not-touch');
  const loose=path.join(dir,'ledger-loose');fs.writeFileSync(loose,'',{mode:0o644});
  fs.chmodSync(loose,0o644);
  assert.throws(()=>new PersistentNonceStore(loose),/NONCE_STORE_UNSAFE/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('nonce storage rejects hardlinked ledgers and symlinked parent directories',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'ultra-ledger-links-'));
 try{
  const original=path.join(root,'original');fs.writeFileSync(original,'do-not-touch',{mode:0o600});
  const linked=path.join(root,'hardlink');fs.linkSync(original,linked);
  assert.throws(()=>new PersistentNonceStore(linked),/NONCE_STORE_UNSAFE/);
  const privateDir=path.join(root,'private');fs.mkdirSync(privateDir,{mode:0o700});
  const symlink=path.join(root,'alias');fs.symlinkSync(privateDir,symlink,'dir');
  assert.throws(()=>new PersistentNonceStore(path.join(symlink,'ledger')),/NONCE_DIRECTORY_UNSAFE/);
  assert.equal(fs.readFileSync(original,'utf8'),'do-not-touch');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('nonce storage refuses a readable parent directory',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'ultra-ledger-parent-'));
 try{
  const exposed=path.join(root,'exposed');fs.mkdirSync(exposed,{mode:0o755});
  fs.chmodSync(exposed,0o755);
  assert.throws(()=>new PersistentNonceStore(path.join(exposed,'ledger')),/NONCE_DIRECTORY_NOT_PRIVATE/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
