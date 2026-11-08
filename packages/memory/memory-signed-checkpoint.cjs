'use strict';
/*
 * Owner-key-verifiable checkpoint for already quarantined revocations.
 * Does not claim that a caller-supplied trust key belongs to the owner.
 * Only a trusted host can supply a separately pinned public key. No
 * promotions, remote writes, code execution or production privileges.
 */
const crypto=require('node:crypto');
const fs=require('node:fs'),path=require('node:path');
const {inspectLocalRevocations}=require('./memory-local-revocation-journal.cjs');
const SCHEMA='ultra-sentinel-signed-revocation-checkpoint/v1';
const SOURCE_SCHEMA='ultra-sentinel-local-revocations/v1';
const REPO='cardenaspiero255-lang/Ultra-Sentinel';
const PREFIX='Ultra-Sentinel:revocation-checkpoint:v1\n';
const SHA=/^[a-f0-9]{40}$/,HASH=/^[a-f0-9]{64}$/;
const SIGNATURE=/^[A-Za-z0-9+/]{86}==$/;
const MAX_BYTES=160000;
function denied(reason='CHECKPOINT_INVALID'){throw Error(reason);}
function plain(value,fields){
 return value!==null&&typeof value==='object'&&!Array.isArray(value)&&
  Object.getPrototypeOf(value)===Object.prototype&&
  Object.keys(value).sort().join(',')===fields.slice().sort().join(',');
}
function createSignedRevocationCheckpoint({journal}={}){
 if(!journal||journal.schema!==SOURCE_SCHEMA||
  !SHA.test(journal.anchorSha||'')||!HASH.test(journal.headHash||'')||
  !Array.isArray(journal.events)||journal.events.length>200)denied();
 const eventCount=journal.events.length;
 const signingMessage=PREFIX+JSON.stringify([REPO,journal.anchorSha,
  eventCount,journal.headHash]);
 return Object.freeze({schema:SCHEMA,repository:REPO,
  anchorSha:journal.anchorSha,headHash:journal.headHash,
  eventCount,signingMessage});
}
function verifySignedRevocationCheckpoint({journal,checkpoint,entries,trustedPublicKey}={}){
 const local=inspectLocalRevocations({journal,entries});
 const canonical=createSignedRevocationCheckpoint({journal});
 if(!plain(checkpoint,['schema','repository','anchorSha','headHash',
   'eventCount','signingMessage','signature'])||
  checkpoint.schema!==canonical.schema||
  checkpoint.repository!==canonical.repository||
  checkpoint.anchorSha!==canonical.anchorSha||
  checkpoint.headHash!==canonical.headHash||
  checkpoint.eventCount!==canonical.eventCount||
  checkpoint.signingMessage!==canonical.signingMessage||
  !SIGNATURE.test(checkpoint.signature||''))denied('CHECKPOINT_SIGNATURE_INVALID');
 let key;
 try{
  key=trustedPublicKey instanceof crypto.KeyObject?trustedPublicKey:
   crypto.createPublicKey(trustedPublicKey);
  if(key.type!=='public'||key.asymmetricKeyType!=='ed25519'||
   !crypto.verify(null,Buffer.from(canonical.signingMessage,'utf8'),
    key,Buffer.from(checkpoint.signature,'base64')))
   denied('CHECKPOINT_SIGNATURE_INVALID');
 }catch{denied('CHECKPOINT_SIGNATURE_INVALID');}
 return Object.freeze({
  status:'SIGNED_REVOCATION_CHAIN_VALID_FOR_CONFIGURED_KEY',
  revokedIds:local.revokedIds,
  anchorSha:canonical.anchorSha,headHash:canonical.headHash,
  eventCount:canonical.eventCount,signatureValidForConfiguredKey:true,
  trustedKeyOriginAuthenticatedByThisModule:false,
  ownerAuthorizationGranted:false,promotionAuthorized:false,
  protectedMainProven:false,remoteWrites:false,mergeAllowed:false,
  productionReleaseAllowed:false,
  limitation:'A signature is cryptographically valid only for the separately configured public key. Authentic owner provenance, external checkpoint monotonicity and deployment are not established by this local helper.'
 });
}
function privateLocation(filename){
 if(typeof filename!=='string'||!path.isAbsolute(filename)||
  filename.length>500||filename.includes('\0'))denied('CHECKPOINT_PATH_UNSAFE');
 const dir=path.dirname(filename),st=fs.lstatSync(dir);
 if(!st.isDirectory()||st.isSymbolicLink()||
  (st.mode&0o077)!==0||fs.realpathSync(dir)!==dir)
  denied('CHECKPOINT_DIRECTORY_UNSAFE');
}
function readFile(filename){
 privateLocation(filename);
 let st;
 try{st=fs.lstatSync(filename);}
 catch(e){if(e.code==='ENOENT')denied('CHECKPOINT_NOT_FOUND');throw e;}
 if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||
  (st.mode&0o077)!==0||st.size<2||st.size>MAX_BYTES)
  denied('CHECKPOINT_FILE_UNSAFE');
 const fd=fs.openSync(filename,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
 let bytes;
 try{
  const live=fs.fstatSync(fd);
  if(!live.isFile()||live.ino!==st.ino||live.dev!==st.dev||
   (live.mode&0o077)!==0||live.nlink!==1||live.size!==st.size)
   denied('CHECKPOINT_FILE_UNSAFE');
  bytes=fs.readFileSync(fd);
 }finally{fs.closeSync(fd);}
 if(bytes.length!==st.size||bytes.includes(0))denied('CHECKPOINT_FILE_CORRUPT');
 let payload;try{payload=JSON.parse(bytes.toString('utf8'));}
 catch{denied('CHECKPOINT_FILE_CORRUPT');}
 if(!plain(payload,['journal','checkpoint']))denied('CHECKPOINT_FILE_CORRUPT');
 return payload;
}
function inspectStored(payload,entries,trustedPublicKey){
 const verification=verifySignedRevocationCheckpoint({
  ...payload,entries,trustedPublicKey
 });
 return Object.freeze({...verification,journal:payload.journal,checkpoint:payload.checkpoint});
}
class PersistentSignedRevocationStore{
 constructor(filename){
  privateLocation(filename);
  this.filename=filename;
 }
 load({entries,trustedPublicKey}={}){
  return inspectStored(readFile(this.filename),entries,trustedPublicKey);
 }
 commit({journal,checkpoint,entries,trustedPublicKey}={}){
  privateLocation(this.filename);
  const current=verifySignedRevocationCheckpoint({
   journal,checkpoint,entries,trustedPublicKey
  });
  const lock=this.filename+'.lock',temp=this.filename+'.tmp';
  let lockfd=null,fd=null;
  try{
   lockfd=fs.openSync(lock,
    fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_WRONLY|fs.constants.O_NOFOLLOW,
    0o600);
   let previous=null;
   if(fs.existsSync(this.filename))
    previous=inspectStored(readFile(this.filename),entries,trustedPublicKey);
   if(previous){
    if(previous.anchorSha!==current.anchorSha||
     current.eventCount<=previous.eventCount)
     denied('CHECKPOINT_NOT_MONOTONIC');
    // Never rebase history, drop an event, edit a recorded reason, or
    // silently replace authenticated evidence beneath the checkpoint.
    for(let i=0;i<previous.eventCount;i++)
     if(JSON.stringify(previous.journal.events[i])!==
       JSON.stringify(journal.events[i]))denied('CHECKPOINT_HISTORY_CHANGED');
   }
   const serialized=JSON.stringify({journal,checkpoint})+'\n';
   if(Buffer.byteLength(serialized)>MAX_BYTES)denied('CHECKPOINT_FILE_TOO_LARGE');
   fd=fs.openSync(temp,
    fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_WRONLY|fs.constants.O_NOFOLLOW,
    0o600);
   const len=Buffer.byteLength(serialized);
   if(fs.writeSync(fd,serialized)!==len)denied('CHECKPOINT_PARTIAL_WRITE');
   fs.fsyncSync(fd);fs.closeSync(fd);fd=null;
   fs.renameSync(temp,this.filename);
   const dfd=fs.openSync(path.dirname(this.filename),fs.constants.O_RDONLY|
    fs.constants.O_DIRECTORY);
   try{fs.fsyncSync(dfd);}finally{fs.closeSync(dfd);}
   return Object.freeze({status:'SIGNED_REVOCATIONS_PERSISTED_NO_REMOTE_AUTHORITY',
    eventCount:current.eventCount,headHash:current.headHash,
    ownerAuthorizationGranted:false,remoteWrites:false,mergeAllowed:false});
  }finally{
   if(fd!==null)fs.closeSync(fd);
   if(lockfd!==null){
    fs.closeSync(lockfd);
    // Do not touch a replaced lock target.
    const stat=fs.lstatSync(lock);
    if(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1)fs.unlinkSync(lock);
   }
   // A crashed commit leaves .tmp and blocks the next attempt until
   // supervised recovery; never remove an unknown file automatically.
  }
 }
}
module.exports=Object.freeze({createSignedRevocationCheckpoint,
 verifySignedRevocationCheckpoint,PersistentSignedRevocationStore});
