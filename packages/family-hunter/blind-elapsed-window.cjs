'use strict';
/** Blind, read-only Kotlin advisory for signed elapsed-time windows.
 * The caller supplies only an authenticated-elsewhere source inventory, not a
 * known defect path, expected rule, remediation, oracle or answer key.
 * This lexical detector cannot authenticate a repository or establish causality. */
const {createHash}=require('node:crypto');
const {types}=require('node:util');
const COMMIT=/^[a-f0-9]{40}$/;
const PATH=/^[A-Za-z0-9_.\/-]+\.kt$/;
const WINDOW=/\bval\s+([A-Za-z_]\w*)\s*=\s*([A-Za-z_]\w*)\s*!=\s*null\s*&&\s*([A-Za-z_]\w*)\s*>=\s*\2\s*&&\s*\3\s*-\s*\2\s*<\s*([A-Za-z_]\w*|\d+L?)\b/g;
function record(value,keys){
 if(!value||typeof value!=='object'||Array.isArray(value)||types.isProxy(value)||
  Object.getPrototypeOf(value)!==Object.prototype||Reflect.ownKeys(value).length!==keys.length)throw Error('BAD_RECORD');
 const out={};
 for(const key of keys){
  const d=Object.getOwnPropertyDescriptor(value,key);
  if(!d||!Object.hasOwn(d,'value'))throw Error('BAD_PROPERTY');
  out[key]=d.value;
 }
 return out;
}
function arrayOfRecords(value,max,keys){
 if(!Array.isArray(value)||types.isProxy(value)||Object.getPrototypeOf(value)!==Array.prototype||
  value.length<1||value.length>max||Reflect.ownKeys(value).length!==value.length+1)throw Error('BAD_ARRAY');
 return Array.from({length:value.length},(_,i)=>{
  const d=Object.getOwnPropertyDescriptor(value,String(i));
  if(!d||!Object.hasOwn(d,'value'))throw Error('BAD_ELEMENT');
  return record(d.value,keys);
 });
}
function sha(source){const b=Buffer.from(source,'utf8');return createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');}
// Preserve byte offsets in UTF-16 source text, neutralizing Kotlin comments
// and quoted strings before matching real executable expressions.
function codeOnly(src){
 let out='',i=0,mode='code',depth=0;
 const pad=x=>x.replace(/[^\n]/g,' ');
 while(i<src.length){
  if(mode==='code'){
   if(src.startsWith('//',i)){out+='  ';i+=2;mode='line';continue;}
   if(src.startsWith('/*',i)){out+='  ';i+=2;mode='block';depth=1;continue;}
   if(src.startsWith('"""',i)){out+='   ';i+=3;mode='raw';continue;}
   if(src[i]==='"'){out+=' ';i++;mode='quote';continue;}
   if(src[i]==='\''){out+=' ';i++;mode='char';continue;}
   out+=src[i++];continue;
  }
  if(mode==='line'){
   if(src[i]==='\n'){mode='code';out+='\n';}else out+=' ';
   i++;continue;
  }
  if(mode==='block'){
   if(src.startsWith('/*',i)){depth++;out+='  ';i+=2;continue;}
   if(src.startsWith('*/',i)){depth--;out+='  ';i+=2;if(depth===0)mode='code';continue;}
   out+=src[i]==='\n'?'\n':' ';i++;continue;
  }
  if(mode==='raw'){
   if(src.startsWith('"""',i)){mode='code';out+='   ';i+=3;continue;}
   out+=src[i]==='\n'?'\n':' ';i++;continue;
  }
  if(mode==='quote'||mode==='char'){
   const delimiter=mode==='quote'?'"':'\'';
   if(src[i]==='\\'&&i+1<src.length){out+=pad(src.slice(i,i+2));i+=2;continue;}
   if(src[i]===delimiter){out+=' ';i++;mode='code';continue;}
   out+=src[i]==='\n'?'\n':' ';i++;continue;
  }
 }
 return mode==='code'||mode==='line'?out:null;
}
function blocked(reason){return Object.freeze({status:reason,findings:Object.freeze([]),
  sourceRepositoryAuthenticated:false,originalFunctionalOracleVerified:false,
  causalityVerified:false,ownerAuthorizationGranted:false,remoteWrites:false,mergeAllowed:false});}
function scanBlindElapsedWindows(options){
 try{
  const input=record(options,['expectedCommitSha','files']);
  if(typeof input.expectedCommitSha!=='string'||!COMMIT.test(input.expectedCommitSha))return blocked('BLOCKED_COMMIT');
  const files=arrayOfRecords(input.files,160,['path','source','expectedBlobSha']);
  const seen=new Set(),findings=[];
  for(const f of files){
   if(typeof f.path!=='string'||f.path.length>350||!PATH.test(f.path)||
      !f.path.includes('/src/main/')||f.path.startsWith('/')||f.path.split('/').some(p=>!p||p==='.'||p==='..')||
      seen.has(f.path)||typeof f.source!=='string'||f.source.length<10||
      f.source.includes('\0')||f.source.includes('\r')||!f.source.endsWith('\n')||
      Buffer.byteLength(f.source,'utf8')>160000||f.source.split('\n').length>4000||
      typeof f.expectedBlobSha!=='string'||!COMMIT.test(f.expectedBlobSha))
     return blocked('BLOCKED_INVENTORY');
   seen.add(f.path);
   if(sha(f.source)!==f.expectedBlobSha)return blocked('BLOCKED_BLOB_MISMATCH');
   const clean=codeOnly(f.source);
   if(clean===null)return blocked('BLOCKED_UNTERMINATED_KOTLIN');
   for(const m of clean.matchAll(WINDOW)){
    findings.push(Object.freeze({
     rule:'SIGNED_ELAPSED_WINDOW_UNDERFLOW',expectedCommitSha:input.expectedCommitSha,path:f.path,
     line:f.source.slice(0,m.index).split('\n').length,offset:m.index,
     sourceBlobSha:f.expectedBlobSha,confidence:'LOW',
     status:'HYPOTHESIS_REQUIRES_INDEPENDENT_KOTLIN_ORACLE'}));
   }
  }
  findings.sort((a,b)=>a.path.localeCompare(b.path)||a.offset-b.offset);
  return Object.freeze({status:findings.length?'UNVERIFIED_ELAPSED_WINDOW_HYPOTHESES':
   'NO_ELAPSED_WINDOW_HYPOTHESES',filesScanned:files.length,
   findings:Object.freeze(findings),sourceRepositoryAuthenticated:false,
   originalFunctionalOracleVerified:false,causalityVerified:false,
   ownerAuthorizationGranted:false,remoteWrites:false,mergeAllowed:false,
   limitation:'Unsigned window comparison of signed elapsed time is a source-only hypothesis. A pinned original JVM oracle must prove reachability and a harmless normal window before any repair.'});
 }catch{return blocked('BLOCKED_INPUT_CONTRACT');}
}
module.exports=Object.freeze({scanBlindElapsedWindows,sha});
