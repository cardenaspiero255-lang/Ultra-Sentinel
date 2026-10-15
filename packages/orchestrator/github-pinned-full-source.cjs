'use strict';
/**
 * Optional source hydration for Kotlin/Java C2 analysis at a pinned immutable
 * GitHub PR HEAD, never from a PR-controlled URL or download_url.
 * Caller must supply trusted file SHA from GitHub's PR-files API.
 */
const {createHash}=require('node:crypto');
const SHA=/^[0-9a-f]{40}$/;
const SOURCE=/^app\/src\/main\/(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+\.(?:kt|java)$/;
function fail(){throw Error('UNVERIFIED_PINNED_SOURCE');}
function sourcePathAllowed(filename){
 return typeof filename==='string'&&filename.length<=240&&
  !filename.includes('..')&&!filename.includes('//')&&
  SOURCE.test(filename);
}
function decodePinnedGithubSource(raw,{path,blobSha}={}){
 if(!sourcePathAllowed(path)||!SHA.test(blobSha||'')||
  !raw||typeof raw!=='object'||Array.isArray(raw)||
  raw.type!=='file'||raw.encoding!=='base64'||raw.path!==path||
  raw.sha!==blobSha||!Number.isSafeInteger(raw.size)||
  raw.size<0||raw.size>160000||
  typeof raw.content!=='string'||raw.content.length>250000||
  !/^[A-Za-z0-9+/=\r\n]*$/.test(raw.content))fail();
 const packed=raw.content.replace(/[\r\n]/g,'');
 if(!packed||packed.length%4!==0)fail();
 const bytes=Buffer.from(packed,'base64');
 if(bytes.length!==raw.size||
  bytes.toString('base64')!==packed||
  bytes.includes(0))fail();
 const actual=createHash('sha1').update('blob '+bytes.length+'\0')
  .update(bytes).digest('hex');
 if(actual!==blobSha)fail();
 const utf8=bytes.toString('utf8');
 if(!Buffer.from(utf8,'utf8').equals(bytes))fail();
 return utf8;
}
module.exports={decodePinnedGithubSource,sourcePathAllowed};
