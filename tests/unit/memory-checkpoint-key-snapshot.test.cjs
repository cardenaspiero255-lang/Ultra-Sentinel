'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const crypto=require('node:crypto'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createLocalRevocationJournal,appendLocalRevocation}=require('../../packages/memory/memory-local-revocation-journal.cjs');
const {createSignedRevocationCheckpoint,verifyPinnedRevocationHighWater,PersistentSignedRevocationStore}=require('../../packages/memory/memory-signed-checkpoint.cjs');
const entries=[{id:'repair_alpha',digest:'c'.repeat(64)}],SHA='a'.repeat(40);
const empty=createLocalRevocationJournal(SHA);
const full=appendLocalRevocation({journal:empty,entries,id:'repair_alpha',reason:'OWNER_VETO',headSha:'b'.repeat(40)});
function sign(journal,key){
 const checkpoint=createSignedRevocationCheckpoint({journal});
 return {...checkpoint,signature:crypto.sign(null,Buffer.from(checkpoint.signingMessage),key).toString('base64')};
}
function alternating(first,second){
 let reads=0;
 return {key:{get key(){return (++reads===1?first:second).publicKey.export({type:'spki',format:'pem'});},
  type:'spki',format:'pem'},reads:()=>reads};
}
test('witness and current checkpoint must verify against one key snapshot',()=>{
 const a=crypto.generateKeyPairSync('ed25519'),b=crypto.generateKeyPairSync('ed25519');
 const source=alternating(a,b);
 assert.throws(()=>verifyPinnedRevocationHighWater({journal:full,checkpoint:sign(full,a.privateKey),
  witness:sign(empty,b.privateKey),entries,trustedPublicKey:source.key}),/CHECKPOINT_SIGNATURE_INVALID/);
 assert.equal(source.reads(),1);
});
test('commit cannot accept a previous checkpoint signed by a different key',()=>{
 const a=crypto.generateKeyPairSync('ed25519'),b=crypto.generateKeyPairSync('ed25519');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-key-snapshot-'));
 try{
  const store=new PersistentSignedRevocationStore(path.join(dir,'checkpoint.json'));
  store.commit({journal:empty,checkpoint:sign(empty,b.privateKey),entries,trustedPublicKey:b.publicKey});
  const source=alternating(a,b);
  assert.throws(()=>store.commit({journal:full,checkpoint:sign(full,a.privateKey),entries,
   trustedPublicKey:source.key}),/CHECKPOINT_SIGNATURE_INVALID/);
  assert.equal(source.reads(),1);
  assert.equal(store.load({entries,trustedPublicKey:b.publicKey}).eventCount,0);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
