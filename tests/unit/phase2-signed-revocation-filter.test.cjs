'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createLocalRevocationJournal,appendLocalRevocation}=require('../../packages/memory/memory-local-revocation-journal.cjs');
const {createSignedRevocationCheckpoint}=require('../../packages/memory/memory-signed-checkpoint.cjs');
const {filterSignedRevokedSuggestions}=require('../../packages/memory/phase2-signed-revocation-filter.cjs');
const HEAD='a'.repeat(40),NEXT='b'.repeat(40);
const entries=[{id:'repair-first-001',digest:'c'.repeat(64)},{id:'repair-second-002',digest:'d'.repeat(64)}];
function sign(journal,privateKey){const c=createSignedRevocationCheckpoint({journal});return {...c,signature:crypto.sign(null,Buffer.from(c.signingMessage),privateKey).toString('base64')};}
function fixture(){
 const keys=crypto.generateKeyPairSync('ed25519');
 const genesis=createLocalRevocationJournal(HEAD),witness=sign(genesis,keys.privateKey);
 const journal=appendLocalRevocation({journal:genesis,entries,id:entries[0].id,reason:'REGRESSION_REPRODUCED',headSha:NEXT});
 return {journal,checkpoint:sign(journal,keys.privateKey),witness,entries,trustedPublicKey:keys.publicKey,suggestions:entries};
}
test('signed current checkpoint extending a pinned witness suppresses revoked hints',()=>{
 const s=filterSignedRevokedSuggestions(fixture());
 assert.equal(s.status,'SIGNED_REVOCATIONS_SUPPRESS_QUARANTINED_HINTS');
 assert.deepEqual(s.suppressedIds,['repair-first-001']);
 assert.deepEqual(s.nonRevokedQuarantinedIds,['repair-second-002']);
 assert.equal(s.ownerIdentityAuthenticated,false);
 assert.equal(s.promotionAuthorized,false);
 assert.equal(s.canAutoRepair,false);
});
test('forged signer, digest mismatch and witness rollback reject all suggestions',()=>{
 const s=fixture(),other=crypto.generateKeyPairSync('ed25519');
 for(const bad of [
  {...s,trustedPublicKey:other.publicKey},
  {...s,suggestions:[{id:'repair-first-001',digest:'f'.repeat(64)}]},
  {...s,entries:s.entries.map((e,i)=>i===0?{...e,digest:'f'.repeat(64)}:e)},
  {...s,witness:{...s.witness,signature:'A'.repeat(86)+'=='}},
  {...s,checkpoint:{...s.checkpoint,headHash:'0'.repeat(64)}}
 ])assert.match(filterSignedRevokedSuggestions(bad).status,/^BLOCKED_/);
});
test('getter and proxy inputs remain inert before any ID or digest is read',()=>{
 let effects=0;const s=fixture();
 const candidate={...s.suggestions[0]};Object.defineProperty(candidate,'digest',{get(){effects++;throw Error('trap');}});
 assert.match(filterSignedRevokedSuggestions({...s,suggestions:[candidate]}).status,/^BLOCKED_/);
 assert.match(filterSignedRevokedSuggestions(new Proxy(s,{ownKeys(){effects++;throw Error('proxy');}})).status,/^BLOCKED_/);
 assert.equal(effects,0);
});
