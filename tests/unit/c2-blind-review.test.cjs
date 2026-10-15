'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {generateKeyPairSync,sign}=require('node:crypto');
const {createBlindReviewPacket,canonicalLabelManifest,
 verifyBlindLabelSignature,DOMAIN}=
 require('../../packages/quality-gates/c2-blind-review.cjs');
const prs=[132,159,161,73],repo='cardenaspiero255-lang/gamehub-ultra';
const cap=()=>({schema:'ultra-sentinel-c2-live-cohort/v1',repository:repo,
 samples:prs.map((pr,i)=>({
  pr,repository:repo,readerStatus:'AUTHENTICATED_SOURCE_DIFF',
  headSha:String.fromCharCode(97+i).repeat(40),
  baseSha:'e'.repeat(40),changedFiles:6,
  candidate:{findings:[{rule:'SPEECH_REENTRANT_RETRY',
   path:'secret/private-file.kt',line:5}]},
  checks:{observedState:'BLOCKED_SOURCE_CI'}
 }))});
const labels=digest=>({schema:'ultra-sentinel-c2-blind-labels/v1',
 packetDigest:digest,
 labels:[
  {pr:132,rule:'UNSCOPED_COROUTINE',path:'app/src/main/java/a.kt',line:10,positive:true},
  {pr:159,rule:'BLOCKING_ANDROID_CALL',path:'app/src/main/java/b.kt',line:20,positive:false},
  {pr:161,rule:'FORCED_GC',path:'app/src/main/java/c.kt',line:30,positive:true},
  {pr:73,rule:'POTENTIAL_PRIVATE_LOG',path:'app/src/main/java/d.kt',line:40,positive:false}
 ]});
function signAs(key,manifest,packet){
 return sign(null,Buffer.concat([
  DOMAIN,Buffer.from(canonicalLabelManifest(manifest,packet),'utf8')
 ]),key).toString('base64');
}
test('blind packet freezes four HEAD/base identities and hides model findings and CI statuses',()=>{
 const packet=createBlindReviewPacket(cap());
 assert.equal(packet.packet.cases.length,4);
 assert.deepEqual(packet.packet.cases.map(x=>x.pr),prs);
 assert.match(packet.digest,/^[0-9a-f]{64}$/);
 const body=JSON.stringify(packet);
 assert.doesNotMatch(body,/secret|candidate|BLOCKED_SOURCE_CI|SPEECH_REENTRANT_RETRY/);
 assert.equal(packet.independentReviewCertified,false);
 assert.equal(packet.modelFindingsIncluded,false);
});
test('authentic Ed25519 signature binds a canonical packet and exact labels, never attests independence',()=>{
 const a=generateKeyPairSync('ed25519'),b=generateKeyPairSync('ed25519');
 const packet=createBlindReviewPacket(cap());
 const manifest=labels(packet.digest),signature=signAs(a.privateKey,manifest,packet);
 const accepted=verifyBlindLabelSignature({manifest,packet,signature,
  trustedReviewerPublicKey:a.publicKey.export({type:'spki',format:'pem'})});
 assert.equal(accepted.signatureVerified,true);
 assert.equal(accepted.labelCount,4);
 assert.equal(accepted.reason,'CRYPTOGRAPHIC_BINDING_ONLY');
 assert.equal(accepted.independentTruthCertified,false);
 assert.equal(accepted.externalParityCertified,false);
 assert.equal(accepted.tripleSPlusCertified,false);
 assert.equal(accepted.mergeAllowed,false);
 assert.equal(verifyBlindLabelSignature({manifest,packet,signature,
  trustedReviewerPublicKey:b.publicKey.export({type:'spki',format:'pem'})})
  .signatureVerified,false);
 assert.equal(verifyBlindLabelSignature({manifest,packet,signature,
  trustedReviewerPublicKey:null}).signatureVerified,false);
});
test('tamper with HEAD, positive/negative label, path, signature or campaign digest fails',()=>{
 const kp=generateKeyPairSync('ed25519');
 const packet=createBlindReviewPacket(cap()),m=labels(packet.digest);
 const signature=signAs(kp.privateKey,m,packet);
 for(const changed of [
  {...m,labels:m.labels.map((x,i)=>i===0?{...x,positive:false}:x)},
  {...m,labels:m.labels.map((x,i)=>i===0?{...x,line:99}:x)},
  {...m,packetDigest:'f'.repeat(64)},
  {...m,reviewer:'self-declared independent'},
  {...m,labels:[...m.labels,m.labels[0]]},
  {...m,labels:[...m.labels,{pr:777,rule:'FORCED_GC',
   path:'app/src/main/java/a.kt',line:8,positive:true}]},
  {...m,labels:[...m.labels.slice(0,1),{...m.labels[1],path:'../private-key'}]}
 ]){
  const r=verifyBlindLabelSignature({manifest:changed,packet,signature,
   trustedReviewerPublicKey:kp.publicKey.export({type:'spki',format:'pem'})});
  assert.equal(r.signatureVerified,false);
  assert.equal(r.tripleSPlusCertified,false);
 }
 const altered=structuredClone(cap());
 altered.samples[0].headSha='0'.repeat(40);
 const changedPacket=createBlindReviewPacket(altered);
 assert.equal(verifyBlindLabelSignature({manifest:m,packet:changedPacket,
  signature,trustedReviewerPublicKey:kp.publicKey.export({type:'spki',format:'pem'})})
  .signatureVerified,false);
 assert.equal(verifyBlindLabelSignature({manifest:m,packet,signature:'X',
  trustedReviewerPublicKey:kp.publicKey.export({type:'spki',format:'pem'})})
  .signatureVerified,false);
});
test('unverified, incomplete, stale or replaced PRs cannot generate a blind cohort',()=>{
 for(const mutate of [
  c=>c.samples[0].status='BLOCKED_INCOMPLETE_OR_STALE',
  c=>delete c.samples[0].headSha,
  c=>c.samples[0].headSha='not-sha',
  c=>c.samples[0].repository='fork/clone',
  c=>c.samples[0].changedFiles=301,
  c=>c.samples[1].pr=158,
  c=>c.samples.pop()
 ]){
  const c=cap();mutate(c);
  // A stale/blocked sample must not silently be treated as a trustworthy diff.
  assert.throws(()=>createBlindReviewPacket(c));
 }
});
