'use strict';
/*
 * Offline, read-only certification gate. It deliberately does not fetch
 * artifacts, execute candidate code, or grant merge/repair authority.
 */
const crypto=require('node:crypto');
const {isStrictRfc3339}=require('../contracts/strict-rfc3339.cjs');
const {assessSssPlusPreScreen}=require('../quality-gates/sssplus-pre-screen.cjs');

const REPOSITORY='cardenaspiero255-lang/gamehub-ultra';
const SHA=/^[0-9a-f]{40}$/;
const DIGEST=/^[0-9a-f]{64}$/;
const ROLES=Object.freeze({
 TRUTH_ATTESTOR:'INDEPENDENT_FROZEN_LABELS',
 CI_ATTESTOR:'SHA_BOUND_SOURCE_CI_SUCCESS',
 RELEASE_OWNER:'READONLY_RELEASE_AUTHORIZATION'
});
const BUNDLE_KEYS=Object.freeze(['schema','repository','candidateEngineSha','campaign','campaignSha256','attestations']);
const ATTESTATION_KEYS=Object.freeze(['role','keyId','publicKey','issuedAt','repository','candidateEngineSha','campaignSha256','assertion','signature']);
const UNSIGNED_KEYS=Object.freeze(ATTESTATION_KEYS.filter(k=>k!=='signature'));

function plainRecord(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype)return false;
 try{return Object.values(Object.getOwnPropertyDescriptors(value)).every(d=>Object.hasOwn(d,'value')&&d.enumerable===true);}catch{return false;}
}
function exact(value,keys){
 try{return plainRecord(value)&&Object.keys(value).length===keys.length&&keys.every(k=>Object.hasOwn(value,k));}catch{return false;}
}
function canonical(value,depth=0){
 if(depth>20)throw Error('MAX_DEPTH');
 if(value===null||typeof value==='boolean'||typeof value==='string')return JSON.stringify(value);
 if(typeof value==='number'&&Number.isFinite(value))return JSON.stringify(value);
 if(Array.isArray(value)){
  if(value.length>2000)throw Error('MAX_ARRAY');
  return '['+value.map(x=>canonical(x,depth+1)).join(',')+']';
 }
 if(plainRecord(value)){
  const keys=Object.keys(value).sort();
  if(keys.length>100)throw Error('MAX_KEYS');
  return '{'+keys.map(k=>JSON.stringify(k)+':'+canonical(value[k],depth+1)).join(',')+'}';
 }
 throw Error('UNSUPPORTED_VALUE');
}
function digest(value){
 const bytes=Buffer.from(canonical(value));
 if(bytes.length>512000)throw Error('OVERSIZED_VALUE');
 return crypto.createHash('sha256').update(bytes).digest('hex');
}
function blocked(reasons,preScreen=null){
 return Object.freeze({
  schema:'ultra-sentinel-sssplus-certification/v1',classification:'NOT_CERTIFIED',
  tripleSPlusCertified:false,mergeAllowed:false,autoRepair:false,
  blocked:Object.freeze([...new Set(reasons)]),preScreen
 });
}
function verifyAttestation(raw,expected){
 if(!exact(raw,ATTESTATION_KEYS)||!Object.hasOwn(ROLES,raw.role)||
  raw.assertion!==ROLES[raw.role]||typeof raw.keyId!=='string'||!/^key-[A-Za-z0-9._-]{1,80}$/.test(raw.keyId)||
  typeof raw.publicKey!=='string'||raw.publicKey.length<64||raw.publicKey.length>1000||
  !isStrictRfc3339(raw.issuedAt)||raw.repository!==REPOSITORY||
  raw.candidateEngineSha!==expected.candidateEngineSha||raw.campaignSha256!==expected.campaignSha256||
  typeof raw.signature!=='string'||!/^[A-Za-z0-9+/]+={0,2}$/.test(raw.signature))return null;
 const signature=Buffer.from(raw.signature,'base64');
 if(signature.length!==64)return null;
 const unsigned=Object.fromEntries(UNSIGNED_KEYS.map(k=>[k,raw[k]]));
 try{
  const key=crypto.createPublicKey(raw.publicKey);
  if(key.asymmetricKeyType!=='ed25519'||!crypto.verify(null,Buffer.from(canonical(unsigned)),key,signature))return null;
 }catch{return null;}
 return Object.freeze({role:raw.role,keyId:raw.keyId,publicKeySha256:digest(raw.publicKey)});
}
function trustedKeys(options){
 if(!exact(options,['trustedAttestors'])||!exact(options.trustedAttestors,Object.keys(ROLES)))return null;
 const out={};
 for(const role of Object.keys(ROLES)){
  const pem=options.trustedAttestors[role];
  if(typeof pem!=='string'||pem.length<64||pem.length>1000)return null;
  try{if(crypto.createPublicKey(pem).asymmetricKeyType!=='ed25519')return null;}catch{return null;}
  out[role]=digest(pem);
 }
 return out;
}
function verifyTripleSPlusEvidenceBundle(bundle,options={}){
 try{
  if(!exact(bundle,BUNDLE_KEYS)||bundle.schema!=='ultra-sentinel-sssplus-evidence-bundle/v1'||
   bundle.repository!==REPOSITORY||!SHA.test(bundle.candidateEngineSha)||!DIGEST.test(bundle.campaignSha256)||
   !Array.isArray(bundle.attestations)||bundle.attestations.length>3)
   return blocked(['invalidBundle']);
  if(digest(bundle.campaign)!==bundle.campaignSha256)return blocked(['campaignDigestMismatch']);
  const roles=new Set(),keys=new Set(),attestors=[];
  for(const attestation of bundle.attestations){
   if(!plainRecord(attestation)||attestation.candidateEngineSha!==bundle.candidateEngineSha)
    return blocked(['engineShaMismatch']);
   const verified=verifyAttestation(attestation,bundle);
   if(!verified)return blocked(['invalidAttestationSignature']);
   if(roles.has(verified.role))return blocked(['attestationRoles']);
   if(keys.has(verified.keyId)||attestors.some(x=>x.publicKeySha256===verified.publicKeySha256))return blocked(['nonDistinctSigner']);
   roles.add(verified.role);keys.add(verified.keyId);attestors.push(verified);
  }
  if(Object.keys(ROLES).some(role=>!roles.has(role)))return blocked(['attestationRoles']);
  const trusted=trustedKeys(options);
  if(!trusted||attestors.some(x=>trusted[x.role]!==x.publicKeySha256))return blocked(['untrustedAttestor']);
  let preScreen;
  try{preScreen=assessSssPlusPreScreen(bundle.campaign);}catch{return blocked(['invalidCampaign']);}
  if(!preScreen.internalNumericalTargetsObserved)return blocked(['numericalThresholds'],preScreen);
  return Object.freeze({
   schema:'ultra-sentinel-sssplus-certification/v1',classification:'TRIPLE_S_PLUS_CERTIFIED',
   tripleSPlusCertified:true,mergeAllowed:false,autoRepair:false,blocked:Object.freeze([]),
   campaignSha256:bundle.campaignSha256,candidateEngineSha:bundle.candidateEngineSha,
   attestors:Object.freeze(attestors),preScreen
  });
 }catch{return blocked(['invalidBundle']);}
}
module.exports={verifyTripleSPlusEvidenceBundle,canonical};
