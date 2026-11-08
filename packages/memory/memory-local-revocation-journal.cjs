'use strict';
/**
 * Deterministic, local-only, tamper-evident revocation hints for quarantined
 * repair claims. A caller controls this journal, so its hash chain establishes
 * consistency, NEVER independent provenance, authority or historical truth.
 * A separately authenticated, durable checkpoint is required before using
 * these observations to decide any privileged action.
 */
const {createHash}=require('node:crypto');
const SCHEMA='ultra-sentinel-local-revocations/v1';
const SHA=/^[a-f0-9]{40}$/,DIGEST=/^[a-f0-9]{64}$/;
const ID=/^[A-Za-z0-9_-]{6,80}$/;
const REASONS=new Set(['REGRESSION_REPRODUCED','SOURCE_MISMATCH',
 'ORACLE_INVALIDATED','OWNER_VETO']);
const MAX_EVENTS=200,GENESIS='0'.repeat(64);
function fail(reason='INVALID_REVOCATION_JOURNAL'){throw Error(reason);}
function plain(value,keys){
 return value!==null&&typeof value==='object'&&!Array.isArray(value)&&
  Object.getPrototypeOf(value)===Object.prototype&&
  Object.keys(value).sort().join(',')===keys.slice().sort().join(',');
}
function evidence(entries){
 if(!Array.isArray(entries)||entries.length>200)fail();
 const m=new Map();
 for(const item of entries){
  if(!plain(item,['id','digest'])||!ID.test(item.id)||
   !DIGEST.test(item.digest)||m.has(item.id))fail();
  m.set(item.id,item.digest);
 }
 return m;
}
function hashRecord(journal,event){
 // Length-preserving canonical JSON arrays avoid delimiter ambiguities.
 return createHash('sha256').update(JSON.stringify([SCHEMA,journal.anchorSha,
  event.seq,event.id,event.digest,event.reason,event.headSha,event.prevHash]),
 'utf8').digest('hex');
}
function createLocalRevocationJournal(anchorSha){
 if(!SHA.test(anchorSha||''))fail();
 return Object.freeze({schema:SCHEMA,anchorSha,headHash:GENESIS,
  events:Object.freeze([])});
}
function inspectLocalRevocations({journal,entries}={}){
 try{
  const known=evidence(entries);
  if(!plain(journal,['schema','anchorSha','headHash','events'])||
   journal.schema!==SCHEMA||!SHA.test(journal.anchorSha)||
   !DIGEST.test(journal.headHash)||!Array.isArray(journal.events)||
   journal.events.length>MAX_EVENTS)fail();
  let prev=GENESIS;
  const revoked=[],seen=new Set();
  for(let i=0;i<journal.events.length;i++){
   const ev=journal.events[i];
   if(!plain(ev,['seq','id','digest','reason','headSha','prevHash','hash'])||
    ev.seq!==i+1||!ID.test(ev.id)||!DIGEST.test(ev.digest)||
    !REASONS.has(ev.reason)||!SHA.test(ev.headSha)||
    !DIGEST.test(ev.prevHash)||!DIGEST.test(ev.hash)||
    ev.prevHash!==prev||seen.has(ev.id))fail();
   if(!known.has(ev.id)||known.get(ev.id)!==ev.digest)
    fail('STALE_REVOCATION_EVIDENCE');
   if(hashRecord(journal,ev)!==ev.hash)fail();
   seen.add(ev.id);revoked.push(ev.id);prev=ev.hash;
  }
  if(journal.headHash!==prev)fail();
  return Object.freeze({status:'LOCAL_REVOCATION_HINTS_VALID_NOT_AUTHENTICATED',
   revokedIds:Object.freeze(revoked),headHash:prev,
   independentEvidenceAuthenticated:false,githubAuthenticated:false,
   ownerAuthorizationGranted:false,promotionAuthorized:false,
   productionReleaseAllowed:false,canAutoRepair:false,
   remoteWrites:false,mergeAllowed:false,
   limitation:'Hash integrity of a caller-controlled journal is not durable or authenticated provenance. Revocation may suppress untrusted candidate hints only.'});
 }catch(e){
  if(e?.message==='STALE_REVOCATION_EVIDENCE')throw e;
  fail();
 }
}
function appendLocalRevocation({journal,entries,id,reason,headSha}={}){
 const state=inspectLocalRevocations({journal,entries});
 const known=evidence(entries);
 if(!ID.test(id||'')||!REASONS.has(reason)||!SHA.test(headSha||'')||
  !known.has(id))fail();
 if(state.revokedIds.includes(id))fail('ALREADY_REVOKED');
 if(journal.events.length>=MAX_EVENTS)fail();
 const e={seq:journal.events.length+1,id,digest:known.get(id),reason,
  headSha,prevHash:state.headHash};
 const event=Object.freeze({...e,hash:hashRecord(journal,e)});
 return Object.freeze({schema:SCHEMA,anchorSha:journal.anchorSha,
  headHash:event.hash,events:Object.freeze([...journal.events,event])});
}
module.exports=Object.freeze({SCHEMA,createLocalRevocationJournal,
 appendLocalRevocation,inspectLocalRevocations});
