#!/usr/bin/env node
'use strict';
// Trusted, owner-controlled Linux operator ONLY. This entrypoint cannot
// sign, create a PR, merge or alter JARVIS main. Dry-run is the default.
const fs=require('node:fs');
const path=require('node:path');
const {runSupervisedGitHubBranchCommit}=
 require('../packages/recovery/supervised-github-branch-commit.cjs');
const {validateOwnerRequest,checkHostGate,createTrustedPoliteJVMVerifier}=
 require('../packages/recovery/owner-jarvis-polite-operator.cjs');
function deny(){throw Error('OWNER_POLITE_OPERATOR_BLOCKED');}
function secureAncestors(filename){
 if(typeof filename!=='string'||!path.isAbsolute(filename)||
  !fs.constants.O_NOFOLLOW||typeof process.geteuid!=='function')deny();
 const uid=process.geteuid();
 const parent=path.dirname(filename),root=path.parse(parent).root;
 let here=root;
 for(const item of [root,...path.relative(root,parent).split(path.sep).filter(Boolean)]){
  if(item!==root)here=path.join(here,item);
  const s=fs.lstatSync(here);
  if(!s.isDirectory()||s.isSymbolicLink()||
   (s.uid!==uid&&s.uid!==0)||(s.mode&0o022)!==0)deny();
 }
}
function readPrivateFile(filename,limit=2*1024*1024){
 secureAncestors(filename);
 const fd=fs.openSync(filename,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
 try{
  const s=fs.fstatSync(fd);
  if(!s.isFile()||s.nlink!==1||s.uid!==process.geteuid()||
   s.size<1||s.size>limit||(s.mode&0o077)!==0)deny();
  const bytes=fs.readFileSync(fd);
  if(bytes.length!==s.size)deny();
  return bytes;
 }finally{fs.closeSync(fd);}
}
function readCanonicalJSON(filename){
 const bytes=readPrivateFile(filename);
 try{
  const text=bytes.toString('utf8');
  if(!Buffer.from(text,'utf8').equals(bytes))deny();
  const value=JSON.parse(text);
  if(text!==JSON.stringify(value))deny();
  return value;
 }finally{bytes.fill(0);}
}
function validateLedgerPath(filename){
 secureAncestors(filename);
 if(fs.existsSync(filename)){
  const st=fs.lstatSync(filename);
  if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||
   st.uid!==process.geteuid()||(st.mode&0o077)!==0)deny();
 }
 return filename;
}
function writeResult(filename,result){
 secureAncestors(filename);
 const data=JSON.stringify(result)+'\n';
 fs.writeFileSync(filename,data,{flag:'wx',mode:0o600});
}
async function main(){
 checkHostGate();
 if(process.argv.length!==2)deny();
 const mode=process.env.ULTRA_SENTINEL_REMOTE_REPAIR_APPLY;
 if(mode!==undefined&&mode!=='true'&&mode!=='false')deny();
 const apply=mode==='true';
 const token=process.env.ULTRA_SENTINEL_OWNER_GITHUB_TOKEN;
 if(typeof token!=='string'||token.length<16)deny();
 const intent=readCanonicalJSON(process.env.ULTRA_SENTINEL_REPAIR_REQUEST_FILE);
 const request=validateOwnerRequest(intent);
 const keyBytes=readPrivateFile(process.env.ULTRA_SENTINEL_OWNER_PUBLIC_KEY_FILE,8192);
 let pubkey;
 try{pubkey=keyBytes.toString('utf8');}
 finally{keyBytes.fill(0);}
 if(!pubkey.includes('BEGIN PUBLIC KEY'))deny();
 const ledger=validateLedgerPath(process.env.ULTRA_SENTINEL_REPAIR_NONCE_LEDGER);
 const output=process.env.ULTRA_SENTINEL_REPAIR_RESULT_FILE;
 if(apply){
  if(typeof output!=='string'||!path.isAbsolute(output)||
   fs.existsSync(output))deny();
  secureAncestors(output);
 }
 const verifyOriginalJVM=createTrustedPoliteJVMVerifier(request);
 const result=await runSupervisedGitHubBranchCommit({
  plan:request.plan,files:request.files,ownerGrant:request.ownerGrant,
  ownerSignature:request.ownerSignature,trustedOwnerPublicKey:pubkey,
  token,nonceStorePath:ledger,verifyOriginalJVM,apply
 });
 if(apply){
  if(result.status!=='OWNER_APPROVED_PR_BRANCH_COMMIT_CREATED'||
   result.remoteWrites!==true||result.remoteRollbackExecuted!==false||
   !result.rollbackPlan||!result.rollbackPlanDigest)deny();
  writeResult(output,{rollbackPlan:result.rollbackPlan,
   rollbackPlanDigest:result.rollbackPlanDigest,repairCommitSha:result.commitSha});
  process.stdout.write('OWNER_POLITE_REPAIR_COMMIT_CONFIRMED\n');
 }else{
  if(result.status!=='OWNER_AUTHENTICATED_DRAFT_PR_READY'||
   result.remoteWrites!==false)deny();
  process.stdout.write('OWNER_POLITE_SIGNED_PREFLIGHT_READY_NO_REMOTE_WRITE\n');
 }
}
if(require.main===module)main().catch(()=>{
 process.stderr.write('OWNER_POLITE_OPERATOR_BLOCKED\n');
 process.exitCode=1;
});
module.exports={secureAncestors,readPrivateFile,readCanonicalJSON,validateLedgerPath,main};
