'use strict';
/*
 * Bind untrusted symbol claims to local commit blobs. Matching bytes do not
 * prove that a compiler produced the claim, that its identity is correct, or
 * that the relationship is causal. This module grants no execution authority.
 */
const fs=require('node:fs'),path=require('node:path');
const {types}=require('node:util');
const {planCommittedKotlinSourceImports}=require('../family-hunter/committed-kotlin-import-graph.cjs');
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
module.exports=Object.freeze({bindCommittedKotlinSemanticClaims});
