'use strict';
/*
 * Read-only adapter: GitHub and Android transports are provided by the host.
 * Android must obtain its high-water independently and sign that value, never
 * simply sign a checkpoint supplied by the GitHub adapter. A fresh signature
 * proves response to this challenge under the configured key; it does not
 * prove device identity, storage independence, or correct device behavior.
 */
const crypto=require('node:crypto');
const {types}=require('node:util');
const {verifyPinnedRevocationHighWater}=require('./memory-signed-checkpoint.cjs');
const REPOSITORY='cardenaspiero255-lang/Ultra-Sentinel';
const FIELDS=['schema','repository','anchorSha','headHash','eventCount','signingMessage','signature'];
const DOMAIN='Ultra-Sentinel:android-github-witness:v1\n';
function fail(code){throw Error(code);}
function record(value,fields,code){
 if(!value||typeof value!=='object'||types.isProxy(value)||
  Object.getPrototypeOf(value)!==Object.prototype)fail(code);
 const d=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(d);
 if(keys.length!==fields.length||fields.some(k=>!Object.hasOwn(d,k)||!Object.hasOwn(d[k],'value')))fail(code);
 return Object.fromEntries(fields.map(k=>[k,d[k].value]));
}
function witnessCopy(value,code){
 const w=record(value,FIELDS,code);
 for(const k of FIELDS){
  if(k==='eventCount'){
   if(!Number.isSafeInteger(w[k])||w[k]<0||w[k]>200)fail(code);
  }else if(typeof w[k]!=='string'||w[k].length>2048)fail(code);
 }
 return Object.freeze(w);
}
function evidenceArray(value,fields){
 const code='GITHUB_WITNESS_CONFIGURATION_INVALID';
 if(!Array.isArray(value)||types.isProxy(value)||Object.getPrototypeOf(value)!==Array.prototype||
  value.length>200||Reflect.ownKeys(value).length!==value.length+1)fail(code);
 const copy=[];
 for(let i=0;i<value.length;i++){
  const d=Object.getOwnPropertyDescriptor(value,String(i));
  if(!d||!Object.hasOwn(d,'value'))fail(code);
  const row=record(d.value,fields,code);
  if(fields.some(k=>k==='seq'?!Number.isSafeInteger(row[k]):typeof row[k]!=='string'))fail(code);
  copy.push(Object.freeze(row));
 }
 return Object.freeze(copy);
}
function androidWitnessMessage(challenge,witness){
 const c=record(challenge,['schema','repository','path','nonce'],'ANDROID_CHALLENGE_INVALID');
 if(c.schema!=='ultra-sentinel-android-witness-challenge/v1'||c.repository!==REPOSITORY||
  typeof c.path!=='string'||!safePath(c.path)||typeof c.nonce!=='string'||! /^[a-f0-9]{64}$/.test(c.nonce))
  fail('ANDROID_CHALLENGE_INVALID');
 const w=witnessCopy(witness,'ANDROID_RESPONSE_INVALID');
 return DOMAIN+JSON.stringify([c.schema,c.repository,c.path,c.nonce,...FIELDS.map(k=>w[k])]);
}
function safePath(p){return p.length>0&&p.length<=200&&/^[A-Za-z0-9._/-]+$/.test(p)&&
 !p.startsWith('/')&&!p.split('/').some(s=>!s||s==='.'||s==='..');}
