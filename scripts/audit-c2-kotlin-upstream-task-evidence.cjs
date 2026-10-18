#!/usr/bin/env node
'use strict';
// Offline preflight only: NEVER executes upstream source, Gradle, shell scripts or Docker.
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {UPSTREAM}=require('../packages/quality-gates/c2-kotlin-upstream-candidate-index.cjs');
const {auditTask,summarizeTasks}=require('../packages/quality-gates/c2-upstream-task-triage.cjs');
function fail(){throw Error('C2_UPSTREAM_TASK_SOURCE_ATTESTATION_BLOCKED');}
function git(root,args){
 try{return execFileSync('git',['-C',root,...args],{encoding:'utf8',timeout:15000,maxBuffer:65536}).trim();}
 catch{fail();}
}
function read(root,rel){
 const filename=path.resolve(root,rel);
 if(!filename.startsWith(root+path.sep))fail();
 let stat;
 try{stat=fs.lstatSync(filename);}catch{fail();}
 if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||stat.size>2097152||stat.size<20)fail();
 const hash=git(root,['hash-object','--',rel]);
 const tracked=git(root,['rev-parse',`HEAD:${rel}`]);
 if(hash!==tracked||!/^[a-f0-9]{40}$/.test(hash))fail();
 return {content:fs.readFileSync(filename,'utf8'),sha:hash};
}
function run(args){
 let stage='ARGUMENTS';
 try{
  if(args.length!==2)fail();
  const [source,output]=args;
  if(!path.isAbsolute(source)||!path.isAbsolute(output)||
     path.resolve(source)===path.resolve(output)||fs.existsSync(output))fail();
  stage='SOURCE_CHECK';
  const root=fs.realpathSync(source);
  if(root!==path.resolve(source))fail();
  stage='PINNED_SOURCE_COMMIT';
  if(git(root,['rev-parse','--show-toplevel'])!==root||
     git(root,['rev-parse','HEAD'])!==UPSTREAM.commit||
     git(root,['status','--porcelain','--untracked-files=no']))fail();
  stage='TASK_ROSTER';
  const base=path.join(root,'tasks');
  const names=fs.readdirSync(base,{withFileTypes:true});
  if(names.length!==106||names.some(d=>!d.isDirectory()||d.isSymbolicLink()))fail();
  const entries=names.map(d=>{
   if(!/^[A-Za-z0-9_-]+-[1-9][0-9]{0,7}$/.test(d.name))fail();
   stage='READ_TASK_TOML:'+d.name;
   const toml=read(root,`tasks/${d.name}/task.toml`);
   stage='READ_EXPECTED_TESTS:'+d.name;
   const expected=read(root,`tasks/${d.name}/tests/expected_tests.json`);
   stage='PARSE_EXPECTED_TESTS:'+d.name;
   let o;try{o=JSON.parse(expected.content);}catch{fail();}
   return {name:d.name,toml:toml.content,expected:o,
    tomlGitSha:toml.sha,expectedGitSha:expected.sha};
  });
  // Identify the exact public task that failed, without printing the original
  // manifest, arbitrary exceptions, paths, process environment, or tokens.
  for(const task of entries){
   stage='VALIDATE_TASK:'+task.name;
   auditTask(task);
  }
  stage='SUMMARIZE_QUOTAS';
  const report=summarizeTasks(entries);
  stage='WRITE_REPORT';
  fs.writeFileSync(output,JSON.stringify(report,null,2)+'\\n',{flag:'wx',mode:0o600});
  return {status:report.status,candidates:report.candidateCount,
   tasksWithFailToPassExpectations:report.f2pDeclaredTasks,
   tasksWithNoFailToPass:report.noF2pTasks,
   actualBeforeFailAfterPassVerified:0,labelsAdded:0,
   sha256:report.contentSha256};
 }catch{
  throw Error('C2_UPSTREAM_TASK_SOURCE_ATTESTATION_BLOCKED:'+stage);
 }
}
if(require.main===module){
 try{console.log(JSON.stringify(run(process.argv.slice(2))));}
 catch(error){
  const reason=String(error?.message||'');
  const safe=/^C2_UPSTREAM_TASK_SOURCE_ATTESTATION_BLOCKED:[A-Z_]+(?::[A-Za-z0-9_-]+)?$/;
  console.error(safe.test(reason)?reason:'C2_UPSTREAM_TASK_SOURCE_ATTESTATION_BLOCKED');
  process.exitCode=2;
 }
}
module.exports={run};
