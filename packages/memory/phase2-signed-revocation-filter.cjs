'use strict';
/** Quarantined candidate suppression based on the existing Ed25519 checkpoint.
 * This module does not authenticate that the configured key belongs to the
 * owner or that the witness was retained independently by a trusted host. */
const {types}=require('node:util');
const {verifyPinnedRevocationHighWater}=require('./memory-signed-checkpoint.cjs');
const ID=/^[A-Za-z0-9_-]{6,80}$/,DIGEST=/^[a-f0-9]{64}$/;
function invalid(){throw Error('UNTRUSTED_CANDIDATE_SUGGESTION');}
function record(v,keys){
 if(!v||typeof v!=='object'||Array.isArray(v)||types.isProxy(v)||
  Object.getPrototypeOf(v)!==Object.prototype||Reflect.ownKeys(v).length!==keys.length)invalid();
 const o={};for(const k of keys){const d=Object.getOwnPropertyDescriptor(v,k);
  if(!d||!Object.hasOwn(d,'value'))invalid();o[k]=d.value;}return o;
}
function rows(v){
 if(!Array.isArray(v)||types.isProxy(v)||Object.getPrototypeOf(v)!==Array.prototype||
    v.length>200||Reflect.ownKeys(v).length!==v.length+1)invalid();
 const byId=new Map();
 for(let i=0;i<v.length;i++){
  const desc=Object.getOwnPropertyDescriptor(v,String(i));
  if(!desc||!Object.hasOwn(desc,'value'))invalid();
  const row=record(desc.value,['id','digest']);
  if(typeof row.id!=='string'||!ID.test(row.id)||typeof row.digest!=='string'||
    !DIGEST.test(row.digest)||byId.has(row.id))invalid();
  byId.set(row.id,row.digest);
 }
 return byId;
}
function blocked(){return Object.freeze({status:'BLOCKED_UNAUTHENTICATED_REVOCATION_OR_SUGGESTION',
 ownerIdentityAuthenticated:false,promotionAuthorized:false,canAutoRepair:false,
 remoteWrites:false,mergeAllowed:false});}
function filterSignedRevokedSuggestions(input){
 try{
  const o=record(input,['journal','checkpoint','witness','entries','trustedPublicKey','suggestions']);
  const entries=rows(o.entries),suggestions=rows(o.suggestions);
  for(const [id,digest] of suggestions)if(entries.get(id)!==digest)invalid();
  const state=verifyPinnedRevocationHighWater({
   journal:o.journal,checkpoint:o.checkpoint,witness:o.witness,
   entries:[...entries].map(([id,digest])=>({id,digest})),trustedPublicKey:o.trustedPublicKey
  });
  if(state.status!=='CURRENT_REVOCATIONS_EXTEND_PINNED_WITNESS'||
    state.witnessSignatureValidForConfiguredKey!==true)invalid();
  const revoked=new Set(state.revokedIds);
  // IDs can change while the signed, revoked content digest stays identical.
  // Keep every alias of that exact digest quarantined and suppressed too.
  const revokedDigests=new Set(state.revokedIds.map(id=>entries.get(id)));
  const suppressed=[],nonRevoked=[];
  for(const [id,digest] of suggestions)
   (revoked.has(id)||revokedDigests.has(digest)?suppressed:nonRevoked).push(id);
  return Object.freeze({status:'SIGNED_REVOCATIONS_SUPPRESS_QUARANTINED_HINTS',
   suppressedIds:Object.freeze(suppressed),nonRevokedQuarantinedIds:Object.freeze(nonRevoked),
   evidenceHeadHash:state.headHash,witnessEventCount:state.witnessEventCount,
   ownerIdentityAuthenticated:false,independentWitnessStorageVerified:false,
   promotionAuthorized:false,canAutoRepair:false,remoteWrites:false,mergeAllowed:false,
   limitation:'Non-revoked hints remain quarantined, not verified repairs. Trusted host must independently pin owner key and witness; no promotion or production write authority.'});
 }catch{return blocked();}
}
module.exports=Object.freeze({filterSignedRevokedSuggestions});
