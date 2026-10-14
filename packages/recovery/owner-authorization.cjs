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
function assertSafeRegularFile(filename){
 const stat=fs.lstatSync(filename);
 if(!stat.isFile()||stat.isSymbolicLink()||(stat.mode&0o077)!==0||stat.nlink!==1)throw Error('NONCE_STORE_UNSAFE');
}
function assertPrivateDirectory(dirname){
 const resolved=path.resolve(dirname),root=path.parse(resolved).root;
 let current=root;
 for(const component of path.relative(root,resolved).split(path.sep).filter(Boolean)){
  current=path.join(current,component);
  const stat=fs.lstatSync(current);
  if(!stat.isDirectory()||stat.isSymbolicLink())throw Error('NONCE_DIRECTORY_UNSAFE');
  if((stat.mode&0o002)!==0&&(stat.mode&0o1000)===0)throw Error('NONCE_DIRECTORY_UNSAFE');
 }
 const stat=fs.statSync(resolved);
 if((stat.mode&0o077)!==0)throw Error('NONCE_DIRECTORY_NOT_PRIVATE');
}
class PersistentNonceStore{
 constructor(filename){
  if(!path.isAbsolute(filename))throw Error('ABSOLUTE_STORE_PATH_REQUIRED');
  this.filename=filename;
  fs.mkdirSync(path.dirname(filename),{recursive:true,mode:0o700});
  assertPrivateDirectory(path.dirname(filename));
  try{fs.writeFileSync(filename,'',{flag:'wx',mode:0o600});}
  catch(e){if(e.code!=='EEXIST')throw e;}
  assertSafeRegularFile(filename);
 }
 consume(nonce){
  if(typeof nonce!=='string'||nonce.length<16)return false;
  assertPrivateDirectory(path.dirname(this.filename));
  assertSafeRegularFile(this.filename);
  const hash=crypto.createHash('sha256').update(nonce).digest('hex');
  const lock=this.filename+'.lock';
  let lockFd;
  try{lockFd=fs.openSync(lock,fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_WRONLY|fs.constants.O_NOFOLLOW,0o600);}
  catch(e){if(e.code==='EEXIST')return false;throw e;}
  let fd;
  try{
   assertSafeRegularFile(this.filename);
   fd=fs.openSync(this.filename,fs.constants.O_RDWR|fs.constants.O_NOFOLLOW);
   const stat=fs.fstatSync(fd);
   if(!stat.isFile()||(stat.mode&0o077)!==0||stat.nlink!==1)throw Error('NONCE_STORE_UNSAFE');
   const existing=fs.readFileSync(fd,'utf8');
   if(existing.split('\n').includes(hash))return false;
   fs.writeSync(fd,hash+'\n',stat.size,'utf8');
   fs.fsyncSync(fd);
   return true;
  }finally{if(fd!==undefined)fs.closeSync(fd);fs.closeSync(lockFd);fs.unlinkSync(lock);}
 }
}
module.exports={stableAuthorization,verifyOwnerAuthorization,PersistentNonceStore};
