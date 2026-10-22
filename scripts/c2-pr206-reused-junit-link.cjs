#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {verifyJUnitLink}=require('../packages/quality-gates/c2-pr206-reused-junit-link.cjs');
const fail=()=>{throw Error('C2_REUSED_JUNIT_LINK_BLOCKED');};
function read(file,max){
 if(!path.isAbsolute(file)||!fs.existsSync(file))fail();
 const stat=fs.lstatSync(file);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||stat.size<1||stat.size>max)fail();
 return fs.readFileSync(file);
}
function main(args){
 if(!Array.isArray(args)||args.length!==6||
    args.some(x=>!path.isAbsolute(x))||
    new Set(args.map(x=>path.resolve(x))).size!==args.length)fail();
 const [run,artifact,xml,joined,core,output]=args;
 if(fs.existsSync(output)||path.isSymbolicLink?.(output))fail();
 const result=verifyJUnitLink({
  run:JSON.parse(read(run,300000).toString('utf8')),
  artifact:JSON.parse(read(artifact,300000).toString('utf8')),
  xml:read(xml,20000),
  joined:JSON.parse(read(joined,200000).toString('utf8')),
  core:JSON.parse(read(core,200000).toString('utf8'))
 });
 fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
 process.stdout.write(JSON.stringify({archivedOriginalRun:result.originalRunId,
  junitSHA:result.junitSha256,junitTests:result.junitTests,
  coreLinked:result.originalSourceWitnessLinkedToCurrentCore,
  gold:result.newGoldLabels,fpRate:result.scoredFalsePositiveRate})+'\n');
}
if(require.main===module){
 try{main(process.argv.slice(2))}
 catch(e){process.stderr.write('C2_REUSED_JUNIT_LINK_BLOCKED: '+String(e?.message||e)+'\n');process.exitCode=2;}
}
module.exports={main};
