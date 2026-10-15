'use strict';
/*
 * Memory proposal inbox on top of the existing hardened ledger parser.
 * A PR comment or an ML suggestion is a QUARANTINED hypothesis, never an
 * authoritatively verified fix, no matter what its schema says.
 */
const {parseLedger,entryDigest,verifiedEntries,searchVerified}=
 require('./ultra_sentinel_memory_ledger.cjs');
const MAX_REVOKES=200,ASCII_ID=/^[A-Za-z0-9_-]{6,80}$/;
function fail(reason){throw Error(reason);}
function validateRevocations(raw){
 if(!Array.isArray(raw)||raw.length>MAX_REVOKES)fail('INVALID_UNTRUSTED_REVOCATIONS');
 const set=new Set();
 for(const id of raw){
  if(typeof id!=='string'||!ASCII_ID.test(id)||set.has(id))
   fail('INVALID_UNTRUSTED_REVOCATIONS');
  set.add(id);
 }
 return set;
}
function quarantineMemoryCandidates(ledger,{untrustedRevokedIds=[]}={}){
 // The parser snapshots/validates all untrusted fields and rejects duplicates,
 // forged types, malformed URLs and unchecked bot evidence.
 const entries=parseLedger(ledger),revoked=validateRevocations(untrustedRevokedIds);
 const pending=entries.map(e=>Object.freeze({
  id:e.id,rule:e.rule,domain:e.domain,fixSha:e.fixSha,testSha:e.testSha,
  digest:entryDigest(e),
  status:revoked.has(e.id)?'EXCLUDED_BY_UNTRUSTED_REVOCATION_HINT':'QUARANTINED',
  promotionAuthorized:false,independentlyVerified:false,
  source:'untrusted-repair-claim'
 }));
 return Object.freeze({
  schema:'ultra-sentinel-memory-quarantine/v1',
  total:entries.length,
  quarantined:pending.filter(x=>x.status==='QUARANTINED').length,
  excludedByHint:pending.filter(x=>x.status!=='QUARANTINED').length,
  entries:Object.freeze(pending),
  trustedPromotionCount:0,
  independentRedGreenVerified:false,
  githubMutationAllowed:false,mergeAllowed:false,
  limitation:'Caller-supplied revocation hints may only suppress candidates. An authenticated independent review and main-pinned evidence digest are required to promote a fix.'
 });
}
async function inspectTrustedMemorySearch(query,ledger,max=3){
 // Always reuse the *existing* search policy. This route is read-only and
 // currently returns only the four curated, non-attested playbooks.
 const proposal=quarantineMemoryCandidates(ledger);
 const accepted=await verifiedEntries(ledger);
 const suggestions=await searchVerified(query,ledger,undefined,max);
 if(accepted.length!==0)fail('UNEXPECTED_MEMORY_AUTHORITY_CHANGE');
 if(!Array.isArray(suggestions)||suggestions.some(s=>
  s.type!=='playbook'||s.verification!=='curated_playbook'))
  fail('UNTRUSTED_MEMORY_PROMOTION');
 return Object.freeze({schema:'ultra-sentinel-memory-inspection/v1',
  pending:proposal.quarantined,certifiedFixes:0,
  trustedPlaybooks:Object.freeze(suggestions),
  learnedFromUntrustedBot:false,externalEvidenceVerified:false});
}
module.exports={quarantineMemoryCandidates,inspectTrustedMemorySearch};
