'use strict';
/**
 * Private Sentry monitor checkpoint envelope for FUTURE Actions integration.
 * No secrets, issue IDs or stack traces belong in a public Actions artifact
 * unless encrypted with an externally managed key. Fail closed by default.
 */
const {randomBytes,createCipheriv,createDecipheriv}=require('node:crypto');
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
function validatePlaintext(raw){
 if(typeof raw!=='string'||Buffer.byteLength(raw,'utf8')<2||
    Buffer.byteLength(raw,'utf8')>65536)fail();
 let parsed;try{parsed=JSON.parse(raw);}catch{fail();}
 if(!parsed||parsed.schema!=='ultra-sentinel-watchdog-checkpoint/v1'||
    typeof parsed.checkpoint!=='object'||parsed.checkpoint===null||
    !Array.isArray(parsed.pendingAlerts))fail();
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
