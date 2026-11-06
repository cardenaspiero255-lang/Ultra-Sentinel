'use strict';
/* Offline signing for a freshly approved, exact GitHub draft-branch rollback.
 * Run only on the owner's trusted machine, never from GitHub Actions.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {digestRollbackPlan,stableOwnerRollbackGrant}=
 require('../packages/recovery/supervised-github-branch-rollback.cjs');
const DOMAIN='Ultra-Sentinel:github-pr-branch-rollback:v1\n';
function readPrivateKey(filename){
 if(typeof filename!=='string'||!path.isAbsolute(filename))throw Error('OWNER_KEY_PATH_REQUIRED');
 const fd=fs.openSync(filename,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
 try{
  const s=fs.fstatSync(fd);
  if(!s.isFile()||s.nlink!==1||(s.mode&0o077)!==0||s.size<1||s.size>8192)
   throw Error('OWNER_KEY_UNSAFE');
  return fs.readFileSync(fd);
 }finally{fs.closeSync(fd);}
}
function signRollbackRequest({plan,ownerGrant}={},privateKeyFile){
 if(process.env.GITHUB_ACTIONS==='true')throw Error('OWNER_SIGNING_NOT_ALLOWED_IN_CI');
 const digest=digestRollbackPlan(plan);
 const canonical=stableOwnerRollbackGrant(ownerGrant);
 const now=Date.now();
 if(ownerGrant.planDigest!==digest||
  ownerGrant.repo!==plan.repository||ownerGrant.prNumber!==plan.prNumber||
  ownerGrant.branch!==plan.branch||ownerGrant.headSha!==plan.repairHeadSha||
  ownerGrant.baseSha!==plan.expectedMainSha||
  ownerGrant.expiresAt<=now||ownerGrant.expiresAt-now>900000)
  throw Error('OWNER_ROLLBACK_PLAN_NOT_SIGNABLE');
 const bytes=readPrivateKey(privateKeyFile);
 try{
  const privateKey=crypto.createPrivateKey(bytes);
  if(privateKey.type!=='private'||privateKey.asymmetricKeyType!=='ed25519')
   throw Error('OWNER_ROLLBACK_KEY_MUST_BE_ED25519');
  return crypto.sign(null,Buffer.from(DOMAIN+canonical),privateKey).toString('base64');
 }finally{bytes.fill(0);}
}
function main(){
 const requestFile=process.argv[2];
 if(typeof requestFile!=='string'||!path.isAbsolute(requestFile))
  throw Error('OWNER_ROLLBACK_REQUEST_PATH_REQUIRED');
 const request=JSON.parse(fs.readFileSync(requestFile,'utf8'));
 process.stdout.write(signRollbackRequest(request,process.env.ULTRA_SENTINEL_OWNER_SIGNING_KEY_FILE)+'\n');
}
if(require.main===module)try{main();}catch{
 process.stderr.write('OWNER_ROLLBACK_SIGNING_BLOCKED\n');process.exitCode=1;
}
module.exports={signRollbackRequest};
