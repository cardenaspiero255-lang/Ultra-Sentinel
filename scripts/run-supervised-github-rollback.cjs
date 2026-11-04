'use strict';
/* Trusted owner host only, separate from any read-only PR Actions runner.
 * Dry-run is the default. Never logs credentials or request payloads.
 */
const fs=require('node:fs'),path=require('node:path');
const {runSupervisedGitHubBranchRollback}=
 require('../packages/recovery/supervised-github-branch-rollback.cjs');
function operatorFile(filename,limit=65536){
 if(typeof filename!=='string'||!path.isAbsolute(filename))
  throw Error('OPERATOR_ABSOLUTE_FILE_PATH_REQUIRED');
 const parent=fs.lstatSync(path.dirname(filename));
 if(!parent.isDirectory()||parent.isSymbolicLink()||(parent.mode&0o022)!==0)
  throw Error('OPERATOR_UNSAFE_PARENT_DIRECTORY');
 const fd=fs.openSync(filename,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
 try{
  const stat=fs.fstatSync(fd);
  if(!stat.isFile()||stat.nlink!==1||stat.size<1||stat.size>limit||
   (stat.mode&0o022)!==0)throw Error('OPERATOR_UNSAFE_FILE');
  return fs.readFileSync(fd,'utf8');
 }finally{fs.closeSync(fd);}
}
async function main(){
 if(process.env.GITHUB_ACTIONS==='true')throw Error('REMOTE_ROLLBACK_FORBIDDEN_IN_ACTIONS');
 const token=process.env.ULTRA_SENTINEL_OWNER_GITHUB_TOKEN;
 const mode=process.env.ULTRA_SENTINEL_REMOTE_ROLLBACK_APPLY;
 if(typeof token!=='string'||token.length<16||
  (mode!==undefined&&mode!=='true'&&mode!=='false'))
  throw Error('OWNER_ROLLBACK_OPERATOR_CONFIG_REQUIRED');
 const request=JSON.parse(operatorFile(process.env.ULTRA_SENTINEL_ROLLBACK_REQUEST_FILE));
 const publicKey=operatorFile(process.env.ULTRA_SENTINEL_OWNER_PUBLIC_KEY_FILE,8192);
 const result=await runSupervisedGitHubBranchRollback({
  ...request,trustedOwnerPublicKey:publicKey,token,
  nonceStorePath:process.env.ULTRA_SENTINEL_ROLLBACK_NONCE_LEDGER,
  apply:mode==='true'
 });
 process.stdout.write(result.status+'\n');
 if(result.status==='OWNER_APPROVED_REMOTE_ROLLBACK_VERIFIED')
  process.stdout.write('RESTORATION_COMMIT '+result.commitSha+'\n');
 return result;
}
if(require.main===module)main().catch(()=>{
 process.stderr.write('OWNER_REMOTE_ROLLBACK_BLOCKED_OR_UNCERTAIN\n');
 process.exitCode=1;
});
module.exports={main,operatorFile};
