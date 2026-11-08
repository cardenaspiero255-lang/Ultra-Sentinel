'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const childProcess=require('node:child_process');
const realSpawnSync=childProcess.spawnSync;
let spawnMock;
// Intercept the two process boundaries without exposing a test-only injection
// option in the security-sensitive production entrypoint.
childProcess.spawnSync=(...args)=>spawnMock(...args);
const {makeOriginalJvmVerifier}=require('../../scripts/run-github-owner-jarvis-remote.cjs');
childProcess.spawnSync=realSpawnSync;
const {PLAN,validateTrialFiles}=require('../../packages/recovery/owner-jarvis-polite-operator.cjs');
const {makePoliteCandidate}=require('../../packages/investigation/jarvis-polite-candidate.cjs');
const {blobSha}=require('../../packages/investigation/novel-kotlin-hypotheses.cjs');
const {digestBranchCandidate}=require('../../packages/recovery/supervised-github-branch-commit.cjs');

function fixture(){
 const base=path.resolve(__dirname,'../fixtures/jarvis-polite-original');
 const gate=fs.readFileSync(path.join(base,'OfflineVoiceQuestionGate.kt'),'utf8');
 const policy=fs.readFileSync(path.join(base,'LocalGgufPolicy.kt'),'utf8');
 const generated=makePoliteCandidate({gate,policy});
 const prefix='apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/';
 const files=validateTrialFiles([
  {path:prefix+'OfflineVoiceQuestionGate.kt',before:gate,after:generated.gate,
   beforeBlobSha:blobSha(gate),afterBlobSha:blobSha(generated.gate)},
  {path:prefix+'LocalGgufPolicy.kt',before:policy,after:generated.policy,
   beforeBlobSha:blobSha(policy),afterBlobSha:blobSha(generated.policy)}
 ]);
 return {plan:PLAN,files,planDigest:digestBranchCandidate(PLAN,files),gate,policy};
}

test('remote JVM verifier starts the original oracle with an empty private directory and cleans up',async()=>{
 const parent=fs.mkdtempSync(path.join(os.tmpdir(),'us-oracle-contract-'));
 const f=fixture(),calls=[];
 try{
  spawnMock=(command,args,options)=>{
   assert.equal(command,'/bin/bash');
   const [script,root]=args;
   calls.push({script,root,env:options.env});
   assert.equal(options.env.ULTRA_SENTINEL_JARVIS_OWNER_TOKEN,undefined);
   assert.equal(fs.realpathSync(path.join(options.env.PATH.split(':')[0],'node')),
    fs.realpathSync(process.execPath));
   if(calls.length===1){
    assert.match(script,/jarvis-polite-operational-original-red\.sh$/);
    // This is the real original script's precondition, not a simulated oracle result.
    assert.deepEqual(fs.readdirSync(root),[]);
    assert.equal(fs.statSync(root).mode&0o077,0);
    assert.equal(options.env.GH_TOKEN,'read-only-token');
    fs.mkdirSync(path.join(root,'input'));
    fs.writeFileSync(path.join(root,'input','gate.kt'),f.gate);
    fs.writeFileSync(path.join(root,'input','policy.kt'),f.policy);
    return {status:0,stdout:'ORIGINAL_VOICE_INTENT_RED_OBSERVED\n',stderr:''};
   }
   assert.equal(calls.length,2);
   assert.match(script,/jarvis-polite-candidate-matrix\.sh$/);
   assert.equal(root,calls[0].root);
   assert.equal(options.env.GH_TOKEN,undefined);
   return {status:0,stdout:'PINNED_SOURCE_MATRIX_AND_LOCAL_ROLLBACK_OBSERVED\n',stderr:''};
  };
  const verify=makeOriginalJvmVerifier(f,{RUNNER_TEMP:parent,HOME:'/tmp',
   JARVIS_KOTLIN_HOME:'/trusted/kotlin',ULTRA_OWNER_COMMENT_READ_TOKEN:'read-only-token',
   ULTRA_SENTINEL_JARVIS_OWNER_TOKEN:'never-forward-this-write-token'});
  const result=await verify({plan:f.plan,files:f.files,planDigest:f.planDigest});
  assert.equal(result.status,'TRUSTED_ORIGINAL_KOTLIN_JVM_RED_GREEN');
  assert.equal(result.remoteWrites,false);
  assert.equal(calls.length,2);
  assert.deepEqual(fs.readdirSync(parent),[]);
 }finally{fs.rmSync(parent,{recursive:true,force:true});}
});

test('remote JVM verifier rejects a failed original oracle and removes its workspace',async()=>{
 const parent=fs.mkdtempSync(path.join(os.tmpdir(),'us-oracle-veto-'));
 const f=fixture();
 let calls=0;
 try{
  spawnMock=()=>{calls++;return {status:1,stdout:'',stderr:'failure'};};
  const verify=makeOriginalJvmVerifier(f,{RUNNER_TEMP:parent,HOME:'/tmp',
   JARVIS_KOTLIN_HOME:'/trusted/kotlin',ULTRA_OWNER_COMMENT_READ_TOKEN:'read-only-token'});
  await assert.rejects(()=>verify({plan:f.plan,files:f.files,planDigest:f.planDigest}),
   /OWNER_ORIGINAL_KOTLIN_ORACLE_FAILED/);
  assert.equal(calls,1);
  assert.deepEqual(fs.readdirSync(parent),[]);
 }finally{fs.rmSync(parent,{recursive:true,force:true});}
});

test('read-only JVM runner refuses write capability or an apply request before any network access',()=>{
 const parent=fs.mkdtempSync(path.join(os.tmpdir(),'us-oracle-readonly-'));
 try{
  const script=path.resolve(__dirname,'../../scripts/verify-remote-jarvis-jvm-readonly.cjs');
  const env={PATH:process.env.PATH,GITHUB_ACTIONS:'true',RUNNER_TEMP:parent,
   JARVIS_KOTLIN_HOME:'/trusted/kotlin',
   ULTRA_OWNER_COMMENT_READ_TOKEN:'read-only-token-placeholder'};
  for(const extra of [{ULTRA_SENTINEL_JARVIS_OWNER_TOKEN:'write-token-placeholder'},
   {ULTRA_SENTINEL_REMOTE_REPAIR_APPLY:'true'}]){
   const child=realSpawnSync(process.execPath,[script],{encoding:'utf8',env:{...env,...extra}});
   assert.notEqual(child.status,0);
   assert.match(child.stderr,/READONLY_REMOTE_JVM_PREFLIGHT_BLOCKED/);
   assert.deepEqual(fs.readdirSync(parent),[]);
  }
 }finally{fs.rmSync(parent,{recursive:true,force:true});}
});
