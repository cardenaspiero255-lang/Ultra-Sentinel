'use strict';
/**
 * Owner-host-only bridge for one fixed JARVIS two-source experiment.
 * Source provenance and expected Kotlin behavior are pinned independently
 * of the untrusted PR. This is not an approval or a GitHub writer.
 */
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const {makePoliteCandidate}=
 require('../investigation/jarvis-polite-candidate.cjs');
const {digestBranchCandidate}=
 require('./supervised-github-branch-commit.cjs');
const PLAN=Object.freeze({
 repository:'cardenaspiero255-lang/JARVIS',prNumber:105,
 branch:'fix/ultra-sentinel-polite-voice-20261106',
 expectedHeadSha:'a88a29ba4119d3f68b2268367f594a0ac1168f9e',
 expectedMainSha:'747c14b5d97750a7b2736968e2d516f02448558d',
 expectedTreeSha:'b48da9292d1f26669eb30b483ee19e59944041e5',
 operation:'COMMIT_TO_EXISTING_DRAFT_PR_BRANCH'
});
const PREFIX='apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/';
const SOURCES=Object.freeze([
 {path:PREFIX+'LocalGgufPolicy.kt',
  before:'46e9dd8b4d0fe861935bfb5ee5160cd39f3b5a78',
  after:'b7659a9cf4cb5035047cb3c59540118ce61f7959',
  tmp:'policy.kt'},
 {path:PREFIX+'OfflineVoiceQuestionGate.kt',
  before:'bdc3a6a576b3473454df232cd21e3a9a3c4e6465',
  after:'a12a768582fe731da2639ab1948a7e0cc1c714d7',
  tmp:'gate.kt'}
]);
const ORACLES=Object.freeze([
 {source:'jarvis-polite-operational-original.kt',dest:'oracle.kt',
  blob:'d19c3eb8cd796f4b57629c2f58b4b4a00af9a798'},
 {source:'jarvis-polite-candidate-adversarial.kt',dest:'adversarial.kt',
  blob:'733b1acbc864be1f30398052ee612cfb4b6bad87'}
]);
const GRANT_FIELDS=['ownerLogin','ownerId','repo','prNumber','branch',
 'headSha','baseSha','planDigest','nonce','expiresAt','operation'];
