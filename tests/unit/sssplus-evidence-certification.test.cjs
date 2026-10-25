'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {verifyTripleSPlusEvidenceBundle}=require('../../packages/certification/sssplus-evidence-certification.cjs');

const rules=[
 'PRIVILEGED_UNTRUSTED_CHECKOUT','SPEECH_REENTRANT_RETRY',
 'POTENTIAL_HARDCODED_SECRET','UNSCOPED_COROUTINE',
 'POTENTIAL_PRIVATE_LOG','BLOCKING_ANDROID_CALL',
 'NON_CANCELLABLE_LOOP','FORCED_GC'
];
const paths=[
 'app/src/main/java/voice/Ultra.kt','app/src/main/java/network/Optimizer.kt',
 '.github/workflows/android.yml','app/src/main/java/security/Token.kt'
];
function canonical(value){
 if(value===null||typeof value==='boolean'||typeof value==='string')return JSON.stringify(value);
 if(typeof value==='number'&&Number.isFinite(value))return JSON.stringify(value);
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>
  JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
 throw Error('bad fixture');
}
function campaign(){
 return {schema:'ultra-sentinel-parity-campaign/v1',samples:[132,158,161,163].map(pr=>{
  const labels=Array.from({length:30},(_,i)=>({rule:rules[i%rules.length],
   path:paths[i%paths.length],line:i+1,positive:(Math.floor(i/rules.length)+pr)%2===0}));
  return {repository:'cardenaspiero255-lang/gamehub-ultra',pr,
   headSha:'a'.repeat(40),baseSha:'b'.repeat(40),sourceCheckState:'SUCCESS',labels,
   baseline:labels.filter((x,i)=>x.positive&&i!==0||i===1).map(({rule,path,line})=>({rule,path,line})),
   candidate:labels.filter(x=>x.positive).map(({rule,path,line})=>({rule,path,line}))};
 })};
}
function bundle(){
 const c=campaign();
 const campaignSha256=crypto.createHash('sha256').update(canonical(c)).digest('hex');
 const roles=[
  ['TRUTH_ATTESTOR','INDEPENDENT_FROZEN_LABELS'],
  ['CI_ATTESTOR','SHA_BOUND_SOURCE_CI_SUCCESS'],
  ['RELEASE_OWNER','READONLY_RELEASE_AUTHORIZATION']
 ];
 const attestations=roles.map(([role,assertion],i)=>{
  const key=crypto.generateKeyPairSync('ed25519');
  const unsigned={role,keyId:'key-'+i,publicKey:key.publicKey.export({type:'spki',format:'pem'}),
   issuedAt:'2026-10-25T18:00:00Z',repository:'cardenaspiero255-lang/gamehub-ultra',
   candidateEngineSha:'a'.repeat(40),campaignSha256,assertion};
  return {...unsigned,signature:crypto.sign(null,Buffer.from(canonical(unsigned)),key.privateKey).toString('base64')};
 });
 return {schema:'ultra-sentinel-sssplus-evidence-bundle/v1',
  repository:'cardenaspiero255-lang/gamehub-ultra',candidateEngineSha:'a'.repeat(40),
  campaign:c,campaignSha256,attestations};
}
function trust(bundle){
 return Object.fromEntries(bundle.attestations.map(x=>[x.role,x.publicKey]));
}

test('three independently signed SHA-bound attestations certify an eligible campaign but never permit writes',()=>{
 const input=bundle();
 const result=verifyTripleSPlusEvidenceBundle(input,{trustedAttestors:trust(input)});
 assert.equal(result.classification,'TRIPLE_S_PLUS_CERTIFIED');
 assert.equal(result.tripleSPlusCertified,true);
 assert.equal(result.mergeAllowed,false);
 assert.equal(result.autoRepair,false);
 assert.deepEqual(result.blocked,[]);
});

test('self-signed attestations are not trust anchors and cannot certify themselves',()=>{
 const result=verifyTripleSPlusEvidenceBundle(bundle());
 assert.equal(result.classification,'NOT_CERTIFIED');
 assert.ok(result.blocked.includes('untrustedAttestor'));
});

test('one key cannot impersonate the distinct truth, CI and release roles',()=>{
 const input=bundle();
 input.attestations[1].keyId=input.attestations[0].keyId;
 input.attestations[1].publicKey=input.attestations[0].publicKey;
 input.attestations[1].signature=input.attestations[0].signature;
 const result=verifyTripleSPlusEvidenceBundle(input);
 assert.equal(result.classification,'NOT_CERTIFIED');
 assert.ok(result.blocked.includes('invalidAttestationSignature')||result.blocked.includes('nonDistinctSigner'));
});

test('a signature over a different campaign or engine SHA cannot certify',()=>{
 const changedCampaign=bundle();
 changedCampaign.campaign.samples[0].candidate.pop();
 const campaignResult=verifyTripleSPlusEvidenceBundle(changedCampaign);
 assert.equal(campaignResult.classification,'NOT_CERTIFIED');
 assert.ok(campaignResult.blocked.includes('campaignDigestMismatch'));
 const changedEngine=bundle();
 changedEngine.candidateEngineSha='b'.repeat(40);
 const engineResult=verifyTripleSPlusEvidenceBundle(changedEngine);
 assert.equal(engineResult.classification,'NOT_CERTIFIED');
 assert.ok(engineResult.blocked.includes('engineShaMismatch'));
});

test('numerical success without three authentic attestations remains not certified',()=>{
 const input=bundle();input.attestations=[];
 const result=verifyTripleSPlusEvidenceBundle(input);
 assert.equal(result.classification,'NOT_CERTIFIED');
 assert.equal(result.tripleSPlusCertified,false);
 assert.ok(result.blocked.includes('attestationRoles'));
});
