'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const crypto=require('node:crypto'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createLocalRevocationJournal,appendLocalRevocation}=require('../../packages/memory/memory-local-revocation-journal.cjs');
const {createSignedRevocationCheckpoint,PersistentSignedRevocationStore}=require('../../packages/memory/memory-signed-checkpoint.cjs');
const entries=[{id:'repair_alpha',digest:'c'.repeat(64)},{id:'repair_beta',digest:'d'.repeat(64)}];
function fixture(fn){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'witness-commit-'));
 try{
  const file=path.join(dir,'checkpoint.json'),store=new PersistentSignedRevocationStore(file);
  const key=crypto.generateKeyPairSync('ed25519');
  const sign=journal=>{const c=createSignedRevocationCheckpoint({journal});return {...c,signature:crypto.sign(null,Buffer.from(c.signingMessage),key.privateKey).toString('base64')};};
  const add=(journal,id,reason)=>appendLocalRevocation({journal,entries,id,reason,headSha:'b'.repeat(40)});
  const genesis=createLocalRevocationJournal('a'.repeat(40));
  const first=add(genesis,'repair_alpha','REGRESSION_REPRODUCED');
  const latest=add(first,'repair_beta','ORACLE_INVALIDATED');
  const fork=add(first,'repair_beta','OWNER_VETO');
  const input=journal=>({journal,checkpoint:sign(journal),entries,trustedPublicKey:key.publicKey});
  fn({file,store,sign,first,latest,fork,input});
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
}
test('witness-protected commit persists a valid extension',()=>fixture(({store,sign,first,latest,input})=>{
 store.commit(input(first));
 const result=store.commitWithWitness({...input(latest),witness:sign(first)});
 assert.equal(result.eventCount,2);
 assert.equal(store.loadWithWitness({...input(latest),witness:sign(first)}).headHash,latest.headHash);
}));
test('witness-protected commit rejects restored old state and preserves it',()=>fixture(({file,store,sign,first,latest,fork,input})=>{
 store.commit(input(first));store.commit(input(latest));
 fs.writeFileSync(file,JSON.stringify({journal:first,checkpoint:sign(first)})+'\n',{mode:0o600});
 const before=fs.readFileSync(file);
 assert.throws(()=>store.commitWithWitness({...input(fork),witness:sign(latest)}),/CHECKPOINT_ROLLBACK_DETECTED/);
 assert.deepEqual(fs.readFileSync(file),before);
}));
test('witness-protected commit rejects a forked candidate and preserves state',()=>fixture(({file,store,sign,first,latest,fork,input})=>{
 store.commit(input(first));store.commit(input(latest));
 const before=fs.readFileSync(file);
 assert.throws(()=>store.commitWithWitness({...input(fork),witness:sign(latest)}),/CHECKPOINT_HISTORY_FORKED/);
 assert.deepEqual(fs.readFileSync(file),before);
}));
test('missing store, missing witness and substituted witness fail closed',()=>fixture(({store,sign,first,latest,input})=>{
 assert.throws(()=>store.commitWithWitness({...input(latest),witness:sign(first)}),/CHECKPOINT_NOT_FOUND/);
 store.commit(input(first));
 assert.throws(()=>store.commitWithWitness(input(latest)),/CHECKPOINT_UNSAFE_OBJECT/);
 const stranger=crypto.generateKeyPairSync('ed25519'), witness=sign(first);
 witness.signature=crypto.sign(null,Buffer.from(witness.signingMessage),stranger.privateKey).toString('base64');
 assert.throws(()=>store.commitWithWitness({...input(latest),witness}),/CHECKPOINT_SIGNATURE_INVALID/);
 assert.equal(store.load(input(first)).headHash,first.headHash);
}));
