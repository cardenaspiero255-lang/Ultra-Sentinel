'use strict';
/* Fail-closed GitHub Actions-only approval receipt, never a repair signature. */
const fs=require('node:fs'),path=require('node:path');
const {validateOwnerWorkflowApproval}=require('../packages/recovery/github-workflow-approval.cjs');
function readProtectedRunMetadata(filename){
 if(typeof filename!=='string'||!path.isAbsolute(filename))throw Error('APPROVAL_METADATA_UNSAFE');
 const parent=fs.lstatSync(path.dirname(filename));
 if(!parent.isDirectory()||parent.isSymbolicLink()||(parent.mode&0o022)!==0)
  throw Error('APPROVAL_METADATA_UNSAFE');
 const fd=fs.openSync(filename,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
 try{
  const st=fs.fstatSync(fd);
  if(!st.isFile()||st.nlink!==1||(st.mode&0o077)!==0||st.size<100||st.size>100000)
   throw Error('APPROVAL_METADATA_UNSAFE');
  return JSON.parse(fs.readFileSync(fd,'utf8'));
 }finally{fs.closeSync(fd);}
}
function main(){
 const run=readProtectedRunMetadata(process.env.ULTRA_OWNER_RUN_METADATA_FILE);
 const approval=validateOwnerWorkflowApproval({
  run,
  repository:process.env.GITHUB_REPOSITORY,
  repositoryId:process.env.GITHUB_REPOSITORY_ID,
  actorId:process.env.GITHUB_ACTOR_ID,
  ref:process.env.GITHUB_REF,
  sha:process.env.GITHUB_SHA,
  eventName:process.env.GITHUB_EVENT_NAME,
  runId:process.env.GITHUB_RUN_ID,
  runAttempt:process.env.GITHUB_RUN_ATTEMPT,
  workflowRef:process.env.GITHUB_WORKFLOW_REF
 });
 process.stdout.write(JSON.stringify(approval)+'\n');
 return approval;
}
if(require.main===module){
 try{main();}catch{
  process.stderr.write('OWNER_GITHUB_APPROVAL_BLOCKED\n');
  process.exitCode=1;
 }
}
module.exports={main,readProtectedRunMetadata};
