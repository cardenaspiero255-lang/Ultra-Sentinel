'use strict';
/*
 * Exact GameHub #151 original Kotlin blob -> disposable Git repair commit
 * -> verified rollback to identical baseline tree. NO remote or production IO.
 * Assumes separate real Kotlin RED / GREEN / Judge execution is mandatory in CI.
 */
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const {inspectFrozenGameHubThermal,PATH,HEAD,BLOB,sha1Blob}=
 require('../packages/recovery/gamehub-pr151-source-hunter.cjs');
function blocked(){throw Error('REAL_GAMEHUB_ROLLBACK_NOT_VERIFIED');}
function git(cwd,...args){
 const p=spawnSync('git',['-c','core.hooksPath=/dev/null','-c','core.fsmonitor=false',
  '-c','commit.gpgsign=false','-c','core.autocrlf=false',...args],{
  cwd,encoding:'utf8',timeout:10000,maxBuffer:1024*1024,
  env:{PATH:process.env.PATH,HOME:cwd,GIT_CONFIG_NOSYSTEM:'1',
   GIT_CONFIG_GLOBAL:'/dev/null',GIT_TERMINAL_PROMPT:'0'}
 });
 if(p.error||p.status!==0)blocked();
 return p.stdout.trim();
}
const replacements=[
 ['!it.isNaN() && it >= HIGH_THERMAL_HEADROOM','it.isFinite() && it >= HIGH_THERMAL_HEADROOM'],
 ['!sample.thermalHeadroom.isNaN()','sample.thermalHeadroom.isFinite()'],
 ['!current.thermalHeadroom.isNaN()','current.thermalHeadroom.isFinite()']
];
function correction(source){
 let result=source;
 for(const [old,next] of replacements){
  if(result.split(old).length!==2||result.includes(next))blocked();
  result=result.replace(old,next);
 }
 let reverse=result;
 for(const [old,next] of replacements){
  if(reverse.split(next).length!==2)blocked();
  reverse=reverse.replace(next,old);
 }
 if(reverse!==source)blocked();
 return result;
}
function runFrozenGameHubRepairRollback({sourceRoot}={}){
 if(typeof sourceRoot!=='string'||!path.isAbsolute(sourceRoot))blocked();
 const root=fs.realpathSync(sourceRoot);
 if(git(root,'rev-parse','HEAD')!==HEAD)blocked();
 const upstream=path.join(root,PATH);
 if(fs.lstatSync(upstream).isSymbolicLink()||!fs.statSync(upstream).isFile())blocked();
 const source=fs.readFileSync(upstream,'utf8');
 if(git(root,'hash-object','--',PATH)!==BLOB||sha1Blob(source)!==BLOB)blocked();
 const hunter=inspectFrozenGameHubThermal({source,path:PATH,sourceSha:HEAD});
 if(!hunter.sourceVerified||hunter.lines.length!==3||
    hunter.lines.join(',')!=='73,150,264')blocked();
 const after=correction(source),afterBlob=sha1Blob(after);
 if(afterBlob===BLOB)blocked();
 const workspace=fs.mkdtempSync(path.join(os.tmpdir(),'ultra-real-gamehub-rollback-'));
 try{
  git(workspace,'init','-q','-b','sandbox/frozen-gamehub-pr151');
  git(workspace,'config','user.name','Ultra Sentinel isolated validation');
  git(workspace,'config','user.email','sandbox@example.invalid');
  const target=path.join(workspace,PATH);
  fs.mkdirSync(path.dirname(target),{recursive:true,mode:0o700});
  fs.writeFileSync(target,source,{mode:0o600,flag:'wx'});
  git(workspace,'add','--',PATH);
  git(workspace,'commit','-qm','baseline: frozen original GameHub PR151 source');
  const baseHead=git(workspace,'rev-parse','HEAD');
  const baseTree=git(workspace,'rev-parse','HEAD^{tree}');
  if(git(workspace,'remote')!==''||git(workspace,'status','--porcelain')!==''||
     git(workspace,'rev-parse','HEAD:'+PATH)!==BLOB)blocked();
  fs.writeFileSync(target,after,{flag:'w'});
  git(workspace,'add','--',PATH);
  git(workspace,'commit','-qm','sandbox: supervised repair drill');
  const repairedHead=git(workspace,'rev-parse','HEAD');
  if(git(workspace,'rev-parse','HEAD^')!==baseHead||
     git(workspace,'rev-parse','HEAD:'+PATH)!==afterBlob||
     git(workspace,'remote')!==''||git(workspace,'status','--porcelain')!=='')blocked();
  const patched=fs.readFileSync(target,'utf8');
  if(patched!==after||
     inspectFrozenGameHubThermal({source:patched,path:PATH,sourceSha:HEAD,experimentalFixture:true}).lines.length!==0)blocked();
  // Deliberately veto release: forced rollback, no production commit/push.
  git(workspace,'revert','--no-edit',repairedHead);
  const rollbackHead=git(workspace,'rev-parse','HEAD');
  if(rollbackHead===repairedHead||
     git(workspace,'rev-parse','HEAD^{tree}')!==baseTree||
     git(workspace,'rev-parse','HEAD:'+PATH)!==BLOB||
     git(workspace,'remote')!==''||git(workspace,'status','--porcelain')!==''||
     fs.readFileSync(target,'utf8')!==source)blocked();
  return Object.freeze({
   schema:'ultra-sentinel-real-gamehub-pr151-sandbox-rollback/v1',
   status:'REAL_SOURCE_GIT_ROLLBACK_VERIFIED',
   sourceRepo:'cardenaspiero255-lang/gamehub-ultra',
   sourceCommit:HEAD,sourceBlobSha:BLOB,patchedBlobSha:afterBlob,
   hunterRule:'NONFINITE_THERMAL_HEADROOM',hunterLineNumbers:hunter.lines,
   frozenCoreRulesUnchanged:true,
   sandboxBaselineHead:baseHead,sandboxPatchedHead:repairedHead,
   sandboxRevertedHead:rollbackHead,baselineTreeSha:baseTree,
   restoredTreeSha:git(workspace,'rev-parse','HEAD^{tree}'),
   originalGitBlobRestored:true,
   remoteWrites:false,mergeAllowed:false,productionOwnerSignatureVerified:false,
   fullSignedHunterFixerJudgeE2E:false,productionRepairCertified:false
  });
 }finally{fs.rmSync(workspace,{force:true,recursive:true});}
}
function main(){
 const receipt=runFrozenGameHubRepairRollback({sourceRoot:process.argv[2]});
 const output=process.argv[3];
 if(!output||!path.isAbsolute(output))blocked();
 fs.writeFileSync(output,JSON.stringify(receipt)+'\n',{flag:'wx',mode:0o600});
 process.stdout.write('REAL_GAMEHUB_SOURCE_ROLLBACK_VERIFIED_NO_PRODUCTION_WRITES\n');
}
if(require.main===module){
 try{main();}catch{process.stderr.write('REAL_GAMEHUB_SOURCE_ROLLBACK_BLOCKED\n');process.exitCode=1;}
}
module.exports={runFrozenGameHubRepairRollback,correction};