async function deadline(fn,arg,code){
 let timer;
 try{return await Promise.race([Promise.resolve().then(()=>fn(arg)),new Promise((_,reject)=>{
  timer=setTimeout(()=>reject(Error(code)),10000);
 })]);}finally{clearTimeout(timer);}
}
// Reads only the official fixed GitHub repository; authentication, if needed,
// is supplied by the host's fetch implementation and is never stored here.
function createGithubContentsReader(fetchImpl=globalThis.fetch,{timeoutMs=10000}={}){
 if(typeof fetchImpl!=='function'||!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>10000)
  fail('GITHUB_WITNESS_CONFIGURATION_INVALID');
 return async ({repository,path}={})=>{
  if(repository!==REPOSITORY||typeof path!=='string'||!safePath(path))
   fail('GITHUB_WITNESS_CONFIGURATION_INVALID');
  const controller=new AbortController();let timer;
  try{
   const read=(async()=>{
    const url='https://api.github.com/repos/'+REPOSITORY+'/contents/'+
     path.split('/').map(encodeURIComponent).join('/');
    const res=await fetchImpl(url,{method:'GET',redirect:'error',signal:controller.signal,
     headers:{accept:'application/vnd.github.raw+json','x-github-api-version':'2022-11-28'}});
    if(!res||res.status!==200||!res.body||typeof res.body.getReader!=='function')
     fail('GITHUB_RESPONSE_INVALID');
    const reader=res.body.getReader(),chunks=[];let size=0;
    try{for(;;){const part=await reader.read();if(part.done)break;
     if(!(part.value instanceof Uint8Array))fail('GITHUB_RESPONSE_INVALID');
     size+=part.value.byteLength;if(size>20000)fail('GITHUB_RESPONSE_INVALID');
     chunks.push(Buffer.from(part.value));
    }}finally{
     // An injected transport can fail to settle cancellation. Do not let it
     // suppress an error or prevent the deadline from resolving.
     try{Promise.resolve(reader.cancel()).catch(()=>{});}catch{}
     try{reader.releaseLock();}catch{}
    }
    return new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks));
   })();
   const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{
    controller.abort();reject(Error('GITHUB_TIMEOUT'));
   },timeoutMs);});
   return await Promise.race([read,timeout]);
  }finally{clearTimeout(timer);}
 };
}
async function verifyGithubAndroidWitness(options){
 const {journal,checkpoint,entries,trustedPublicKey,devicePublicKey,path,fetchGithub,queryAndroid}=
  record(options,['journal','checkpoint','entries','trustedPublicKey','devicePublicKey','path','fetchGithub','queryAndroid'],
   'GITHUB_WITNESS_CONFIGURATION_INVALID');
 if(typeof path!=='string'||!safePath(path)||typeof fetchGithub!=='function'||typeof queryAndroid!=='function')
  fail('GITHUB_WITNESS_CONFIGURATION_INVALID');
 const local=record(journal,['schema','anchorSha','headHash','events'],'GITHUB_WITNESS_CONFIGURATION_INVALID');
 if(['schema','anchorSha','headHash'].some(k=>typeof local[k]!=='string'))fail('GITHUB_WITNESS_CONFIGURATION_INVALID');
 const stableJournal=Object.freeze({...local,events:evidenceArray(local.events,['seq','id','digest','reason','headSha','prevHash','hash'])});
 const stableEntries=evidenceArray(entries,['id','digest']);
 const stableCheckpoint=witnessCopy(checkpoint,'GITHUB_WITNESS_CONFIGURATION_INVALID');
 let key,ownerKey;
 try{key=devicePublicKey instanceof crypto.KeyObject?devicePublicKey:crypto.createPublicKey(devicePublicKey);
  if(key.type!=='public'||key.asymmetricKeyType!=='ed25519')throw Error();
 }catch{fail('ANDROID_KEY_INVALID');}
 try{ownerKey=trustedPublicKey instanceof crypto.KeyObject?trustedPublicKey:crypto.createPublicKey(trustedPublicKey);
  if(ownerKey.type!=='public'||ownerKey.asymmetricKeyType!=='ed25519')throw Error();
 }catch{fail('CHECKPOINT_SIGNATURE_INVALID');}
 const body=await deadline(fetchGithub,Object.freeze({repository:REPOSITORY,path}), 'GITHUB_TIMEOUT');
 if(typeof body!=='string'||Buffer.byteLength(body)>20000)fail('GITHUB_RESPONSE_INVALID');
 let github;
 try{github=witnessCopy(JSON.parse(body),'GITHUB_RESPONSE_INVALID');}catch{fail('GITHUB_RESPONSE_INVALID');}
 const challenge=Object.freeze({schema:'ultra-sentinel-android-witness-challenge/v1',
  repository:REPOSITORY,path,nonce:crypto.randomBytes(32).toString('hex')});
 const response=record(await deadline(queryAndroid,challenge,'ANDROID_TIMEOUT'),['witness','signature'],'ANDROID_RESPONSE_INVALID');
 const witness=witnessCopy(response.witness,'ANDROID_RESPONSE_INVALID');
 if(typeof response.signature!=='string'||! /^[A-Za-z0-9+/]{86}==$/.test(response.signature)||
  Buffer.from(response.signature,'base64').toString('base64')!==response.signature)
  fail('ANDROID_RESPONSE_INVALID');
 if(!crypto.verify(null,Buffer.from(androidWitnessMessage(challenge,witness)),key,Buffer.from(response.signature,'base64')))
  fail('ANDROID_SIGNATURE_INVALID');
 if(FIELDS.some(k=>github[k]!==witness[k]))fail('GITHUB_WITNESS_MISMATCH');
 const result=verifyPinnedRevocationHighWater({journal:stableJournal,checkpoint:stableCheckpoint,
  entries:stableEntries,trustedPublicKey:ownerKey,witness});
 return Object.freeze({...result,deviceChallengeSignatureValid:true,
  operationalFreshnessVerified:false,protectedOperationsAllowed:false,
  independentWitnessStorageVerified:false,remoteWrites:false,mergeAllowed:false,
  limitation:'The configured device key signed a fresh challenge and a checkpoint matching the GitHub response. Device identity, independent custody, correct device behavior, GitHub provenance and operational freshness are not established.'});
}
module.exports=Object.freeze({verifyGithubAndroidWitness,androidWitnessMessage,createGithubContentsReader});
