'use strict';
/** Scopable, separate Fixer for one *detected* lexical family only.
 * No repository writes or permission elevation; JVM oracle and Judge required. */
const {types}=require('node:util');
const {scanBlindElapsedWindows,sha}=require('../family-hunter/blind-elapsed-window.cjs');
function read(value,keys){
 if(!value||typeof value!=='object'||types.isProxy(value)||Array.isArray(value)||
 Object.getPrototypeOf(value)!==Object.prototype||Reflect.ownKeys(value).length!==keys.length)throw Error('BAD_INPUT');
 const out={};for(const k of keys){const d=Object.getOwnPropertyDescriptor(value,k);if(!d||!Object.hasOwn(d,'value'))throw Error('BAD_INPUT');out[k]=d.value;}return out;
}
function reject(){return Object.freeze({status:'BLOCKED_NOT_UNIQUE_AUTHENTICATED_HYPOTHESIS',
 originalFunctionalOracleVerified:false,remoteWrites:false,mergeAllowed:false});}
function draftElapsedWindowCandidate(options){
 try{
  const data=read(options,['expectedCommitSha','file','finding']);
  const file=read(data.file,['path','source','expectedBlobSha']);
  const finding=read(data.finding,['rule','expectedCommitSha','path','line','offset','sourceBlobSha','confidence','status']);
  const r=scanBlindElapsedWindows({expectedCommitSha:data.expectedCommitSha,files:[file]});
  if(r.status!=='UNVERIFIED_ELAPSED_WINDOW_HYPOTHESES'||r.findings.length!==1||
    finding.expectedCommitSha!==data.expectedCommitSha||
    finding.rule!=='SIGNED_ELAPSED_WINDOW_UNDERFLOW'||finding.path!==file.path||
    finding.sourceBlobSha!==file.expectedBlobSha||finding.offset!==r.findings[0].offset||
    finding.line!==r.findings[0].line)return reject();
  const after=file.source.slice(finding.offset);
  const m=/^\bval\s+([A-Za-z_]\w*)\s*=\s*([A-Za-z_]\w*)\s*!=\s*null\s*&&\s*([A-Za-z_]\w*)\s*>=\s*\2\s*&&\s*(\3\s*-\s*\2\s*<\s*(?:[A-Za-z_]\w*|\d+L?))\b/.exec(after);
  if(!m)return reject();
  const prior=m[0],compare=m[4],left=m[3],right=m[2];
  const guarded=`${left} - ${right} >= 0L && ${compare}`;
  const candidateSource=file.source.slice(0,finding.offset)+prior.replace(compare,guarded)+
   file.source.slice(finding.offset+prior.length);
  if(candidateSource===file.source||
   scanBlindElapsedWindows({expectedCommitSha:data.expectedCommitSha,files:[{path:file.path,source:candidateSource,expectedBlobSha:sha(candidateSource)}]}).findings.length!==0)return reject();
  return Object.freeze({status:'CANDIDATE_REQUIRES_INDEPENDENT_ORIGINAL_JVM_ORACLE',
    rule:finding.rule,path:file.path,originalBlobSha:file.expectedBlobSha,
    candidateBlobSha:sha(candidateSource),candidateSource,generatedByScopedFixer:true,
    sourceRepositoryAuthenticated:false,originalFunctionalOracleVerified:false,
    ownerAuthorizationGranted:false,remoteWrites:false,mergeAllowed:false});
 }catch{return reject();}
}
module.exports=Object.freeze({draftElapsedWindowCandidate});
