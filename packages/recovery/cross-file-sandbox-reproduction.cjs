'use strict';
/*
 * Execute bounded, read-only factorial observations on disposable local Git
 * fixtures. An injected oracle must be owned by the trusted test harness:
 * NEVER load/execute JS, Kotlin, shell commands or oracle code from a PR.
 * This runner does not authenticate GitHub source or certify a root cause.
 */
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const {judgeLocalRepair}=require('./repair-judge.cjs');
const {rollbackSandbox}=require('./sandbox-rollback.cjs');
const {assertSafeGitCheckout}=require('./git-sandbox-policy.cjs');
const SHA=/^[a-f0-9]{40}$/;
const RULE=/^[A-Z][A-Z0-9_]{2,80}$/;
const SAFE=/^(?:app\/src\/main\/|supabase\/functions\/)[A-Za-z0-9_./-]+$/;
function invalid(){throw Error('INVALID_CROSS_FILE_REPRODUCTION');}
function validPath(name){
 return typeof name==='string'&&name.length<=240&&SAFE.test(name)&&
  !name.includes('..')&&!name.includes('//')&&
  !name.split('/').some(s=>!s||s==='.');
}
function git(cwd,...args){
 const v=spawnSync('git',['-c','core.hooksPath=/dev/null','-c','core.fsmonitor=false',
  '-c','commit.gpgsign=false','-c','core.autocrlf=false',...args],{
  cwd,encoding:'utf8',timeout:10000,maxBuffer:1024*1024,
  env:{PATH:process.env.PATH,HOME:cwd,GIT_CONFIG_NOSYSTEM:'1',
   GIT_CONFIG_GLOBAL:'/dev/null',GIT_TERMINAL_PROMPT:'0',GIT_CONFIG_COUNT:'0'}
 });
 if(v.error||v.status!==0)throw Error('LOCAL_FACTORIAL_GIT_FAILED');
 return v.stdout.trim();
}
function commit(directory,message){
 git(directory,'-c','user.name=Ultra Sentinel Sandbox',
  '-c','user.email=sandbox@example.invalid','commit','-qm',message);
 return git(directory,'rev-parse','HEAD');
}
function preflight(plan,candidateRule,versions,independentOracle){
 if(!plan||plan.schema!=='ultra-sentinel-cross-file-interventions/v1'||
  plan.status!=='EXPERIMENTS_REQUIRED'||!SHA.test(plan.baseSha||'')||
  !SHA.test(plan.headSha||'')||plan.baseSha===plan.headSha||
  plan.sourceAuthenticated!==false||plan.causalityVerified!==false||
  plan.commitAllowed!==false||plan.mergeAllowed!==false||
  !Array.isArray(plan.candidates)||plan.candidates.length<1||
  typeof candidateRule!=='string'||!RULE.test(candidateRule)||
  typeof independentOracle!=='function')invalid();
 const matching=plan.candidates.filter(c=>c?.rule===candidateRule);
 if(matching.length!==1)invalid();
 const chosen=matching[0],files=chosen.files;
 if(chosen.status!=='MULTI_FILE_CAUSAL_HYPOTHESIS_NOT_VERIFIED'||
  chosen.causalLinksProved!==false||!Array.isArray(files)||
  files.length<2||files.length>4||
  files.some((name,i)=>!validPath(name)||(i>0&&files[i-1]>=name))||
  !Array.isArray(chosen.experiments)||
  chosen.experiments.length!==2**files.length||
  !Array.isArray(versions)||versions.length!==files.length)invalid();
 let byteCount=0;
 for(let i=0;i<files.length;i++){
  const v=versions[i];
  if(!v||Object.keys(v).sort().join(',')!=='after,before,path'||
   v.path!==files[i]||typeof v.before!=='string'||typeof v.after!=='string'||
   v.before===v.after||!v.before.endsWith('\n')||!v.after.endsWith('\n')||
   v.before.includes('\0')||v.after.includes('\0')||
   v.before.includes('\r')||v.after.includes('\r')||
   Buffer.byteLength(v.before,'utf8')>50000||
   Buffer.byteLength(v.after,'utf8')>50000)invalid();
  byteCount+=Buffer.byteLength(v.before,'utf8')+Buffer.byteLength(v.after,'utf8');
 }
 if(byteCount>150000)invalid();
 for(let mask=0;mask<chosen.experiments.length;mask++){
  const e=chosen.experiments[mask];
  const expected=files.filter((_,i)=>Boolean(mask&(1<<i)));
  const kind=mask===0?'baseline':mask===(1<<files.length)-1?'combined':'subset';
  if(!e||e.kind!==kind||e.executed!==false||
   e.independentOracleVerified!==false||!Array.isArray(e.selectedFiles)||
   e.selectedFiles.length!==expected.length||
   e.selectedFiles.some((name,i)=>name!==expected[i]))invalid();
 }
 return chosen;
}
function createSandbox(versions){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'ultra-factorial-'));
 try{
  git(directory,'init','-q','-b','sandbox/factorial');
  assertSafeGitCheckout(directory);
  if(git(directory,'remote')!=='')invalid();
  for(const v of versions){
   const filename=path.join(directory,v.path);
   fs.mkdirSync(path.dirname(filename),{recursive:true});
   fs.writeFileSync(filename,v.before,{flag:'wx',mode:0o600});
  }
  git(directory,'add','--',...versions.map(v=>v.path));
  const baselineHeadSha=commit(directory,'baseline: independent factorial fixture');
  return {directory,baselineHeadSha,
   baselineTree:git(directory,'rev-parse','HEAD^{tree}')};
 }catch(e){fs.rmSync(directory,{recursive:true,force:true});throw e;}
}
function oneScenario(versions,selectedFiles,independentOracle){
 const work=createSandbox(versions);
 const {directory,baselineHeadSha,baselineTree}=work;
 let repairHeadSha=null,judgeStatus='BASELINE_NO_COMMIT';
 let restoredTree=null,rollbackVerified=false,oracleVerdict;
 try{
  // All materialized bytes are inert data; the actual source is not evaluated.
  if(selectedFiles.length){
   for(const v of versions)if(selectedFiles.includes(v.path))
    fs.writeFileSync(path.join(directory,v.path),v.after,{flag:'w'});
   git(directory,'add','--',...selectedFiles);
   repairHeadSha=commit(directory,'sandbox: factorial controlled variant');
  }
  let error=null;
  try{
   if(repairHeadSha){
    const changes=selectedFiles.map(p=>({
     path:p,
     beforeBlobSha:git(directory,'rev-parse',baselineHeadSha+':'+p),
     afterBlobSha:git(directory,'rev-parse',repairHeadSha+':'+p),
     patchBytes:1
    }));
    const plan={branch:'sandbox/factorial',expectedHeadSha:baselineHeadSha,changes};
    const judge=judgeLocalRepair({directory,baselineHeadSha,repairHeadSha,plan});
    if(!judge.approved||judge.checkedFiles!==selectedFiles.length||
     judge.status!=='APPROVED_LOCAL_POLICY_ONLY')
     throw Error('LOCAL_FACTORIAL_JUDGE_VETO');
    judgeStatus=judge.status;
   }
   const snapshot=Object.freeze(Object.fromEntries(versions.map(v=>[
    v.path,fs.readFileSync(path.join(directory,v.path),'utf8')
   ])));
   let value;
   try{value=independentOracle(snapshot);}catch{throw Error('ORACLE_EVALUATION_FAILED');}
   if(typeof value!=='boolean')throw Error('ORACLE_EVALUATION_FAILED');
   oracleVerdict=value?'PASS':'FAIL';
  }catch(e){error=e;}
  finally{
   // Even an oracle or Judge failure must restore the exact original tree.
   if(repairHeadSha){
    const recovery=rollbackSandbox({directory,baselineHeadSha,repairHeadSha});
    restoredTree=recovery.restoredTree;
    rollbackVerified=recovery.status==='ROLLBACK_VERIFIED';
   }else{
    restoredTree=git(directory,'rev-parse','HEAD^{tree}');
    rollbackVerified=true;
   }
   if(!rollbackVerified||restoredTree!==baselineTree||
    git(directory,'status','--porcelain')!=='')
    throw Error('LOCAL_FACTORIAL_ROLLBACK_FAILED');
  }
  if(error)throw error;
  return Object.freeze({selectedFiles:Object.freeze([...selectedFiles]),
   oracleVerdict,judgeStatus,rollbackVerified,baselineTree,restoredTree,
   remoteWrites:false});
 }finally{
  fs.rmSync(directory,{recursive:true,force:true});
 }
}
function reproduceCrossFileInterventions({plan,candidateRule,versions,independentOracle}={}){
 const candidate=preflight(plan,candidateRule,versions,independentOracle);
 const scenarios=[];
 for(const e of candidate.experiments){
  scenarios.push(oneScenario(versions,e.selectedFiles,independentOracle));
 }
 return Object.freeze({
  schema:'ultra-sentinel-local-cross-file-reproduction/v1',
  status:'LOCAL_FACTORIAL_COMPLETED_REQUIRES_EXTERNAL_ORACLE',
  baseSha:plan.baseSha,headSha:plan.headSha,candidateRule,
  scenarios:Object.freeze(scenarios),
  causalityVerified:false,sourceAuthenticated:false,
  independentOracleProvenanceVerified:false,
  ownerAuthorizationRequired:true,commitAllowed:false,
  mergeAllowed:false,productionReleaseAllowed:false,
  limitation:'Only disposable Git source fixtures and caller-owned data predicates were exercised. Independent original-source JVM/Android behavior and authentic GitHub provenance remain unverified.'
 });
}
module.exports={reproduceCrossFileInterventions};
