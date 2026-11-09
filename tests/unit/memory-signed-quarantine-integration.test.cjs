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
 revision:1,entries:[row('voice-fix-001'),
  {...row('voice-fix-002'),advice:'A separate valid recommendation with a different safe action'}]});
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

test('signed revocation suppresses an identical recommendation under another ID',()=>{
 const keys=crypto.generateKeyPairSync('ed25519');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sentinel-memory-alias-'));
 try{
  const rows=[row('voice-fix-001'),row('voice-fix-002'),
   {...row('voice-fix-003'),advice:'A separate valid recommendation with a different safe action'}];
  const input={schema:'ultra-sentinel-family-hunter-memory/v1',revision:1,entries:rows};
  const entries=parseLedger(input).map(e=>({id:e.id,digest:entryDigest(e)}));
  assert.notEqual(entries[0].digest,entries[1].digest, 'record digest binds the ID');
  const genesis=createLocalRevocationJournal(SHA), witness=signed(genesis,keys.privateKey);
  const journal=appendLocalRevocation({journal:genesis,entries,id:'voice-fix-001',
   reason:'REGRESSION_REPRODUCED',headSha:'b'.repeat(40)});
  const file=path.join(dir,'checkpoint.json');
  new PersistentSignedRevocationStore(file).commit({journal,checkpoint:signed(journal,keys.privateKey),
   entries,trustedPublicKey:keys.publicKey});
  const options={checkpointFile:file,trustedPublicKey:keys.publicKey,requireWitness:true,witness};
  const result=inspectPersistedSignedMemoryQuarantine(input,options);
  assert.equal(result.excludedBySignedCheckpoint,2);
  assert.equal(result.quarantined,1);
  assert.equal(result.entries[0].status,'EXCLUDED_BY_LOCAL_REVOCATION_JOURNAL');
  assert.equal(result.entries[1].status,'EXCLUDED_BY_SIGNED_CONTENT_ALIAS');
  assert.equal(result.entries[2].status,'QUARANTINED');
  assert.equal(result.ownerAuthorizationGranted,false);
  let reads=0;
  const changing={schema:input.schema,revision:input.revision};
  Object.defineProperty(changing,'entries',{enumerable:true,get(){
   reads++; if(reads>1)throw Error('REPEATED_UNTRUSTED_READ'); return rows;
  }});
  const stable=inspectPersistedSignedMemoryQuarantine(changing,options);
  assert.equal(reads,1);
  assert.equal(stable.entries[1].status,'EXCLUDED_BY_SIGNED_CONTENT_ALIAS');
  const forged=signed(genesis,crypto.generateKeyPairSync('ed25519').privateKey);
  assert.throws(()=>inspectPersistedSignedMemoryQuarantine(input,{...options,witness:forged}),
   /CHECKPOINT_SIGNATURE_INVALID/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
