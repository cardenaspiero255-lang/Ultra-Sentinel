'use strict';
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const SHA=/^[a-f0-9]{40}$/;
function stableAuthorization({ownerLogin,repo,branch,headSha,nonce,expiresAt,planDigest}={}){
 if(typeof ownerLogin!=='string'||!/^[A-Za-z0-9-]{1,39}$/.test(ownerLogin)||
 typeof repo!=='string'||!/^[-\w]+\/[-\w.]+$/.test(repo)||
 typeof branch!=='string'||!/^sandbox\/[a-z0-9._/-]+$/.test(branch)||
 !SHA.test(headSha||'')||typeof nonce!=='string'||nonce.length<16||
 !SHA.test(planDigest||'')||!Number.isSafeInteger(expiresAt))
 throw Error('INVALID_OWNER_AUTHORIZATION');
 return JSON.stringify({ownerLogin,repo,branch,headSha,nonce,expiresAt,planDigest});
}
/* Authentication is performed by a trusted caller using a verified GitHub identity.
   Untrusted PR payloads cannot assert actorVerified=true. */
function verifyOwnerAuthorization({authorization,verifiedActor,expectedOwner,now=Date.now()}={}){
 if(!verifiedActor||verifiedActor.source!=='github-authenticated-session'||
 typeof verifiedActor.login!=='string'||verifiedActor.login!==expectedOwner)
  return Object.freeze({authorized:false,reason:'UNVERIFIED_OWNER'});
 try{
  const canonical=stableAuthorization(authorization);
  if(authorization.ownerLogin!==expectedOwner)return Object.freeze({authorized:false,reason:'OWNER_MISMATCH'});
  if(authorization.expiresAt<=now||authorization.expiresAt-now>900000)
   return Object.freeze({authorized:false,reason:'AUTHORIZATION_EXPIRED'});
  return Object.freeze({authorized:true,canonical});
 }catch{return Object.freeze({authorized:false,reason:'INVALID_AUTHORIZATION'});}
}
class PersistentNonceStore{
 constructor(filename){
  if(!path.isAbsolute(filename))throw Error('ABSOLUTE_STORE_PATH_REQUIRED');
  this.filename=filename;
  fs.mkdirSync(path.dirname(filename),{recursive:true,mode:0o700});
  try{fs.writeFileSync(filename,'', {flag:'wx',mode:0o600});}catch(e){if(e.code!=='EEXIST')throw e;}
 }
 consume(nonce){
  if(typeof nonce!=='string'||nonce.length<16)return false;
  const hash=crypto.createHash('sha256').update(nonce).digest('hex');
  const fd=fs.openSync(this.filename,'r+');
  try{
   const existing=fs.readFileSync(fd,'utf8');
   if(existing.split('\n').includes(hash))return false;
   fs.writeSync(fd,hash+'\n',fs.fstatSync(fd).size,'utf8');
   fs.fsyncSync(fd);
   return true;
  }finally{fs.closeSync(fd);}
 }
}
module.exports={stableAuthorization,verifyOwnerAuthorization,PersistentNonceStore};