function fail(code){throw Error('OWNER_POLITE_'+code);}
function exact(record,keys){
 return record!==null&&typeof record==='object'&&!Array.isArray(record)&&
  Object.getPrototypeOf(record)===Object.prototype&&
  Object.keys(record).sort().join(',')===keys.slice().sort().join(',');
}
function blob(text){
 const bytes=Buffer.from(text,'utf8');
 return crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
}
function validateTrialPlan(plan){
 if(!exact(plan,Object.keys(PLAN))||
  Object.keys(PLAN).some(key=>plan[key]!==PLAN[key]))fail('PINNED_PLAN_MISMATCH');
 return plan;
}
function validateTrialFiles(files){
 if(!Array.isArray(files)||files.length!==2)fail('TWO_SOURCE_FILES_REQUIRED');
 const ordered=[...files].sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
 for(let i=0;i<2;i++){
  const f=ordered[i],pin=SOURCES[i];
  if(!exact(f,['path','before','after','beforeBlobSha','afterBlobSha'])||
   f.path!==pin.path||f.beforeBlobSha!==pin.before||
   f.afterBlobSha!==pin.after||typeof f.before!=='string'||
   typeof f.after!=='string'||blob(f.before)!==pin.before||
   blob(f.after)!==pin.after)fail('PINNED_FILE_MISMATCH');
 }
 let candidate;
 try{candidate=makePoliteCandidate({
  gate:ordered[1].before,policy:ordered[0].before});}
 catch{fail('UNTRUSTED_CANDIDATE');}
 if(ordered[0].after!==candidate.policy||ordered[1].after!==candidate.gate||
  candidate.gateBlob!==SOURCES[1].after||
  candidate.policyBlob!==SOURCES[0].after)fail('CANDIDATE_DIVERGED');
 return ordered;
}
function validateOwnerRequest(request){
 if(!exact(request,['plan','files','ownerGrant','ownerSignature']))
  fail('INVALID_SIGNED_REQUEST');
 validateTrialPlan(request.plan);
 const files=validateTrialFiles(request.files);
 const grant=request.ownerGrant;
 const digest=digestBranchCandidate(request.plan,files);
 if(!exact(grant,GRANT_FIELDS)||grant.ownerLogin!=='cardenaspiero255-lang'||
  grant.ownerId!==322222186||grant.repo!==PLAN.repository||
  grant.prNumber!==PLAN.prNumber||grant.branch!==PLAN.branch||
  grant.headSha!==PLAN.expectedHeadSha||
  grant.baseSha!==PLAN.expectedMainSha||grant.operation!==PLAN.operation||
  grant.planDigest!==digest||
  typeof grant.nonce!=='string'||!/^[a-zA-Z0-9_-]{20,96}$/.test(grant.nonce)||
  !Number.isSafeInteger(grant.expiresAt)||
  typeof request.ownerSignature!=='string'||
  !/^[A-Za-z0-9+/]{86}==$/.test(request.ownerSignature))
  fail('SIGNED_SCOPE_OR_SIGNATURE_REQUIRED');
 // This validates *shape* only; the executor independently verifies Ed25519.
 return Object.freeze({plan:request.plan,files,ownerGrant:grant,
  ownerSignature:request.ownerSignature,planDigest:digest});
}
function checkHostGate(env=process.env,platform=process.platform){
 if(platform!=='linux'||env.GITHUB_ACTIONS==='true'||
  typeof env.JARVIS_KOTLIN_HOME!=='string'||
  !path.posix.isAbsolute(env.JARVIS_KOTLIN_HOME)||
  env.JARVIS_KOTLIN_HOME.includes('\0'))
  fail('TRUSTED_LINUX_HOST_AND_KOTLIN_REQUIRED');
}
function trustedOracleSource(entry){
 const filename=path.resolve(__dirname,'../../tests/oracles',entry.source);
 const stat=fs.lstatSync(filename);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||stat.size>15000)
  fail('ORACLE_FILE_UNTRUSTED');
 const bytes=fs.readFileSync(filename),value=bytes.toString('utf8');
 if(!Buffer.from(value,'utf8').equals(bytes)||blob(value)!==entry.blob)
  fail('ORACLE_SOURCE_UNTRUSTED');
 return bytes;
}
function createTrustedPoliteJVMVerifier({plan,files}){
 validateTrialPlan(plan);
 const original=validateTrialFiles(files);
 const expectedDigest=digestBranchCandidate(plan,original);
 const oracleBytes=ORACLES.map(trustedOracleSource);
 return async function verifyOriginalJVM(proofInput){
  if(!proofInput||!exact(proofInput,['plan','files','planDigest'])||
    proofInput.planDigest!==expectedDigest)fail('CALLBACK_PLAN_MISMATCH');
  validateTrialPlan(proofInput.plan);
  if(digestBranchCandidate(proofInput.plan,validateTrialFiles(proofInput.files))!==
    expectedDigest)fail('CALLBACK_FILES_MISMATCH');
  checkHostGate();
  const parent=fs.mkdtempSync(path.join(os.tmpdir(),'us-owner-polite-'));
  try{
   fs.mkdirSync(path.join(parent,'original'),{mode:0o700});
   fs.mkdirSync(path.join(parent,'candidate'),{mode:0o700});
   fs.mkdirSync(path.join(parent,'oracle'),{mode:0o700});
   for(let i=0;i<2;i++){
    const record=original[i],pin=SOURCES[i];
    fs.writeFileSync(path.join(parent,'original',pin.tmp),record.before,
      {flag:'wx',mode:0o400});
    fs.writeFileSync(path.join(parent,'candidate',pin.tmp),record.after,
      {flag:'wx',mode:0o400});
   }
   for(let i=0;i<ORACLES.length;i++){
    fs.writeFileSync(path.join(parent,'oracle',ORACLES[i].dest),oracleBytes[i],
      {flag:'wx',mode:0o400});
   }
   const runner=path.resolve(__dirname,'../../scripts/owner-jarvis-polite-original-jvm.sh');
   const stat=fs.lstatSync(runner);
   if(!stat.isFile()||stat.isSymbolicLink())fail('RUNNER_UNTRUSTED');
   const cmd=spawnSync('/bin/bash',[runner,parent],{
    encoding:'utf8',timeout:240000,maxBuffer:65536,
    env:{PATH:'/usr/bin:/bin',HOME:'/tmp',LC_ALL:'C',
      JARVIS_KOTLIN_HOME:process.env.JARVIS_KOTLIN_HOME}
   });
   if(cmd.error||cmd.status!==0||
    cmd.stdout!=='OWNER_POLITE_JVM_ORIGINAL_RED_CANDIDATE_GREEN\n')
    fail('ORIGINAL_JVM_ISOLATION_OR_MATRIX_VETO');
   return Object.freeze({
    status:'TRUSTED_ORIGINAL_KOTLIN_JVM_RED_GREEN',
    baselineHeadSha:plan.expectedHeadSha,planDigest:expectedDigest,
    sourceBlobs:original.map(f=>f.beforeBlobSha),
    candidateBlobs:original.map(f=>f.afterBlobSha),
    genuineOriginalRed:true,originalJVMGreen:true,
    benignControlsPassed:true,isolatedExecution:true,
    remoteWrites:false,mergeAllowed:false
   });
  }finally{fs.rmSync(parent,{force:true,recursive:true,maxRetries:1});}
 };
}
module.exports={PLAN,SOURCES,validateTrialPlan,validateTrialFiles,
 validateOwnerRequest,checkHostGate,createTrustedPoliteJVMVerifier};
