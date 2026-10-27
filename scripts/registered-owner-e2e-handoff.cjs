'use strict';
/*
 * Only invoked by the owner-only trusted main issue_comment workflow AFTER
 * the actual GitHub OIDC, nonce, Kotlin sandbox and rollback verification.
 * Produces a read-only handoff receipt. Never calls GitHub write endpoints.
 */
const fs=require('node:fs'),path=require('node:path');
const {loadRegisteredPlan}=require('../packages/recovery/registered-owner-plans.cjs');
const {verifyRegisteredOwnerRepairE2E}=
 require('../packages/recovery/registered-owner-e2e-handoff.cjs');
const FLOW='cardenaspiero255-lang/Ultra-Sentinel/.github/workflows/owner-single-approval.yml@refs/heads/main';
function blocked(){throw Error('REGISTERED_OWNER_E2E_HANDOFF_BLOCKED');}
function readReceipt(directory,filename){
 const file=path.join(directory,filename);
 const stat=fs.lstatSync(file);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||
  (stat.mode&0o077)!==0||stat.size<10||stat.size>32768)blocked();
 return JSON.parse(fs.readFileSync(file,'utf8'));
}
async function main({env=process.env,fetchImpl=globalThis.fetch}={}){
 try{
  if(env.GITHUB_ACTIONS!=='true'||
    env.GITHUB_EVENT_NAME!=='issue_comment'||env.GITHUB_WORKFLOW_REF!==FLOW||
    env.GITHUB_REPOSITORY!=='cardenaspiero255-lang/Ultra-Sentinel'||
    env.GITHUB_REPOSITORY_ID!=='1418338512'||
    env.GITHUB_ACTOR_ID!=='322222186'||
    env.GITHUB_REF!=='refs/heads/main'||
    env.GITHUB_RUN_ATTEMPT!=='1'||
    !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA||'')||
    !/^[1-9]\d{0,16}$/.test(env.GITHUB_RUN_ID||'')||
    typeof env.RUNNER_TEMP!=='string'||!path.isAbsolute(env.RUNNER_TEMP)||
    typeof env.ULTRA_READONLY_GITHUB_TOKEN!=='string'||
    env.ULTRA_READONLY_GITHUB_TOKEN.length<16)blocked();
  const directory=fs.realpathSync(env.RUNNER_TEMP);
  if(directory!==env.RUNNER_TEMP)blocked();
  const approval=readReceipt(directory,'owner-single-approval-receipt.json');
  const rollback=readReceipt(directory,'registered-owner-rollback.json');
  const kotlin=readReceipt(path.join(directory,'gamehub-battery-domain-proof'),'receipt.json');
  const sealed=readReceipt(directory,'registered-owner-proof.json');
  const registered=loadRegisteredPlan(path.resolve(__dirname,'..'),approval.planDigest);
  const result=await verifyRegisteredOwnerRepairE2E({
   plan:registered.plan,planDigest:registered.planDigest,
   approval,rollback,kotlin,sealed,
   expectedWorkflowSha:env.GITHUB_SHA,expectedRunId:Number(env.GITHUB_RUN_ID),
   githubToken:env.ULTRA_READONLY_GITHUB_TOKEN,fetchImpl
  });
  if(result.productionCertified!==false||result.autoMergeAllowed!==false||
    result.remoteWrites!==false||result.releaseAuthorized!==false||
    result.sandboxRecoveryVerified!==true)blocked();
  fs.writeFileSync(path.join(directory,'registered-owner-review-handoff.json'),
   JSON.stringify(result)+'\n',{flag:'wx',mode:0o600});
  process.stdout.write(result.status+' NO_AUTO_MERGE\n');
  return result;
 }catch{blocked();}
}
if(require.main===module)main().catch(()=>{
 process.stderr.write('REGISTERED_OWNER_E2E_HANDOFF_BLOCKED\n');
 process.exitCode=1;
});
module.exports={main};
