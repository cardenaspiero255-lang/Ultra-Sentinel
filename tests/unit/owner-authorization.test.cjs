'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {verifyOwnerAuthorization,PersistentNonceStore}=require('../../packages/recovery/owner-authorization.cjs');
const base={ownerLogin:'cardenaspiero255-lang',repo:'cardenaspiero255-lang/Ultra-Sentinel',
 branch:'sandbox/repair',headSha:'a'.repeat(40),nonce:'12345678901234567890',
 expiresAt:Date.now()+60000,planDigest:'b'.repeat(40)};
test('owner authorization rejects absent or wrong actor',()=>{
 assert.equal(verifyOwnerAuthorization({authorization:base,expectedOwner:base.ownerLogin}).authorized,false);
 assert.equal(verifyOwnerAuthorization({authorization:base,expectedOwner:base.ownerLogin,
 verifiedActor:{source:'github-authenticated-session',login:'someone-else'}}).authorized,false);
});
test('owner authorization checks expiration and scope',()=>{
 const actor={source:'github-authenticated-session',login:base.ownerLogin};
 assert.equal(verifyOwnerAuthorization({authorization:base,expectedOwner:base.ownerLogin,verifiedActor:actor}).authorized,true);
 assert.equal(verifyOwnerAuthorization({authorization:{...base,expiresAt:Date.now()-1},
 expectedOwner:base.ownerLogin,verifiedActor:actor}).authorized,false);
 assert.equal(verifyOwnerAuthorization({authorization:{...base,branch:'main'},
 expectedOwner:base.ownerLogin,verifiedActor:actor}).authorized,false);
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
