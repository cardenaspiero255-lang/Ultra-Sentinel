'use strict';
const fs=require('node:fs'),path=require('node:path');
const {loadRegisteredPlan}=require('../packages/recovery/registered-owner-plans.cjs');
const {runRegisteredCandidateRollback}=require('../packages/recovery/registered-candidate-rollback.cjs');
function main(){
 try{
  const [baseRoot,candidateRoot,output,ownerReceipt]=process.argv.slice(2);
  if(![baseRoot,candidateRoot,output,ownerReceipt].every(x=>
   typeof x==='string'&&path.isAbsolute(x)))throw Error('INVALID_PATH');
  const evidence=JSON.parse(fs.readFileSync(ownerReceipt,'utf8'));
  if(evidence.status!=='SINGLE_GITHUB_OWNER_APPROVAL_VERIFIED'||
   evidence.planKind!=='registered'||evidence.workflowSha!==process.env.GITHUB_SHA||
   evidence.runId!==process.env.GITHUB_RUN_ID||evidence.remoteWrites!==false)
   throw Error('UNTRUSTED_APPROVAL');
  const found=loadRegisteredPlan(path.resolve(__dirname,'..'),evidence.planDigest);
  if(found.plan.id!==evidence.registeredPlanId||
   !['gamehub-kotlin-domain-battery-v1','gamehub-kotlin-domain-battery-finite-v2'].includes(found.plan.oracle))throw Error('UNTRUSTED_PLAN');
  const proof=runRegisteredCandidateRollback({baseRoot,candidateRoot,plan:found.plan});
  const result={...proof,workflowSha:evidence.workflowSha,runId:evidence.runId,
   planDigest:evidence.planDigest,ownerCommentId:evidence.commentId,
   reviewedPRRequired:true,protectedChecksRequired:true,autoMergeAllowed:false};
  fs.writeFileSync(output,JSON.stringify(result)+'\n',{flag:'wx',mode:0o600});
  process.stdout.write('REGISTERED_CANDIDATE_ROLLBACK_VERIFIED_NO_REMOTE_WRITES\n');
 }catch{
  process.stderr.write('REGISTERED_CANDIDATE_ROLLBACK_BLOCKED\n');
  process.exitCode=1;
 }
}
if(require.main===module)main();
module.exports={main};
