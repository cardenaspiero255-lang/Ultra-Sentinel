'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {parseLedger,entryDigest}=require('../../packages/memory/ultra_sentinel_memory_ledger.cjs');
const {createLocalRevocationJournal,appendLocalRevocation}=
 require('../../packages/memory/memory-local-revocation-journal.cjs');
const {createSignedRevocationCheckpoint,PersistentSignedRevocationStore}=
 require('../../packages/memory/memory-signed-checkpoint.cjs');
const {inspectPersistedSignedMemoryQuarantine}=
 require('../../packages/memory/ultra_sentinel_memory_quarantine.cjs');
const rule='SPEECH_REENTRANT_RETRY',SHA='a'.repeat(40);
const row=id=>({id,type:'verified_fix',rule,domain:'voice',
 fixSha:SHA,testSha:'b'.repeat(40),
 evidenceUrl:'https://github.com/cardenaspiero255-lang/gamehub-ultra/commit/'+SHA,
 summary:'Evidence claim about voice synchronous restart issue',
 advice:'Use a cancellation bound and exercise all original lifecycle tests',
 tests:['original RED regression','candidate GREEN and benign cases']});
const ledger=()=>({schema:'ultra-sentinel-family-hunter-memory/v1',
 revision:1,entries:[row('voice-fix-001'),row('voice-fix-002')]});
const digests=()=>parseLedger(ledger()).map(x=>({id:x.id,digest:entryDigest(x)}));
function signed(journal,key){
 const c=createSignedRevocationCheckpoint({journal});
 return {...c,signature:crypto.sign(null,Buffer.from(c.signingMessage),key).toString('base64')};
}
test('configured-key signed journal survives restart and suppresses only one untrusted entry',()=>{
 const {privateKey,publicKey}=crypto.generateKeyPairSync('ed25519');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-memory-signed-int-'));
 try{
  const file=path.join(dir,'checkpoint.json');
  const journal=appendLocalRevocation({
   journal:createLocalRevocationJournal(SHA),entries:digests(),
   id:'voice-fix-001',reason:'REGRESSION_REPRODUCED',headSha:'b'.repeat(40)
  });
  new PersistentSignedRevocationStore(file).commit({
   journal,checkpoint:signed(journal,privateKey),entries:digests(),
   trustedPublicKey:publicKey
  });
  const result=inspectPersistedSignedMemoryQuarantine(ledger(),{
   checkpointFile:file,trustedPublicKey:publicKey
  });
  assert.equal(result.quarantined,1);
  assert.equal(result.excludedBySignedCheckpoint,1);
  assert.equal(result.entries[0].status,'EXCLUDED_BY_LOCAL_REVOCATION_JOURNAL');
  assert.equal(result.entries[1].status,'QUARANTINED');
  assert.equal(result.signatureValidForConfiguredKey,true);
  assert.equal(result.trustedPromotionCount,0);
  assert.equal(result.ownerAuthorizationGranted,false);
  assert.equal(result.remoteWrites,false);
  const wrong=crypto.generateKeyPairSync('ed25519').publicKey;
  assert.throws(()=>inspectPersistedSignedMemoryQuarantine(ledger(),{
   checkpointFile:file,trustedPublicKey:wrong}),/CHECKPOINT_SIGNATURE_INVALID/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
