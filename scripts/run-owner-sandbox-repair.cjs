'use strict';
// Production entrypoint for owner-authorized *isolated* sandbox repair only.
// Must run inside an OS-enforced disposable sandbox with network disabled for
// verifier processes. No GitHub write scopes, remote pushes, or auto-merge.
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {spawnSync}=require('node:child_process');
const {runOwnerAuthorizedSandboxRepair}=require('../packages/recovery/owner-sandbox-flow.cjs');
const OWNER='cardenaspiero255-lang';
const OWNER_ID=322222186;
function readTrustedFile(filename){
 if(typeof filename!=='string'||!path.isAbsolute(filename))
  throw Error('ABSOLUTE_CONFIG_PATH_REQUIRED');
 // Public trust anchors may be readable, but MUST NOT be group/world-writable.
 // Use O_NOFOLLOW and fstat on the opened fd to defeat a symlink swap between
 // path inspection and read. The request JSON is also bounded.
 const parent=fs.lstatSync(path.dirname(filename));
 if(!parent.isDirectory()||parent.isSymbolicLink()||
  (parent.mode&0o022)!==0)throw Error('UNSAFE_CONFIG_PARENT');
 const fd=fs.openSync(filename,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
 try{
  const stat=fs.fstatSync(fd);
  if(!stat.isFile()||stat.nlink!==1||(stat.mode&0o022)!==0||
     stat.size<1||stat.size>65536)throw Error('UNSAFE_CONFIG_FILE');
  return fs.readFileSync(fd,'utf8');
 }finally{fs.closeSync(fd);}
}
function bubblewrapCommand(directory,argv){
 if(process.platform!=='linux'||typeof directory!=='string'||!path.isAbsolute(directory)||
  !fs.realpathSync(directory).startsWith(fs.realpathSync(os.tmpdir())+path.sep))
  throw Error('OS_VALIDATOR_SANDBOX_REQUIRED');
 // Only a trusted operator config can select the validator argv.
 // Explicit namespace isolation: the child can see only OS binaries and the
 // disposable Git sandbox, NOT the parent token, HOME or credential files.
 const args=['--die-with-parent','--unshare-all','--new-session','--clearenv',
  '--setenv','PATH','/usr/bin:/bin','--setenv','HOME','/workspace',
  '--setenv','CI','true','--setenv','ULTRA_SENTINEL_OFFLINE_VALIDATOR','true',
  '--ro-bind','/usr','/usr'];
 for(const mount of ['/bin','/lib','/lib64']){
  try{
   const stat=fs.lstatSync(mount);
   if(stat.isSymbolicLink()){
    const dest=fs.readlinkSync(mount);
    if(dest.startsWith('/')||dest.includes('..'))throw Error('UNSAFE_SYSTEM_SYMLINK');
    args.push('--symlink',dest,mount);
   }else if(stat.isDirectory())args.push('--ro-bind',mount,mount);
   else throw Error('UNSAFE_SYSTEM_MOUNT');
  }catch(e){if(e.code!=='ENOENT')throw e;}
 }
 args.push('--proc','/proc','--dev','/dev','--tmpfs','/tmp',
  '--dir','/workspace','--bind',directory,'/workspace','--chdir','/workspace',
  '--',...argv);
 return Object.freeze({binary:'/usr/bin/bwrap',args:Object.freeze(args)});
}
function redFailureObserved(result){
 return !!result&&!result.error&&result.status===1&&result.signal===null&&
  typeof result.stdout==='string'&&
  /^\\s*not ok [1-9]\\d*\\s*-/m.test(result.stdout)&&
  /^\\s*# fail [1-9]\\d*\\s*$/m.test(result.stdout);
}
function verifierFromTrustedEnvironment(directory,{argvVariable='ULTRA_SENTINEL_VALIDATOR_ARGV_JSON',expectRed=false}={}){
 if(!['ULTRA_SENTINEL_VALIDATOR_ARGV_JSON','ULTRA_SENTINEL_JUDGE_ARGV_JSON'].includes(argvVariable)||
  typeof expectRed!=='boolean')throw Error('UNTRUSTED_VALIDATOR_CONFIGURATION');
 const raw=process.env[argvVariable];
 if(!raw)throw Error('VALIDATOR_CONFIGURATION_REQUIRED');
 const argv=JSON.parse(raw);
 if(!Array.isArray(argv)||argv.length===0||argv.length>20||
  argv.some(x=>typeof x!=='string'||!x||x.length>500||/[\x00-\x1f]/.test(x))||
  !['npm','node','./gradlew'].includes(argv[0]))
  throw Error('INVALID_TRUSTED_VALIDATOR');
 // Reject the former unisolated subprocess path. A declarative environment
 // variable does NOT prove bwrap exists: the actual launcher below verifies it.
 if(process.env.ULTRA_SENTINEL_VALIDATOR_ISOLATION!=='bubblewrap')
  throw Error('OS_VALIDATOR_SANDBOX_REQUIRED');
 const launch=bubblewrapCommand(directory,argv);
 return async ()=>{
  try{
   const stat=fs.lstatSync(launch.binary);
   if(!stat.isFile()||stat.isSymbolicLink()||(stat.mode&0o111)===0)
    throw Error('ISOLATION_BINARY_UNTRUSTED');
  }catch{return false;}
  const result=spawnSync(launch.binary,launch.args,{
   cwd:directory,shell:false,encoding:'utf8',timeout:120000,maxBuffer:1024*1024,
   env:{PATH:'/usr/bin:/bin',HOME:directory,GIT_CONFIG_NOSYSTEM:'1',
    GIT_CONFIG_GLOBAL:'/dev/null',GIT_TERMINAL_PROMPT:'0'}
  });
  if(expectRed)return redFailureObserved(result);
  return !result.error&&result.status===0;
 };
}

async function main(){
 const token=process.env.ULTRA_SENTINEL_OWNER_GITHUB_TOKEN;
 if(!token)throw Error('OWNER_TOKEN_NOT_CONFIGURED');
 const request=JSON.parse(readTrustedFile(process.env.ULTRA_SENTINEL_REPAIR_REQUEST_FILE));
 const trustedPublicKey=readTrustedFile(process.env.ULTRA_SENTINEL_OWNER_PUBLIC_KEY_FILE);
 const verifyRepair=verifierFromTrustedEnvironment(request.directory);
 const verifyRed=verifierFromTrustedEnvironment(request.directory,{expectRed:true});
 const testArgv=process.env.ULTRA_SENTINEL_VALIDATOR_ARGV_JSON;
 const judgeArgv=process.env.ULTRA_SENTINEL_JUDGE_ARGV_JSON;
 if(!judgeArgv||JSON.stringify(JSON.parse(judgeArgv))===JSON.stringify(JSON.parse(testArgv)))
  throw Error('DISTINCT_JUDGE_CONFIGURATION_REQUIRED');
 const judgeRepair=verifierFromTrustedEnvironment(request.directory,{argvVariable:'ULTRA_SENTINEL_JUDGE_ARGV_JSON'});
 const result=await runOwnerAuthorizedSandboxRepair({
  token,expectedOwner:OWNER,expectedOwnerId:OWNER_ID,
  authorization:request.authorization,
  authorizationSignature:request.authorizationSignature,
  trustedPublicKey,nonceStorePath:request.nonceStorePath,
  directory:request.directory,plan:request.plan,changes:request.changes,
  expectedHeadSha:request.expectedHeadSha,verifyRepair,verifyRed,judgeRepair,
  requireRedGreenJudge:true
 });
 if(result.status!=='SANDBOX_REPAIR_VERIFIED')throw Error('REPAIR_NOT_VERIFIED');
 process.stdout.write('OWNER_AUTHORIZED_SANDBOX_REPAIR_VERIFIED\n');
}
if(require.main===module){
 main().catch(()=>{
  // Never print secrets, request data, or validator output.
  process.stderr.write('OWNER_SANDBOX_REPAIR_BLOCKED\n');
  process.exitCode=1;
 });
}
module.exports={main,verifierFromTrustedEnvironment,bubblewrapCommand,readTrustedFile,redFailureObserved};
