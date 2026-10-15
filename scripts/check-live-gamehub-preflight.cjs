'use strict';
/* Trusted-host entrypoint. Consumes signed, externally audited evidence but
 * never writes to GitHub or grants a push/merge capability. Only operator env
 * supplies required checks, key trust anchors and private ledger location.
 */
const fs=require('node:fs'),path=require('node:path');
const {liveSignedGameHubPreflight}=require('../packages/recovery/gamehub-signed-preflight.cjs');
function operatorFile(filename,maxBytes=65536){
 if(typeof filename!=='string'||!path.isAbsolute(filename))throw Error('OPERATOR_CONFIG_REQUIRED');
 const stat=fs.lstatSync(filename);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||stat.size<1||
   stat.size>maxBytes||(stat.mode&0o022)!==0)
  throw Error('UNSAFE_OPERATOR_CONFIG_FILE');
 return fs.readFileSync(filename,'utf8');
}
async function main(){
 const token=process.env.ULTRA_SENTINEL_OWNER_GITHUB_TOKEN;
 const pr=Number(process.env.ULTRA_SENTINEL_GAMEHUB_PR);
 const requiredChecks=JSON.parse(process.env.ULTRA_SENTINEL_REQUIRED_CHECKS_JSON||'null');
 const request=JSON.parse(operatorFile(process.env.ULTRA_SENTINEL_GAMEHUB_SIGNED_REQUEST_FILE));
 const ownerPublicKey=operatorFile(process.env.ULTRA_SENTINEL_OWNER_PUBLIC_KEY_FILE);
 const auditPublicKey=operatorFile(process.env.ULTRA_SENTINEL_AUDIT_PUBLIC_KEY_FILE);
 const result=await liveSignedGameHubPreflight(pr,{
  token,requiredChecks,ownerApproval:request.ownerApproval,
  ownerSignature:request.ownerSignature,ownerPublicKey,
  auditReceipt:request.auditReceipt,auditSignature:request.auditSignature,
  auditPublicKey,
  nonceStorePath:process.env.ULTRA_SENTINEL_GAMEHUB_NONCE_LEDGER
 });
 if(result.status!=='ELIGIBLE_FOR_HUMAN_COMMIT')throw Error('PREFLIGHT_DENIED');
 process.stdout.write('GAMEHUB_AUTHORIZED_FOR_MANUAL_REVIEW_ONLY\n');
}
if(require.main===module)main().catch(()=>{
 process.stderr.write('GAMEHUB_SIGNED_PREFLIGHT_BLOCKED\n');
 process.exitCode=1;
});
module.exports={main,operatorFile};
