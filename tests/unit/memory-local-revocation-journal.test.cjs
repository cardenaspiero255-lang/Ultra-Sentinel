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

test('revocation journal rejects active records, arrays and options without executing them',()=>{
 let effects=0;
 const journal=revoke(fresh());
 const event={...journal.events[0]};
 Object.defineProperty(event,'reason',{enumerable:true,get(){effects++;return 'REGRESSION_REPRODUCED';}});
 const evidence={...entries()[0]};
 Object.defineProperty(evidence,'digest',{enumerable:true,get(){effects++;return 'c'.repeat(64);}});
 const activeList=entries();
 Object.defineProperty(activeList,Symbol.iterator,{value:function*(){effects++;yield entries()[0];}});
 const proxy=new Proxy(journal,{ownKeys(){effects++;throw Error('proxy trap');},
  getPrototypeOf(){effects++;throw Error('proxy trap');},get(){effects++;throw Error('proxy trap');}});
 const inspectOptions={entries:entries()};
 Object.defineProperty(inspectOptions,'journal',{enumerable:true,get(){effects++;return journal;}});
 const appendOptions={journal,entries:entries(),reason:'OWNER_VETO',headSha:LATER};
 Object.defineProperty(appendOptions,'id',{enumerable:true,get(){effects++;return 'voice-fix-002';}});
 const inputs=[
  ()=>inspectLocalRevocations({journal:{...journal,events:[event]},entries:entries()}),
  ()=>inspectLocalRevocations({journal,entries:[evidence,entries()[1]]}),
  ()=>inspectLocalRevocations({journal,entries:activeList}),
  ()=>inspectLocalRevocations({journal:proxy,entries:entries()}),
  ()=>inspectLocalRevocations(inspectOptions),
  ()=>appendLocalRevocation(appendOptions)
 ];
 for(const execute of inputs){
  assert.throws(execute,/INVALID_REVOCATION_JOURNAL/);
  assert.equal(effects,0,'untrusted input must not execute its code');
 }
});

test('revocation identities are strings and cannot coerce arbitrary objects',()=>{
 let effects=0;
 const sha={toString(){effects++;return HEAD;}};
 assert.throws(()=>createLocalRevocationJournal(sha),/INVALID_REVOCATION_JOURNAL/);
 const id={toString(){effects++;return 'voice-fix-001';}};
 assert.throws(()=>appendLocalRevocation({journal:fresh(),entries:entries(),id,
  reason:'OWNER_VETO',headSha:LATER}),/INVALID_REVOCATION_JOURNAL/);
 const forged=[{id,digest:'c'.repeat(64)}];
 assert.throws(()=>inspectLocalRevocations({journal:fresh(),entries:forged}),/INVALID_REVOCATION_JOURNAL/);
 assert.equal(effects,0);
});

test('appending copies prior events so later caller mutation cannot corrupt the new journal',()=>{
 const original=revoke(fresh());
 const mutable={...original,events:original.events.map(event=>({...event}))};
 const next=revoke(mutable,'voice-fix-002');
 mutable.events[0].reason='OWNER_VETO';
 assert.equal(next.events[0].reason,'REGRESSION_REPRODUCED');
 assert.equal(Object.isFrozen(next.events[0]),true);
 assert.deepEqual(inspectLocalRevocations({journal:next,entries:entries()}).revokedIds,
  ['voice-fix-001','voice-fix-002']);
});
