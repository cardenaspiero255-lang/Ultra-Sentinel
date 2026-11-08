'use strict';
/*
 * Owner-key-verifiable checkpoint for already quarantined revocations.
 * Does not claim that a caller-supplied trust key belongs to the owner.
 * Only a trusted host can supply a separately pinned public key. No
 * promotions, remote writes, code execution or production privileges.
 */
const crypto=require('node:crypto');
const {types}=require('node:util');
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
  !types.isProxy(value)&&Object.getPrototypeOf(value)===Object.prototype&&
  Object.keys(value).sort().join(',')===fields.slice().sort().join(',');
}
/*
 * Snapshot only own data descriptors. Never invoke caller getters or trust
 * proxies. All chain inspection, signed bytes and serialized records must
 * use exactly one frozen copy of caller input, even during store commits.
 */
function snapshotRecord(value,fields){
 if(!plain(value,fields))denied('CHECKPOINT_UNSAFE_OBJECT');
 const descriptors=Object.getOwnPropertyDescriptors(value);
 const keys=Reflect.ownKeys(descriptors);
 if(keys.length!==fields.length||
  fields.some(k=>!Object.hasOwn(descriptors,k)||
    !Object.hasOwn(descriptors[k],'value')))
  denied('CHECKPOINT_UNSAFE_OBJECT');
 // Never retain caller-owned mutable scalar objects. Some objects implement
 // coercion/toJSON that yields different values during chain inspection and
 // disk serialization, corrupting an otherwise valid signed checkpoint.
 for(const key of fields){
  const data=descriptors[key].value;
  if(key==='events'){
   if(!Array.isArray(data)||types.isProxy(data))
    denied('CHECKPOINT_UNSAFE_OBJECT');
  }else if(key==='seq'||key==='eventCount'){
   if(!Number.isSafeInteger(data)||data<0)
    denied('CHECKPOINT_UNSAFE_OBJECT');
  }else if(typeof data!=='string')denied('CHECKPOINT_UNSAFE_OBJECT');
 }
 return Object.freeze(Object.fromEntries(
  fields.map(k=>[k,descriptors[k].value])));
}
function snapshotArray(value,max,makeRow){
 if(!Array.isArray(value)||types.isProxy(value)||
  Object.getPrototypeOf(value)!==Array.prototype||
  value.length>max||Reflect.ownKeys(value).length!==value.length+1)
  denied('CHECKPOINT_UNSAFE_OBJECT');
 const rows=[];
 for(let i=0;i<value.length;i++){
  const field=Object.getOwnPropertyDescriptor(value,String(i));
  if(!field||!Object.hasOwn(field,'value'))
   denied('CHECKPOINT_UNSAFE_OBJECT');
  rows.push(makeRow(field.value));
 }
 return Object.freeze(rows);
}
function snapshotJournal(journal){
 const copy=snapshotRecord(journal,['schema','anchorSha','headHash','events']);
 const events=snapshotArray(copy.events,200,ev=>snapshotRecord(ev,
  ['seq','id','digest','reason','headSha','prevHash','hash']));
 return Object.freeze({...copy,events});
}
function snapshotEntries(entries){
 return snapshotArray(entries,200,e=>snapshotRecord(e,['id','digest']));
}
function snapshotCheckpoint(checkpoint){
 return snapshotRecord(checkpoint,['schema','repository','anchorSha','headHash',
  'eventCount','signingMessage','signature']);
}
function createSignedRevocationCheckpoint({journal}={}){
 const stable=snapshotJournal(journal);
 if(stable.schema!==SOURCE_SCHEMA||
  !SHA.test(stable.anchorSha||'')||!HASH.test(stable.headHash||''))
  denied();
 const eventCount=stable.events.length;
 const signingMessage=PREFIX+JSON.stringify([REPO,stable.anchorSha,
  eventCount,stable.headHash]);
 return Object.freeze({schema:SCHEMA,repository:REPO,
  anchorSha:stable.anchorSha,headHash:stable.headHash,
  eventCount,signingMessage});
}
function verifySignedRevocationCheckpoint({journal,checkpoint,entries,trustedPublicKey}={}){
 const stableJournal=snapshotJournal(journal);
 const stableEntries=snapshotEntries(entries);
 const stableCheckpoint=snapshotCheckpoint(checkpoint);
 const local=inspectLocalRevocations({
  journal:stableJournal,entries:stableEntries
 });
 const canonical=createSignedRevocationCheckpoint({journal:stableJournal});
 if(stableCheckpoint.schema!==canonical.schema||
  stableCheckpoint.repository!==canonical.repository||
  stableCheckpoint.anchorSha!==canonical.anchorSha||
  stableCheckpoint.headHash!==canonical.headHash||
  stableCheckpoint.eventCount!==canonical.eventCount||
  stableCheckpoint.signingMessage!==canonical.signingMessage||
  !SIGNATURE.test(stableCheckpoint.signature||'')||
  Buffer.from(stableCheckpoint.signature,'base64').toString('base64')!==stableCheckpoint.signature)
  denied('CHECKPOINT_SIGNATURE_INVALID');
 let key;
 try{
  key=trustedPublicKey instanceof crypto.KeyObject?trustedPublicKey:
   crypto.createPublicKey(trustedPublicKey);
  if(key.type!=='public'||key.asymmetricKeyType!=='ed25519'||
   !crypto.verify(null,Buffer.from(canonical.signingMessage,'utf8'),
    key,Buffer.from(stableCheckpoint.signature,'base64')))
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

/*
 * Compare a signed checkpoint against an independently pinned high-water mark.
 * This module verifies signatures and prefix history, NOT witness custody.
 */
function verifyPinnedRevocationHighWater({journal,checkpoint,entries,trustedPublicKey,witness}={}){
 const stableJournal=snapshotJournal(journal);
 const stableCheckpoint=snapshotCheckpoint(checkpoint);
 const stableEntries=snapshotEntries(entries);
 const stableWitness=snapshotCheckpoint(witness);
 const current=verifySignedRevocationCheckpoint({
  journal:stableJournal,checkpoint:stableCheckpoint,
  entries:stableEntries,trustedPublicKey
 });
 const expectedMessage=PREFIX+JSON.stringify([REPO,stableWitness.anchorSha,
  stableWitness.eventCount,stableWitness.headHash]);
 if(stableWitness.schema!==SCHEMA||stableWitness.repository!==REPO||
  !SHA.test(stableWitness.anchorSha)||!HASH.test(stableWitness.headHash)||
  stableWitness.signingMessage!==expectedMessage||
  !SIGNATURE.test(stableWitness.signature)||
  Buffer.from(stableWitness.signature,'base64').toString('base64')!==
    stableWitness.signature)denied('CHECKPOINT_SIGNATURE_INVALID');
 try{
  const key=trustedPublicKey instanceof crypto.KeyObject?trustedPublicKey:
   crypto.createPublicKey(trustedPublicKey);
  if(key.type!=='public'||key.asymmetricKeyType!=='ed25519'||
   !crypto.verify(null,Buffer.from(expectedMessage,'utf8'),key,
    Buffer.from(stableWitness.signature,'base64')))
   denied('CHECKPOINT_SIGNATURE_INVALID');
 }catch{denied('CHECKPOINT_SIGNATURE_INVALID');}
 if(stableWitness.anchorSha!==current.anchorSha)
  denied('CHECKPOINT_HISTORY_FORKED');
 if(stableWitness.eventCount>current.eventCount)
  denied('CHECKPOINT_ROLLBACK_DETECTED');
 const pinnedHash=stableWitness.eventCount===0?'0'.repeat(64):
  stableJournal.events[stableWitness.eventCount-1]?.hash;
 if(pinnedHash!==stableWitness.headHash)
  denied('CHECKPOINT_HISTORY_FORKED');
 return Object.freeze({...current,
  status:'CURRENT_REVOCATIONS_EXTEND_PINNED_WITNESS',
  witnessEventCount:stableWitness.eventCount,
  witnessSignatureValidForConfiguredKey:true,
  independentWitnessStorageVerified:false,
  ownerAuthorizationGranted:false,promotionAuthorized:false,
  productionReleaseAllowed:false,remoteWrites:false,mergeAllowed:false,
  limitation:'The signed history extends the supplied witness. The host must authenticate and retain the trusted key and witness separately; this module does not certify witness storage or authority.'
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
 loadWithWitness({entries,trustedPublicKey,witness}={}){
  const payload=readFile(this.filename);
  const proof=verifyPinnedRevocationHighWater({...payload,
   entries,trustedPublicKey,witness});
  return Object.freeze({...proof,journal:payload.journal,
   checkpoint:payload.checkpoint});
 }
 commit({journal,checkpoint,entries,trustedPublicKey}={}){
  privateLocation(this.filename);
  const stableJournal=snapshotJournal(journal),
   stableCheckpoint=snapshotCheckpoint(checkpoint),
   stableEntries=snapshotEntries(entries);
  const current=verifySignedRevocationCheckpoint({
   journal:stableJournal,checkpoint:stableCheckpoint,
   entries:stableEntries,trustedPublicKey
  });
  const lock=this.filename+'.lock',temp=this.filename+'.tmp';
  let lockfd=null,fd=null;
  try{
   lockfd=fs.openSync(lock,
    fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_WRONLY|fs.constants.O_NOFOLLOW,
    0o600);
   let previous=null;
   if(fs.existsSync(this.filename))
    previous=inspectStored(readFile(this.filename),stableEntries,trustedPublicKey);
   if(previous){
    if(previous.anchorSha!==current.anchorSha||
     current.eventCount<=previous.eventCount)
     denied('CHECKPOINT_NOT_MONOTONIC');
    // Never rebase history, drop an event, edit a recorded reason, or
    // silently replace authenticated evidence beneath the checkpoint.
    for(let i=0;i<previous.eventCount;i++)
     if(JSON.stringify(previous.journal.events[i])!==
       JSON.stringify(stableJournal.events[i]))denied('CHECKPOINT_HISTORY_CHANGED');
   }
   const serialized=JSON.stringify({journal:stableJournal,checkpoint:stableCheckpoint})+'\n';
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
    const owned=fs.fstatSync(lockfd);
    fs.closeSync(lockfd);
    // Compare identity before cleanup; this is not an atomic conditional
    // unlink against a writer able to modify the private directory.
    let stat;
    try{stat=fs.lstatSync(lock);}catch(e){if(e.code!=='ENOENT')throw e;}
    if(stat&&stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1&&
     stat.dev===owned.dev&&stat.ino===owned.ino)fs.unlinkSync(lock);
   }
   // A crashed commit leaves .tmp and blocks the next attempt until
   // supervised recovery; never remove an unknown file automatically.
  }
 }
}
module.exports=Object.freeze({createSignedRevocationCheckpoint,
 verifySignedRevocationCheckpoint,verifyPinnedRevocationHighWater,
 PersistentSignedRevocationStore});
