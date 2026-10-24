#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {sourceGitBlob,createProjectOracleReceipt,verifyProjectOracleReceipt}=
 require('../packages/quality-gates/c2-project-oracle-proof.cjs');
const PHASES=['original','fixed','benign'];
const sha256=x=>crypto.createHash('sha256').update(x).digest('hex');
const fail=()=>{throw Error('C2_PROJECT_ORACLE_BLOCKED');};
function readRegular(file,min=8,max=262144){
 if(typeof file!=='string'||!path.isAbsolute(file))fail();
 let stat,data;
 try{stat=fs.lstatSync(file);data=fs.readFileSync(file);}
 catch{fail();}
 if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||
   data.length<min||data.length>max)fail();
 return data;
}
function files(root){
 if(typeof root!=='string'||!path.isAbsolute(root))fail();
 let stat,names;
 try{stat=fs.lstatSync(root);names=fs.readdirSync(root);}
 catch{fail();}
 if(!stat.isDirectory()||stat.isSymbolicLink())fail();
 const expected=['receipt.json',...PHASES.flatMap(x=>[x+'.test.cjs',x+'.log'])].sort();
 if(JSON.stringify(names.sort())!==JSON.stringify(expected))fail();
 return Object.fromEntries(PHASES.map(p=>[p,{
  source:readRegular(path.join(root,p+'.test.cjs'),10),
  log:readRegular(path.join(root,p+'.log'),8)
 }]));
}
function generate(root,commitSha){
 if(typeof root!=='string'||!path.isAbsolute(root)||!(/^[0-9a-f]{40}$/.test(commitSha)))fail();
 if(fs.existsSync(path.join(root,'receipt.json')))fail();
 const phases=PHASES.map((phase,i)=>{
  const source=readRegular(path.join(root,phase+'.test.cjs'),10);
  const log=readRegular(path.join(root,phase+'.log'),8);
  if(!log.toString('utf8').includes('# tests ')||
     !log.toString('utf8').includes(i===0?'# fail 1':'# fail 0'))fail();
  return {phase,sourceBlobSha:sourceGitBlob(source),
   sourceSha256:sha256(source),logSha256:sha256(log),
   exitCode:i===0?1:0};
 });
 const receipt=createProjectOracleReceipt({
  mode:'TRUSTED_SELFTEST_ONLY',workerCommitSha:commitSha,
  projectId:'ultra-sentinel-sandbox-fixture',
  isolation:{networkUnshared:true,credentialsAbsent:true,rootReadOnly:true,unprivileged:true},
  phases
 });
 fs.writeFileSync(path.join(root,'receipt.json'),JSON.stringify(receipt,null,2)+'\n',
  {flag:'wx',mode:0o600});
 return receipt;
}
function verify(root,commitSha){
 const all=files(root);
 const parsed=JSON.parse(readRegular(path.join(root,'receipt.json'),100,65536).toString('utf8'));
 return verifyProjectOracleReceipt({receipt:parsed,
  expectedCommitSha:commitSha,
  sourceBytes:Object.fromEntries(PHASES.map(x=>[x,all[x].source])),
  logBytes:Object.fromEntries(PHASES.map(x=>[x,all[x].log]))
 });
}
function main(args){
 if(args.length!==3||!['generate','verify'].includes(args[0]))fail();
 const [mode,root,sha]=args;
 return mode==='generate'?generate(root,sha):verify(root,sha);
}
if(require.main===module){
 try{process.stdout.write(JSON.stringify(main(process.argv.slice(2)))+'\n');}
 catch{process.stderr.write('C2_PROJECT_ORACLE_BLOCKED\n');process.exitCode=2;}
}
module.exports={main,readRegular};
