'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const crypto=require('node:crypto'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createLocalRevocationJournal,appendLocalRevocation}=
 require('../../packages/memory/memory-local-revocation-journal.cjs');
const {createSignedRevocationCheckpoint,verifySignedRevocationCheckpoint,
 PersistentSignedRevocationStore}=
 require('../../packages/memory/memory-signed-checkpoint.cjs');
const SRC='a'.repeat(40),HEAD='b'.repeat(40);
const entries=()=>[{id:'voice-fix-001',digest:'c'.repeat(64)},
 {id:'voice-fix-002',digest:'d'.repeat(64)}];
function extend(journal,id){
 return appendLocalRevocation({journal,entries:entries(),id,
  reason:'REGRESSION_REPRODUCED',headSha:HEAD});
}
function signed(journal,privateKey){
 const cp=createSignedRevocationCheckpoint({journal});
 return {...cp,signature:crypto.sign(null,Buffer.from(cp.signingMessage),privateKey).toString('base64')};
}
function poisoned(journal,index,toJSON){
 const event={...journal.events[index],headSha:{
  toString(){return HEAD;},toJSON
 }};
 return {...journal,events:journal.events.map((x,i)=>i===index?event:x)};
}
test('RED P2: scalar object with coercion may not inherit the authority of a signed source SHA',()=>{
 const key=crypto.generateKeyPairSync('ed25519'),safe=extend(createLocalRevocationJournal(SRC),'voice-fix-001');
 const cp=signed(safe,key.privateKey);
 const evil=poisoned(safe,0,()=>HEAD);
 assert.throws(()=>verifySignedRevocationCheckpoint({
  journal:evil,checkpoint:cp,entries:entries(),trustedPublicKey:key.publicKey
 }),/CHECKPOINT_UNSAFE_OBJECT/);
});
test('RED P2: variable toJSON cannot overwrite a known-good checkpoint with unverified bytes',()=>{
 const key=crypto.generateKeyPairSync('ed25519');
 const first=extend(createLocalRevocationJournal(SRC),'voice-fix-001');
 const second=extend(first,'voice-fix-002');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-scalar-p2-'));
 try{
  const store=new PersistentSignedRevocationStore(path.join(dir,'signed.json'));
  store.commit({journal:first,checkpoint:signed(first,key.privateKey),
   entries:entries(),trustedPublicKey:key.publicKey});
  let serialized=0;
  const tampered=poisoned(second,1,()=>++serialized===1?HEAD:'f'.repeat(40));
  assert.throws(()=>store.commit({journal:tampered,
   checkpoint:signed(second,key.privateKey),
   entries:entries(),trustedPublicKey:key.publicKey}),/CHECKPOINT_UNSAFE_OBJECT/);
  assert.deepEqual(store.load({entries:entries(),trustedPublicKey:key.publicKey}).revokedIds,
   ['voice-fix-001']);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('RED P2: boxed scalars in checkpoints or evidence cannot bypass strict data-only schema',()=>{
 const key=crypto.generateKeyPairSync('ed25519'),safe=extend(createLocalRevocationJournal(SRC),'voice-fix-001');
 const cp=signed(safe,key.privateKey);
 assert.throws(()=>verifySignedRevocationCheckpoint({
  journal:safe,checkpoint:{...cp,headHash:new String(cp.headHash)},
  entries:entries(),trustedPublicKey:key.publicKey}),/CHECKPOINT_UNSAFE_OBJECT/);
 assert.throws(()=>verifySignedRevocationCheckpoint({
  journal:safe,checkpoint:cp,entries:[{...entries()[0],digest:new String(entries()[0].digest)},entries()[1]],
  trustedPublicKey:key.publicKey}),/CHECKPOINT_UNSAFE_OBJECT/);
});
