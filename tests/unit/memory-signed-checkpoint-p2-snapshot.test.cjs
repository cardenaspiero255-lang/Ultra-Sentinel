'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {createLocalRevocationJournal,appendLocalRevocation}=
 require('../../packages/memory/memory-local-revocation-journal.cjs');
const {createSignedRevocationCheckpoint,verifySignedRevocationCheckpoint}=
 require('../../packages/memory/memory-signed-checkpoint.cjs');
const HEAD='a'.repeat(40),NEXT='b'.repeat(40);
const entries=()=>[{id:'voice-fix-001',digest:'c'.repeat(64)},
 {id:'voice-fix-002',digest:'d'.repeat(64)}];
function journal(id){
 return appendLocalRevocation({journal:createLocalRevocationJournal(HEAD),
  entries:entries(),id,reason:'ORACLE_INVALIDATED',headSha:NEXT});
}
function signed(target,privateKey){
 const canonical=createSignedRevocationCheckpoint({journal:target});
 return {...canonical,signature:crypto.sign(null,Buffer.from(canonical.signingMessage),
  privateKey).toString('base64')};
}
function verify(journalInput,checkpoint,trustedPublicKey){
 return verifySignedRevocationCheckpoint({journal:journalInput,
  checkpoint,entries:entries(),trustedPublicKey});
}
test('RED P2: time-varying headHash cannot bind unsigned revoked IDs to a different signed head',()=>{
 const {privateKey,publicKey}=crypto.generateKeyPairSync('ed25519');
 const unsigned=journal('voice-fix-001'),legit=journal('voice-fix-002');
 const checkpoint=signed(legit,privateKey);
 let reads=0;
 const swapped={schema:unsigned.schema,anchorSha:unsigned.anchorSha,
  events:unsigned.events};
 Object.defineProperty(swapped,'headHash',{enumerable:true,configurable:true,
  get(){return ++reads===1?unsigned.headHash:legit.headHash;}});
 assert.throws(()=>verify(swapped,checkpoint,publicKey),
  /CHECKPOINT_(?:INVALID|SIGNATURE_INVALID|UNSAFE_OBJECT)/);
 assert.equal(verify(legit,checkpoint,publicKey).revokedIds[0],'voice-fix-002');
});
test('RED P2: accessor and Proxy journal events cannot change the signed event list',()=>{
 const {privateKey,publicKey}=crypto.generateKeyPairSync('ed25519');
 const accepted=journal('voice-fix-001'),checkpoint=signed(accepted,privateKey);
 const event={...accepted.events[0]};
 Object.defineProperty(event,'id',{enumerable:true,get(){return 'voice-fix-002';}});
 const accessorEvents={...accepted,events:[event]};
 assert.throws(()=>verify(accessorEvents,checkpoint,publicKey),
  /CHECKPOINT_(?:INVALID|SIGNATURE_INVALID|UNSAFE_OBJECT)/);
 const proxied=new Proxy({...accepted},{get(target,key){return Reflect.get(target,key);}});
 assert.throws(()=>verify(proxied,checkpoint,publicKey),
  /CHECKPOINT_(?:INVALID|SIGNATURE_INVALID|UNSAFE_OBJECT)/);
});
test('RED P2: accessor checkpoint fields cannot change signed bytes between comparisons',()=>{
 const {privateKey,publicKey}=crypto.generateKeyPairSync('ed25519');
 const accepted=journal('voice-fix-001'),checkpoint=signed(accepted,privateKey);
 const malicious={...checkpoint};
 Object.defineProperty(malicious,'headHash',{enumerable:true,
  get(){return checkpoint.headHash;}});
 assert.throws(()=>verify(accepted,malicious,publicKey),
  /CHECKPOINT_(?:INVALID|SIGNATURE_INVALID|UNSAFE_OBJECT)/);
});
