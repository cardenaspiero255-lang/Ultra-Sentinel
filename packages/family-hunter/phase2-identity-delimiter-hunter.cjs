'use strict';
// Advisory only: lexical candidate discovery over source blobs, not Kotlin type or
// repository authentication. Original oracles are unavailable to this module.
const {createHash}=require('node:crypto');
const {snapshotRecord,snapshotArray}=require('../investigation/plain-kotlin-payload.cjs');
const {isSafeNovelKotlinPath}=require('../investigation/novel-kotlin-path-policy.cjs');
const SHA=/^[a-f0-9]{40}$/;
const RULE='AMBIGUOUS_DELIMITED_IDENTITY';
const sha=s=>{const b=Buffer.from(s,'utf8');return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');};
function neutral(source){
 let out='',block=0,raw=false,quote='',lineComment=false;
 for(let i=0;i<source.length;i++){
  const c=source[i], two=source.slice(i,i+2),three=source.slice(i,i+3);
  if(c==='\n'){lineComment=false;out+='\n';continue;}
  if(lineComment){out+=' ';continue;}
  if(block){
   if(two==='/*'){block++;out+='  ';i++;continue;}
   if(two==='*/'){block--;out+='  ';i++;continue;}
   out+=' ';continue;
  }
  if(raw){if(three==='"""'){raw=false;out+='   ';i+=2;}else out+=' ';continue;}
  if(quote){
   if(c==='\\'){out+=' ';if(i+1<source.length){out+=' ';i++;}continue;}
   out+=' ';if(c===quote)quote='';continue;
  }
  if(two==='//'){lineComment=true;out+='  ';i++;continue;}
  if(two==='/*'){block=1;out+='  ';i++;continue;}
  if(three==='"""'){raw=true;out+='   ';i+=2;continue;}
  if(c==='"'||c==="'"){quote=c;out+=' ';continue;}
  out+=c;
 }
 return out;
}
function closing(mask,start){
 let depth=1;
 for(let i=start+1;i<mask.length;i++){
  if(mask[i]==='(')depth++;
  else if(mask[i]===')'&&--depth===0)return i;
 }
 return -1;
}
function locateIdentitySites(source){
 const code=neutral(source),sites=[];
 for(const m of code.matchAll(/\blistOf\s*\(/g)){
  const start=code.indexOf('(',m.index),end=closing(code,start);
  if(end<0)continue;
  const context=code.slice(Math.max(0,m.index-400),m.index);
  if(!/(?:fingerprint|serializ|identity|(?:context|cache|state)\w*key)/i.test(context))continue;
  const next=/^\s*\.\s*joinToString\s*\(/.exec(code.slice(end+1));
  if(!next)continue;
  const open=end+1+next[0].length-1,close=closing(code,open);
  if(close<0)continue;
  const delim=/^\s*"([^"\\\r\n]{1,3})"\s*$/u.exec(source.slice(open+1,close));
  if(!delim)continue;
  // Distinct unescaped dynamic fields can contain the same separator.
  const args=code.slice(start+1,end);
  let depth=0,fields=0,part='';
  const add=()=>{if(/[A-Za-z_]\w*/.test(part))fields++;part='';};
  for(const ch of args){
   if(ch==='(')depth++;
   if(ch===')')depth--;
   if(ch===','&&depth===0)add();else part+=ch;
  }
  add();
  if(fields<2)continue;
  sites.push(Object.freeze({line:source.slice(0,m.index).split('\n').length,
   insertionOffset:end+1,delimiter:delim[1]}));
 }
 return sites;
}
function report(status,findings=[],integrity=false){
 return Object.freeze({schema:'ultra-sentinel-identity-delimiter-hunter/v1',status,
  findings:Object.freeze(findings),sourceByteIntegrityVerified:integrity,
  sourceRepositoryAuthenticated:false,originalFunctionalOracleVerified:false,
  causalityVerified:false,generalizationVerified:false,ownerAuthorizationGranted:false,
  remoteWrites:false,mergeAllowed:false});
}
function scanIdentityDelimiterHypotheses(options){
 try{
  const r=snapshotRecord(options,['expectedCommitSha','files']);
  if(typeof r.expectedCommitSha!=='string'||!SHA.test(r.expectedCommitSha))return report('BLOCKED_COMMIT');
  const files=snapshotArray(r.files,['path','source','expectedBlobSha'],300),seen=new Set();
  for(const f of files){
   if(typeof f.path!=='string'||!isSafeNovelKotlinPath(f.path)||seen.has(f.path)||
     typeof f.source!=='string'||f.source.length<10||Buffer.byteLength(f.source,'utf8')>160000||
     f.source.includes('\0')||f.source.includes('\r')||
     Buffer.from(f.source,'utf8').toString('utf8')!==f.source||
     typeof f.expectedBlobSha!=='string'||!SHA.test(f.expectedBlobSha))return report('BLOCKED_SOURCE');
   if(sha(f.source)!==f.expectedBlobSha)return report('BLOCKED_BLOB');
   seen.add(f.path);
  }
  const findings=files.flatMap(f=>locateIdentitySites(f.source).map(site=>Object.freeze({
   rule:RULE,path:f.path,line:site.line,expectedBlobSha:f.expectedBlobSha,
   status:'HYPOTHESIS_REQUIRES_INDEPENDENT_KOTLIN_ORACLE'
  }))).sort((a,b)=>a.path.localeCompare(b.path)||a.line-b.line);
  return report(findings.length?'IDENTITY_DELIMITER_HYPOTHESES_REQUIRE_ORIGINAL_ORACLE':
   'NO_IDENTITY_DELIMITER_HYPOTHESES_NOT_CERTIFIED',findings,true);
 }catch{return report('BLOCKED_INPUT_CONTRACT');}
}
module.exports=Object.freeze({scanIdentityDelimiterHypotheses,locateIdentitySites});
