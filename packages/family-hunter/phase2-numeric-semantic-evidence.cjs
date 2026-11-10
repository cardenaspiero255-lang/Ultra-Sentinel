'use strict';
/** Pure type-evidence boundary; it never authenticates a compiler, repository
 * or functional oracle. Only the isolated, source-verified runner can supply
 * execution provenance outside this function. */
const {types}=require('node:util');
const {snapshotRecord}=require('../investigation/plain-kotlin-payload.cjs');
const SHA=/^[0-9a-f]{40}$/;
const SCHEMA='ultra-sentinel-numeric-semantic-claims/v1';
const RULES=new Set(['WIDE_NUMERIC_NARROWED_BEFORE_CLAMP','INT_MULTIPLICATION_BEFORE_WIDENING']);
function output(status,matching=0){return Object.freeze({schema:'ultra-sentinel-semantic-pair-check/v1',status,
 matchingOriginalClaims:matching,compilerEvidenceAuthenticated:false,
 independentOriginalOracleVerified:false,causalityVerified:false,remoteWrites:false,mergeAllowed:false});}
function snapshotClaims(report){
 const r=snapshotRecord(report,['schema','claims','compilerAuthenticated','originalOracleVerified']);
 if(r.schema!==SCHEMA||r.compilerAuthenticated!==false||r.originalOracleVerified!==false)throw Error('UNTRUSTED_CLAIMS');
 const a=r.claims;
 if(!Array.isArray(a)||types.isProxy(a)||Object.getPrototypeOf(a)!==Array.prototype||
  a.length>256||Reflect.ownKeys(a).length!==a.length+1)throw Error('UNTRUSTED_ARRAY');
 const claims=[];
 for(let i=0;i<a.length;i++){
  const d=Object.getOwnPropertyDescriptor(a,String(i));
  if(!d||!Object.hasOwn(d,'value'))throw Error('UNTRUSTED_ENTRY');
  const c=snapshotRecord(d.value,['path','line','rule','blobSha']);
  if(typeof c.path!=='string'||c.path.length>1024||
     !Number.isSafeInteger(c.line)||c.line<1||c.line>100000||
     !RULES.has(c.rule)||typeof c.blobSha!=='string'||!SHA.test(c.blobSha))throw Error('UNTRUSTED_CLAIM');
  claims.push(c);
 }
 return claims;
}
function verifyNumericSemanticPair(options){
 try{
  const input=snapshotRecord(options,['originalPath','originalBlobSha','candidatePath','candidateBlobSha','originalReport','candidateReport']);
  if(typeof input.originalPath!=='string'||!input.originalPath.startsWith('/')||
     typeof input.candidatePath!=='string'||!input.candidatePath.startsWith('/')||
     input.originalPath===input.candidatePath||
     typeof input.originalBlobSha!=='string'||!SHA.test(input.originalBlobSha)||
     typeof input.candidateBlobSha!=='string'||!SHA.test(input.candidateBlobSha)||
     input.originalBlobSha===input.candidateBlobSha)return output('BLOCKED_SEMANTIC_SOURCE_CONTRACT');
  const originals=snapshotClaims(input.originalReport),candidates=snapshotClaims(input.candidateReport);
  const valid=(claims,path,sha)=>claims.every(c=>c.path===path&&c.blobSha===sha);
  if(!valid(originals,input.originalPath,input.originalBlobSha)||
     !valid(candidates,input.candidatePath,input.candidateBlobSha)||
     originals.length===0||candidates.length!==0)return output('BLOCKED_SEMANTIC_PAIR_MISMATCH');
  const unique=new Set(originals.map(c=>`${c.rule}:${c.line}`));
  if(unique.size!==originals.length)return output('BLOCKED_DUPLICATE_SEMANTIC_CLAIM');
  return output('TYPE_EVIDENCE_BOUND_REQUIRES_TRUSTED_KOTLIN_RUNNER',originals.length);
 }catch{return output('BLOCKED_SEMANTIC_INPUT_CONTRACT');}
}
module.exports=Object.freeze({verifyNumericSemanticPair});
