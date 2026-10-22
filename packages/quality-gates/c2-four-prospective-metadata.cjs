'use strict';
/*
 * A prospective source identity pointer is NOT a defect label. This parser
 * must NEVER fetch files, PR descriptions, tests, patch contents or findings.
 * An independent owner Actions job authenticates PR metadata through GitHub.
 */
const {createHash}=require('node:crypto');
const CUTOFF='2026-10-20T19:30:54Z';
const H40=/^[a-f0-9]{40}$/;
const REPO=/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const CKEYS=['repository','pr','baseSha','headSha','createdAt','source','disclosure'];
const fail=()=>{throw Error('C2_EXTERNAL_METADATA_BLOCKED');};
function prevalidateProspectiveMetadata(doc){
 if(!doc||typeof doc!=='object'||Array.isArray(doc)||
    Object.keys(doc).length!==3||!Object.hasOwn(doc,'schema')||
    !Object.hasOwn(doc,'cutoff')||!Object.hasOwn(doc,'candidates')||
    doc.schema!=='c2-four-external-pr-metadata/v1'||
    doc.cutoff!==CUTOFF||!Array.isArray(doc.candidates)||
    doc.candidates.length!==4)fail();
 const uniqueRepos=new Set(),uniqueHeads=new Set(),uniqueBases=new Set();
 const rows=[];
 for(const c of doc.candidates){
  if(!c||typeof c!=='object'||Array.isArray(c)||
     Object.keys(c).length!==CKEYS.length||
     CKEYS.some(k=>!Object.hasOwn(c,k))||
     typeof c.repository!=='string'||!REPO.test(c.repository)||
     !Number.isSafeInteger(c.pr)||c.pr<1||
     !H40.test(c.baseSha)||!H40.test(c.headSha)||
     c.baseSha===c.headSha||
     c.source!=='PROSPECTIVE_GITHUB'||c.disclosure!=='METADATA_ONLY'||
     typeof c.createdAt!=='string'||
     !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(c.createdAt)||
     !Number.isFinite(Date.parse(c.createdAt))||
     Date.parse(c.createdAt)<=Date.parse(CUTOFF))fail();
  const repo=c.repository.toLowerCase();
  if(repo==='cardenaspiero255-lang/ultra-sentinel'||
     repo==='cardenaspiero255-lang/gamehub-ultra'||
     repo==='tasks/tasks'||repo==='ankidroid/anki-android'||uniqueRepos.has(repo)||
     uniqueHeads.has(c.headSha)||uniqueBases.has(c.headSha)||
     uniqueHeads.has(c.baseSha))fail();
  uniqueRepos.add(repo);uniqueHeads.add(c.headSha);uniqueBases.add(c.baseSha);
  rows.push(Object.freeze({repository:c.repository,pr:c.pr,
   baseSha:c.baseSha,headSha:c.headSha,createdAt:c.createdAt,
   source:c.source,disclosure:c.disclosure}));
 }
 const order=rows.sort((a,b)=>(a.repository.toLowerCase()+'#'+a.pr)
   .localeCompare(b.repository.toLowerCase()+'#'+b.pr));
 const digest=createHash('sha256').update(JSON.stringify(order)).digest('hex');
 return Object.freeze({
  schema:'c2-four-external-pr-metadata-preflight/v1',
  status:'METADATA_ONLY_REQUIRE_OWNER_API_ATTESTATION_NO_LABELS',
  count:rows.length,uniqueRepositories:uniqueRepos.size,metadataSha256:digest,
  sourceCutoff:CUTOFF,
  gitHubApiAuthenticatedByThisModule:false,
  coreInspectedCandidatePatches:false,originalSourceBlobsFetched:false,
  candidatePredictionsRead:false,baselinePredictionsRead:false,
  potentialDefectsConfirmed:0,independenceVerified:false,
  cohortFrozen:false,blindHoldout:false,scoredNegatives:0,
  newGoldLabels:0,falsePositiveRate:null,
  precision:null,recall:null,f1:null,sssPlusCertified:false,
  candidates:Object.freeze(order)
 });
}
module.exports={prevalidateProspectiveMetadata,CUTOFF};
