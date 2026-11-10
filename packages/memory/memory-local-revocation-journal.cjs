'use strict';
/**
 * Deterministic, local-only, tamper-evident revocation hints for quarantined
 * repair claims. A caller controls this journal, so its hash chain establishes
 * consistency, NEVER independent provenance, authority or historical truth.
 * A separately authenticated, durable checkpoint is required before using
 * these observations to decide any privileged action.
 */
const {createHash}=require('node:crypto');
const {types}=require('node:util');
const {snapshotRecord}=require('../investigation/plain-kotlin-payload.cjs');
const SCHEMA='ultra-sentinel-local-revocations/v1';
const SHA=/^[a-f0-9]{40}$/,DIGEST=/^[a-f0-9]{64}$/;
const ID=/^[A-Za-z0-9_-]{6,80}$/;
const REASONS=new Set(['REGRESSION_REPRODUCED','SOURCE_MISMATCH',
 'ORACLE_INVALIDATED','OWNER_VETO']);
const MAX_EVENTS=200,GENESIS='0'.repeat(64);
function fail(reason='INVALID_REVOCATION_JOURNAL'){throw Error(reason);}
function record(value,keys){
 try{return snapshotRecord(value,keys);}catch{fail();}
}
function list(value){
 if(types.isProxy(value)||!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype||
  value.length>MAX_EVENTS||Reflect.ownKeys(value).length!==value.length+1)fail();
 const items=[];
 for(let i=0;i<value.length;i++){
  const d=Object.getOwnPropertyDescriptor(value,String(i));
  if(!d||!Object.hasOwn(d,'value'))fail();
  items.push(d.value);
 }
 return items;
}
function snapshotJournal(value){
 const journal=record(value,['schema','anchorSha','headHash','events']);
 journal.events=list(journal.events).map(ev=>Object.freeze(record(ev,
  ['seq','id','digest','reason','headSha','prevHash','hash'])));
 return journal;
}
function evidence(entries){
 const m=new Map();
 for(const value of list(entries)){
  const item=record(value,['id','digest']);
  if(typeof item.id!=='string'||!ID.test(item.id)||
   typeof item.digest!=='string'||!DIGEST.test(item.digest)||m.has(item.id))fail();
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
 if(typeof anchorSha!=='string'||!SHA.test(anchorSha))fail();
 return Object.freeze({schema:SCHEMA,anchorSha,headHash:GENESIS,
  events:Object.freeze([])});
}
function inspectSnapshot(journal,known){
  if(journal.schema!==SCHEMA||typeof journal.anchorSha!=='string'||!SHA.test(journal.anchorSha)||
   typeof journal.headHash!=='string'||!DIGEST.test(journal.headHash))fail();
  let prev=GENESIS;
  const revoked=[],seen=new Set();
  for(let i=0;i<journal.events.length;i++){
   const ev=journal.events[i];
   if(ev.seq!==i+1||typeof ev.id!=='string'||!ID.test(ev.id)||
    typeof ev.digest!=='string'||!DIGEST.test(ev.digest)||
    typeof ev.reason!=='string'||!REASONS.has(ev.reason)||
    typeof ev.headSha!=='string'||!SHA.test(ev.headSha)||
    typeof ev.prevHash!=='string'||!DIGEST.test(ev.prevHash)||
    typeof ev.hash!=='string'||!DIGEST.test(ev.hash)||
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
}
function inspectLocalRevocations(input){
 try{
  const args=record(input,['journal','entries']);
  return inspectSnapshot(snapshotJournal(args.journal),evidence(args.entries));
 }catch(e){
  if(e?.message==='STALE_REVOCATION_EVIDENCE')throw e;
  fail();
 }
}
function appendLocalRevocation(input){
 const {journal:rawJournal,entries,id,reason,headSha}=
  record(input,['journal','entries','id','reason','headSha']);
 const journal=snapshotJournal(rawJournal),known=evidence(entries);
 const state=inspectSnapshot(journal,known);
 if(typeof id!=='string'||!ID.test(id)||typeof reason!=='string'||!REASONS.has(reason)||
  typeof headSha!=='string'||!SHA.test(headSha)||
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
