'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createLocalRevocationJournal,appendLocalRevocation,inspectLocalRevocations}=
 require('../../packages/memory/memory-local-revocation-journal.cjs');
const HEAD='a'.repeat(40),LATER='b'.repeat(40);
const entries=()=>[{id:'voice-fix-001',digest:'c'.repeat(64)},
 {id:'voice-fix-002',digest:'d'.repeat(64)}];
const fresh=()=>createLocalRevocationJournal(HEAD);
const revoke=(journal,id='voice-fix-001')=>appendLocalRevocation({
 journal,entries:entries(),id,reason:'REGRESSION_REPRODUCED',headSha:LATER
});
test('a revocation is appended once and blocks reuse only of the exact evidence digest',()=>{
 const journal=revoke(fresh());
 assert.equal(journal.events.length,1);
 assert.equal(journal.events[0].digest,'c'.repeat(64));
 const result=inspectLocalRevocations({journal,entries:entries()});
 assert.equal(result.status,'LOCAL_REVOCATION_HINTS_VALID_NOT_AUTHENTICATED');
 assert.deepEqual(result.revokedIds,['voice-fix-001']);
 assert.equal(result.independentEvidenceAuthenticated,false);
 assert.equal(result.promotionAuthorized,false);
 assert.equal(result.remoteWrites,false);
 assert.equal(result.headHash,journal.headHash);
 assert.equal(Object.isFrozen(journal.events[0]),true);
});
test('two revocations form an exact ordered chain without allowing replay',()=>{
 const one=revoke(fresh());
 const two=revoke(one,'voice-fix-002');
 assert.equal(two.events[1].prevHash,one.headHash);
 assert.deepEqual(inspectLocalRevocations({journal:two,entries:entries()}).revokedIds,
  ['voice-fix-001','voice-fix-002']);
 assert.throws(()=>revoke(two),/ALREADY_REVOKED/);
});
test('tampered payload, reordered events and truncated histories fail closed',()=>{
 const two=revoke(revoke(fresh()),'voice-fix-002');
 const changed={...two,events:[{...two.events[0],reason:'OWNER_VETO'},two.events[1]]};
 const reversed={...two,events:two.events.slice().reverse()};
 const dropped={...two,events:[two.events[0]]};
 for(const journal of [changed,reversed,dropped])
  assert.throws(()=>inspectLocalRevocations({journal,entries:entries()}),/INVALID_REVOCATION_JOURNAL/);
});
test('a same-id but different-content repair is never accidentally revoked',()=>{
 const journal=revoke(fresh());
 const replaced=[{id:'voice-fix-001',digest:'f'.repeat(64)},entries()[1]];
 assert.throws(()=>inspectLocalRevocations({journal,entries:replaced}),/STALE_REVOCATION_EVIDENCE/);
});
test('forged IDs, duplicate entries, invalid inputs and unauthorized modes are rejected',()=>{
 assert.throws(()=>createLocalRevocationJournal('invalid'),/INVALID_REVOCATION_JOURNAL/);
 const journal=fresh();
 for(const input of [
  {journal,entries:entries(),id:'../../x',reason:'OWNER_VETO',headSha:LATER},
  {journal,entries:entries(),id:'voice-fix-001',reason:'UNTRUSTED_BOT_APPROVED',headSha:LATER},
  {journal,entries:entries(),id:'voice-fix-001',reason:'OWNER_VETO',headSha:'no'},
  {journal,entries:[entries()[0],entries()[0]],id:'voice-fix-001',reason:'OWNER_VETO',headSha:LATER},
 ])assert.throws(()=>appendLocalRevocation(input));
});
test('caller supplied local journal is not a cryptographic attestation or a promotion grant',()=>{
 const journal=revoke(fresh());
 const result=inspectLocalRevocations({journal,entries:entries()});
 assert.equal(result.githubAuthenticated,false);
 assert.equal(result.ownerAuthorizationGranted,false);
 assert.equal(result.productionReleaseAllowed,false);
 assert.equal(result.canAutoRepair,false);
});
