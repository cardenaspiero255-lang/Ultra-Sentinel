'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createLocalRevocationJournal,appendLocalRevocation}=require('../../packages/memory/memory-local-revocation-journal.cjs');
const {createSignedRevocationCheckpoint}=require('../../packages/memory/memory-signed-checkpoint.cjs');
const {verifyGithubAndroidWitness,androidWitnessMessage}=require('../../packages/memory/github-witness-provider.cjs');
const entries=[{id:'repair_alpha',digest:'c'.repeat(64)}];
function fixture(){
 const owner=crypto.generateKeyPairSync('ed25519'),device=crypto.generateKeyPairSync('ed25519');
 const initial=createLocalRevocationJournal('a'.repeat(40));
 const journal=appendLocalRevocation({journal:initial,entries,id:'repair_alpha',reason:'REGRESSION_REPRODUCED',headSha:'b'.repeat(40)});
 function sign(j){const c=createSignedRevocationCheckpoint({journal:j});return {...c,signature:crypto.sign(null,Buffer.from(c.signingMessage),owner.privateKey).toString('base64')};}
 const checkpoint=sign(journal),old=sign(initial);
 const opts={journal,checkpoint,entries,trustedPublicKey:owner.publicKey,devicePublicKey:device.publicKey,path:'witness/checkpoint.json',
  fetchGithub:async()=>JSON.stringify(checkpoint),
  queryAndroid:async challenge=>{const witness=checkpoint;return {witness,signature:crypto.sign(null,Buffer.from(androidWitnessMessage(challenge,witness)),device.privateKey).toString('base64')};}};
 return {opts,old,checkpoint,device};
}
test('accepts independently signed fresh Android response matching GitHub and valid history',async()=>{
 const {opts}=fixture();const result=await verifyGithubAndroidWitness(opts);
 assert.equal(result.status,'CURRENT_REVOCATIONS_EXTEND_PINNED_WITNESS');
 assert.equal(result.deviceChallengeSignatureValid,true);assert.equal(result.independentWitnessStorageVerified,false);
 assert.equal(result.remoteWrites,false);assert.equal(result.mergeAllowed,false);
});
test('rejects replay of a previously signed challenge',async()=>{
 const {opts}=fixture();let saved;const original=opts.queryAndroid;
 opts.queryAndroid=async c=>saved||(saved=await original(c));
 await verifyGithubAndroidWitness(opts);
 await assert.rejects(verifyGithubAndroidWitness(opts),/ANDROID_SIGNATURE_INVALID/);
});
test('rejects stale GitHub data when device returns newer checkpoint',async()=>{
 const {opts,old}=fixture();opts.fetchGithub=async()=>JSON.stringify(old);
 await assert.rejects(verifyGithubAndroidWitness(opts),/GITHUB_WITNESS_MISMATCH/);
});
test('rejects absent device, invalid signatures, malformed and oversized responses',async()=>{
 const {opts}=fixture();opts.queryAndroid=async()=>null;
 await assert.rejects(verifyGithubAndroidWitness(opts),/ANDROID_RESPONSE_INVALID/);
 opts.queryAndroid=async()=>({witness:{},signature:'invalid'});
 await assert.rejects(verifyGithubAndroidWitness(opts),/ANDROID_RESPONSE_INVALID/);
 const f=fixture();f.opts.fetchGithub=async()=> 'x'.repeat(20001);
 await assert.rejects(verifyGithubAndroidWitness(f.opts),/GITHUB_RESPONSE_INVALID/);
});
test('valid fresh device signature cannot make a signed rollback valid',async()=>{
 const {opts,old,device}=fixture();opts.journal=createLocalRevocationJournal('a'.repeat(40));opts.checkpoint=old;
 const latest=JSON.parse(await opts.fetchGithub());
 opts.queryAndroid=async c=>({witness:latest,signature:crypto.sign(null,Buffer.from(androidWitnessMessage(c,latest)),device.privateKey).toString('base64')});
 await assert.rejects(verifyGithubAndroidWitness(opts),/CHECKPOINT_ROLLBACK_DETECTED/);
});
test('GitHub reader uses only the fixed official endpoint and bounds the response',async()=>{
 const {createGithubContentsReader}=require('../../packages/memory/github-witness-provider.cjs');
 let seen;const reader=createGithubContentsReader(async (url,options)=>{
  seen={url,options};return new Response('hello',{status:200});
 });
 assert.equal(await reader({repository:'cardenaspiero255-lang/Ultra-Sentinel',path:'witness/checkpoint.json'}),'hello');
 assert.equal(seen.url,'https://api.github.com/repos/cardenaspiero255-lang/Ultra-Sentinel/contents/witness/checkpoint.json');
 assert.equal(seen.options.method,'GET');assert.equal(seen.options.redirect,'error');
 await assert.rejects(reader({repository:'evil/repo',path:'x'}),/CONFIGURATION_INVALID/);
 const huge=createGithubContentsReader(async()=>new Response('x'.repeat(20001)));
 await assert.rejects(huge({repository:'cardenaspiero255-lang/Ultra-Sentinel',path:'x'}),/GITHUB_RESPONSE_INVALID/);
});
test('colluding GitHub and Android can agree on old state without proving custody or freshness',async()=>{
 const {opts,old,device}=fixture();
 opts.journal=createLocalRevocationJournal('a'.repeat(40));opts.checkpoint=old;
 opts.fetchGithub=async()=>JSON.stringify(old);
 opts.queryAndroid=async c=>({witness:old,signature:crypto.sign(null,Buffer.from(androidWitnessMessage(c,old)),device.privateKey).toString('base64')});
 const result=await verifyGithubAndroidWitness(opts);
 assert.equal(result.independentWitnessStorageVerified,false);
 assert.equal(result.operationalFreshnessVerified,false);
 for(const field of ['ownerAuthorizationGranted','promotionAuthorized','productionReleaseAllowed','mergeAllowed'])
  assert.equal(result[field],false);
});
test('GitHub reader times out even when transport or stream cancellation never settles',async()=>{
 const {createGithubContentsReader}=require('../../packages/memory/github-witness-provider.cjs');
 const never=()=>new Promise(()=>{});
 const request=createGithubContentsReader(never,{timeoutMs:20});
 await assert.rejects(request({repository:'cardenaspiero255-lang/Ultra-Sentinel',path:'x'}),/GITHUB_TIMEOUT/);
 const stream=createGithubContentsReader(async()=>({status:200,body:{getReader:()=>({
  read:async()=>({done:false,value:new Uint8Array(20001)}),cancel:never,releaseLock(){} })}}),{timeoutMs:20});
 await assert.rejects(stream({repository:'cardenaspiero255-lang/Ultra-Sentinel',path:'x'}),/GITHUB_RESPONSE_INVALID/);
});
test('rejects accessor options without evaluating them',async()=>{
 const {opts}=fixture();let called=false;
 Object.defineProperty(opts,'path',{enumerable:true,get(){called=true;return 'witness/checkpoint.json';}});
 await assert.rejects(verifyGithubAndroidWitness(opts),/GITHUB_WITNESS_CONFIGURATION_INVALID/);
 assert.equal(called,false);
});
test('uses one stable snapshot of local evidence across asynchronous reads',async()=>{
 const {opts}=fixture();
 opts.journal=structuredClone(opts.journal);opts.entries=structuredClone(opts.entries);
 const originalFetch=opts.fetchGithub;
 opts.fetchGithub=async()=>{opts.journal.events.length=0;opts.entries.length=0;return originalFetch();};
 const result=await verifyGithubAndroidWitness(opts);
 assert.equal(result.eventCount,1);
});
