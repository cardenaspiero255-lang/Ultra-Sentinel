'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {quarantineMemoryCandidates,inspectTrustedMemorySearch}=
 require('../../packages/memory/ultra_sentinel_memory_quarantine.cjs');
const record=()=>({
 id:'voice-fix-001',type:'verified_fix',rule:'SPEECH_REENTRANT_RETRY',
 domain:'voice',fixSha:'a'.repeat(40),testSha:'b'.repeat(40),
 evidenceUrl:'https://github.com/cardenaspiero255-lang/gamehub-ultra/commit/'+'a'.repeat(40),
 summary:'Observed a suspected synchronous onError reentrancy issue',
 advice:'Schedule bounded cancellation-aware retry and test lifecycle shutdown',
 tests:['confirmed callback recursion test','verified session cancellation']
});
const ledger=(entries=[record()])=>({schema:'ultra-sentinel-family-hunter-memory/v1',
 revision:1,entries});
test('proposed fixes remain quarantined with minimal metadata, not trusted memory',async()=>{
 const x=quarantineMemoryCandidates(ledger());
 assert.equal(x.total,1);
 assert.equal(x.quarantined,1);
 assert.equal(x.entries[0].status,'QUARANTINED');
 assert.equal(x.entries[0].promotionAuthorized,false);
 assert.match(x.entries[0].digest,/^[a-f0-9]{64}$/);
 assert.equal(x.trustedPromotionCount,0);
 assert.equal(x.githubMutationAllowed,false);
 assert.doesNotMatch(JSON.stringify(x),/Schedule bounded|onError reentrancy|callback recursion/);
 const result=await inspectTrustedMemorySearch({
  rule:'SPEECH_REENTRANT_RETRY',path:'app/src/main/java/voice/Ultra.kt'
 },ledger());
 assert.equal(result.pending,1);
 assert.equal(result.certifiedFixes,0);
 assert.equal(result.learnedFromUntrustedBot,false);
 assert.ok(result.trustedPlaybooks.every(x=>x.verification==='curated_playbook'));
});
test('identity may be excluded but untrusted revocation does not promote any record',()=>{
 const x=quarantineMemoryCandidates(ledger(),{untrustedRevokedIds:['voice-fix-001']});
 assert.equal(x.quarantined,0);
 assert.equal(x.excludedByHint,1);
 assert.equal(x.entries[0].status,'EXCLUDED_BY_UNTRUSTED_REVOCATION_HINT');
 assert.equal(x.entries[0].promotionAuthorized,false);
 for(const bad of [['voice-fix-001','voice-fix-001'],['../path'],[13],Array(201).fill('abc123')])
  assert.throws(()=>quarantineMemoryCandidates(ledger(),{untrustedRevokedIds:bad}),
   /INVALID_UNTRUSTED_REVOCATIONS/);
});
test('changing remediation advice changes evidence digest and never establishes authorization',()=>{
 const a=quarantineMemoryCandidates(ledger());
 const b=quarantineMemoryCandidates(ledger([{...record(),
  advice:'This untrusted advice has been silently replaced by a bot.'}]));
 assert.notEqual(a.entries[0].digest,b.entries[0].digest);
 assert.equal(b.trustedPromotionCount,0);
});
test('oversized, duplicate, forged playbook or malformed fix evidence fail closed',()=>{
 const valid=record();
 for(const records of [
  [valid,valid],
  [{...valid,type:'playbook'}],
  [{...valid,id:'../../unsafe'}],
  [{...valid,fixSha:'broken'}],
  [{...valid,summary:'secret'}],
  Array(201).fill(valid)
 ])assert.throws(()=>quarantineMemoryCandidates(ledger(records)));
});
