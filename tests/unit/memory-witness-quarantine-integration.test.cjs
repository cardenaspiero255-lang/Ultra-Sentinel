'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {parseLedger,entryDigest}=require('../../packages/memory/ultra_sentinel_memory_ledger.cjs');
const {createLocalRevocationJournal,appendLocalRevocation}=require('../../packages/memory/memory-local-revocation-journal.cjs');
const {createSignedRevocationCheckpoint,PersistentSignedRevocationStore}=require('../../packages/memory/memory-signed-checkpoint.cjs');
const {inspectPersistedSignedMemoryQuarantine}=require('../../packages/memory/ultra_sentinel_memory_quarantine.cjs');
const SHA='a'.repeat(40),HEAD='b'.repeat(40);
const row=id=>({id,type:'verified_fix',rule:'SPEECH_REENTRANT_RETRY',domain:'voice',
 fixSha:SHA,testSha:HEAD,evidenceUrl:'https://github.com/cardenaspiero255-lang/gamehub-ultra/commit/'+SHA,
 summary:'Evidence claim about voice synchronous restart issue',
 advice:'Use a cancellation bound and exercise all original lifecycle tests',
 tests:['original RED regression','candidate GREEN and benign cases']});
const ledger={schema:'ultra-sentinel-family-hunter-memory/v1',revision:1,
 entries:[row('voice-fix-001'),
  {...row('voice-fix-002'),advice:'A separate valid recommendation with a different safe action'}]};
const entries=parseLedger(ledger).map(e=>({id:e.id,digest:entryDigest(e)}));
function sign(journal,key){
 const checkpoint=createSignedRevocationCheckpoint({journal});
 return {...checkpoint,signature:crypto.sign(null,Buffer.from(checkpoint.signingMessage),key).toString('base64')};
}
test('strict quarantine requires a separately supplied witness and rejects rollback or forged witness',()=>{
 const keys=crypto.generateKeyPairSync('ed25519');
 const first=appendLocalRevocation({journal:createLocalRevocationJournal(SHA),entries,
  id:'voice-fix-001',reason:'REGRESSION_REPRODUCED',headSha:HEAD});
 const second=appendLocalRevocation({journal:first,entries,
  id:'voice-fix-002',reason:'ORACLE_INVALIDATED',headSha:HEAD});
 const old=sign(first,keys.privateKey),latest=sign(second,keys.privateKey);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-witness-quarantine-'));
 try{
  const file=path.join(dir,'checkpoint.json'),store=new PersistentSignedRevocationStore(file);
  for(const [journal,checkpoint] of [[first,old],[second,latest]])
   store.commit({journal,checkpoint,entries,trustedPublicKey:keys.publicKey});
  const opts={checkpointFile:file,trustedPublicKey:keys.publicKey,requireWitness:true};
  for(const invalid of ['true',null,1])
   assert.throws(()=>inspectPersistedSignedMemoryQuarantine(ledger,
    {...opts,requireWitness:invalid}),/INVALID_WITNESS_REQUIREMENT/);
  const result=inspectPersistedSignedMemoryQuarantine(ledger,{...opts,witness:old});
  assert.equal(result.excludedBySignedCheckpoint,2);
  assert.equal(result.witnessSignatureValidForConfiguredKey,true);
  assert.equal(result.independentWitnessStorageVerified,false);
  assert.equal(result.trustedPromotionCount,0);
  assert.equal(result.ownerAuthorizationGranted,false);
  assert.equal(result.mergeAllowed,false);
  assert.throws(()=>inspectPersistedSignedMemoryQuarantine(ledger,opts));
  const forged=sign(first,crypto.generateKeyPairSync('ed25519').privateKey);
  assert.throws(()=>inspectPersistedSignedMemoryQuarantine(ledger,{...opts,witness:forged}),/CHECKPOINT_SIGNATURE_INVALID/);
  fs.writeFileSync(file,JSON.stringify({journal:first,checkpoint:old})+'\n',{mode:0o600});
  assert.throws(()=>inspectPersistedSignedMemoryQuarantine(ledger,{...opts,witness:latest}),/CHECKPOINT_ROLLBACK_DETECTED/);
  // The legacy path remains available and does not claim witness verification.
  const legacy=inspectPersistedSignedMemoryQuarantine(ledger,{checkpointFile:file,trustedPublicKey:keys.publicKey});
  assert.equal(legacy.excludedBySignedCheckpoint,1);
  assert.equal(legacy.witnessSignatureValidForConfiguredKey,undefined);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
