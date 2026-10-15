'use strict';
/** Offline integrity check for C2 reviewer handoffs; not proof of provenance or independence. */
const crypto=require('node:crypto');
const {PRS}=require('./live-gamehub-c2-cohort.cjs');
const REPO='cardenaspiero255-lang/gamehub-ultra';
const SHA=/^[0-9a-f]{40}$/;
const HASH=/^[0-9a-f]{64}$/;
function exact(value,keys){
 return value!==null&&typeof value==='object'&&!Array.isArray(value)&&
  Object.keys(value).length===keys.length&&keys.every(k=>Object.hasOwn(value,k));
}
function isValidFrozenBlindPacket(snapshot){
 try{
  if(!snapshot||!HASH.test(snapshot.digest||''))return false;
  const p=snapshot.packet;
  if(!exact(p,['schema','repository','cases'])||
   p.schema!=='ultra-sentinel-c2-blind-review-packet/v1'||
   p.repository!==REPO||!Array.isArray(p.cases)||p.cases.length!==PRS.length)
   return false;
  for(let i=0;i<PRS.length;i++){
   const c=p.cases[i];
   if(!exact(c,['pr','headSha','baseSha','changedFiles'])||
    c.pr!==PRS[i]||!SHA.test(c.headSha||'')||!SHA.test(c.baseSha||'')||
    !Number.isSafeInteger(c.changedFiles)||c.changedFiles<1||c.changedFiles>300)
    return false;
  }
  const computed=crypto.createHash('sha256').update(JSON.stringify(p),'utf8').digest('hex');
  return crypto.timingSafeEqual(Buffer.from(computed,'hex'),Buffer.from(snapshot.digest,'hex'));
 }catch{return false;}
}
module.exports={isValidFrozenBlindPacket};
