'use strict';
/* Cross-check a sealed source-only discovery with compiler-typed claims.
 * This pure module does not authenticate isolation, compiler execution, Git
 * provenance, the independent functional oracle, or production permissions. */
const {types}=require('node:util');
const {snapshotRecord}=require('../investigation/plain-kotlin-payload.cjs');
const {isSafeNovelKotlinPath}=require('../investigation/novel-kotlin-path-policy.cjs');
const SHA=/^[a-f0-9]{40}$/;
const RULES=new Set(['WIDE_NUMERIC_NARROWED_BEFORE_CLAMP','INT_MULTIPLICATION_BEFORE_WIDENING']);
function result(status,matchedClaims=0){
 return Object.freeze({schema:'ultra-sentinel-numeric-blind-semantic-link/v1',status,matchedClaims,
  compilerEvidenceAuthenticated:false,sourceRepositoryAuthenticated:false,originalOracleVerified:false,
  causalityVerified:false,generalizationVerified:false,remoteWrites:false,mergeAllowed:false});
}
function safeArray(value,max){
 if(!Array.isArray(value)||types.isProxy(value)||Object.getPrototypeOf(value)!==Array.prototype||
    value.length<1||value.length>max||Reflect.ownKeys(value).length!==value.length+1)throw Error('BAD_ARRAY');
 const items=[];
 for(let i=0;i<value.length;i++){
  const d=Object.getOwnPropertyDescriptor(value,String(i));
  if(!d||!Object.hasOwn(d,'value'))throw Error('BAD_ELEMENT');
  items.push(d.value);
 }
 return items;
}
function safeClaims(claims,fields,max){
 const seen=new Set(),out=[];
 for(const entry of safeArray(claims,max)){
  const x=snapshotRecord(entry,fields);
  if(typeof x.path!=='string'||x.path.length>1024||
    !Number.isSafeInteger(x.line)||x.line<1||x.line>100000||!RULES.has(x.rule))throw Error('BAD_CLAIM');
  const sha=fields[3],digest=x[sha];
  if(typeof digest!=='string'||!SHA.test(digest))throw Error('BAD_SHA');
  const key=JSON.stringify([x.path,x.line,x.rule]);
  if(seen.has(key))throw Error('DUPLICATE_CLAIM');
  seen.add(key);out.push(x);
 }
 return out;
}
function linkSealedNumericAndCompilerClaims(options){
 try{
  const x=snapshotRecord(options,['relativePath','absolutePath','sourceBlobSha','blindReport','semanticReport']);
  if(!isSafeNovelKotlinPath(x.relativePath)||typeof x.absolutePath!=='string'||
     x.absolutePath.length>2048||!x.absolutePath.startsWith('/')||
     x.absolutePath.includes('//')||x.absolutePath.includes('\\')||
     x.absolutePath.split('/').some(seg=>seg==='.'||seg==='..')||
     /[\u0000-\u001f\u007f]/.test(x.absolutePath)||
     !x.absolutePath.endsWith('/'+x.relativePath)||
     typeof x.sourceBlobSha!=='string'||!SHA.test(x.sourceBlobSha))
   return result('BLOCKED_NUMERIC_LINK_IDENTITY');
  const b=snapshotRecord(x.blindReport,['schema','status','findings','filesScanned','skippedOversized','skippedNoncanonical','sourceByteIntegrityVerified','compilerAuthenticated','sourceRepositoryAuthenticated','originalOracleVerified','repairAuthorized','remoteWrites','mergeAllowed']);
  if(b.schema!=='ultra-sentinel-blind-numeric/v1'||
   !['NUMERIC_BLIND_HYPOTHESES_UNVERIFIED','NUMERIC_BLIND_PARTIAL_INVENTORY_UNVERIFIED'].includes(b.status)||
   b.sourceByteIntegrityVerified!==true||b.compilerAuthenticated!==false||b.sourceRepositoryAuthenticated!==false||
   b.originalOracleVerified!==false||b.repairAuthorized!==false||b.remoteWrites!==false||b.mergeAllowed!==false||
   !Number.isSafeInteger(b.filesScanned)||b.filesScanned<1||b.filesScanned>4096||
   !Number.isSafeInteger(b.skippedOversized)||b.skippedOversized<0||b.skippedOversized>4096||
   !Number.isSafeInteger(b.skippedNoncanonical)||b.skippedNoncanonical<0||b.skippedNoncanonical>4096)
   return result('BLOCKED_NUMERIC_LINK_BLIND_CONTRACT');
  const partial=b.skippedOversized!==0||b.skippedNoncanonical!==0;
  if((b.status==='NUMERIC_BLIND_PARTIAL_INVENTORY_UNVERIFIED')!==partial)
   return result('BLOCKED_NUMERIC_LINK_PARTIAL_MISMATCH');
  const s=snapshotRecord(x.semanticReport,['schema','claims','compilerAuthenticated','originalOracleVerified']);
  if(s.schema!=='ultra-sentinel-numeric-semantic-claims/v1'||
    s.compilerAuthenticated!==false||s.originalOracleVerified!==false)
   return result('BLOCKED_NUMERIC_LINK_SEMANTIC_CONTRACT');
  const discoveries=safeClaims(b.findings,['path','line','rule','expectedBlobSha'],256);
  const typed=safeClaims(s.claims,['path','line','rule','blobSha'],256);
  if(discoveries.some(c=>!isSafeNovelKotlinPath(c.path))||
    typed.some(c=>c.path!==x.absolutePath||c.blobSha!==x.sourceBlobSha))
    return result('BLOCKED_NUMERIC_LINK_FOREIGN_CLAIM');
  const target=discoveries.filter(c=>c.path===x.relativePath&&c.expectedBlobSha===x.sourceBlobSha);
  const inconsistent=discoveries.some(c=>c.path===x.relativePath&&c.expectedBlobSha!==x.sourceBlobSha);
  if(inconsistent||target.length===0||target.length!==typed.length)
    return result('BLOCKED_NUMERIC_LINK_DIFFERENT_FINDINGS');
  const keys=new Set(target.map(c=>JSON.stringify([c.line,c.rule])));
  if(typed.some(c=>!keys.has(JSON.stringify([c.line,c.rule]))))
    return result('BLOCKED_NUMERIC_LINK_DIFFERENT_FINDINGS');
  return result(partial?'BLIND_NUMERIC_TYPED_LINK_PARTIAL_ADVISORY':'BLIND_NUMERIC_TYPED_LINK_ADVISORY',typed.length);
 }catch{return result('BLOCKED_NUMERIC_LINK_INPUT_CONTRACT');}
}
module.exports=Object.freeze({linkSealedNumericAndCompilerClaims});
