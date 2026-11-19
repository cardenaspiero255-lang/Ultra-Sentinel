#!/usr/bin/env node
'use strict';
// Trusted host-only preflight for a FUTURE new V12 cohort. This tool never
// selects sources, runs oracles, executes Hunter or inspects its predictions.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const {validateOracleBeforeHunter}=require('../packages/quality-gates/v12-prehunter-oracle-gate.cjs');
const ROOT=path.resolve(__dirname,'..');
const FREEZE='docs/quality/PHASE2-BLOCK26-V12-PROSPECTIVE-FREEZE.json';
const SHA=/^[a-f0-9]{40}$/;
const blob=b=>crypto.createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const fail=m=>{throw Error('V12_PROTOCOL_'+m);};
function git(args){
 const r=cp.spawnSync('git',['-C',ROOT,'-c','core.hooksPath=/dev/null',...args],{
  encoding:'utf8',timeout:20000,maxBuffer:2*1024*1024,
  env:{PATH:process.env.PATH||'/usr/bin:/bin',GIT_CONFIG_GLOBAL:'/dev/null',
   GIT_CONFIG_NOSYSTEM:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_NO_LAZY_FETCH:'1',
   GIT_TERMINAL_PROMPT:'0',GIT_OPTIONAL_LOCKS:'0'}});
 return r;
}
function gitText(args){
 const r=git(args);
 if(r.error||r.status!==0)fail('GIT_AUTHENTICATION');
 return r.stdout.trim();
}
function file(p){
 if(typeof p!=='string'||!p||p.startsWith('/')||p.split('/').some(x=>x==='.'||x==='..'))fail('PATH');
 const full=path.join(ROOT,p),stat=fs.lstatSync(full);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size>1048576)fail('PATH');
 return fs.readFileSync(full);
}
function parse(b){return JSON.parse(b.toString('utf8'));}
function freeze(){
 const p=parse(file(FREEZE)),ex=parse(file(p.exclusions.path));
 if(p.schema!=='ultra-sentinel-v12-independent-oracle-before-hunter-freeze/v1'||
  p.hunter.commitSha!=='689583c23277807345edb715d8c2d277a3d4bda7'||
  p.hunter.blobSha!=='430b4e928527b20fe305d63f3efb85909f1dfa06'||
  p.hunter.mutable!==false||
  p.gate.path!=='packages/quality-gates/v12-prehunter-oracle-gate.cjs'||
  p.exclusions.path!=='docs/quality/PHASE2-BLOCK26-V11-POSTSCOUT-EXCLUSIONS.json'||
  p.exclusions.repositories!==185||p.exclusions.blobs!==729||
  blob(file(p.gate.path))!==p.gate.blobSha||
  blob(file(p.exclusions.path))!==p.exclusions.blobSha||
  p.plan.oracleSourceMustPrecedeHunter!==true||
  p.plan.noTargetExecutionBeforeOracleCommit!==true||
  p.plan.fullPredictionsOnlyAfterOracleCommit!==true||
  p.plan.noReuseOfExposedSources!==true||
  p.plan.noOracleTruthInHunterMount!==true||
  p.plan.noRetuneOfFrozenHunter!==true||
  p.state.newSourceMetadataSearched!==false||
  p.state.oracleCommitted!==false||
  p.state.hunterExecuted!==false||
  p.state.block26Closed!==false)
  fail('PRECOMMIT_DRIFT');
 if(ex.repositories.length!==185||ex.blobShas.length!==729)fail('EXCLUSIONS');
 return {p,ex};
}
function trustedGitWitness(oracle,protocolCommit){
 if(!SHA.test(oracle.commitSha)||!SHA.test(protocolCommit))fail('COMMIT_SHA');
 if(!/^tests\/fixtures\/phase2-block26-v12\/oracle\/[A-Za-z0-9_-]+\.kt$/.test(oracle.path))fail('ORACLE_PATH');
 const r=git(['show',oracle.commitSha+':'+oracle.path]);
 if(r.error||r.status!==0)fail('ORACLE_NOT_IN_COMMIT');
 const actualCommitted=blob(Buffer.from(r.stdout));
 const actualWorking=blob(file(oracle.path));
 // The preflight runs with no credential or oracle executable. The oracle
 // source MUST match the blob in the historical committed Git object.
 return {isAncestor:(a,b)=>SHA.test(a)&&SHA.test(b)&&git(['merge-base','--is-ancestor',a,b]).status===0,
  committedOracleBlob:actualCommitted,workingOracleBlob:actualWorking};
}
function main(){
 if(process.argv.length===3&&process.argv[2]==='freeze-only'){
  const {p}=freeze();
  process.stdout.write('V12_PREHUNTER_PROTOCOL_FROZEN='+p.hunter.commitSha+'\n');
  return;
 }
 if(process.argv.length!==6||process.argv[2]!=='admit')fail('ARGUMENTS');
 if(process.env.GH_TOKEN||process.env.GITHUB_TOKEN)fail('TOKEN_EXPOSURE');
 const {p,ex}=freeze(),cohort=parse(file(process.argv[3])),oracle=parse(file(process.argv[4])),
  protocolCommit=process.argv[5];
 if(!SHA.test(protocolCommit)||blob(Buffer.from(gitText(['show',protocolCommit+':'+FREEZE])+'\n'))!==blob(file(FREEZE)))
  fail('PROTOCOL_NOT_PRECOMMITTED');
 const start={protocolCommitSha:protocolCommit,hunterHeadCommitSha:gitText(['rev-parse','HEAD']),
  hunterRunStarted:false,oracleExecutableMountedWithHunter:false};
 const result=validateOracleBeforeHunter({freeze:p.policy,exclusions:ex,cohort,oracle,start,
  git:trustedGitWitness(oracle,protocolCommit)});
 process.stdout.write(JSON.stringify(result)+'\n');
}
if(require.main===module)try{main();}catch(e){console.error(e.message);process.exitCode=1;}
module.exports=Object.freeze({freeze});
