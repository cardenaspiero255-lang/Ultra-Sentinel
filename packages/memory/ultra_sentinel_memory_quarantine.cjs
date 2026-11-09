'use strict';
/*
 * Memory proposal inbox on top of the existing hardened ledger parser.
 * A PR comment or an ML suggestion is a QUARANTINED hypothesis, never an
 * authoritatively verified fix, no matter what its schema says.
 */
const {parseLedger,entryDigest,verifiedEntries,searchVerified}=
 require('./ultra_sentinel_memory_ledger.cjs');
const {inspectLocalRevocations}=require('./memory-local-revocation-journal.cjs');
const {PersistentSignedRevocationStore}=require('./memory-signed-checkpoint.cjs');
const {createHash}=require('node:crypto');
const MAX_REVOKES=200,ASCII_ID=/^[A-Za-z0-9_-]{6,80}$/;
function fail(reason){throw Error(reason);}
// Identity for an exact recommendation without its caller-chosen row ID.
// The ID-bound entryDigest still authenticates the revoked row in the journal.
function recommendationDigest(e){
 return createHash('sha256').update(JSON.stringify([e.type,e.rule,e.domain,
  e.fixSha,e.testSha,e.evidenceUrl,e.summary,e.advice,e.tests]),'utf8').digest('hex');
}
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
function quarantineMemoryCandidates(ledger,{untrustedRevokedIds=[],localRevocationJournal=null}={}){
 // The parser snapshots/validates all untrusted fields and rejects duplicates,
 // forged types, malformed URLs and unchecked bot evidence.
 const entries=parseLedger(ledger),revoked=validateRevocations(untrustedRevokedIds);
 // These journal hashes are consistency hints only, never trusted approval.
 const local=localRevocationJournal===null?null:inspectLocalRevocations({
  journal:localRevocationJournal,
  entries:entries.map(e=>({id:e.id,digest:entryDigest(e)}))
 });
 const localIds=new Set(local?.revokedIds||[]);
 const pending=entries.map(e=>Object.freeze({
  id:e.id,rule:e.rule,domain:e.domain,fixSha:e.fixSha,testSha:e.testSha,
  digest:entryDigest(e),
  status:localIds.has(e.id)?'EXCLUDED_BY_LOCAL_REVOCATION_JOURNAL':
   revoked.has(e.id)?'EXCLUDED_BY_UNTRUSTED_REVOCATION_HINT':'QUARANTINED',
  promotionAuthorized:false,independentlyVerified:false,
  source:'untrusted-repair-claim'
 }));
 return Object.freeze({
  schema:'ultra-sentinel-memory-quarantine/v1',
  total:entries.length,
  quarantined:pending.filter(x=>x.status==='QUARANTINED').length,
  excludedByHint:pending.filter(x=>x.status==='EXCLUDED_BY_UNTRUSTED_REVOCATION_HINT').length,
  excludedByLocalJournal:pending.filter(x=>x.status==='EXCLUDED_BY_LOCAL_REVOCATION_JOURNAL').length,
  entries:Object.freeze(pending),
  trustedPromotionCount:0,
  localJournalAuthenticated:false,
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
function inspectPersistedSignedMemoryQuarantine(ledger,{checkpointFile,trustedPublicKey,
 requireWitness=false,witness}={}){
 if(typeof requireWitness!=='boolean')fail('INVALID_WITNESS_REQUIREMENT');
 // Only trusted host configuration may supply this key. This function cannot
 // authenticate the origin of a caller-supplied public key.
 const parsed=parseLedger(ledger);
 const entries=parsed.map(e=>({id:e.id,digest:entryDigest(e)}));
 const store=new PersistentSignedRevocationStore(checkpointFile);
 // The host must retain and authenticate the witness independently. A valid
 // signature cannot detect replacement by an older, validly signed witness.
 const stored=requireWitness===true?
  store.loadWithWitness({entries,trustedPublicKey,witness}):
  store.load({entries,trustedPublicKey});
 // Reuse the already validated snapshot. Re-reading caller getters after
 // signature verification could otherwise replace the checked ledger.
 const stableLedger={schema:'ultra-sentinel-family-hunter-memory/v1',revision:0,entries:parsed};
 const proposal=quarantineMemoryCandidates(stableLedger,{
  localRevocationJournal:stored.journal
 });
 const revokedIds=new Set(stored.revokedIds);
 const revokedContent=new Set(parsed.filter(e=>revokedIds.has(e.id)).map(recommendationDigest));
 const contentById=new Map(parsed.map(e=>[e.id,recommendationDigest(e)]));
 const pending=Object.freeze(proposal.entries.map(e=>
  e.status==='QUARANTINED'&&revokedContent.has(contentById.get(e.id))?
   Object.freeze({...e,status:'EXCLUDED_BY_SIGNED_CONTENT_ALIAS'}):e));
 const excluded=pending.filter(e=>e.status==='EXCLUDED_BY_LOCAL_REVOCATION_JOURNAL'||
  e.status==='EXCLUDED_BY_SIGNED_CONTENT_ALIAS').length;
 return Object.freeze({
  schema:'ultra-sentinel-persisted-signed-quarantine/v1',
  status:'QUARANTINE_SUPPRESSED_BY_CONFIGURED_SIGNER_NO_OWNER_AUTH',
  total:proposal.total,quarantined:pending.filter(e=>e.status==='QUARANTINED').length,
  excludedBySignedCheckpoint:excluded,
  entries:pending,headHash:stored.headHash,
  signatureValidForConfiguredKey:stored.signatureValidForConfiguredKey,
  ...(requireWitness===true?{
   witnessSignatureValidForConfiguredKey:stored.witnessSignatureValidForConfiguredKey,
   witnessEventCount:stored.witnessEventCount,
   independentWitnessStorageVerified:false,
   witnessLimitation:stored.limitation
  }:{}),
  trustedKeyOriginAuthenticatedByThisModule:false,
  trustedPromotionCount:0,remoteWrites:false,mergeAllowed:false,
  ownerAuthorizationGranted:false,productionReleaseAllowed:false
 });
}
module.exports={quarantineMemoryCandidates,inspectTrustedMemorySearch,
 inspectPersistedSignedMemoryQuarantine};
