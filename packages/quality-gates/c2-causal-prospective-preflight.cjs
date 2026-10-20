'use strict';
/*
 * Strictly PRE-ADMISSION screening, not a truth seal or a scoring oracle.
 * Hash pointers alone do not prove that a root cause, receipt or label is real.
 * Existing known labels/PRs and public Kotlin benchmarks are not unseen.
 */
const {createHash}=require('node:crypto');
const CUTOFF='2026-10-20T19:30:54Z'; // latest disclosed rule-specific GameHub #206 evidence
const KNOWN_GAMEHUB=new Set([73,132,150,151,152,153,154,155,157,158,159,161,163,172,205,206,208]);
const HKEYS=Object.freeze(['repository','pr','headSha','blobSha','rule','path',
 'line','positive','causalFingerprint','oracleReceiptSha256','sourceRunId']);
const CKEYS=Object.freeze(['repository','pr','baseSha','headSha','createdAt','source','disclosure']);
const HEX40=/^[a-f0-9]{40}$/;
const HEX64=/^[a-f0-9]{64}$/;
const REPO=/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const PATH=/^[A-Za-z0-9_.\/-]{1,350}$/;
const RULE=/^[A-Z][A-Z0-9_]{2,100}$/;
const fail=()=>{throw Error('CAUSAL_PREFLIGHT_BLOCKED');};
const strict=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const validPath=p=>typeof p==='string'&&PATH.test(p)&&
 !p.startsWith('/')&&!p.includes('//')&&!p.split('/').includes('..');
function auditHistorical(entries){
 if(!Array.isArray(entries)||entries.length>23)fail();
 const causes=new Set(),ids=new Set(),seenCauses=new Set(),seenIdentities=new Set();
 let positives=0,negatives=0;
 for(const x of entries){
  if(!strict(x,HKEYS)||!REPO.test(x.repository)||!Number.isSafeInteger(x.pr)||x.pr<1||
   !HEX40.test(x.headSha)||!HEX40.test(x.blobSha)||!RULE.test(x.rule)||
   !validPath(x.path)||!Number.isSafeInteger(x.line)||x.line<1||
   typeof x.positive!=='boolean'||!HEX64.test(x.causalFingerprint)||
   !HEX64.test(x.oracleReceiptSha256)||!Number.isSafeInteger(x.sourceRunId)||x.sourceRunId<1)fail();
  const identity=JSON.stringify([x.repository,x.pr,x.headSha,x.rule,x.path,x.line,x.positive]);
  const cause=x.repository+'|'+x.causalFingerprint;
  if(ids.has(identity))seenIdentities.add(identity);
  if(causes.has(cause))seenCauses.add(cause);
  ids.add(identity);causes.add(cause);
  x.positive?positives++:negatives++;
 }
 const status=seenIdentities.size?'DUPLICATE_IDENTITY':
  seenCauses.size?'DUPLICATE_CAUSAL_FINGERPRINT':
  entries.length<23?'INCOMPLETE':
  positives!==11||negatives!==12?'CLASS_QUOTA_MISMATCH':'UNATTESTED_PROVENANCE';
 const metadata=entries.map(x=>[x.repository,x.pr,x.headSha,x.blobSha,x.rule,x.path,
  x.line,x.positive,x.causalFingerprint,x.oracleReceiptSha256,x.sourceRunId])
  .sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
 return Object.freeze({schema:'c2-causal-historical-preflight/v1',status,
  count:entries.length,positives,negatives,
  metadataSha256:createHash('sha256').update(JSON.stringify(metadata)).digest('hex'),
  historicalEvidenceAuthenticated:false,independenceVerified:false,
  duplicates:{identities:seenIdentities.size,causalFingerprints:seenCauses.size},
  newLabels:0,precision:null,recall:null,f1:null,tripleSPlusCertified:false});
}
function screenCandidates(history,candidates){
 const h=auditHistorical(history);
 if(!Array.isArray(candidates)||candidates.length>2000)fail();
 const byIdentity=new Set(),knownShas=new Set(history.map(x=>x.headSha));
 const checked=[];
 for(const x of candidates){
  if(!strict(x,CKEYS)||!REPO.test(x.repository)||!Number.isSafeInteger(x.pr)||
   x.pr<1||!HEX40.test(x.baseSha)||!HEX40.test(x.headSha)||
   x.baseSha===x.headSha||knownShas.has(x.headSha)||
   !['PUBLIC_KOTLIN_BENCH','PROSPECTIVE_GITHUB'].includes(x.source)||
   !['REVEALED','METADATA_ONLY'].includes(x.disclosure)||
   typeof x.createdAt!=='string'||
   !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(x.createdAt)||
   !Number.isFinite(Date.parse(x.createdAt)))fail();
  const identity=x.repository+'#'+x.pr+'#'+x.headSha;
  let decision;
  if(byIdentity.has(identity)) decision='DUPLICATE_METADATA';
  else if(x.repository.toLowerCase()==='cardenaspiero255-lang/gamehub-ultra'&&
   KNOWN_GAMEHUB.has(x.pr))decision='KNOWN_HISTORICAL_EXCLUDED';
  else if(x.repository.toLowerCase()==='cardenaspiero255-lang/ultra-sentinel')
   decision='SELF_EVALUATION_EXCLUDED';
  else if(x.source==='PUBLIC_KOTLIN_BENCH'||x.disclosure==='REVEALED')
   decision='DEVELOPMENT_ORACLE_REQUIRED';
  else if(Date.parse(x.createdAt)<=Date.parse(CUTOFF))decision='PRE_CUTOFF_EXCLUDED';
  else decision='PROSPECTIVE_METADATA_ONLY_NOT_FROZEN';
  byIdentity.add(identity);
  checked.push(Object.freeze({repository:x.repository,pr:x.pr,headSha:x.headSha,decision}));
 }
 return Object.freeze({
  schema:'c2-causal-prospective-preflight/v1',cutoff:CUTOFF,
  historicalStatus:h.status,historicalInventoryDigest:h.metadataSha256,
  historicalEvidenceAuthenticated:false,
  independenceVerified:false,holdoutFrozen:false,
  candidates:Object.freeze(checked),
  verifiedNewPositiveLabels:0,verifiedNewNegativeLabels:0,newLabels:0,
  blindHoldout:false,precision:null,recall:null,f1:null,
  tripleSPlusCertified:false,
  limitation:'Unverified metadata and public candidate discovery cannot establish genuine labels or prospectively frozen independent holdout; independently attest all 23 original receipts and causal lineages first.'
 });
}
module.exports={auditHistorical,screenCandidates,CUTOFF,KNOWN_GAMEHUB};
