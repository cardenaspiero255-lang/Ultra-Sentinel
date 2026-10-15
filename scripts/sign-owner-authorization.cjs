'use strict';
// Offline owner signing. Run on the owner's trusted device; never in pull_request CI.
// The private key is read from an owner-controlled absolute path and never logged.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {stableAuthorization}=require('../packages/recovery/owner-authorization.cjs');
function signAuthorization(authorization,keyPath){
 if(!path.isAbsolute(keyPath))throw Error('ABSOLUTE_PRIVATE_KEY_PATH_REQUIRED');
 const fd=fs.openSync(keyPath,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
 let bytes;
 try{
  const stat=fs.fstatSync(fd);
  if(!stat.isFile()||stat.nlink!==1||(stat.mode&0o077)!==0)
   throw Error('UNSAFE_PRIVATE_KEY_PERMISSIONS');
  bytes=fs.readFileSync(fd);
 }finally{fs.closeSync(fd);}
 try{
  const key=crypto.createPrivateKey(bytes);
  if(key.asymmetricKeyType!=='ed25519')throw Error('OWNER_KEY_MUST_BE_ED25519');
  const canonical=stableAuthorization(authorization);
  return crypto.sign(null,Buffer.from('Ultra-Sentinel:owner-authorization:v1\n'+canonical),key).toString('base64');
 }finally{bytes.fill(0);}
}
function main(){
 const keyPath=process.env.ULTRA_SENTINEL_OWNER_SIGNING_KEY_FILE;
 const authorizationFile=process.argv[2];
 if(!keyPath||!authorizationFile||!path.isAbsolute(authorizationFile))
  throw Error('SIGNING_CONFIGURATION_REQUIRED');
 const authorization=JSON.parse(fs.readFileSync(authorizationFile,'utf8'));
 process.stdout.write(signAuthorization(authorization,keyPath)+'\n');
}
if(require.main===module){
 try{main();}catch{
  process.stderr.write('OWNER_SIGNING_FAILED\n');
  process.exitCode=1;
 }
}
module.exports={signAuthorization};
