'use strict';
/* Actual Bubblewrap OS namespace drill. Never runs PR code or real repair. */
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const {bubblewrapCommand}=require('./run-owner-sandbox-repair.cjs');
function fail(reason){throw Error(reason);}
/**
 * Convert arbitrary stderr from OS subprocesses to fixed public error codes.
 * Never print the subprocess stderr itself (it could contain a host path).
 */
function classifyBwrapFailure(result){
 const diagnostic=typeof result?.stderr==='string'?result.stderr.slice(0,8192):'';
 if(/(?:setting up uid map|Failed RTM_NEWADDR|creating new namespace|unshare|userns|Operation not permitted|Permission denied)/i.test(diagnostic))
  return 'BWRAP_NAMESPACE_PERMISSION_DENIED';
 if(/(?:ro-bind|bind mount|mount failed|Failed to make \/ slave|mountpoint)/i.test(diagnostic))
  return 'BWRAP_MOUNT_SETUP_FAILED';
 if(/(?:SyntaxError|AssertionError|Traceback \(most recent call last\)|python3:)/i.test(diagnostic))
  return 'BWRAP_FIXTURE_PROCESS_FAILED';
 return 'BWRAP_NAMESPACE_OPERATION_DENIED';
}
function runIsolationDrill(){
 if(process.platform!=='linux')fail('LINUX_HOST_REQUIRED');
 const binary='/usr/bin/bwrap';
 let stat;
 try{stat=fs.lstatSync(binary);}catch{fail('BWRAP_BINARY_MISSING');}
 if(!stat.isFile()||stat.isSymbolicLink()||(stat.mode&0o111)===0)
  fail('BWRAP_BINARY_UNSAFE');
 const parent=fs.mkdtempSync(path.join(os.tmpdir(),'ultra-bwrap-drill-'));
 const sandbox=path.join(parent,'workspace');
 const outside=path.join(parent,'host-only');
 try{
  fs.mkdirSync(sandbox,{mode:0o700});
  fs.mkdirSync(outside,{mode:0o700});
  fs.writeFileSync(path.join(sandbox,'public-marker.txt'),'fixture-only\n',{mode:0o600});
  const hidden=path.join(outside,'fake-sentinel-secret.txt');
  fs.writeFileSync(hidden,'MOCK_SECRET_NEVER_A_REAL_TOKEN\n',{mode:0o600});
  const hostNamespace=fs.readlinkSync('/proc/self/ns/net');
  const script=[
   'import os,socket,json,sys',
   'assert open("/workspace/public-marker.txt",encoding="utf-8").read()=="fixture-only\\n"',
   'assert not os.path.exists('+JSON.stringify(hidden)+')',
   'assert "GITHUB_TOKEN" not in os.environ',
   'assert "ULTRA_SENTINEL_OWNER_GITHUB_TOKEN" not in os.environ',
   'assert os.environ.get("ULTRA_SENTINEL_OFFLINE_VALIDATOR")=="true"',
   's=socket.socket(socket.AF_INET,socket.SOCK_STREAM)',
   's.settimeout(1)',
   'result=s.connect_ex(("1.1.1.1",80))',
   's.close()',
   'assert result!=0',
   'print(json.dumps({"netNamespace":os.readlink("/proc/self/ns/net"),',
   ' "hostFileHidden":True,"networkAttemptDenied":True,"secretsAbsent":True}))'
  ].join('\n');
  const launch=bubblewrapCommand(sandbox,['/usr/bin/python3','-c',script]);
  if(launch.binary!==binary||!launch.args.includes('--unshare-all')||
   !launch.args.includes('--clearenv')||!launch.args.includes('--new-session'))
    fail('ISOLATION_COMMAND_UNTRUSTED');
  const result=spawnSync(binary,launch.args,{
   shell:false,encoding:'utf8',timeout:30000,maxBuffer:1024*256,
   env:{PATH:'/usr/bin:/bin',HOME:sandbox,GIT_CONFIG_NOSYSTEM:'1',
    GIT_CONFIG_GLOBAL:'/dev/null',GIT_TERMINAL_PROMPT:'0'}
  });
  if(result.error||result.status!==0)fail(classifyBwrapFailure(result));
  let report;
  try{report=JSON.parse(result.stdout.trim());}catch{fail('BWRAP_INVALID_EVIDENCE');}
  if(!report||report.netNamespace===hostNamespace||
   typeof report.netNamespace!=='string'||!/^net:\[\d+\]$/.test(report.netNamespace)||
   report.hostFileHidden!==true||report.networkAttemptDenied!==true||
   report.secretsAbsent!==true)fail('BWRAP_ISOLATION_NOT_PROVEN');
  return Object.freeze({schema:'ultra-sentinel-bwrap-drill/v1',
   status:'BWRAP_EPHEMERAL_HOST_ISOLATION_OBSERVED',
   networkNamespaceSeparate:true,hostFilesHidden:true,
   networkAttemptDenied:true,secretsAbsent:true,
   simulatedFixtureOnly:true,productionOwnerAuthorizationVerified:false,
   realRollbackE2EVerified:false,automaticRepairEnabled:false,
   tripleSPlusCertified:false});
 }finally{fs.rmSync(parent,{force:true,recursive:true});}
}
if(require.main===module){
 try{process.stdout.write(JSON.stringify(runIsolationDrill())+'\n');}
 catch(error){
  const allowed=new Set(['LINUX_HOST_REQUIRED','BWRAP_BINARY_MISSING',
   'BWRAP_BINARY_UNSAFE','BWRAP_NAMESPACE_OPERATION_DENIED',
   'BWRAP_NAMESPACE_PERMISSION_DENIED','BWRAP_MOUNT_SETUP_FAILED',
   'BWRAP_FIXTURE_PROCESS_FAILED',
   'BWRAP_INVALID_EVIDENCE','BWRAP_ISOLATION_NOT_PROVEN',
   'ISOLATION_COMMAND_UNTRUSTED']);
  process.stderr.write('BWRAP_DRILL_BLOCKED: '+
   (allowed.has(error?.message)?error.message:'UNVERIFIED_ISOLATION')+'\n');
  process.exitCode=1;
 }
}
module.exports={runIsolationDrill,classifyBwrapFailure};
