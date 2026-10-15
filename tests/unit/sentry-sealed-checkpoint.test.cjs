'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {randomBytes}=require('node:crypto');
const {sealSentryCheckpoint,openSentryCheckpoint}=
 require('../../packages/operations/sentry-sealed-checkpoint.cjs');
const key=randomBytes(32).toString('base64url');
const otherKey=randomBytes(32).toString('base64url');
function state(){
 return JSON.stringify({schema:'ultra-sentinel-watchdog-checkpoint/v1',
  checkpoint:{version:1,issues:['a'.repeat(24)],
   prs:[{pr:12,headSha:'b'.repeat(40)}],
   gamehub:{pr:132,headSha:'c'.repeat(40)}},
  pendingAlerts:[{type:'NEW_SENTRY_ISSUE',fingerprint:'a'.repeat(24)}],
  batchSequence:1,deliveryAcknowledged:false});
}
test('AES-256-GCM checkpoint hides Sentry issue identifiers and roundtrips on authorized key only',()=>{
 const content=state();
 const envelope=sealSentryCheckpoint(content,key);
 assert.equal(envelope.schema,'ultra-sentinel-sentry-sealed-state/v1');
 assert.equal(envelope.algorithm,'AES-256-GCM');
 assert.equal(envelope.nonce.length,16);
 assert.equal(envelope.tag.length,22);
 assert.notEqual(envelope.ciphertext,content);
 assert.doesNotMatch(JSON.stringify(envelope),/JARVIS|NEW_SENTRY_ISSUE|checkpoint|b{40}/i);
 assert.equal(openSentryCheckpoint(envelope,key),content);
 assert.throws(()=>openSentryCheckpoint(envelope,otherKey),
  /INVALID_OR_UNAUTHORIZED_PRIVATE_CHECKPOINT/);
});
test('fresh random nonces prevent reusing a deterministic ciphertext for identical private data',()=>{
 const a=sealSentryCheckpoint(state(),key),b=sealSentryCheckpoint(state(),key);
 assert.notEqual(a.nonce,b.nonce);
 assert.notEqual(a.ciphertext,b.ciphertext);
 assert.equal(openSentryCheckpoint(a,key),openSentryCheckpoint(b,key));
});
test('tampered AES envelope and extra fields are rejected rather than silently accepted',()=>{
 const original=sealSentryCheckpoint(state(),key);
 const edited=[
  {...original,tag:original.tag.replace(/^./,original.tag[0]==='A'?'B':'A')},
  {...original,ciphertext:original.ciphertext.replace(/^./,original.ciphertext[0]==='A'?'B':'A')},
  {...original,nonce:original.nonce.slice(2)},
  {...original,algorithm:'AES-128-CTR'},
  {...original,stacktrace:'SECRET'},
  {...original,nonce:'../../etc/passwd'},
  {...original,tag:'invalid'},
  null
 ];
 for(const artifact of edited)
  assert.throws(()=>openSentryCheckpoint(artifact,key),
   /INVALID_OR_UNAUTHORIZED_PRIVATE_CHECKPOINT/);
});
test('no configuration or a weak encryption key can open or seal anything',()=>{
 for(const secret of [null,'',randomBytes(20).toString('base64url'),'A'.repeat(43),
  'sk-project-unsafe-key',randomBytes(32).toString('base64')]){
  assert.throws(()=>sealSentryCheckpoint(state(),secret),
   /INVALID_OR_UNAUTHORIZED_PRIVATE_CHECKPOINT/);
  assert.throws(()=>openSentryCheckpoint(sealSentryCheckpoint(state(),key),secret),
   /INVALID_OR_UNAUTHORIZED_PRIVATE_CHECKPOINT/);
 }
});
test('minimization refuses raw exception, email, source code or private titles despite valid AES key',()=>{
 const original=JSON.parse(state());
 const injections=[
  x=>{x.checkpoint.privateEmail='person@example.com';},
  x=>{x.checkpoint.prs[0].source='private code';},
  x=>{x.checkpoint.issues=['person@example.com'];},
  x=>{x.pendingAlerts[0].stacktrace='SECRET';},
  x=>{x.pendingAlerts.push({type:'SENTRY_RAW_EVENT',message:'secret'});},
  x=>{x.deliveryAcknowledged=true;},
  x=>{x.batchSequence=-1;},
  x=>{x.credentials='token';}
 ];
 for(const change of injections){
  const proposed=structuredClone(original);change(proposed);
  assert.throws(()=>sealSentryCheckpoint(JSON.stringify(proposed),key),
   /INVALID_OR_UNAUTHORIZED_PRIVATE_CHECKPOINT/);
 }
});
