'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const crypto=require('node:crypto'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createLocalRevocationJournal,appendLocalRevocation}=
 require('../../packages/memory/memory-local-revocation-journal.cjs');
const {createSignedRevocationCheckpoint,verifySignedRevocationCheckpoint,
 PersistentSignedRevocationStore}=
 require('../../packages/memory/memory-signed-checkpoint.cjs');
const SHA='a'.repeat(40),HEAD='b'.repeat(40);
const evidences=()=>[{id:'voice-fix-001',digest:'c'.repeat(64)},
 {id:'voice-fix-002',digest:'d'.repeat(64)}];
function owner(){return crypto.generateKeyPairSync('ed25519');}
function sign(journal,key){
 const canonical=createSignedRevocationCheckpoint({journal});
 return Object.freeze({...canonical,signature:crypto.sign(null,
  Buffer.from(canonical.signingMessage,'utf8'),key).toString('base64')});
}
function snapshot(privateKey){
 let journal=createLocalRevocationJournal(SHA);
 journal=appendLocalRevocation({journal,entries:evidences(),
  id:'voice-fix-001',reason:'REGRESSION_REPRODUCED',headSha:HEAD});
 return {journal,checkpoint:sign(journal,privateKey)};
}
test('RED: independent Ed25519 signature binds exact revocation chain and evidence digests',()=>{
 const {publicKey,privateKey}=owner(),s=snapshot(privateKey);
 const out=verifySignedRevocationCheckpoint({...s,entries:evidences(),
  trustedPublicKey:publicKey});
 assert.equal(out.signatureValidForConfiguredKey,true);
 assert.equal(out.revokedIds[0],'voice-fix-001');
 assert.equal(out.ownerAuthorizationGranted,false);
 assert.equal(out.promotionAuthorized,false);
 assert.equal(out.remoteWrites,false);
});
test('RED: altered digest, wrong signer and untrusted source cannot authenticate',()=>{
 const a=owner(),b=owner(),s=snapshot(a.privateKey);
 assert.throws(()=>verifySignedRevocationCheckpoint({...s,entries:evidences(),
  trustedPublicKey:b.publicKey}),/CHECKPOINT_SIGNATURE_INVALID/);
 assert.throws(()=>verifySignedRevocationCheckpoint({...s,entries:[
  {...evidences()[0],digest:'f'.repeat(64)},evidences()[1]],
  trustedPublicKey:a.publicKey}));
 assert.throws(()=>verifySignedRevocationCheckpoint({...s,
  checkpoint:{...s.checkpoint,headHash:'f'.repeat(64)},entries:evidences(),
  trustedPublicKey:a.publicKey}));
});
test('RED: signed checkpoint persists across reopening and is strictly append-only',()=>{
 const key=owner(),s=snapshot(key.privateKey);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-revocation-signed-'));
 try{
  const file=path.join(dir,'checkpoint.json');
  const store=new PersistentSignedRevocationStore(file);
  assert.equal(store.commit({...s,entries:evidences(),trustedPublicKey:key.publicKey}).status,
   'SIGNED_REVOCATIONS_PERSISTED_NO_REMOTE_AUTHORITY');
  const fresh=new PersistentSignedRevocationStore(file);
  assert.deepEqual(fresh.load({entries:evidences(),trustedPublicKey:key.publicKey}).revokedIds,
   ['voice-fix-001']);
  assert.throws(()=>fresh.commit({...s,entries:evidences(),trustedPublicKey:key.publicKey}),
   /CHECKPOINT_NOT_MONOTONIC/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('RED: legitimate second signed revocation extends but cannot rewrite original event',()=>{
 const key=owner(),first=snapshot(key.privateKey);
 const secondJournal=appendLocalRevocation({journal:first.journal,entries:evidences(),
  id:'voice-fix-002',reason:'ORACLE_INVALIDATED',headSha:HEAD});
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-revocation-signed-'));
 try{
  const store=new PersistentSignedRevocationStore(path.join(dir,'checkpoint.json'));
  store.commit({...first,entries:evidences(),trustedPublicKey:key.publicKey});
  const next={journal:secondJournal,checkpoint:sign(secondJournal,key.privateKey)};
  assert.equal(store.commit({...next,entries:evidences(),trustedPublicKey:key.publicKey}).status,
   'SIGNED_REVOCATIONS_PERSISTED_NO_REMOTE_AUTHORITY');
  assert.deepEqual(store.load({entries:evidences(),trustedPublicKey:key.publicKey}).revokedIds,
   ['voice-fix-001','voice-fix-002']);
  assert.throws(()=>store.commit({...first,entries:evidences(),
   trustedPublicKey:key.publicKey}),/CHECKPOINT_NOT_MONOTONIC/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('RED: corrupt file and symlink are never treated as valid persisted proof',()=>{
 const key=owner(),s=snapshot(key.privateKey);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-revocation-signed-'));
 try{
  const file=path.join(dir,'checkpoint.json'),store=new PersistentSignedRevocationStore(file);
  store.commit({...s,entries:evidences(),trustedPublicKey:key.publicKey});
  fs.writeFileSync(file,'{corrupt}',{mode:0o600});
  assert.throws(()=>store.load({entries:evidences(),trustedPublicKey:key.publicKey}));
  const link=path.join(dir,'link.json');fs.symlinkSync(file,link);
  assert.throws(()=>new PersistentSignedRevocationStore(link)
   .load({entries:evidences(),trustedPublicKey:key.publicKey}));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('a dangling checkpoint symlink is never mistaken for a new signed store',()=>{
 const key=owner(),s=snapshot(key.privateKey);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-revocation-dangling-'));
 try{
  const file=path.join(dir,'checkpoint.json'),target=path.join(dir,'missing.json');
  fs.symlinkSync(target,file);
  const store=new PersistentSignedRevocationStore(file);
  assert.throws(()=>store.commit({...s,entries:evidences(),trustedPublicKey:key.publicKey}),
   /CHECKPOINT_FILE_UNSAFE/);
  assert.equal(fs.lstatSync(file).isSymbolicLink(),true);
  assert.equal(fs.readlinkSync(file),target);
  assert.equal(fs.existsSync(target),false);
  assert.equal(fs.existsSync(file+'.lock'),false);
  assert.equal(fs.existsSync(file+'.tmp'),false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('checkpoint lookup errors are not treated as an empty store',t=>{
 const key=owner(),s=snapshot(key.privateKey);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-revocation-lookup-'));
 try{
  const file=path.join(dir,'checkpoint.json'),original=fs.lstatSync;
  t.mock.method(fs,'lstatSync',(name,...args)=>{
   if(name===file)throw Object.assign(Error('lookup failed'),{code:'EACCES'});
   return original(name,...args);
  });
  assert.throws(()=>new PersistentSignedRevocationStore(file).commit({
   ...s,entries:evidences(),trustedPublicKey:key.publicKey
  }),/lookup failed/);
  assert.equal(fs.existsSync(file),false);
  assert.equal(fs.existsSync(file+'.lock'),false);
  assert.equal(fs.existsSync(file+'.tmp'),false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('a checkpoint appearing during initial creation is preserved',t=>{
 const key=owner(),s=snapshot(key.privateKey);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-revocation-race-'));
 try{
  const file=path.join(dir,'checkpoint.json'),temp=file+'.tmp',original=fs.writeSync;
  let injected=false;
  t.mock.method(fs,'writeSync',(fd,...args)=>{
   const result=original(fd,...args);
   if(!injected&&fs.existsSync(temp)){
    const live=fs.fstatSync(fd),candidate=fs.lstatSync(temp);
    if(live.ino===candidate.ino&&live.dev===candidate.dev){
     fs.symlinkSync('other-writer-target',file);injected=true;
    }
   }
   return result;
  });
  assert.throws(()=>new PersistentSignedRevocationStore(file).commit({
   ...s,entries:evidences(),trustedPublicKey:key.publicKey
  }),error=>error.code==='EEXIST');
  assert.equal(injected,true);
  assert.equal(fs.readlinkSync(file),'other-writer-target');
  assert.equal(fs.existsSync(file+'.lock'),false);
  assert.equal(fs.existsSync(temp),true);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('cleanup preserves a replacement lock owned by another writer',()=>{
 const key=owner(),s=snapshot(key.privateKey);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-lock-replaced-'));
 const file=path.join(dir,'checkpoint.json'),lock=file+'.lock';
 const originalClose=fs.closeSync;
 let replaced=false;
 try{
  fs.closeSync=function(fd){
   if(!replaced&&fs.existsSync(lock)){
    const open=fs.fstatSync(fd),current=fs.lstatSync(lock);
    if(open.dev===current.dev&&open.ino===current.ino){
     replaced=true;
     fs.unlinkSync(lock);
     fs.writeFileSync(lock,'other writer',{mode:0o600,flag:'wx'});
    }
   }
   return originalClose(fd);
  };
  new PersistentSignedRevocationStore(file).commit({...s,entries:evidences(),
   trustedPublicKey:key.publicKey});
  assert.equal(replaced,true);
  assert.equal(fs.readFileSync(lock,'utf8'),'other writer');
 }finally{
  fs.closeSync=originalClose;
  fs.rmSync(dir,{recursive:true,force:true});
 }
});

test('rejects noncanonical base64 encoding of an otherwise valid signature',()=>{
 const key=owner(),s=snapshot(key.privateKey);
 const signature=s.checkpoint.signature;
 const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
 const finalIndex=alphabet.indexOf(signature[85]);
 const noncanonical=signature.slice(0,85)+alphabet[finalIndex+1]+'==';
 assert.deepEqual(Buffer.from(noncanonical,'base64'),Buffer.from(signature,'base64'));
 assert.throws(()=>verifySignedRevocationCheckpoint({...s,
  checkpoint:{...s.checkpoint,signature:noncanonical},entries:evidences(),
  trustedPublicKey:key.publicKey}),/CHECKPOINT_SIGNATURE_INVALID/);
});
