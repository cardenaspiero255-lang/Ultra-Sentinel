'use strict';
// Production entrypoint for owner-authorized *isolated* sandbox repair only.
// Must run inside an OS-enforced disposable sandbox with network disabled for
// verifier processes. No GitHub write scopes, remote pushes, or auto-merge.
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {runOwnerAuthorizedSandboxRepair}=require('../packages/recovery/owner-sandbox-flow.cjs');
const OWNER='cardenaspiero255-lang';
const OWNER_ID=322222186;
function readTrustedFile(filename){
 if(!filename||!path.isAbsolute(filename))throw Error('ABSOLUTE_CONFIG_PATH_REQUIRED');
 const stat=fs.lstatSync(filename);
 if(!stat.isFile()||stat.isSymbolicLink())throw Error('UNSAFE_CONFIG_FILE');
 return fs.readFileSync(filename,'utf8');
}
function verifierFromTrustedEnvironment(directory){
 const raw=process.env.ULTRA_SENTINEL_VALIDATOR_ARGV_JSON;
 if(!raw)throw Error('VALIDATOR_CONFIGURATION_REQUIRED');
 const argv=JSON.parse(raw);
 if(!Array.isArray(argv)||argv.length===0||argv.length>20||
  argv.some(x=>typeof x!=='string'||!x||x.length>500||/[\x00-\x1f]/.test(x))||
  !['npm','node','./gradlew'].includes(argv[0]))
  throw Error('INVALID_TRUSTED_VALIDATOR');
 return async ()=>{
  // Command and arguments originate from operator-controlled environment,
  // never from a pull request, authorization payload, or model suggestion.
  const result=spawnSync(argv[0],argv.slice(1),{
   cwd:directory,shell:false,encoding:'utf8',timeout:120000,maxBuffer:1024*1024,
   env:{PATH:process.env.PATH,HOME:directory,GIT_CONFIG_NOSYSTEM:'1',
    GIT_CONFIG_GLOBAL:'/dev/null',GIT_TERMINAL_PROMPT:'0',
    CI:'true',ULTRA_SENTINEL_OFFLINE_VALIDATOR:'true'}
  });
  return !result.error&&result.status===0;
 };
}
async function main(){
 const token=process.env.ULTRA_SENTINEL_OWNER_GITHUB_TOKEN;
 if(!token)throw Error('OWNER_TOKEN_NOT_CONFIGURED');
 const request=JSON.parse(readTrustedFile(process.env.ULTRA_SENTINEL_REPAIR_REQUEST_FILE));
 const trustedPublicKey=readTrustedFile(process.env.ULTRA_SENTINEL_OWNER_PUBLIC_KEY_FILE);
 const verifyRepair=verifierFromTrustedEnvironment(request.directory);
 const result=await runOwnerAuthorizedSandboxRepair({
  token,expectedOwner:OWNER,expectedOwnerId:OWNER_ID,
  authorization:request.authorization,
  authorizationSignature:request.authorizationSignature,
  trustedPublicKey,nonceStorePath:request.nonceStorePath,
  directory:request.directory,plan:request.plan,changes:request.changes,
  expectedHeadSha:request.expectedHeadSha,verifyRepair
 });
 if(result.status!=='SANDBOX_REPAIR_VERIFIED')throw Error('REPAIR_NOT_VERIFIED');
 process.stdout.write('OWNER_AUTHORIZED_SANDBOX_REPAIR_VERIFIED\n');
}
if(require.main===module){
 main().catch(()=>{
  // Never print secrets, request data, or validator output.
  process.stderr.write('OWNER_SANDBOX_REPAIR_BLOCKED\n');
  process.exitCode=1;
 });
}
module.exports={main,verifierFromTrustedEnvironment};
