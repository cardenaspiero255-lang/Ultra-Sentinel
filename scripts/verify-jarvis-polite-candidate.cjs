#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {makePoliteCandidate}=require('../packages/investigation/jarvis-polite-candidate.cjs');
const {drillTwoSourceKotlinSandbox}=require('../packages/recovery/two-source-kotlin-sandbox.cjs');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const blob=s=>{const b=Buffer.from(s,'utf8');return crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');};
function fail(){throw Error('POLITE_MATRIX_BLOCKED');}
function main(root){
 if(typeof root!=='string'||!path.isAbsolute(root)||fs.realpathSync(root)!==root)fail();
 function read(relative,max=65536){
  const file=path.join(root,relative),st=fs.lstatSync(file);
  if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||st.size<1||st.size>max)fail();
  return fs.readFileSync(file);
 }
 const gate=read('input/gate.kt').toString('utf8'),policy=read('input/policy.kt').toString('utf8');
 const generated=makePoliteCandidate({gate,policy});
 if(read('candidate/gate.kt').toString('utf8')!==generated.gate||
  read('candidate/policy.kt').toString('utf8')!==generated.policy||
  sha(read('input/oracle.kt'))!=='d6901d8a1725397c7e242352bd0e2830f6c657bd7d358f1d6d06ef9ed7a80fa3')fail();
 const rows=[];
 for(const mode of ['00','01','10','11']){
  const gateFixed=mode[0]==='1',policyFixed=mode[1]==='1';
  if(read('matrix/'+mode+'/input/gate.kt').toString('utf8')!==(gateFixed?generated.gate:gate)||
   read('matrix/'+mode+'/input/policy.kt').toString('utf8')!==(policyFixed?generated.policy:policy)||
   sha(read('matrix/'+mode+'/input/oracle.kt'))!=='d6901d8a1725397c7e242352bd0e2830f6c657bd7d358f1d6d06ef9ed7a80fa3')fail();
  const logs={};
  for(const [name,passes,marker] of [
   ['policy',policyFixed,policyFixed?'POLICY_BARRIER_PASS':'READ_ONLY_POLICY_POLITE_RESTART_ACCEPTED'],
   ['gate',gateFixed,gateFixed?'GATE_BARRIER_PASS':'VOICE_GATE_OPERATIONAL_REQUEST_ACCEPTED'],
   ['controls',true,'ORIGINAL_CONTROLS_PASS'],
   ['integration',gateFixed&&policyFixed,gateFixed&&policyFixed?'TWO_BARRIER_INTEGRATION_PASS':'VOICE_GATE_OPERATIONAL_REQUEST_ACCEPTED']
  ]){
   const exit=read('matrix/'+mode+'/'+name+'.exit',8).toString('utf8');
   const bytes=read('matrix/'+mode+'/'+name+'.log');
   const output=bytes.toString('utf8');
   const expected=passes?marker:'Exception in thread "main" java.lang.IllegalStateException: '+marker;
   if(exit!==(passes?'0\n':'1\n')||!output.split(/\r?\n/).includes(expected))fail();
   logs[name]=sha(bytes);
  }
  rows.push({mode,gateFixed,policyFixed,jarSha256:sha(read('matrix/'+mode+'/out/oracle.jar',50000000)),logSha256:logs});
 }
 const adverseExit=read('matrix/11/adversarial.exit',8).toString('utf8');
 const adverse=read('matrix/11/adversarial.log');
 if(adverseExit!=='0\n'||adverse.toString('utf8').trim()!=='POLITE_ADVERSARIAL_CONTROLS_PASS')fail();
 const prefix='apps/android/app/src/main/java/com/cardenaspiero255/jarvis/core/';
 const files=[
  {path:prefix+'OfflineVoiceQuestionGate.kt',before:gate,after:generated.gate,
   beforeBlobSha:blob(gate),afterBlobSha:blob(generated.gate)},
  {path:prefix+'LocalGgufPolicy.kt',before:policy,after:generated.policy,
   beforeBlobSha:blob(policy),afterBlobSha:blob(generated.policy)}
 ];
 const judge=drillTwoSourceKotlinSandbox({files});
 if(judge.status!=='TWO_SOURCE_SANDBOX_JUDGE_AND_ROLLBACK_VERIFIED'||
  judge.checkedFiles!==2||judge.exactTreeRollbackVerified!==true||
  judge.remoteWrites!==false||judge.mergeAllowed!==false)fail();
 const report={schema:'ultra-sentinel-jarvis-polite-candidate-matrix/v1',
  status:'PINNED_SOURCE_MATRIX_AND_LOCAL_ROLLBACK_OBSERVED',
  sourceRepository:'cardenaspiero255-lang/JARVIS',
  sourceCommit:'747c14b5d97750a7b2736968e2d516f02448558d',
  sourceBlobs:files.map(f=>({path:f.path,before:f.beforeBlobSha,after:f.afterBlobSha})),
  originalOracleSha256:sha(read('input/oracle.kt')),
  adversarialOracleSha256:sha(read('matrix/11/input/adversarial.kt')),
  adversarialJarSha256:sha(read('matrix/11/out/adversarial.jar',50000000)),
  adversarialLogSha256:sha(adverse),matrix:rows,
  localStructuralJudgeApproved:true,localExactTreeRollbackVerified:true,
  sourceAndRunnerAuthenticatedByThisFunction:false,ownerAuthorizationVerified:false,
  androidDeviceObserved:false,deviceActionProven:false,remoteWrites:false,
  mergeAllowed:false,productionReleaseCertified:false};
 fs.writeFileSync(path.join(root,'polite-candidate-receipt.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 process.stdout.write(report.status+'\n');
}
if(require.main===module)try{main(process.argv[2]);}catch{
 process.stderr.write('POLITE_MATRIX_BLOCKED\n');process.exitCode=2;
}
module.exports={main};
