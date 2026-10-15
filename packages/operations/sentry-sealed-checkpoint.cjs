'use strict';
/**
 * Private Sentry monitor checkpoint envelope for FUTURE Actions integration.
 * No secrets, issue IDs or stack traces belong in a public Actions artifact
 * unless encrypted with an externally managed key. Fail closed by default.
 */
const {randomBytes,createCipheriv,createDecipheriv}=require('node:crypto');
const {validateCheckpoint}=require('../../apps/watchdog/watchdog-state.cjs');
const SCHEMA='ultra-sentinel-sentry-sealed-state/v1';
const AAD=Buffer.from('ultra-sentinel/sentry-private-checkpoint/v1:repo:1418338512:main','utf8');
function fail(){throw Error('INVALID_OR_UNAUTHORIZED_PRIVATE_CHECKPOINT');}
function keyBytes(value){
 if(typeof value!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(value))fail();
 const key=Buffer.from(value,'base64url');
 if(key.length!==32||key.toString('base64url')!==value)fail();
 return key;
}
function strictDecode(value,min,max){
 if(typeof value!=='string'||! /^[A-Za-z0-9_-]+$/.test(value))fail();
 const bytes=Buffer.from(value,'base64url');
 if(bytes.length<min||bytes.length>max||bytes.toString('base64url')!==value)fail();
 return bytes;
}
const SHA=/^[a-f0-9]{40}$/,HASH=/^[a-f0-9]{24}$/;
function exact(o,fields){
 return o!==null&&typeof o==='object'&&!Array.isArray(o)&&
  Object.keys(o).length===fields.length&&fields.every(k=>Object.hasOwn(o,k));
}
function validAlert(alert){
 if(!alert||typeof alert.type!=='string')fail();
 const type=alert.type;
 if(type==='NEW_SENTRY_ISSUE')
  return exact(alert,['type','fingerprint'])&&HASH.test(alert.fingerprint);
 if(type==='GAMEHUB_SAMPLE_NOW_IDLE')
  return exact(alert,['type']);
 if(!Number.isSafeInteger(alert.pr)||alert.pr<1)fail();
 if(['JARVIS_PR_OPENED','JARVIS_PR_NO_LONGER_OPEN_IN_SNAPSHOT'].includes(type))
  return exact(alert,['type','pr']);
 if(['JARVIS_PR_HEAD_CHANGED','GAMEHUB_PR_SAMPLE_SELECTED',
  'GAMEHUB_PR_SAMPLE_CHANGED','GAMEHUB_PR_HEAD_CHANGED'].includes(type))
  return exact(alert,['type','pr','headSha'])&&SHA.test(alert.headSha||'');
 return false;
}
function validatePlaintext(raw){
 if(typeof raw!=='string'||Buffer.byteLength(raw,'utf8')<2||
    Buffer.byteLength(raw,'utf8')>65536)fail();
 let parsed;try{parsed=JSON.parse(raw);}catch{fail();}
 if(!exact(parsed,['schema','checkpoint','pendingAlerts',
    'batchSequence','deliveryAcknowledged'])||
    parsed.schema!=='ultra-sentinel-watchdog-checkpoint/v1'||
    parsed.deliveryAcknowledged!==false||
    !Number.isSafeInteger(parsed.batchSequence)||parsed.batchSequence<1||
    !exact(parsed.checkpoint,['version','issues','prs','gamehub'])||
    !Array.isArray(parsed.checkpoint.issues)||
    !Array.isArray(parsed.checkpoint.prs)||
    parsed.checkpoint.prs.some(x=>!exact(x,['pr','headSha']))||
    (parsed.checkpoint.gamehub!==null&&
     !exact(parsed.checkpoint.gamehub,['pr','headSha']))||
    !Array.isArray(parsed.pendingAlerts)||parsed.pendingAlerts.length>40||
    parsed.pendingAlerts.some(x=>!validAlert(x)))fail();
 try{validateCheckpoint(parsed.checkpoint);}catch{fail();}
 return Buffer.from(raw,'utf8');
}
function sealSentryCheckpoint(plaintext,privateKey){
 const bytes=validatePlaintext(plaintext),key=keyBytes(privateKey);
 const nonce=randomBytes(12);
 const cipher=createCipheriv('aes-256-gcm',key,nonce,{authTagLength:16});
 cipher.setAAD(AAD);
 const encrypted=Buffer.concat([cipher.update(bytes),cipher.final()]);
 const tag=cipher.getAuthTag();
 return Object.freeze({
  schema:SCHEMA,algorithm:'AES-256-GCM',
  nonce:nonce.toString('base64url'),
  ciphertext:encrypted.toString('base64url'),
  tag:tag.toString('base64url')
 });
}
function openSentryCheckpoint(raw,privateKey){
 const key=keyBytes(privateKey);
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||
  Object.keys(raw).length!==5||
  !Object.hasOwn(raw,'schema')||!Object.hasOwn(raw,'algorithm')||
  !Object.hasOwn(raw,'nonce')||!Object.hasOwn(raw,'ciphertext')||
  !Object.hasOwn(raw,'tag')||
  raw.schema!==SCHEMA||raw.algorithm!=='AES-256-GCM')fail();
 const nonce=strictDecode(raw.nonce,12,12),
  ciphertext=strictDecode(raw.ciphertext,1,65536+32),
  tag=strictDecode(raw.tag,16,16);
 let recovered;
 try{
  const decipher=createDecipheriv('aes-256-gcm',key,nonce,{authTagLength:16});
  decipher.setAAD(AAD);decipher.setAuthTag(tag);
  recovered=Buffer.concat([decipher.update(ciphertext),decipher.final()]);
 }catch{fail();}
 const text=recovered.toString('utf8');
 if(!Buffer.from(text,'utf8').equals(recovered))fail();
 validatePlaintext(text);
 return text;
}
module.exports={sealSentryCheckpoint,openSentryCheckpoint};
