'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const crypto=require('node:crypto'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createLocalRevocationJournal,appendLocalRevocation}=
 require('../../packages/memory/memory-local-revocation-journal.cjs');
const {createSignedRevocationCheckpoint,verifyPinnedRevocationHighWater,
 PersistentSignedRevocationStore}=
 require('../../packages/memory/memory-signed-checkpoint.cjs');
const SHA='a'.repeat(40),HEAD='b'.repeat(40);
const entries=[{id:'repair_alpha',digest:'c'.repeat(64)},
 {id:'repair_beta',digest:'d'.repeat(64)}];
const sign=(journal,privateKey)=>{
 const canonical=createSignedRevocationCheckpoint({journal});
 return {...canonical,signature:crypto.sign(null,
  Buffer.from(canonical.signingMessage,'utf8'),privateKey).toString('base64')};
};
function fixture(){
 const keys=crypto.generateKeyPairSync('ed25519');
 const genesis=createLocalRevocationJournal(SHA);
 const first=appendLocalRevocation({journal:genesis,entries,
  id:'repair_alpha',reason:'REGRESSION_REPRODUCED',headSha:HEAD});
 const second=appendLocalRevocation({journal:first,entries,
  id:'repair_beta',reason:'ORACLE_INVALIDATED',headSha:HEAD});
 return {keys,first,second,old:sign(first,keys.privateKey),
  latest:sign(second,keys.privateKey)};
}
test('authenticated external high-water witness permits an append-only signed extension',()=>{
 const f=fixture();
 const r=verifyPinnedRevocationHighWater({journal:f.second,checkpoint:f.latest,
  entries,trustedPublicKey:f.keys.publicKey,witness:f.old});
 assert.equal(r.status,'CURRENT_REVOCATIONS_EXTEND_PINNED_WITNESS');
 assert.equal(r.witnessSignatureValidForConfiguredKey,true);
 assert.equal(r.independentWitnessStorageVerified,false);
 assert.equal(r.remoteWrites,false);assert.equal(r.mergeAllowed,false);
});
test('valid older signed state cannot roll back a newer externally pinned witness',()=>{
 const f=fixture();
 assert.throws(()=>verifyPinnedRevocationHighWater({journal:f.first,checkpoint:f.old,
  entries,trustedPublicKey:f.keys.publicKey,witness:f.latest}),
  /CHECKPOINT_ROLLBACK_DETECTED/);
});
test('same-length signed fork is rejected rather than treated as current evidence',()=>{
 const f=fixture();
 const alternate=appendLocalRevocation({journal:createLocalRevocationJournal(SHA),
  entries,id:'repair_alpha',reason:'OWNER_VETO',headSha:HEAD});
 assert.throws(()=>verifyPinnedRevocationHighWater({
  journal:alternate,checkpoint:sign(alternate,f.keys.privateKey),
  witness:f.old,entries,trustedPublicKey:f.keys.publicKey}),
  /CHECKPOINT_HISTORY_FORKED/);
});
test('forged witness signed by another key never establishes monotonicity',()=>{
 const f=fixture(),stranger=crypto.generateKeyPairSync('ed25519');
 const forged=sign(f.first,stranger.privateKey);
 assert.throws(()=>verifyPinnedRevocationHighWater({journal:f.second,checkpoint:f.latest,
  entries,trustedPublicKey:f.keys.publicKey,witness:forged}),
  /CHECKPOINT_SIGNATURE_INVALID/);
});
test('strict persisted loading rejects a replaced, validly signed old checkpoint',()=>{
 const f=fixture(),dir=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-highwater-'));
 try{
  const file=path.join(dir,'checkpoint.json'),store=new PersistentSignedRevocationStore(file);
  store.commit({journal:f.first,checkpoint:f.old,entries,trustedPublicKey:f.keys.publicKey});
  store.commit({journal:f.second,checkpoint:f.latest,entries,trustedPublicKey:f.keys.publicKey});
  assert.equal(store.loadWithWitness({entries,trustedPublicKey:f.keys.publicKey,
   witness:f.old}).status,'CURRENT_REVOCATIONS_EXTEND_PINNED_WITNESS');
  fs.writeFileSync(file,JSON.stringify({journal:f.first,checkpoint:f.old})+'\n',{mode:0o600});
  assert.throws(()=>store.loadWithWitness({entries,trustedPublicKey:f.keys.publicKey,
   witness:f.latest}),/CHECKPOINT_ROLLBACK_DETECTED/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
