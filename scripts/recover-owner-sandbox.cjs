'use strict';
// Explicit crash recovery for an isolated, disposable sandbox only.
// No access to GitHub writes, tokens, production worktrees, or remote repositories.
const path=require('node:path');
const {recoverInterruptedSandboxRepair}=require('../packages/recovery/owner-sandbox-flow.cjs');
function main(){
 const directory=process.env.ULTRA_SENTINEL_SANDBOX_DIR;
 const nonceStorePath=process.env.ULTRA_SENTINEL_NONCE_LEDGER;
 if(!directory||!nonceStorePath||!path.isAbsolute(directory)||!path.isAbsolute(nonceStorePath))
  throw Error('RECOVERY_CONFIGURATION_REQUIRED');
 const result=recoverInterruptedSandboxRepair({directory,nonceStorePath});
 if(result.status!=='RECOVERY_VERIFIED')throw Error('RECOVERY_UNVERIFIED');
 process.stdout.write('RECOVERY_VERIFIED\n');
}
if(require.main===module){
 try{main();}catch(error){
  process.stderr.write('RECOVERY_BLOCKED: '+error.message+'\n');
  process.exitCode=1;
 }
}
module.exports={main};
