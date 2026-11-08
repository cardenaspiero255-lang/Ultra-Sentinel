'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {parseLedger,entryDigest}=require('../../packages/memory/ultra_sentinel_memory_ledger.cjs');
const {quarantineMemoryCandidates}=require('../../packages/memory/ultra_sentinel_memory_quarantine.cjs');
const {createLocalRevocationJournal,appendLocalRevocation}=
 require('../../packages/memory/memory-local-revocation-journal.cjs');
const fix=(id)=>({id,type:'verified_fix',rule:'SPEECH_REENTRANT_RETRY',domain:'voice',
 fixSha:'a'.repeat(40),testSha:'b'.repeat(40),
 evidenceUrl:'https://github.com/cardenaspiero255-lang/gamehub-ultra/commit/'+'a'.repeat(40),
 summary:'Observed a suspected synchronous voice callback issue',
 advice:'Use a bounded cancellation-aware gate and test lifecycle shutdown',
 tests:['original regression fails','candidate regression passes']});
const ledger=()=>({schema:'ultra-sentinel-family-hunter-memory/v1',revision:1,
 entries:[fix('voice-fix-001'),fix('voice-fix-002')]});
test('a content-bound local revocation suppresses only one quarantined candidate',()=>{
 const parsed=parseLedger(ledger());
 const entries=parsed.map(e=>({id:e.id,digest:entryDigest(e)}));
 const journal=appendLocalRevocation({journal:createLocalRevocationJournal('c'.repeat(40)),
  entries,id:'voice-fix-001',reason:'ORACLE_INVALIDATED',headSha:'d'.repeat(40)});
 const result=quarantineMemoryCandidates(ledger(),{localRevocationJournal:journal});
 assert.equal(result.total,2);
 assert.equal(result.quarantined,1);
 assert.equal(result.excludedByLocalJournal,1);
 assert.equal(result.entries[0].status,'EXCLUDED_BY_LOCAL_REVOCATION_JOURNAL');
 assert.equal(result.entries[1].status,'QUARANTINED');
 assert.equal(result.trustedPromotionCount,0);
 assert.equal(result.githubMutationAllowed,false);
});
test('journal cannot revoke changed advice under an old ID or promote anything',()=>{
 const parsed=parseLedger(ledger()),entries=parsed.map(e=>({id:e.id,digest:entryDigest(e)}));
 const journal=appendLocalRevocation({journal:createLocalRevocationJournal('c'.repeat(40)),
  entries,id:'voice-fix-001',reason:'REGRESSION_REPRODUCED',headSha:'d'.repeat(40)});
 const changed=ledger();changed.entries[0].advice+=' A previously unseen modification.';
 assert.throws(()=>quarantineMemoryCandidates(changed,{localRevocationJournal:journal}),
  /STALE_REVOCATION_EVIDENCE/);
 assert.equal(quarantineMemoryCandidates(ledger()).trustedPromotionCount,0);
});
