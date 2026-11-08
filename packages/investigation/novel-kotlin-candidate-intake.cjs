'use strict';
/**
 * Unregistered Kotlin proposal intake. Candidate sources come from an arbitrary
 * proposer, not a rule-specific replacement table. Treat all input as DATA.
 * This module never executes Kotlin, invokes Git, authenticates GitHub, or
 * claims that a static finding disappeared without a functional regression.
 */
const {createHash}=require('node:crypto');
const {types}=require('node:util');
const {scanNovelKotlinHypotheses,blobSha}=
 require('./novel-kotlin-hypotheses.cjs');
const SHA=/^[a-f0-9]{40}$/;
const RULE=/^[A-Z][A-Z0-9_]{2,80}$/;
const MAX_FILES=12,MAX_BYTES=60000;
const {isSafeNovelKotlinPath}=require('./novel-kotlin-path-policy.cjs');
const hex256=s=>createHash('sha256').update(s,'utf8').digest('hex');
function snapshotRecord(x,keys,exact=true){
 if(!x||typeof x!=='object'||types.isProxy(x)||Array.isArray(x)||
  Object.getPrototypeOf(x)!==Object.prototype||
  (exact&&Reflect.ownKeys(x).length!==keys.length))throw Error('UNSAFE_CANDIDATE_INPUT');
 const copy={};
 for(const k of keys){
  const d=Object.getOwnPropertyDescriptor(x,k);
  if(!d||!Object.hasOwn(d,'value'))throw Error('UNSAFE_CANDIDATE_INPUT');
  copy[k]=d.value;
 }
 return copy;
}
function snapshotArray(value,keys){
 if(!Array.isArray(value)||types.isProxy(value)||Object.getPrototypeOf(value)!==Array.prototype||
  value.length<1||value.length>MAX_FILES||Reflect.ownKeys(value).length!==value.length+1)
  throw Error('UNSAFE_CANDIDATE_INPUT');
 const copy=[];
 for(let i=0;i<value.length;i++){
  const d=Object.getOwnPropertyDescriptor(value,String(i));
  if(!d||!Object.hasOwn(d,'value'))throw Error('UNSAFE_CANDIDATE_INPUT');
  copy.push(snapshotRecord(d.value,keys));
 }
 return copy;
}
function snapshotNovelKotlinInput(options){
 const input=snapshotRecord(options,['expectedCommitSha','files','proposals'],false);
 return {expectedCommitSha:input.expectedCommitSha,
  files:snapshotArray(input.files,['path','source','expectedBlobSha']),
  proposals:snapshotArray(input.proposals,['path','rule','candidateSource','expectedCandidateBlobSha'])};
}
const safePath=isSafeNovelKotlinPath;
function safeSource(s){
 return typeof s==='string'&&s.length>=10&&s.endsWith('\n')&&
  !s.includes('\r')&&!s.includes('\0')&&
  Buffer.byteLength(s,'utf8')<=MAX_BYTES&&
  s.split('\n').length<=1501;
}
function result(status,candidates=[]){
 return Object.freeze({
  schema:'ultra-sentinel-unregistered-kotlin-candidate-intake/v1',
  status,candidates:Object.freeze(candidates),
  authenticatedSourceProvenance:false,
  originalFunctionalOracleVerified:false,rootCauseVerified:false,
  causalityVerified:false,ownerAuthorizationGranted:false,
  remoteWrites:false,commitAllowed:false,mergeAllowed:false,
  productionReleaseAllowed:false,
  limitation:'A caller-provided blob digest is a consistency assertion, not authenticated provenance. Unregistered proposals must pass trusted original Kotlin/JVM oracles, independent Judge, real-source checks and rollback before any promotion.'
 });
}
function planNovelKotlinCandidates(options={}){
 const blocked=(why)=>result('BLOCKED_'+why);
 let expectedCommitSha,files,proposals;
 try{
  ({expectedCommitSha,files,proposals}=snapshotNovelKotlinInput(options));
 }catch{return blocked('INPUT_CONTRACT');}
 if(typeof expectedCommitSha!=='string'||!SHA.test(expectedCommitSha))return blocked('INPUT_CONTRACT');
 const sourceByPath=new Map();
 for(const file of files){
  if(!safePath(file.path)||!safeSource(file.source)||
     typeof file.expectedBlobSha!=='string'||!SHA.test(file.expectedBlobSha)||
     sourceByPath.has(file.path))return blocked('INPUT_CONTRACT');
  if(blobSha(file.source)!==file.expectedBlobSha)
   return blocked('SOURCE_BLOB_MISMATCH');
  sourceByPath.set(file.path,file);
 }
 const scanned=scanNovelKotlinHypotheses({expectedCommitSha,files});
 if(scanned.status.startsWith('BLOCKED_'))return blocked('SOURCE_SCAN');
 const observed=new Map(scanned.findings.map(f=>[JSON.stringify([f.path,f.rule]),f]));
 const chosen=new Set(),cases=[];
 for(const proposal of proposals){
  if(!safePath(proposal.path)||typeof proposal.rule!=='string'||!RULE.test(proposal.rule)||
     !safeSource(proposal.candidateSource)||
     typeof proposal.expectedCandidateBlobSha!=='string'||!SHA.test(proposal.expectedCandidateBlobSha))return blocked('INPUT_CONTRACT');
  const source=sourceByPath.get(proposal.path),
    key=JSON.stringify([proposal.path,proposal.rule]);
  if(!source||chosen.has(key)||!observed.has(key))return blocked('UNSUPPORTED_FINDING');
  chosen.add(key);
  if(blobSha(proposal.candidateSource)!==proposal.expectedCandidateBlobSha)
   return blocked('CANDIDATE_BLOB_MISMATCH');
  if(proposal.candidateSource===source.source)return blocked('UNCHANGED_CANDIDATE');
  const next=scanNovelKotlinHypotheses({expectedCommitSha,files:[{
   path:proposal.path,source:proposal.candidateSource,
   expectedBlobSha:proposal.expectedCandidateBlobSha
  }]});
  if(next.status.startsWith('BLOCKED_'))return blocked('CANDIDATE_SCAN');
  if(next.findings.some(f=>f.path===proposal.path&&f.rule===proposal.rule))
   return blocked('TARGET_RISK_REMAINS');
  // Other newly introduced high-risk hypotheses cannot be silently hidden.
  const prior=new Set(scanned.findings.filter(f=>f.path===proposal.path)
   .map(f=>f.rule));
  if(next.findings.some(f=>f.severity==='HIGH'&&!prior.has(f.rule)))
   return blocked('NEW_HIGH_RISK');
  const found=observed.get(key);
  cases.push(Object.freeze({
   rule:proposal.rule,path:proposal.path,line:found.line,
   familyId:found.familyId,
   originalBlobSha:source.expectedBlobSha,
   candidateBlobSha:proposal.expectedCandidateBlobSha,
   beforeSha256:hex256(source.source),
   afterSha256:hex256(proposal.candidateSource),
   originalBlobMatched:true,candidateBlobMatched:true,
   targetStaticRiskGone:true,
   originalOracleVerified:false,autofix:false
  }));
 }
 cases.sort((a,b)=>a.path.localeCompare(b.path)||a.rule.localeCompare(b.rule));
 return result('CANDIDATES_REQUIRE_TRUSTED_ORIGINAL_ORACLE',cases);
}
module.exports={planNovelKotlinCandidates,snapshotNovelKotlinInput,snapshotRecord};
