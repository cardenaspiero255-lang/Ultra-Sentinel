'use strict';
/**
 * Independently judge two inert Kotlin source changes in a disposable local
 * Git checkout and restore exact baseline tree. NOT a production executor.
 */
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createHash}=require('node:crypto'),{spawnSync}=require('node:child_process');
const {judgeLocalRepair}=require('./repair-judge.cjs');
const {rollbackSandbox}=require('./sandbox-rollback.cjs');
const SHA=/^[0-9a-f]{40}$/;
const FILE=/^(?:apps\/android\/app\/src\/main\/java\/com\/cardenaspiero255\/jarvis\/core\/[A-Za-z0-9_.-]+\.kt|app\/src\/main\/(?:java|kotlin)\/[A-Za-z0-9_./-]+\.kt)$/;
function outcome(status,checkedFiles=0,exactTreeRollbackVerified=false){
 return Object.freeze({
  schema:'ultra-sentinel-two-source-kotlin-sandbox/v1',
  status,checkedFiles,exactTreeRollbackVerified,
  originalOracleVerifiedByThisFunction:false,
  remoteRepositoryIdentityAuthenticated:false,
  ownerAuthorizationVerified:false,
  writeScope:'disposable-local-git-only',
  remoteWrites:false,mergeAllowed:false,productionReleaseAllowed:false,
  limitation:'Source bytes and blob consistency alone cannot authenticate GitHub or validate Kotlin behavior. A trusted original JVM/Android oracle and owner-authenticated real executor remain separate required gates.'
 });
}
const digest=(s)=>{const b=Buffer.from(s,'utf8');return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');};
function good(f){
 if(!f||typeof f!=='object'||Array.isArray(f)||
  Object.getPrototypeOf(f)!==Object.prototype||
  Object.keys(f).sort().join(',')!=='after,afterBlobSha,before,beforeBlobSha,path'||
  typeof f.path!=='string'||f.path.length>280||!FILE.test(f.path)||
  f.path.includes('..')||f.path.includes('//')||
  !SHA.test(f.beforeBlobSha||'')||!SHA.test(f.afterBlobSha||'')||
  f.beforeBlobSha===f.afterBlobSha)return false;
 for(const k of ['before','after']){
  if(typeof f[k]!=='string'||f[k].length<10||
   Buffer.byteLength(f[k],'utf8')>60000||!f[k].endsWith('\n')||
   f[k].includes('\0')||f[k].includes('\r'))return false;
 }
 return f.before!==f.after&&digest(f.before)===f.beforeBlobSha&&
  digest(f.after)===f.afterBlobSha;
}
function git(root,...args){
 const cmd=spawnSync('git',[
  '-c','core.hooksPath=/dev/null','-c','core.fsmonitor=false',
  '-c','commit.gpgsign=false','-c','core.autocrlf=false',...args
 ],{
  cwd:root,encoding:'utf8',timeout:10000,maxBuffer:1024*1024,
  env:{PATH:process.env.PATH,HOME:root,GIT_CONFIG_NOSYSTEM:'1',
   GIT_CONFIG_GLOBAL:'/dev/null',GIT_TERMINAL_PROMPT:'0',GIT_CONFIG_COUNT:'0'}
 });
 if(cmd.error||cmd.status!==0)throw Error('LOCAL_GIT_FAILED');
 return cmd.stdout.trim();
}
function commit(root,label){
 git(root,'-c','user.name=Sentinel Local Test',
  '-c','user.email=sandbox@example.invalid','commit','-qm',label);
 return git(root,'rev-parse','HEAD');
}
function drillTwoSourceKotlinSandbox({files}={}){
 if(!Array.isArray(files)||files.length!==2||!files.every(good)||
  files[0].path===files[1].path)return outcome('BLOCKED_INPUT_CONTRACT');
 const ordered=[...files].sort((a,b)=>a.path.localeCompare(b.path));
 let root=null;
 try{
  root=fs.mkdtempSync(path.join(os.tmpdir(),'us-two-source-kotlin-'));
  git(root,'init','-q','-b','sandbox/two-source-kotlin');
  if(git(root,'remote')!=='')throw Error('REMOTE_NOT_EMPTY');
  for(const f of ordered){
   const dest=path.join(root,f.path);
   fs.mkdirSync(path.dirname(dest),{recursive:true});
   fs.writeFileSync(dest,f.before,{flag:'wx',mode:0o600});
  }
  git(root,'add','--',...ordered.map(f=>f.path));
  const baseline=commit(root,'original two-source baseline');
  const baselineTree=git(root,'rev-parse','HEAD^{tree}');
  for(const f of ordered){
   if(git(root,'rev-parse',baseline+':'+f.path)!==f.beforeBlobSha)
    throw Error('BASELINE_SHA_MISMATCH');
   fs.writeFileSync(path.join(root,f.path),f.after,{flag:'w',mode:0o600});
  }
  git(root,'add','--',...ordered.map(f=>f.path));
  const candidate=commit(root,'supervised local candidate');
  const plan={branch:'sandbox/two-source-kotlin',expectedHeadSha:baseline,
   changes:ordered.map(f=>({path:f.path,beforeBlobSha:f.beforeBlobSha,
    afterBlobSha:f.afterBlobSha,patchBytes:Buffer.byteLength(f.after,'utf8')}))};
  const judge=judgeLocalRepair({directory:root,baselineHeadSha:baseline,
   repairHeadSha:candidate,plan});
  if(!judge.approved||judge.checkedFiles!==2||
   judge.status!=='APPROVED_LOCAL_POLICY_ONLY')throw Error('JUDGE_VETO');
  const recovery=rollbackSandbox({directory:root,baselineHeadSha:baseline,
   repairHeadSha:candidate});
  if(recovery.status!=='ROLLBACK_VERIFIED'||
   recovery.restoredTree!==baselineTree||
   git(root,'status','--porcelain')!==''||git(root,'remote')!=='')throw Error('ROLLBACK_VETO');
  for(const f of ordered)if(git(root,'rev-parse','HEAD:'+f.path)!==f.beforeBlobSha)
   throw Error('SOURCE_NOT_RESTORED');
  return outcome('TWO_SOURCE_SANDBOX_JUDGE_AND_ROLLBACK_VERIFIED',2,true);
 }catch{return outcome('BLOCKED_LOCAL_JUDGE_OR_ROLLBACK');}
 finally{if(root!==null)fs.rmSync(root,{recursive:true,force:true});}
}
module.exports={drillTwoSourceKotlinSandbox};
