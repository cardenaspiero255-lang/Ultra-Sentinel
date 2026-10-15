'use strict';
/**
 * C2 blind-review handoff. The reviewer packet deliberately omits Ultra
 * Sentinel findings, legacy baseline and CI verdicts to avoid label leakage.
 * A verified signature authenticates a snapshot ONLY; it cannot prove
 * reviewer independence, ground truth, or release readiness.
 */
const crypto=require('node:crypto');
const {PRS}=require('./live-gamehub-c2-cohort.cjs');
const {isValidFrozenBlindPacket}=require('./c2-blind-packet-integrity.cjs');
const REPO='cardenaspiero255-lang/gamehub-ultra';
const DOMAIN=Buffer.from('Ultra-Sentinel:C2:blind-labels:v1\n','utf8');
const SHA=/^[0-9a-f]{40}$/;
const HASH=/^[0-9a-f]{64}$/;
const RULE=/^[A-Z][A-Z0-9_]{2,80}$/;
const PATH=/^[A-Za-z0-9_.\/-]{1,240}$/;
function fail(code){throw Error(code);}
function exact(o,keys){
 return o&&typeof o==='object'&&!Array.isArray(o)&&
  Object.keys(o).length===keys.length&&
  keys.every(k=>Object.hasOwn(o,k));
}
function sha256(bytes){return crypto.createHash('sha256').update(bytes).digest('hex');}
function createBlindReviewPacket(capture){
 if(!capture||capture.schema!=='ultra-sentinel-c2-live-cohort/v1'||
  capture.repository!==REPO||!Array.isArray(capture.samples)||
  capture.samples.length!==PRS.length)
  fail('INVALID_C2_CAPTURE');
 const cases=[];
 for(let i=0;i<PRS.length;i++){
  const s=capture.samples[i];
  if(!s||s.status!==undefined||s.pr!==PRS[i]||s.repository!==REPO||
   !SHA.test(s.headSha||'')||!SHA.test(s.baseSha||'')||
   !Number.isSafeInteger(s.changedFiles)||s.changedFiles<1||
   s.changedFiles>300||typeof s.readerStatus!=='string'||
   s.readerStatus!=='AUTHENTICATED_SOURCE_DIFF')
   fail('UNFROZEN_C2_SOURCE');
  cases.push(Object.freeze({
   pr:s.pr,headSha:s.headSha,baseSha:s.baseSha,
   changedFiles:s.changedFiles
  }));
 }
 const packet=Object.freeze({
  schema:'ultra-sentinel-c2-blind-review-packet/v1',
  repository:REPO,cases:Object.freeze(cases)
 });
 const digest=sha256(Buffer.from(JSON.stringify(packet),'utf8'));
 return Object.freeze({packet,digest,
  modelFindingsIncluded:false,baselineFindingsIncluded:false,
  truthLabelsIncluded:false,independentReviewCertified:false});
}
function canonicalLabelManifest(manifest,packet){
 if(!isValidFrozenBlindPacket(packet))fail('INVALID_BLIND_PACKET');
 if(!manifest||!packet||
  !exact(manifest,['schema','packetDigest','labels'])||
  manifest.schema!=='ultra-sentinel-c2-blind-labels/v1'||
  !HASH.test(manifest.packetDigest||'')||
  manifest.packetDigest!==packet.digest||
  !Array.isArray(manifest.labels)||manifest.labels.length<2||
  manifest.labels.length>2000)
  fail('INVALID_LABEL_MANIFEST');
 const allowed=new Set(packet.packet.cases.map(x=>x.pr));
 const labels=[],ids=new Set();
 for(const l of manifest.labels){
  if(!exact(l,['pr','rule','path','line','positive'])||
   !allowed.has(l.pr)||!RULE.test(l.rule||'')||
   !PATH.test(l.path||'')||l.path.startsWith('/')||
   l.path.split('/').includes('..')||
   !Number.isSafeInteger(l.line)||l.line<1||l.line>1000000||
   typeof l.positive!=='boolean')fail('INVALID_BLIND_LABEL');
  const id=JSON.stringify([l.pr,l.rule,l.path,l.line]);
  if(ids.has(id))fail('DUPLICATE_BLIND_LABEL');
  ids.add(id);
  labels.push({pr:l.pr,rule:l.rule,path:l.path,
   line:l.line,positive:l.positive});
 }
 labels.sort((a,b)=>a.pr-b.pr||a.rule.localeCompare(b.rule)||
  a.path.localeCompare(b.path)||a.line-b.line);
 return JSON.stringify({schema:manifest.schema,
  packetDigest:manifest.packetDigest,labels});
}
function verifyBlindLabelSignature({manifest,packet,signature,
 trustedReviewerPublicKey}={}){
 let canonical;
 try{canonical=canonicalLabelManifest(manifest,packet);}
 catch{return Object.freeze({signatureVerified:false,
  reason:'INVALID_LABELS_OR_SNAPSHOT',independentTruthCertified:false,
  tripleSPlusCertified:false,mergeAllowed:false});}
 let valid=false;
 try{
  if(typeof signature!=='string'||
   !/^[A-Za-z0-9+/]{86}==$/.test(signature)||
   !trustedReviewerPublicKey)throw Error('NO_TRUST_ANCHOR');
  const key=crypto.createPublicKey(trustedReviewerPublicKey);
  if(key.asymmetricKeyType!=='ed25519'||key.type!=='public')
   throw Error('WRONG_KEY_TYPE');
  valid=crypto.verify(null,Buffer.concat([
   DOMAIN,Buffer.from(canonical,'utf8')]),key,Buffer.from(signature,'base64'));
 }catch{}
 return Object.freeze({
  signatureVerified:valid,
  manifestSha256:valid?sha256(Buffer.from(canonical,'utf8')):null,
  labelCount:valid?manifest.labels.length:0,
  packetDigest:packet.digest,
  independentTruthCertified:false,sourceCiIndependentlyVerified:false,
  externalParityCertified:false,tripleSPlusCertified:false,
  mergeAllowed:false,
  reason:valid?'CRYPTOGRAPHIC_BINDING_ONLY':'INVALID_OR_UNTRUSTED_SIGNATURE'
 });
}
module.exports={createBlindReviewPacket,canonicalLabelManifest,
 verifyBlindLabelSignature,DOMAIN};
