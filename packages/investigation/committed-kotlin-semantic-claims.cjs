'use strict';
/*
 * Bind untrusted symbol claims to local commit blobs. Matching bytes do not
 * prove that a compiler produced the claim, that its identity is correct, or
 * that the relationship is causal. This module grants no execution authority.
 */
const fs=require('node:fs'),path=require('node:path');
const {createHash}=require('node:crypto');
const {types}=require('node:util');
const {planCommittedKotlinSourceImports}=require('../family-hunter/committed-kotlin-import-graph.cjs');
const {planDependencyExpansion}=require('../family-hunter/dependency-expansion-planner.cjs');
const SHA=/^[a-f0-9]{40}$/;
function reject(){throw Error('KOTLIN_SEMANTIC_CLAIM_REJECTED');}
function record(value,fields){
 if(!value||typeof value!=='object'||types.isProxy(value)||Object.getPrototypeOf(value)!==Object.prototype)reject();
 if(Reflect.ownKeys(value).length!==fields.length)reject();
 const result={};
 for(const key of fields){
  const d=Object.getOwnPropertyDescriptor(value,key);
  if(!d||!Object.hasOwn(d,'value'))reject();
  result[key]=d.value;
 }
 return result;
}
function array(value,max){
 if(!Array.isArray(value)||types.isProxy(value)||Object.getPrototypeOf(value)!==Array.prototype||
  value.length<1||value.length>max||Reflect.ownKeys(value).length!==value.length+1)reject();
 const out=[];
 for(let i=0;i<value.length;i++){
  const d=Object.getOwnPropertyDescriptor(value,String(i));
  if(!d||!Object.hasOwn(d,'value'))reject();out.push(d.value);
 }
 return out;
}
function bindCommittedKotlinSemanticClaims(options){
 try{
  const o=record(options,['directory','expectedCommitSha','paths','seeds','maxFiles','maxDepth','claims']);
  const claims=array(o.claims,256).map(raw=>{
   const c=record(raw,['calledName','kind','identity','callSite','declarationSite','origin','dispatch']);
   if(typeof c.calledName!=='string'||!c.calledName.length||c.calledName.length>200||/[\x00-\x1f\x7f]/.test(c.calledName)||
    !['FUNCTION','CONSTRUCTOR'].includes(c.kind)||typeof c.identity!=='string'||!c.identity.length||
    c.identity.length>2000||/[\x00-\x1f\x7f]/.test(c.identity)||c.origin!=='SOURCE_UNAUTHENTICATED'||c.dispatch!=='STATIC')reject();
   const location=value=>{
    const l=record(value,['path','line','column','gitBlobSha']);
    if(typeof l.path!=='string'||!path.isAbsolute(l.path)||l.path.length>1024||
     !Number.isSafeInteger(l.line)||l.line<1||!Number.isSafeInteger(l.column)||l.column<1||
     typeof l.gitBlobSha!=='string'||!SHA.test(l.gitBlobSha))reject();
    return l;
   };
   return {...c,callSite:location(c.callSite),declarationSite:location(c.declarationSite)};
  });
  const graph=planCommittedKotlinSourceImports({directory:o.directory,expectedCommitSha:o.expectedCommitSha,
   paths:o.paths,seeds:o.seeds,maxFiles:o.maxFiles,maxDepth:o.maxDepth});
  const root=fs.realpathSync(o.directory),allowed=new Set(graph.plan.files.map(f=>f.path));
  const byPath=new Map(graph.sourceBlobs.filter(s=>allowed.has(s.path)).map(s=>[path.join(root,s.path),s]));
  const relations=claims.map(c=>{
   const from=byPath.get(c.callSite.path),to=byPath.get(c.declarationSite.path);
   if(!from||!to||from.blobSha!==c.callSite.gitBlobSha||to.blobSha!==c.declarationSite.gitBlobSha)reject();
   return Object.freeze({identity:c.identity,callPath:from.path,callBlobSha:from.blobSha,
    callLine:c.callSite.line,callColumn:c.callSite.column,declarationPath:to.path,
    declarationBlobSha:to.blobSha,declarationLine:c.declarationSite.line,declarationColumn:c.declarationSite.column});
  });
  return Object.freeze({status:'CLAIMS_BOUND_TO_LOCAL_BLOBS_NOT_COMPILER_ATTESTED',headSha:o.expectedCommitSha,
   investigationGraphStatus:graph.status,
   relations:Object.freeze(relations),sourceCommitMembershipVerified:true,externalRepositoryAuthenticated:false,
   compilerExecutionVerified:false,symbolResolutionVerified:false,causalityVerified:false,
   originalFunctionalOracleVerified:false,ownerAuthorizationGranted:false,commitAllowed:false,mergeAllowed:false,
   limitation:'Source blobs belong to a local commit within the bounded lexical plan. Caller-supplied symbols and line/column locations remain unverified claims; compiler execution, remote identity and causal or functional correctness are not established.'});
 }catch{reject();}
}
// Plan over claims only AFTER binding every referenced blob to a clean local
// Git commit. Seeding all supplied files for the binding step avoids assuming
// that a semantically resolved call must also appear as an explicit import.
// These are still caller claims: local bytes alone do not attest a compiler.
function planCommittedKotlinCallClaims(options){
 try{
  const o=record(options,['directory','expectedCommitSha','paths','seeds','maxFiles','maxDepth','claims']);
  const paths=array(o.paths,64),seeds=array(o.seeds,64);
  if(!Number.isSafeInteger(o.maxFiles)||o.maxFiles<1||o.maxFiles>300||
   !Number.isSafeInteger(o.maxDepth)||o.maxDepth<0||
   seeds.some(p=>!paths.includes(p)))reject();
  const bound=bindCommittedKotlinSemanticClaims({directory:o.directory,
   expectedCommitSha:o.expectedCommitSha,paths,seeds:paths,
   maxFiles:paths.length,maxDepth:0,claims:o.claims});
  const unique=new Map();
  for(const relation of bound.relations)unique.set(JSON.stringify(relation),relation);
  const pairs=new Map();
  for(const [encoded,relation] of unique){
   if(relation.callPath===relation.declarationPath)continue;
   const key=JSON.stringify([relation.callPath,relation.declarationPath]);
   if(!pairs.has(key))pairs.set(key,[]);
   pairs.get(key).push(encoded);
  }
  const edges=[];
  for(const [key,relations] of pairs){
   const [from,to]=JSON.parse(key);
   const evidenceSha256=createHash('sha256').update('ULTRA_SENTINEL_CALL_CLAIMS_V1\0')
    .update(JSON.stringify(relations.sort())).digest('hex');
   edges.push({from,to,evidenceSha256});
  }
  const planned=planDependencyExpansion({headSha:o.expectedCommitSha,seeds,edges,
   maxFiles:o.maxFiles,maxDepth:o.maxDepth});
  const plan=Object.freeze({...planned,files:Object.freeze(planned.files.map(f=>Object.freeze(f)))});
  return Object.freeze({status:'LOCAL_COMMITTED_CALL_CLAIMS_REQUIRE_COMPILER_ATTESTATION',
   headSha:o.expectedCommitSha,sourceFilesVerified:paths.length,uniqueEdges:edges.length,
   relations:Object.freeze([...unique.entries()].sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0).map(x=>x[1])),
   plan,sourceCommitMembershipVerified:true,externalRepositoryAuthenticated:false,
   compilerExecutionVerified:false,symbolResolutionVerified:false,causalityVerified:false,
   originalFunctionalOracleVerified:false,ownerAuthorizationGranted:false,commitAllowed:false,mergeAllowed:false,
   limitation:'All supplied files (at most 64) are verified before traversal; maxFiles bounds visited files, not source reads. Call and declaration blobs belong to a clean local commit; caller-provided identities and locations remain unverified. This is not an authenticated compiler run, a functional oracle, causal proof, or authority to write.'});
 }catch{throw Error('COMMITTED_KOTLIN_CALL_GRAPH_REJECTED');}
}
module.exports=Object.freeze({bindCommittedKotlinSemanticClaims,planCommittedKotlinCallClaims});
